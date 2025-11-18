#include "tree_sitter/parser.h"
#include <wctype.h>
#include <stdbool.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

enum TokenType {
  MACRO_ARG,                 // Raw macro argument (lexed in a "raw" mode)
  MACRO_ARG_END,             // Marks end of macro-arg mode at EOL / EOF
  RAW_MACRO_MODE,            // Zero-width token that toggles RAW mode on this line
  LABEL_TOKEN,               // Identifier immediately followed by : (no space)
  REGISTER_TOKEN,            // CPU register token (A, B, C, D, E, H, L, AF, BC, DE, HL, SP, PC)
  SYMBOL_TOKEN,              // Plain identifier (for macro calls, etc.)
  INSTRUCTION_TOKEN,         // Known Z80/GB instruction opcode
};

typedef struct {
  bool in_raw_macro_mode;
} ScannerState;

void *tree_sitter_rgbasm_external_scanner_create() {
  ScannerState *state = calloc(1, sizeof(ScannerState));
  return state;
}

void tree_sitter_rgbasm_external_scanner_destroy(void *payload) {
  free(payload);
}

unsigned tree_sitter_rgbasm_external_scanner_serialize(void *payload, char *buffer) {
  ScannerState *state = (ScannerState *)payload;
  buffer[0] = state->in_raw_macro_mode ? 1 : 0;
  return 1;
}

void tree_sitter_rgbasm_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  ScannerState *state = (ScannerState *)payload;
  state->in_raw_macro_mode = (length > 0 && buffer[0] != 0);
}

static inline bool is_identifier_char(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || 
         (c >= '0' && c <= '9') || c == '_' || c == '#' || 
         c == '@' || c == '$';
}

static inline void advance(TSLexer *lexer) {
  lexer->advance(lexer, false);
}

static inline void skip(TSLexer *lexer) {
  lexer->advance(lexer, true);
}

static inline bool is_blank(int32_t c) {
  return c == ' ' || c == '\t';
}

static inline bool is_newline(int32_t c) {
  return c == '\n' || c == '\r';
}

static inline bool is_identifier_start(int32_t c) {
  // Do NOT treat '.' or '#' as identifier starts here:
  // - '.' is reserved for local identifiers (.loop, .string) handled by internal lexer
  // - '#' is reserved for raw identifiers (#load, #IF, etc.) handled by internal lexer
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
}

