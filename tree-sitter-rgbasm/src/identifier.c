#define MAX_IDENTIFIER_LENGTH 20

static inline bool is_identifier_char(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == '#' || c == '@' || c == '$';
}

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
