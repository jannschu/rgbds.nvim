#include "tree_sitter/parser.h"
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <wctype.h>

#define MAX_IDENTIFIER_LENGTH 255
#define DEBUG_SCANNER 0

enum TokenType {
  SYMBOL_TOKEN,
  RAW_SYMBOL_TOKEN,
  LOCAL_SYMBOL_TOKEN,
  SYMBOL_FRAGMENT_TOKEN,

  IDENTIFIER_BOUNDARY_TOKEN,

  // Looking ahead for start of identifiers, which need considerable
  // lookahead information
  GLOBAL_SYMBOL_BEGIN,
  LOCAL_SYMBOL_BEGIN,
  QUALIFIED_LOCAL_SYMBOL_BEGIN,

  FORMAT_SPEC,

  // End of line: physical newline, or synthetic (before ']]', at EOF)
  EOL_TOKEN,

  // A LOAD _may_ be ended by each of the following:
  // - <eof>
  // - ENDL token
  //
  // Additionally, the following tokens of other section related blocks
  // will also implicitly end a LOAD block:
  // - ENDSECTION
  // - SECTION
  // - POPS
  LOAD_END_TOKEN,
  ERROR,
};

void *tree_sitter_rgbasm_external_scanner_create() { return NULL; }

void tree_sitter_rgbasm_external_scanner_destroy(void *payload) {}

unsigned tree_sitter_rgbasm_external_scanner_serialize(void *payload,
                                                       char *buffer) {
  return 0;
}

void tree_sitter_rgbasm_external_scanner_deserialize(void *payload,
                                                     const char *buffer,
                                                     unsigned length) {}

static inline bool is_identifier_char(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '#' || c == '@' || c == '$';
}

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

static inline bool is_blank(int32_t c) { return c == ' ' || c == '\t'; }

static inline bool is_identifier_start(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
}

static inline bool is_identifier_boundary(int32_t c) {
  return !is_identifier_char(c) && c != '{' && c != '.';
}

static inline int matches_any(const char *input, size_t len,
                              const char *const *words, size_t count) {
  for (size_t i = 0; i < count; i++) {
    const char *kw = words[i];
    const size_t kw_len = strlen(kw);
    if (kw_len > len) {
      break;
    }
    if (strlen(kw) == len && memcmp(input, kw, len) == 0) {
      return (int)i;
    }
  }
  return -1;
}