// Check if identifier matches a known Z80/GB instruction (case-insensitive)
static bool is_instruction(const char *name, size_t len) {
  // Convert to uppercase for comparison
  char upper[32];
  if (len >= sizeof(upper)) return false;
  
  for (size_t i = 0; i < len; i++) {
    char c = name[i];
    upper[i] = (c >= 'a' && c <= 'z') ? (char)(c - 32) : c;
  }
  upper[len] = '\0';
  
  // Complete SM83 (Game Boy) / Z80 instruction set
  if (len == 2) {
    return (upper[0] == 'L' && upper[1] == 'D') ||  // LD
           (upper[0] == 'C' && upper[1] == 'P') ||  // CP
           (upper[0] == 'O' && upper[1] == 'R') ||  // OR
           (upper[0] == 'J' && upper[1] == 'R') ||  // JR
           (upper[0] == 'J' && upper[1] == 'P') ||  // JP
           (upper[0] == 'D' && upper[1] == 'I') ||  // DI
           (upper[0] == 'E' && upper[1] == 'I');    // EI
  }
  if (len == 3) {
    return (upper[0] == 'A' && upper[1] == 'D' && upper[2] == 'D') ||  // ADD
           (upper[0] == 'A' && upper[1] == 'D' && upper[2] == 'C') ||  // ADC
           (upper[0] == 'S' && upper[1] == 'U' && upper[2] == 'B') ||  // SUB
           (upper[0] == 'S' && upper[1] == 'B' && upper[2] == 'C') ||  // SBC
           (upper[0] == 'A' && upper[1] == 'N' && upper[2] == 'D') ||  // AND
           (upper[0] == 'X' && upper[1] == 'O' && upper[2] == 'R') ||  // XOR
           (upper[0] == 'I' && upper[1] == 'N' && upper[2] == 'C') ||  // INC
           (upper[0] == 'D' && upper[1] == 'E' && upper[2] == 'C') ||  // DEC
           (upper[0] == 'D' && upper[1] == 'A' && upper[2] == 'A') ||  // DAA
           (upper[0] == 'C' && upper[1] == 'P' && upper[2] == 'L') ||  // CPL
           (upper[0] == 'S' && upper[1] == 'C' && upper[2] == 'F') ||  // SCF
           (upper[0] == 'C' && upper[1] == 'C' && upper[2] == 'F') ||  // CCF
           (upper[0] == 'N' && upper[1] == 'O' && upper[2] == 'P') ||  // NOP
           (upper[0] == 'P' && upper[1] == 'O' && upper[2] == 'P') ||  // POP
           (upper[0] == 'R' && upper[1] == 'E' && upper[2] == 'T') ||  // RET
           (upper[0] == 'R' && upper[1] == 'S' && upper[2] == 'T') ||  // RST
           (upper[0] == 'R' && upper[1] == 'L' && upper[2] == 'A') ||  // RLA
           (upper[0] == 'R' && upper[1] == 'L' && upper[2] == 'C') ||  // RLC
           (upper[0] == 'R' && upper[1] == 'R' && upper[2] == 'A') ||  // RRA
           (upper[0] == 'R' && upper[1] == 'R' && upper[2] == 'C') ||  // RRC
           (upper[0] == 'S' && upper[1] == 'L' && upper[2] == 'A') ||  // SLA
           (upper[0] == 'S' && upper[1] == 'R' && upper[2] == 'A') ||  // SRA
           (upper[0] == 'S' && upper[1] == 'R' && upper[2] == 'L') ||  // SRL
           (upper[0] == 'B' && upper[1] == 'I' && upper[2] == 'T') ||  // BIT
           (upper[0] == 'R' && upper[1] == 'E' && upper[2] == 'S') ||  // RES
           (upper[0] == 'S' && upper[1] == 'E' && upper[2] == 'T') ||  // SET
           (upper[0] == 'L' && upper[1] == 'D' && upper[2] == 'I') ||  // LDI
           (upper[0] == 'L' && upper[1] == 'D' && upper[2] == 'D') ||  // LDD
           (upper[0] == 'L' && upper[1] == 'D' && upper[2] == 'H');    // LDH
  }
  if (len == 4) {
    return (upper[0] == 'P' && upper[1] == 'U' && upper[2] == 'S' && upper[3] == 'H') ||  // PUSH
           (upper[0] == 'C' && upper[1] == 'A' && upper[2] == 'L' && upper[3] == 'L') ||  // CALL
           (upper[0] == 'H' && upper[1] == 'A' && upper[2] == 'L' && upper[3] == 'T') ||  // HALT
           (upper[0] == 'S' && upper[1] == 'T' && upper[2] == 'O' && upper[3] == 'P') ||  // STOP
           (upper[0] == 'R' && upper[1] == 'E' && upper[2] == 'T' && upper[3] == 'I') ||  // RETI
           (upper[0] == 'R' && upper[1] == 'E' && upper[2] == 'T' && upper[3] == 'N') ||  // RETN
           (upper[0] == 'R' && upper[1] == 'L' && upper[2] == 'C' && upper[3] == 'A') ||  // RLCA
           (upper[0] == 'R' && upper[1] == 'R' && upper[2] == 'C' && upper[3] == 'A') ||  // RRCA
           (upper[0] == 'S' && upper[1] == 'W' && upper[2] == 'A' && upper[3] == 'P') ||  // SWAP
           (upper[0] == 'L' && upper[1] == 'D' && upper[2] == 'I' && upper[3] == 'O');    // LDIO
  }
  
  return false;
}

// Check if identifier is a CPU register name (case-insensitive)
static bool is_register_name(const char *name, size_t len) {
  if (len == 1) {
    char c = name[0];
    c = (c >= 'a' && c <= 'z') ? (char)(c - 32) : c;
    return c == 'A' || c == 'B' || c == 'C' ||
           c == 'D' || c == 'E' || c == 'H' ||
           c == 'L';
  }

  if (len == 2) {
    char c0 = name[0];
    char c1 = name[1];
    c0 = (c0 >= 'a' && c0 <= 'z') ? (char)(c0 - 32) : c0;
    c1 = (c1 >= 'a' && c1 <= 'z') ? (char)(c1 - 32) : c1;

    return (c0 == 'A' && c1 == 'F') ||  // AF
           (c0 == 'B' && c1 == 'C') ||  // BC
           (c0 == 'D' && c1 == 'E') ||  // DE
           (c0 == 'H' && c1 == 'L') ||  // HL
           (c0 == 'S' && c1 == 'P') ||  // SP
           (c0 == 'P' && c1 == 'C');    // PC
  }

  return false;
}

