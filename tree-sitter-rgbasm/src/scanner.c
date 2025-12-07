#include "tree_sitter/alloc.h"
#include "tree_sitter/parser.h"
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <wctype.h>

#include "identifier.c"

#define DEBUG_SCANNER 0

enum TokenType {
  IDENTIFIER_TOKEN,
  // Looking ahead for start of identifiers, which need considerable
  // lookahead information
  GLOBAL_IDENTIFIER_BEGIN,
  LOCAL_IDENTIFIER_BEGIN,
  QUALIFIED_LOCAL_IDENTIFIER_BEGIN,
  INSIDE_INTERPOLATION,

  STRING_CONTENT,
  TRIPLE_STRING_CONTENT,

  // A statement is ended either at the end of line/file, or by a ']]' token,
  // which closes a fragment literal. Latter must not be consumed.
  EOL_TOKEN,

  // These markers allow the scanner to track section state
  SECTION_START,
  SECTION_END_EXPLICIT,
  // Is scanned if the last section was explicitly ended
  SECTION_TRAILER,

  // A LOAD _may_ be ended by each of the following:
  // - <eof>
  // - ENDL token  FIXME: check if this can now be handled by the grammar
  //
  // Additionally, the following tokens of other section related blocks
  // will also implicitly end a LOAD block:
  // - ENDSECTION
  // - SECTION
  // - POPS
  LOAD_END_TOKEN,

  ERROR,
};

typedef enum SectionState {
  SECTION_STATE_NONE = 0,
  SECTION_STATE_STARTED,
  SECTION_STATE_ENDED,
} SectionState;

typedef struct ScannerState {
  SectionState section_state;
  int peeked_identifier_length;
} ScannerState;

void *tree_sitter_rgbasm_external_scanner_create() {
  ScannerState *state = (ScannerState *)ts_calloc(1, sizeof(ScannerState));
  state->section_state = SECTION_STATE_NONE;
  state->peeked_identifier_length = 0;
  return state;
}

void tree_sitter_rgbasm_external_scanner_destroy(void *payload) {
  ts_free(payload);
}

unsigned tree_sitter_rgbasm_external_scanner_serialize(void *payload,
                                                       char *buffer) {

  ScannerState *state = (ScannerState *)payload;
  memcpy(buffer, &(state->section_state), sizeof(state->section_state));
  memcpy(buffer + sizeof(state->section_state),
         &(state->peeked_identifier_length),
         sizeof(state->peeked_identifier_length));
  return sizeof(state->section_state) + sizeof(state->peeked_identifier_length);
}

void tree_sitter_rgbasm_external_scanner_deserialize(void *payload,
                                                     const char *buffer,
                                                     unsigned length) {
  if (length > 0) {
    ScannerState *state = (ScannerState *)payload;
    state->section_state = (enum SectionState)(buffer[0]);
  }
}

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

static inline bool is_blank(int32_t c) { return c == ' ' || c == '\t'; }

static inline bool swallow_uniqueness_affix(TSLexer *lexer) {
  if (lexer->lookahead == '\\') {
    advance(lexer);
    if (lexer->lookahead == '@') {
      advance(lexer);
      return true;
    }
  }
  return false;
}

static inline int min(int a, int b) { return (a < b) ? a : b; }

