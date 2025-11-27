#include "tree_sitter/parser.h"
#include <wctype.h>
#include <stdbool.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#define MAX_IDENTIFIER_LENGTH 255

enum TokenType {
  // Non-reserved identifier, neither a label nor a keyword.
  SYMBOL_TOKEN,
  // Global label ends with ':', e.g. "Start:"
  LABEL_TOKEN,
  // Local label with a dot, e.g. "Start.loop" or ".loop"
  LOCAL_TOKEN,
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

void *tree_sitter_rgbasm_external_scanner_create() {
  return NULL;
}

void tree_sitter_rgbasm_external_scanner_destroy(void *payload) { }

unsigned tree_sitter_rgbasm_external_scanner_serialize(void *payload, char *buffer) {
  return 0;
}

void tree_sitter_rgbasm_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) { }

static inline bool is_identifier_char(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '.' ||
         c == '#' || c == '@' || c == '$';
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

static inline bool is_identifier_start(int32_t c) {
  // Include '.' for local labels (.loop, .local, etc.)
  // '#' is still reserved for raw identifiers handled by internal lexer
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         c == '_' || c == '.';
}

static inline int matches_any(const char *input, size_t len, const char *const *words, size_t count) {
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
    "AF", "BC", "CP", "DB", "DE", "DI", "DL", "DS", "DW", "EI", 
    "HL", "IF", "JP", "JR", "LD", "NC", "NZ", "OR", "RB", "RL", 
    "RR", "RW", "SP", 
    // 3
    "ADC", "ADD", "AND", "BIT", "CCF", "COS", "CPL", "DAA", "DEC",
    "DEF", "DIV", "EQU", "FOR", "HLD", "HLI", "INC", "LDD", "LDH",
    "LDI", "LOG", "LOW", "MUL", "NOP", "OAM", "OPT", "POP", "POW",
    "RES", "RET", "RLA", "RLC", "RRA", "RRC", "RST", "SBC", "SCF", 
    "SET", "SIN", "SLA", "SRA", "SRL", "SUB", "TAN", "XOR", 
    // 4
    "ACOS", "ASIN", "ATAN", "BANK", "CALL", "CEIL", "ELIF", "ELSE", 
    "ENDC", "ENDL", "ENDM", "ENDR", "ENDU", "EQUS", "FAIL", "FMOD", 
    "HALT", "HIGH", "HRAM", "LOAD", "POPC", "POPO", "POPS", "PUSH",
    "REPT", "RETI", "RLCA", "ROM0", "ROMX", "RRCA", "SRAM", "STOP", 
    "SWAP", "VRAM", "WARN", 
    // 5
    "ALIGN", "ATAN2", "BREAK", "FATAL", "FLOOR", "MACRO", "NEXTU", 
    "PRINT", "PURGE", "PUSHC", "PUSHO", "PUSHS", "REDEF", "ROUND", 
    "RSSET", "SHIFT", "STRIN", "UNION", "WRAM0", "WRAMX",
    // 6
    "ASSERT", "EXPORT", "INCBIN", "SIZEOF", "STRCAT", "STRCMP", 
    "STRFMT", "STRLEN", "STRLWR", "STRRIN", "STRRPL", "STRSUB",
    "STRUPR", 
    // 7
    "BYTELEN", "CHARCMP", "CHARLEN", "CHARMAP", "CHARSUB", "CHARVAL", 
    "INCLUDE", "ISCONST", "PRINTLN", "REVCHAR", "RSRESET", "SECTION", 
    // 8
    "STARTOF", "STRBYTE", "STRCHAR", "STRFIND", "TZCOUNT", 
    // 9
    "BITWIDTH", "CHARSIZE", "FRAGMENT", "READFILE", "STRRFIND", 
    // 10+
    "STRSLICE", 
    "INCHARMAP", 
    "ENDSECTION", 
    "NEWCHARMAP", 
    "SETCHARMAP", "STATIC_ASSERT"
  };

  if (matches_any(name, len, constants, sizeof(constants) / sizeof(constants[0])) != -1) {
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

// Scan an identifier and classify as SYMBOL, LOCAL, or LABEL
static bool scan_identifier_token(TSLexer *lexer, const bool *valid_symbols) {
  // Must start with valid identifier start character
  if (!is_identifier_start(lexer->lookahead)) {
    return false;
  }

  lexer->mark_end(lexer);

  // Track dot state
  bool has_dot = false;
  // Scan the identifier into a buffer
  size_t len = 0;
  char name[MAX_IDENTIFIER_LENGTH + 1];
  while (is_identifier_char(lexer->lookahead) && len < sizeof(name) - 1) {
    char c = (char)lexer->lookahead;
    name[len++] = c;

    if (c == '.') {
      if (has_dot) {
        return false;
      }
      has_dot = true;
    }

    advance(lexer);
  }
  name[len] = '\0';

  // Check what follows the identifier
  int32_t next = lexer->lookahead;

  // If followed by '{'  this is part of interpolatable_identifier
  if (next == '{') {
    return false;
  }

  bool marked = false;
  if (next == '\\') {
    // this will not become a LOAD_END_TOKEN
    // and we do not want to include the potential \@
    lexer->mark_end(lexer);
    marked = true;
  }
  const bool had_affix = swallow_uniqueness_affix(lexer);
  if (had_affix) {
    next = lexer->lookahead;
  }
  if (!had_affix && is_reserved_word(name, len)) {
    // Check if we might scan a LOAD_END_TOKEN
    if (valid_symbols[LOAD_END_TOKEN]) {
      const size_t match = matches_any(
        name,
        len, 
        (const char *const[]){"ENDL", "SECTION", "ENDSECTION", "POPS"}, 
        4
      );
      if (match != -1) {
        lexer->result_symbol = LOAD_END_TOKEN;
        // if ENDL, consume it
        if (match == 0) {
          lexer->mark_end(lexer);
        }
        return true;
      }
    }
    return false;
  }

  if (!marked) {
    lexer->mark_end(lexer);
  }
  
  // Classify token based on RGBDS rules
  if (has_dot) {
    // Contains dot(s) → LOCAL_TOKEN (can be label without colon)
    if (valid_symbols[LOCAL_TOKEN]) {
      lexer->result_symbol = LOCAL_TOKEN;
      return true;
    }
    return false;
  } else if (next == ':') {
    if (valid_symbols[LABEL_TOKEN]) {
      // No dots, followed by colon → LABEL_TOKEN (colon not included)
      lexer->result_symbol = LABEL_TOKEN;
      return true;
    }
    return false;
  } else {
    // No dots, not followed by colon → SYMBOL_TOKEN
    if (valid_symbols[SYMBOL_TOKEN]) {
      lexer->result_symbol = SYMBOL_TOKEN;
      return true;
    }
    return false;
  }
}

bool tree_sitter_rgbasm_external_scanner_scan(void *payload, TSLexer *lexer,
                                               const bool *valid_symbols) {
  if (valid_symbols[ERROR]) {
    return false;
  }

  while (is_blank(lexer->lookahead)) {
    skip(lexer);
  }

  // Check for EOL token: newline, EOF, or before ]]
  if (valid_symbols[EOL_TOKEN]) {
    // Mark end position FIRST (like tree-sitter-javascript automatic semicolon)
    lexer->mark_end(lexer);
    lexer->result_symbol = EOL_TOKEN;

    if (lexer->eof(lexer)) {
      return false;
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

  // Try to match identifier token (symbol, local, or label)
  if ((valid_symbols[SYMBOL_TOKEN] ||
       valid_symbols[LOCAL_TOKEN] ||
       valid_symbols[LOAD_END_TOKEN] ||
       valid_symbols[LABEL_TOKEN]) &&
      scan_identifier_token(lexer, valid_symbols)) {
    return true;
  }

  return false;
}