// Reserved directive / block keywords that should NOT be treated as
// generic identifiers by the external scanner. These are handled by
// the main grammar (directive_keyword, def_directive, if_block, etc.).
static bool is_reserved_word(const char *name, size_t len) {
  static const char *const reserved[] = {
    // Core directives and assignment types
    "DEF", "REDEF", "EQU", "EQUS",
    "DB", "DW", "DS", "CHAR",
    "READFILE", "PRINT", "PRINTLN", "PRINTT",
    "FAIL", "WARN", "IMPORT", "XREF",
    "RSSET", "RSRESET",
    "PUSHO", "POPO", "PUSHS", "POPS", "PUSHC", "POPC",
    "CHARMAP", "NEWCHARMAP", "SETCHARMAP",
    "LOAD", "ENDL",
    "FRAGMENT", "ALIGN",
    // Section / bank options
    "SECTION", "UNION", "BANK",
    // Flow / block directives
    "IF", "ELIF", "ELSE", "ENDC",
    "REPT", "FOR", "ENDR",
    "UNION", "NEXTU", "ENDU",
    // Macros
    "MACRO", "ENDM",
    // Other directives
    "ASSERT", "STATIC_ASSERT",
    "PURGE",
    "SHIFT",
    "BREAK",
    "INCLUDE", "INCBIN",
    "EXPORT",
    "OPT",
  };

  if (len == 0 || len >= 32) {
    return false;
  }

  char upper[32];
  for (size_t i = 0; i < len; i++) {
    char c = name[i];
    upper[i] = (c >= 'a' && c <= 'z') ? (char)(c - 32) : c;
  }
  upper[len] = '\0';

  size_t count = sizeof(reserved) / sizeof(reserved[0]);
  for (size_t i = 0; i < count; i++) {
    const char *kw = reserved[i];
    if (strlen(kw) == len && memcmp(upper, kw, len) == 0) {
      return true;
    }
  }

  return false;
}

// Scan an identifier and determine if it's followed by ':' (label), or if it's an instruction/symbol
static bool scan_identifier_token(TSLexer *lexer, const bool *valid_symbols) {
  // Must start with valid identifier start character
  if (!is_identifier_start(lexer->lookahead)) {
    return false;
  }
  
  // Peek ahead to see if this is a dotted identifier like "Global.local"
  // If so, let the internal lexer handle it entirely
  TSLexer saved = *lexer;
  size_t len = 0;
  char name[32];
  bool has_dot = false;
  while ((is_identifier_char(lexer->lookahead) || lexer->lookahead == '.') && len < sizeof(name) - 1) {
    if (lexer->lookahead == '.') {
      has_dot = true;
    }
    name[len++] = (char)lexer->lookahead;
    advance(lexer);
  }
  
  // If this identifier contains a dot, restore position and let internal lexer handle it
  if (has_dot) {
    *lexer = saved;
    return false;
  }
  
  name[len] = '\0';

  // Reserved directive / block keywords are handled by the main grammar
  // (e.g., DEF, REDEF, SECTION, IF, MACRO). Let the internal lexer
  // produce the appropriate keyword tokens instead of emitting any
  // external identifier tokens for them.
  if (is_reserved_word(name, len)) {
    *lexer = saved;
    return false;
  }
  
  lexer->mark_end(lexer);
  
  // Check what follows (without consuming it)
  // If followed by ':', it's a label
  if (lexer->lookahead == ':') {
    if (valid_symbols[LABEL_TOKEN]) {
      lexer->result_symbol = LABEL_TOKEN;
      return true;
    }
    // If LABEL_TOKEN not valid but this looks like a label, don't consume as macro arg
    return false;
  }

  // CPU register names (A, B, C, D, E, H, L, AF, BC, DE, HL, SP, PC)
  // Only emit REGISTER_TOKEN when registers are valid in this context
  if (is_register_name(name, len) && valid_symbols[REGISTER_TOKEN]) {
    lexer->result_symbol = REGISTER_TOKEN;
    return true;
  }

  // Known instruction opcodes
  if (is_instruction(name, len) && valid_symbols[INSTRUCTION_TOKEN]) {
    lexer->result_symbol = INSTRUCTION_TOKEN;
    return true;
  }

  // Plain symbol (macro name, etc.)
  if (valid_symbols[SYMBOL_TOKEN]) {
    lexer->result_symbol = SYMBOL_TOKEN;
    return true;
  }
  
  // If we got here, we scanned an identifier but didn't match any external
  // tokens (label/register). Let the internal scanner produce a normal
  // `identifier` token.
  return false;
}

static void skip_line_comment(TSLexer *lexer) {
  while (!lexer->eof(lexer) && !is_newline(lexer->lookahead)) {
    advance(lexer);
  }
}