// Reserved directive / block keywords that should NOT be treated as
// generic identifiers by the external scanner. These are handled by
// the main grammar (directive_keyword, def_directive, if_block, etc.).
static bool is_reserved_word(const char *name, size_t len) {
  static const char *const constants[] = {
      "@",
      ".",
      "..",
      "_RS",
      "_NARG",
      "__SCOPE__",
      "__UTC_DAY__",
      "__UTC_HOUR__",
      "__RGBDS_RC__",
      "__UTC_YEAR__",
      "__UTC_MONTH__",
      "__UTC_MINUTE__",
      "__UTC_SECOND__",
      "__RGBDS_MAJOR__",
      "__RGBDS_MINOR__",
      "__RGBDS_PATCH__",
      "__ISO_8601_UTC__",
      "__RGBDS_VERSION__",
      "__ISO_8601_LOCAL__",
  };

  static const char *const reserved[] = {
      // 1
      "A", "B", "C", "D", "E", "H", "L", "Z",
      // 2
      "AF", "BC", "CP", "DB", "DE", "DI", "DL", "DS", "DW", "EI", "HL", "IF",
      "JP", "JR", "LD", "NC", "NZ", "OR", "RB", "RL", "RR", "RW", "SP",
      // 3
      "ADC", "ADD", "AND", "BIT", "CCF", "COS", "CPL", "DAA", "DEC", "DEF",
      "DIV", "EQU", "FOR", "HLD", "HLI", "INC", "LDD", "LDH", "LDI", "LOG",
      "LOW", "MUL", "NOP", "OAM", "OPT", "POP", "POW", "RES", "RET", "RLA",
      "RLC", "RRA", "RRC", "RST", "SBC", "SCF", "SET", "SIN", "SLA", "SRA",
      "SRL", "SUB", "TAN", "XOR",
      // 4
      "ACOS", "ASIN", "ATAN", "BANK", "CALL", "CEIL", "ELIF", "ELSE", "ENDC",
      "ENDL", "ENDM", "ENDR", "ENDU", "EQUS", "FAIL", "FMOD", "HALT", "HIGH",
      "HRAM", "LOAD", "POPC", "POPO", "POPS", "PUSH", "REPT", "RETI", "RLCA",
      "ROM0", "ROMX", "RRCA", "SRAM", "STOP", "SWAP", "VRAM", "WARN",
      // 5
      "ALIGN", "ATAN2", "BREAK", "FATAL", "FLOOR", "MACRO", "NEXTU", "PRINT",
      "PURGE", "PUSHC", "PUSHO", "PUSHS", "REDEF", "ROUND", "RSSET", "SHIFT",
      "STRIN", "UNION", "WRAM0", "WRAMX",
      // 6
      "ASSERT", "EXPORT", "INCBIN", "SIZEOF", "STRCAT", "STRCMP", "STRFMT",
      "STRLEN", "STRLWR", "STRRIN", "STRRPL", "STRSUB", "STRUPR",
      // 7
      "BYTELEN", "CHARCMP", "CHARLEN", "CHARMAP", "CHARSUB", "CHARVAL",
      "INCLUDE", "ISCONST", "PRINTLN", "REVCHAR", "RSRESET", "SECTION",
      // 8
      "STARTOF", "STRBYTE", "STRCHAR", "STRFIND", "TZCOUNT",
      // 9
      "BITWIDTH", "CHARSIZE", "FRAGMENT", "READFILE", "STRRFIND",
      // 10+
      "STRSLICE", "INCHARMAP", "ENDSECTION", "NEWCHARMAP", "SETCHARMAP",
      "STATIC_ASSERT"};

  if (matches_any(name, len, constants,
                  sizeof(constants) / sizeof(constants[0])) != -1) {
    return true;
  }

  const size_t count = sizeof(reserved) / sizeof(reserved[0]);
  const size_t max_len = strlen(reserved[count - 1]);
  if (len == 0 || len > max_len) {
    return false;
  }

  char upper[MAX_IDENTIFIER_LENGTH + 1];
  for (size_t i = 0; i < len; i++) {
    char c = name[i];
    c = (c >= 'a' && c <= 'z') ? (char)(c - 32) : c;
    if (!(c >= 'A' || c <= 'Z') && !(c >= '0' || c <= '9') && c != '_') {
      return false;
    }
    upper[i] = c;
  }
  upper[len] = '\0';

  return matches_any(upper, len, reserved, count) != -1;
}

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

static inline bool is_format_char(int32_t c) {
  return (c == 'd' || c == 'u' || c == 'x' || c == 'X' || c == 'b' ||
          c == 'o' || c == 'f' || c == 's');
}

static inline bool scan_format_spec(TSLexer *lexer) {
  if (lexer->lookahead == '+' || lexer->lookahead == ' ') {
    advance(lexer);
  }
  if (lexer->lookahead == '#') {
    advance(lexer);
  }
  do {
    advance(lexer);
  } while (lexer->lookahead >= '0' && lexer->lookahead <= '9');
  if (lexer->lookahead == 'q') {
    advance(lexer);
    int digits = 0;
    do {
      advance(lexer);
      digits += 1;
    } while (lexer->lookahead >= '0' && lexer->lookahead <= '9');
    if (digits == 0) {
      return false;
    }
  }
  if (is_format_char(lexer->lookahead)) {
    advance(lexer);
  }
  if (lexer->lookahead == ':') {
    lexer->mark_end(lexer);
    lexer->result_symbol = FORMAT_SPEC;
    return true;
  }
  return false;
}