static size_t scan_identifier(TSLexer *lexer, const bool *valid_symbols,
                              const bool peek) {
  lexer->mark_end(lexer);
  bool raw = lexer->lookahead == '#';
  int len = 0;
  if (raw) {
    len += 1;
    advance(lexer);
  }
  size_t interpolation = 0;
  size_t name_len = 0;
  char name[MAX_IDENTIFIER_LENGTH + 1];
  int dot = -1;
  int first_interpolation_pos = -1;

  while (interpolation > 0 || is_identifier_char(lexer->lookahead) ||
         lexer->lookahead == '.' || lexer->lookahead == '{') {
    int32_t c = lexer->lookahead;
    if (name_len < MAX_IDENTIFIER_LENGTH) {
      name[name_len] = c < 256 ? (char)c : 0;
      name_len += 1;
    }
    if (c == '{') {
      if (first_interpolation_pos == -1) {
        first_interpolation_pos = (int)len;
      }
      interpolation += 1;
    } else if (interpolation > 0) {
      if (c == '}') {
        interpolation -= 1;
      }
      if (c == '\r' || c == '\n' || c == '\0') {
        // unterminated interpolation
        return 0;
      }
    } else if (c == '.') {
      if (dot != -1) {
        // multiple dots not allowed
        return 0;
      }
      dot = (int)len;
    } else if (len == 0 && !is_identifier_start(c)) {
      return 0;
    }
    advance(lexer);
    len += 1;
  }
  if (len == 0) {
    return 0;
  }
  if (raw && dot == 0) {
    // raw local symbol ("#." + ...), not allowed
    return 0;
  }

  // check uniqueness_affix
  if (!peek) {
    lexer->mark_end(lexer);
  }
  const bool unique = swallow_uniqueness_affix(lexer);
  const bool interpolated = first_interpolation_pos != -1;

  if (dot == 0) {
    // local symbol
    if (valid_symbols[LOCAL_IDENTIFIER_BEGIN]) {
      lexer->result_symbol = LOCAL_IDENTIFIER_BEGIN;
      return len;
    }
    return false;
  } else if (dot > 0) {
    // qualified local symbol
    if (valid_symbols[QUALIFIED_LOCAL_IDENTIFIER_BEGIN]) {
      // part before dot must not be a reserved word,
      // uniqueness, i.e. \@, doesn't matter here
      if (!raw && (!interpolated || first_interpolation_pos > dot) &&
          is_reserved_word(name, dot)) {
        lexer->result_symbol = ERROR;
        return len;
      }
      lexer->result_symbol = QUALIFIED_LOCAL_IDENTIFIER_BEGIN;
      return len;
    }
    return false;
  } else {
    if (!raw && !interpolated && !unique && is_reserved_word(name, name_len)) {
      if (valid_symbols[LOAD_END_TOKEN]) {
        const size_t match = matches_any(
            name, name_len,
            (const char *const[]){"ENDL", "SECTION", "ENDSECTION", "POPS"}, 4);
        if (match != -1) {
          lexer->result_symbol = LOAD_END_TOKEN;
          // if ENDL, consume it
          if (match == 0) {
            // peek value is expected to be false here
            lexer->mark_end(lexer);
          }
          return len;
        }
      }
      // reserved word, global symbol not allowed
      // this is also checked by the grammar, but we catch it earlier here
      return 0;
    }
    // global symbol
    if (valid_symbols[GLOBAL_IDENTIFIER_BEGIN]) {
      lexer->result_symbol = GLOBAL_IDENTIFIER_BEGIN;
      return len;
    }
    return 0;
  }
}