static void skip_block_comment(TSLexer *lexer) {
  int depth = 1;
  advance(lexer); // consume '*'
  while (depth > 0 && !lexer->eof(lexer)) {
    if (lexer->lookahead == '/' ) {
      advance(lexer);
      if (lexer->lookahead == '*') {
        advance(lexer);
        depth++;
      }
    } else if (lexer->lookahead == '*') {
      advance(lexer);
      if (lexer->lookahead == '/') {
        advance(lexer);
        depth--;
      }
    } else {
      advance(lexer);
    }
  }
}

static void read_string_like(TSLexer *lexer, bool is_raw, bool *has_content) {
  // Entered with lookahead at '"'; raw prefix (if any) has already been consumed
  advance(lexer); // consume '"'

  bool triple = false;
  if (lexer->lookahead == '"' ) {
    advance(lexer);
    if (lexer->lookahead == '"') {
      advance(lexer);
      triple = true;
    } else {
      // Two quotes were part of content; mark as content so trimming keeps them
      *has_content = true;
      lexer->mark_end(lexer);
    }
  }

  *has_content = true;
  lexer->mark_end(lexer); // include opening quotes as content

  while (!lexer->eof(lexer)) {
    int32_t c = lexer->lookahead;

    if (!triple && is_newline(c)) {
      // Unterminated single-line string; stop to avoid crossing lines
      return;
    }

    if (c == '"' ) {
      advance(lexer);
      if (triple) {
        if (lexer->lookahead == '"' ) {
          advance(lexer);
          if (lexer->lookahead == '"') {
            advance(lexer);
            lexer->mark_end(lexer);
            return;
          }
        }
      } else {
        lexer->mark_end(lexer);
        return;
      }
      lexer->mark_end(lexer);
      continue;
    }

    if (!is_raw && c == '\\') {
      advance(lexer);
      if (lexer->eof(lexer)) {
        return;
      }
      advance(lexer); // consume escaped char
      lexer->mark_end(lexer);
      continue;
    }

    advance(lexer);
    lexer->mark_end(lexer);
  }
}

static bool scan_macro_arg(ScannerState *state, TSLexer *lexer, const bool *valid_symbols) {
  // Skip leading blanks
  while (is_blank(lexer->lookahead)) {
    skip(lexer);
  }

  // If we're at the start of a raw identifier (e.g., #load:)
  // and labels are valid here, don't treat this as a macro
  // argument. Let the normal lexer parse it as a label or
  // raw_identifier instead.
  if (lexer->lookahead == '#' && valid_symbols[LABEL_TOKEN]) {
    return false;
  }
  
  // Mark initial position (for empty args)
  lexer->mark_end(lexer);

  uint32_t paren_depth = 0;
  uint32_t bracket_depth = 0;
  bool has_content = false;
  bool pending_spaces = false;  // Track if we have spaces that might be trailing

  for (;;) {
    int32_t c = lexer->lookahead;
    if (lexer->eof(lexer)) {
      if (has_content) {
        lexer->result_symbol = MACRO_ARG;
        return true;
      }
      // No content and EOF - emit end marker
      state->in_raw_macro_mode = false;
      lexer->result_symbol = MACRO_ARG_END;
      return true;
    }

    if (c == ',' && paren_depth == 0 && bracket_depth == 0) {
      // End of this argument
      if (has_content) {
        lexer->result_symbol = MACRO_ARG;
        return true;
      }
      // No content before comma - let grammar handle comma
      return false;
    }

    if (is_newline(c)) {
      if (has_content) {
        lexer->result_symbol = MACRO_ARG;
        return true;
      }
      // No content and newline - emit end marker
      state->in_raw_macro_mode = false;
      lexer->result_symbol = MACRO_ARG_END;
      return true;
    }

    switch (c) {
      case ';':
        skip_line_comment(lexer);
        continue;
      case '/':
        advance(lexer);
        if (lexer->lookahead == '*') {
          skip_block_comment(lexer);
          continue;
        }
        // Not a comment; part of content
        has_content = true;
        pending_spaces = false;
        lexer->mark_end(lexer);
        continue;
      case '\\':
        advance(lexer); // consume '\'
        if (lexer->eof(lexer)) {
          has_content = true;
          pending_spaces = false;
          lexer->mark_end(lexer);
          return true;
        }
        while (is_blank(lexer->lookahead)) {
          skip(lexer);
        }
        if (lexer->lookahead == '\r') {
          skip(lexer);
        }
        if (lexer->lookahead == '\n') {
          skip(lexer);
          continue;
        }
        if (!lexer->eof(lexer)) {
          advance(lexer); // consume escaped character
        }
        has_content = true;
        pending_spaces = false;
        lexer->mark_end(lexer);
        continue;
      case '(':
        paren_depth++;
        advance(lexer);
        has_content = true;
        pending_spaces = false;
        lexer->mark_end(lexer);
        continue;
      case ')':
        if (paren_depth > 0) {
          paren_depth--;
        }
        advance(lexer);
        has_content = true;
        pending_spaces = false;
        lexer->mark_end(lexer);
        continue;
      case '[':
        bracket_depth++;
        advance(lexer);
        has_content = true;
        pending_spaces = false;
        lexer->mark_end(lexer);
        continue;
      case ']':
        if (bracket_depth > 0) {
          bracket_depth--;
        }
        advance(lexer);
        has_content = true;
        pending_spaces = false;
        lexer->mark_end(lexer);
        continue;
      case '#':
        if (lexer->lookahead == '#') {
          // fallthrough normal
        }
        {
          advance(lexer);
          if (lexer->lookahead == '"') {
            read_string_like(lexer, true, &has_content);
            pending_spaces = false;
            lexer->mark_end(lexer);
            continue;
          }
          has_content = true;
          pending_spaces = false;
          lexer->mark_end(lexer);
          continue;
        }
      case '"':
        read_string_like(lexer, false, &has_content);
        pending_spaces = false;
        lexer->mark_end(lexer);
        continue;
      case '\'':
        // Consume character literal: 'x' or '\n'
        advance(lexer); // consume opening
        if (!lexer->eof(lexer)) {
          if (lexer->lookahead == '\\') {
            advance(lexer);
            if (!lexer->eof(lexer)) {
              advance(lexer);
            }
          } else {
            advance(lexer);
          }
        }
        if (!lexer->eof(lexer) && lexer->lookahead == '\'') {
          advance(lexer);
        }
        has_content = true;
        pending_spaces = false;
        lexer->mark_end(lexer);
        continue;
      default:
        if (is_blank(c)) {
          // Space might be internal or trailing - don't mark_end yet
          advance(lexer);
          pending_spaces = true;
          continue;
        }
        // Non-space character: mark previous position and this one
        advance(lexer);
        has_content = true;
        pending_spaces = false;
        lexer->mark_end(lexer);
        continue;
    }
  }
}