// Scan an identifier and classify as SYMBOL, LOCAL, or LABEL
static bool scan_identifier_token(TSLexer *lexer, const bool *valid_symbols) {
  char start = lexer->lookahead;
  if (start == '+' || start == ' ' || start == '-' ||
      (start >= '0' && start <= '9')) {
    return scan_format_spec(lexer);
  }
  bool raw = false;
  bool local = is_identifier_char(start);
  bool symbol = is_identifier_start(start);

  if (!symbol) {
    // could still be raw or local
    if (local) {
      raw = (lexer->lookahead == '#');
      advance(lexer);
    } else {
      return false;
    }
  }

  if (raw && (start == '-' || (start >= '0' && start <= '9'))) {
    return scan_format_spec(lexer);
  }

  if (!symbol && !local && !raw) {
    return false;
  }

  // Scan the identifier into a buffer
  size_t len = 0;
  char name[MAX_IDENTIFIER_LENGTH + 1];
  while (is_identifier_char(lexer->lookahead) && len < sizeof(name) - 1) {
    char c = (char)lexer->lookahead;
    name[len++] = c;
    advance(lexer);
  }
  name[len] = '\0';

#if DEBUG_SCANNER
  printf("# Scanned identifier: '%s' (len=%zu), symbol=%d, local=%d, raw=%d\n",
         name, len, symbol, local, raw);
#endif

  // Check what follows the identifier
  int32_t next = lexer->lookahead;

  if (valid_symbols[FORMAT_SPEC] && len == 1 && next == ':' &&
      is_format_char(name[0])) {
    lexer->mark_end(lexer);
    lexer->result_symbol = FORMAT_SPEC;
    return true;
  }

  // we do not want to include the potential \@
  lexer->mark_end(lexer);
  const bool had_affix = swallow_uniqueness_affix(lexer);
  if (had_affix) {
    next = lexer->lookahead;
  }
  if (valid_symbols[SYMBOL_FRAGMENT_TOKEN]) {
    // if local symbol is also valid here, we prefer it
    if (valid_symbols[LOCAL_SYMBOL_TOKEN] && local && next != '{') {
      lexer->result_symbol = LOCAL_SYMBOL_TOKEN;
    } else {
      lexer->result_symbol = SYMBOL_FRAGMENT_TOKEN;
    }
    return true;
  }
  // only fragments are allowed before interpolation
  if (next == '{') {
    return false;
  }
  // presence of an affix means this is no longer a reserved word
  const bool reserved = symbol && !had_affix && is_reserved_word(name, len);
  if (reserved) {
    symbol = false;
#if DEBUG_SCANNER
    printf("  Identifier is a reserved word: '%s'\n", name);
#endif
  }

#if DEBUG_SCANNER
  printf("# Identifier classification: symbol=%d, local=%d, raw=%d\n", symbol,
         local, raw);
#endif

  if (raw) {
    if (valid_symbols[RAW_SYMBOL_TOKEN]) {
      lexer->result_symbol = SYMBOL_TOKEN;
      return true;
    }
    return false;
  } else if (symbol) {
    if (valid_symbols[SYMBOL_TOKEN]) {
      lexer->result_symbol = SYMBOL_TOKEN;
      return true;
    }
    return false;
  } else if (local) {
    if (valid_symbols[LOCAL_SYMBOL_TOKEN]) {
      lexer->result_symbol = LOCAL_SYMBOL_TOKEN;
      return true;
    }
    return false;
  }

  return false;
}

static bool scan_identifier_start(TSLexer *lexer, const bool *valid_symbols) {
  lexer->mark_end(lexer);
  bool raw = lexer->lookahead == '#';
  if (raw) {
    advance(lexer);
  }
  size_t interpolation = 0;
  bool interpolated = false;
  size_t len = 0;
  char name[MAX_IDENTIFIER_LENGTH + 1];
  int dot = -1;

  while (interpolation > 0 || is_identifier_char(lexer->lookahead) ||
         lexer->lookahead == '.' || lexer->lookahead == '{') {
    int32_t c = lexer->lookahead;
    name[len] = (char)c;
    if (c == '{') {
      interpolation += 1;
      interpolated = true;
    } else if (interpolation > 0) {
      if (c == '}') {
        interpolation -= 1;
      }
      if (c == '\r' || c == '\n' || c == '\0') {
        // unterminated interpolation
        return false;
      }
    } else if (c == '.') {
      if (dot != -1) {
        // multiple dots not allowed
        return false;
      }
      dot = (int)len;
    } else if (len == 0 && !is_identifier_start(c)) {
      return false;
    }
    advance(lexer);
    len += 1;
  }
  if (len == 0) {
    return false;
  }
  if (raw && dot == 0) {
    // raw local symbol cannot start with #
    return false;
  }
  if (dot == 0) {
    // local symbol
    if (valid_symbols[LOCAL_SYMBOL_BEGIN]) {
      lexer->result_symbol = LOCAL_SYMBOL_BEGIN;
      return true;
    }
    return false;
  } else if (dot > 0) {
    // qualified local symbol
    if (valid_symbols[QUALIFIED_LOCAL_SYMBOL_BEGIN]) {
      lexer->result_symbol = QUALIFIED_LOCAL_SYMBOL_BEGIN;
      return true;
    }
    return false;
  } else {
    if (!raw && !interpolated && is_reserved_word(name, len)) {
      if (valid_symbols[LOAD_END_TOKEN]) {
        const size_t match = matches_any(
            name, len,
            (const char *const[]){"ENDL", "SECTION", "ENDSECTION", "POPS"}, 4);
        if (match != -1) {
          lexer->result_symbol = LOAD_END_TOKEN;
          // if ENDL, consume it
          if (match == 0) {
            lexer->mark_end(lexer);
          }
          return true;
        }
      }

      const bool had_affix = swallow_uniqueness_affix(lexer);
      if (!had_affix) {
        // reserved word cannot be global symbol
        return false;
      }
    }
    // global symbol
    if (valid_symbols[GLOBAL_SYMBOL_BEGIN]) {
      lexer->result_symbol = GLOBAL_SYMBOL_BEGIN;
      return true;
    }
    return false;
  }
}

