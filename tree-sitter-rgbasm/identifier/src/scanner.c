#include "tree_sitter/alloc.h"
#include "tree_sitter/parser.h"
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <wctype.h>

#include "../../src/identifier.c"

#define DEBUG_SCANNER 0

enum TokenType {
  IDENTIFIER,
  ERROR,
};

void *tree_sitter_rgbasm_identifier_external_scanner_create() { return NULL; }

void tree_sitter_rgbasm_identifier_external_scanner_destroy(void *payload) {}

unsigned
tree_sitter_rgbasm_identifier_external_scanner_serialize(void *payload,
                                                         char *buffer) {
  return 0;
}

void tree_sitter_rgbasm_identifier_external_scanner_deserialize(
    void *payload, const char *buffer, unsigned length) {}

static bool scan_identifier(TSLexer *lexer) {
  if (!is_identifier_start(lexer->lookahead)) {
    return false;
  }
  char name[MAX_IDENTIFIER_LENGTH + 1];
  size_t len = 0;
  while (is_identifier_char(lexer->lookahead)) {
    if (len < MAX_IDENTIFIER_LENGTH) {
      name[len++] = (char)lexer->lookahead;
    }
    lexer->advance(lexer, false);
  }
  const bool valid =
      len > MAX_IDENTIFIER_LENGTH || !is_reserved_word(name, len);
  // printf("scanned identifier: %.*s (%s)\n", (int)len, name,
  //        valid ? "ok" : "reserved");
  return valid && lexer->lookahead != ':';
}

static bool scan(TSLexer *lexer, const bool *valid_symbols) {
  if (valid_symbols[ERROR]) {
    lexer->result_symbol = ERROR;
    return true;
  }

  if (valid_symbols[IDENTIFIER] && scan_identifier(lexer)) {
    lexer->result_symbol = IDENTIFIER;
    return true;
  }

  return false;
}

bool tree_sitter_rgbasm_identifier_external_scanner_scan(
    void *payload, TSLexer *lexer, const bool *valid_symbols) {
  const bool result = scan(lexer, valid_symbols);
  // printf("scanner result: %d, %d\n", result, lexer->result_symbol);
  return result;
}