static bool scan(ScannerState *state, TSLexer *lexer, const bool *valid_symbols,
                 const bool error) {
  if (!error) {
    // ----- Section handling -----
    //
    // We use markers for start and explicit ends via ENDSECTION and save that
    // in the state. The start and end tokens are assumed to be optional, so
    // we always return false (virtual token anyway).

    if (valid_symbols[SECTION_START]) {
      state->section_state = SECTION_STATE_STARTED;
      return false;
    }

    if (valid_symbols[SECTION_END_EXPLICIT]) {
      state->section_state = SECTION_STATE_ENDED;
      if (!valid_symbols[SECTION_TRAILER]) {
        return false;
      }
    }

    if (valid_symbols[SECTION_TRAILER] &&
        state->section_state == SECTION_STATE_ENDED) {
      lexer->mark_end(lexer);
      lexer->result_symbol = SECTION_TRAILER;
      return true;
    }

    if (valid_symbols[STRING_CONTENT] || valid_symbols[TRIPLE_STRING_CONTENT]) {
      size_t len = 0;
      while (!lexer->eof(lexer)) {
        const int32_t next = lexer->lookahead;
        if (next == '{' || next == '\\') {
          break;
        }
        if (!valid_symbols[TRIPLE_STRING_CONTENT] &&
            (next == '\n' || next == '\r')) {
          break;
        }
        // check for end of string
        if (valid_symbols[TRIPLE_STRING_CONTENT]) {
          if (next == '"') {
            lexer->mark_end(lexer);
            advance(lexer);
            if (lexer->lookahead == '"') {
              advance(lexer);
              if (lexer->lookahead == '"') {
                // end of triple-quoted string
                break;
              }
            }
          }
        } else if (valid_symbols[STRING_CONTENT] && next == '"') {
          break;
        }

        advance(lexer);
        lexer->mark_end(lexer);
        len += 1;
      } // while

      if (len > 0) {
        lexer->result_symbol = valid_symbols[TRIPLE_STRING_CONTENT]
                                   ? TRIPLE_STRING_CONTENT
                                   : STRING_CONTENT;
        return true;
      }
    }
  }

  // Skip blanks
  while (is_blank(lexer->lookahead)) {
    skip(lexer);
  }

  // Check for EOL token: newline, EOF, or before ]]
  if (valid_symbols[EOL_TOKEN]) {
    // Mark end position FIRST (like tree-sitter-javascript automatic
    // semicolon)
    lexer->mark_end(lexer);
    lexer->result_symbol = EOL_TOKEN;

#if DEBUG_SCANNER
    printf("# Scanning for EOL token\n");
    printf("  eof: %d, lookahead: 0x%02X\n", lexer->eof(lexer),
           (unsigned int)lexer->lookahead);
#endif

    if (lexer->eof(lexer)) {
      return true;
    }
    // Before ']]' (fragment literal end)
    else if (lexer->lookahead == ']') {
      advance(lexer);
      return lexer->lookahead == ']';
    }
    // Physical newline
    else if (lexer->lookahead == '\r') {
      advance(lexer);
      if (lexer->lookahead == '\n') {
        advance(lexer);
        lexer->mark_end(lexer);
        return true;
      }
      return false;
    } else if (lexer->lookahead == '\n') {
      advance(lexer);
      lexer->mark_end(lexer);
      return true;
    }
  }

  if (error) {
    return false;
  }

  if (valid_symbols[GLOBAL_IDENTIFIER_BEGIN] ||
      valid_symbols[LOCAL_IDENTIFIER_BEGIN] ||
      valid_symbols[QUALIFIED_LOCAL_IDENTIFIER_BEGIN] ||
      valid_symbols[LOAD_END_TOKEN]) {
    int len = scan_identifier(lexer, valid_symbols, true);
    if (len > 0) {
      if (valid_symbols[INSIDE_INTERPOLATION]) {
        while (is_blank(lexer->lookahead)) {
          skip(lexer);
        }
        if (lexer->lookahead != '}') {
          return false;
        }
      }
      state->peeked_identifier_length = len;
      return true;
    }
  } else if (valid_symbols[IDENTIFIER_TOKEN]) {
    if (state->peeked_identifier_length > 0) {
      // consume previously peeked identifier
      for (int i = 0; i < state->peeked_identifier_length; i++) {
        advance(lexer);
      }
      state->peeked_identifier_length = 0;
      lexer->result_symbol = IDENTIFIER_TOKEN;
      return true;
    } else {
      bool valid[] = {
          [GLOBAL_IDENTIFIER_BEGIN] = true,
          [LOCAL_IDENTIFIER_BEGIN] = true,
          [QUALIFIED_LOCAL_IDENTIFIER_BEGIN] = true,
          [LOAD_END_TOKEN] = false,
      };
      int len = scan_identifier(lexer, valid, false);
      if (len > 0) {
        lexer->result_symbol = IDENTIFIER_TOKEN;
        return true;
      }
    }
  }

  return false;
}

