#include "tree_sitter/parser.h"
#include <wctype.h>
#include <stdbool.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

enum TokenType {
  SYMBOL_TOKEN,               // Identifier immediately followed by : (no space)
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

// Reserved directive / block keywords that should NOT be treated as
// generic identifiers by the external scanner. These are handled by
// the main grammar (directive_keyword, def_directive, if_block, etc.).
static bool is_reserved_word(const char *name, size_t len) {
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

  const size_t count = sizeof(reserved) / sizeof(reserved[0]);
  const size_t max_len = strlen(reserved[count - 1]);
  if (len == 0 || len >= max_len) {
    return false;
  }

  char upper[32];
  for (size_t i = 0; i < len; i++) {
    char c = name[i];
    c = (c >= 'a' && c <= 'z') ? (char)(c - 32) : c;
    if (c < 'A' || c > 'Z') {
      return false;
    }
    upper[i] = c;
  }
  upper[len] = '\0';

  for (size_t i = 0; i < count; i++) {
    const char *kw = reserved[i];
    const size_t kw_len = strlen(kw);
    if (kw_len > len) {
      break;
    }
    if (strlen(kw) == len && memcmp(upper, kw, len) == 0) {
      return true;
    }
  }

  return false;
}

// Scan an identifier and determine if it's a non-reserved symbol
static bool scan_symbol_token(TSLexer *lexer, const bool *valid_symbols) {
  // Must start with valid identifier start character
  if (!is_identifier_start(lexer->lookahead)) {
    return false;
  }

  // Scan the identifier into a buffer
  size_t len = 0;
  char name[32];
  while (is_identifier_char(lexer->lookahead) && len < sizeof(name) - 1) {
    name[len++] = (char)lexer->lookahead;
    advance(lexer);
  }
  
  name[len] = '\0';

  // Check what follows the identifier
  int32_t next = lexer->lookahead;

  // Mark end of token BEFORE checking conditions
  lexer->mark_end(lexer);

  // Don't produce SYMBOL_TOKEN if:
  // 1. Followed by '{' - this is part of interpolatable_identifier
  // 2. It's a reserved word - let grammar's keyword rules handle it
  if (next == '{' || is_reserved_word(name, len)) {
    return false;
  }

  // Not reserved, not interpolation - produce SYMBOL_TOKEN
  lexer->result_symbol = SYMBOL_TOKEN;
  return true;
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


bool tree_sitter_rgbasm_external_scanner_scan(void *payload, TSLexer *lexer,
                                               const bool *valid_symbols) {
  ScannerState *state = (ScannerState *)payload;
  
  while (is_blank(lexer->lookahead)) {
    skip(lexer);
  }

  // Try to match symbol token
  if (valid_symbols[SYMBOL_TOKEN] && scan_symbol_token(lexer, valid_symbols)) {
    return true;
  }

  return false;
}