static bool scan(TSLexer *lexer, const bool *valid_symbols) {
  if (valid_symbols[IDENTIFIER_BOUNDARY_TOKEN]) {
    if (is_identifier_boundary(lexer->lookahead)) {
      lexer->mark_end(lexer);
      lexer->result_symbol = IDENTIFIER_BOUNDARY_TOKEN;
      return true;
    }
  }

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

  if (valid_symbols[GLOBAL_SYMBOL_BEGIN] || valid_symbols[LOCAL_SYMBOL_BEGIN] ||
      valid_symbols[QUALIFIED_LOCAL_SYMBOL_BEGIN] ||
      valid_symbols[LOAD_END_TOKEN]) {
    if (scan_identifier_start(lexer, valid_symbols)) {
      return true;
    }
  } else if ((valid_symbols[SYMBOL_TOKEN] || valid_symbols[RAW_SYMBOL_TOKEN] ||
              valid_symbols[LOCAL_SYMBOL_TOKEN] ||
              valid_symbols[SYMBOL_FRAGMENT_TOKEN] ||
              valid_symbols[FORMAT_SPEC]) &&
             scan_identifier_token(lexer, valid_symbols)) {
    return true;
  }

  return false;
}

bool tree_sitter_rgbasm_external_scanner_scan(void *payload, TSLexer *lexer,
                                              const bool *valid_symbols) {
#if DEBUG_SCANNER
  printf("# External scanner invoked. Lookahead: '%c' (0x%02X) ",
         (lexer->lookahead >= 32 && lexer->lookahead <= 126)
             ? (char)lexer->lookahead
             : '?',
         (unsigned int)lexer->lookahead);
  // Print valid symbols presence by lower and upper case
  printf(" Valid symbols: ");
  printf("%c", valid_symbols[SYMBOL_TOKEN] ? 'S' : '.');
  printf("%c", valid_symbols[RAW_SYMBOL_TOKEN] ? 'R' : '.');
  printf("%c", valid_symbols[LOCAL_SYMBOL_TOKEN] ? 'L' : '.');
  printf("%c", valid_symbols[SYMBOL_FRAGMENT_TOKEN] ? 'F' : '.');

  printf("m%c", valid_symbols[IDENTIFIER_BOUNDARY_TOKEN] ? 'B' : '.');
  printf("%c", valid_symbols[GLOBAL_SYMBOL_BEGIN] ? 'G' : '.');
  printf("%c", valid_symbols[LOCAL_SYMBOL_BEGIN] ? 'l' : '.');
  printf("%c ", valid_symbols[QUALIFIED_LOCAL_SYMBOL_BEGIN] ? 'Q' : '.');

  printf("%c ", valid_symbols[FORMAT_SPEC] ? 'T' : '.');

  printf("%c", valid_symbols[EOL_TOKEN] ? 'E' : '.');
  printf("%c", valid_symbols[LOAD_END_TOKEN] ? 'e' : '.');
  printf("\n");

  if (valid_symbols[ERROR]) {
    printf("  => error sentinel\n");
    return false;
  }
#endif

  bool result = scan(lexer, valid_symbols);

#if DEBUG_SCANNER
  char *symbol = "<none>";
  if (result) {
    switch (lexer->result_symbol) {
    case SYMBOL_TOKEN:
      symbol = "S";
      break;
    case RAW_SYMBOL_TOKEN:
      symbol = "R";
      break;
    case LOCAL_SYMBOL_TOKEN:
      symbol = "L";
      break;
    case SYMBOL_FRAGMENT_TOKEN:
      symbol = "F";
      break;
    case IDENTIFIER_BOUNDARY_TOKEN:
      symbol = "B";
      break;
    case GLOBAL_SYMBOL_BEGIN:
      symbol = "G";
      break;
    case LOCAL_SYMBOL_BEGIN:
      symbol = "l";
      break;
    case QUALIFIED_LOCAL_SYMBOL_BEGIN:
      symbol = "Q";
      break;
    case FORMAT_SPEC:
      symbol = "T";
      break;
    case EOL_TOKEN:
      symbol = "E";
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