bool tree_sitter_rgbasm_external_scanner_scan(ScannerState *state,
                                              TSLexer *lexer,
                                              const bool *valid_symbols) {
#if DEBUG_SCANNER
  char buf[2];
  char *repr = "<non-printable>";
  if (lexer->lookahead == '\n') {
    repr = "\\n";
  } else if (lexer->lookahead == '\r') {
    repr = "\\r";
  } else if (lexer->lookahead == '\t') {
    repr = "\\t";
  } else if (lexer->lookahead == '\0') {
    repr = "\\0";
  } else if (lexer->lookahead >= 32 && lexer->lookahead <= 126) {
    buf[0] = (char)lexer->lookahead;
    buf[1] = '\0';
    repr = buf;
  }
  const char *section_state_names[] = {"NONE", "STARTED", "ENDED"};
  printf("# External scanner. Lookahead: %-2s (0x%02X), section %s, peek %i",
         repr, (unsigned int)lexer->lookahead,
         section_state_names[state->section_state],
         state->peeked_identifier_length);

  // Print valid symbols presence by lower and upper case
  printf(" Valid symbols: ");
  const char del1 = valid_symbols[INSIDE_INTERPOLATION] ? '{' : '(';
  const char del2 = valid_symbols[INSIDE_INTERPOLATION] ? '}' : ')';
  printf("%c%c", valid_symbols[IDENTIFIER_TOKEN] ? 'I' : '.', del1);
  printf("%c", valid_symbols[GLOBAL_IDENTIFIER_BEGIN] ? 'G' : '.');
  printf("%c", valid_symbols[LOCAL_IDENTIFIER_BEGIN] ? 'l' : '.');
  printf("%c%c ", valid_symbols[QUALIFIED_LOCAL_IDENTIFIER_BEGIN] ? 'Q' : '.',
         del2);

  printf("\":%c", valid_symbols[TRIPLE_STRING_CONTENT] ? '3' : '.');
  printf("%c ", valid_symbols[STRING_CONTENT] ? '1' : '.');

  printf("%c ", valid_symbols[EOL_TOKEN] ? 'E' : '.');

  printf("%c", valid_symbols[SECTION_START] ? '>' : '.');
  printf("%c", valid_symbols[SECTION_END_EXPLICIT] ? '<' : '.');
  printf("%c ", valid_symbols[SECTION_TRAILER] ? '*' : '.');

  printf("%c", valid_symbols[LOAD_END_TOKEN] ? 'e' : '.');
  printf("\n");
#endif

  bool result = scan(state, lexer, valid_symbols, valid_symbols[ERROR]);

#if DEBUG_SCANNER
  char *symbol = "<none>";
  if (result) {
    switch (lexer->result_symbol) {
    case IDENTIFIER_TOKEN:
      symbol = "I";
      break;
    case GLOBAL_IDENTIFIER_BEGIN:
      symbol = "G";
      break;
    case LOCAL_IDENTIFIER_BEGIN:
      symbol = "l";
      break;
    case QUALIFIED_LOCAL_IDENTIFIER_BEGIN:
      symbol = "Q";
      break;
    case STRING_CONTENT:
      symbol = "1";
      break;
    case TRIPLE_STRING_CONTENT:
      symbol = "3";
    case EOL_TOKEN:
      symbol = "E";
      break;
    case SECTION_START:
      symbol = ">";
      break;
    case SECTION_END_EXPLICIT:
      symbol = "<";
      break;
    case SECTION_TRAILER:
      symbol = "*";
      break;
    case LOAD_END_TOKEN:
      symbol = "e";
      break;
    default:
      symbol = "?";
    }
  }
  printf("  => %s\n", symbol);
#endif
  return result;
}