static bool scan_raw_macro_mode(ScannerState *state, TSLexer *lexer, const bool *valid_symbols) {
  if (!valid_symbols[RAW_MACRO_MODE]) return false;

  // Skip blanks/comments, but do NOT cross newline
  int32_t c;
  do {
    c = lexer->lookahead;
    if (c == ';') {
      // Skip line comment to newline
      skip_line_comment(lexer);
      c = lexer->lookahead;
    } else if (c == '/') {
      // Check for block comment start
      advance(lexer);
      if (lexer->lookahead == '*') {
        skip_block_comment(lexer);
        c = lexer->lookahead;
      } else {
        // Not a block comment - treat as regular content
        // This indicates RAW mode should be enabled
        break;
      }
    } else if (c == ' ' || c == '\t') {
      skip(lexer);
      c = lexer->lookahead;
    } else {
      break;
    }
  } while (!lexer->eof(lexer));

  if (c == '\n' || c == '\r' || lexer->eof(lexer)) {
    // No trailing content: this macro call has no args → let the
    // expression/no-args variant handle it
    return false;
  }

  // String-leading heuristic: If the first non-comment token is a string, 
  // use expression-style arguments for more robust parsing
  if (c == '"') {
    // This looks like an expression-style string argument
    return false;
  }

  // There is trailing content: enable RAW mode
  state->in_raw_macro_mode = true;
  lexer->result_symbol = RAW_MACRO_MODE;
  return true;
}

bool tree_sitter_rgbasm_external_scanner_scan(void *payload, TSLexer *lexer,
                                               const bool *valid_symbols) {
  ScannerState *state = (ScannerState *)payload;
  
  while (is_blank(lexer->lookahead)) {
    skip(lexer);
  }

  // First, try label / register / opcode / symbol
  if (is_identifier_start(lexer->lookahead)) {
    if (scan_identifier_token(lexer, valid_symbols)) {
      return true;
    }
  }

  // RAW macro mode toggle (only when requested by the grammar)
  if (valid_symbols[RAW_MACRO_MODE]) {
    if (scan_raw_macro_mode(state, lexer, valid_symbols)) {
      return true;
    }
  }

  // Raw macro arguments, only if RAW mode is active
  if (state->in_raw_macro_mode &&
      (valid_symbols[MACRO_ARG] || valid_symbols[MACRO_ARG_END])) {
    return scan_macro_arg(state, lexer, valid_symbols);
  }

  return false;
}
