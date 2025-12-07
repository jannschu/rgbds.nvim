/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

function _top_level_statements($) {
  return seq(
    // we allow statements outside sections/labels
    // to support macro generated code we can not see and files that are included
    repeat($._statement),
    repeat(alias($.qualified_label_block, $.local_label_block)),
    repeat($.local_label_block),
    repeat($.global_label_block),
    repeat(
      seq(
        $.section_block,
        optional(
          seq(
            $._section_trailer,
            repeat($._statement),
          ),
        ),
      ),
    ),
  );
}

const RESERVED = [
  "A", "B", "C", "D", "E", "H", "L", "Z",
  "AF", "BC", "CP", "DB", "DE", "DI", "DL", "DS", "DW", "EI", "HL", "IF",
  "JP", "JR", "LD", "NC", "NZ", "OR", "RB", "RL", "RR", "RW", "SP",
  "ADC", "ADD", "AND", "BIT", "CCF", "COS", "CPL", "DAA", "DEC", "DEF",
  "DIV", "EQU", "FOR", "HLD", "HLI", "INC", "LDD", "LDH", "LDI", "LOG",
  "LOW", "MUL", "NOP", "OAM", "OPT", "POP", "POW", "RES", "RET", "RLA",
  "RLC", "RRA", "RRC", "RST", "SBC", "SCF", "SET", "SIN", "SLA", "SRA",
  "SRL", "SUB", "TAN", "XOR",
  "ACOS", "ASIN", "ATAN", "BANK", "CALL", "CEIL", "ELIF", "ELSE", "ENDC",
  "ENDL", "ENDM", "ENDR", "ENDU", "EQUS", "FAIL", "FMOD", "HALT", "HIGH",
  "HRAM", "LOAD", "POPC", "POPO", "POPS", "PUSH", "REPT", "RETI", "RLCA",
  "ROM0", "ROMX", "RRCA", "SRAM", "STOP", "SWAP", "VRAM", "WARN",
  "ALIGN", "ATAN2", "BREAK", "FATAL", "FLOOR", "MACRO", "NEXTU", "PRINT",
  "PURGE", "PUSHC", "PUSHO", "PUSHS", "REDEF", "ROUND", "RSSET", "SHIFT",
  "STRIN", "UNION", "WRAM0", "WRAMX",
  "ASSERT", "EXPORT", "INCBIN", "SIZEOF", "STRCAT", "STRCMP", "STRFMT",
  "STRLEN", "STRLWR", "STRRIN", "STRRPL", "STRSUB", "STRUPR",
  "BYTELEN", "CHARCMP", "CHARLEN", "CHARMAP", "CHARSUB", "CHARVAL",
  "INCLUDE", "ISCONST", "PRINTLN", "REVCHAR", "RSRESET", "SECTION",
  "STARTOF", "STRBYTE", "STRCHAR", "STRFIND", "TZCOUNT",
  "BITWIDTH", "CHARSIZE", "FRAGMENT", "READFILE", "STRRFIND",
  "STRSLICE", "INCHARMAP", "ENDSECTION", "NEWCHARMAP", "SETCHARMAP",
  "STATIC_ASSERT",
];

const KW = Object.fromEntries(RESERVED.map(kw => [kw, ci(kw)]));

const MNEMONICS = [
  'ADC', 'ADD', 'AND', 'BIT', 'CALL', 'CCF', 'CP', 'CPL', 'DAA', 'DEC', 'DI',
  'EI', 'HALT', 'INC', 'JP', 'JR', 'LD', 'LDD', 'LDH', 'LDI', 'NOP', 'OR', 'POP',
  'PUSH', 'RES', 'RET', 'RETI', 'RL', 'RLA', 'RLC', 'RLCA', 'RR', 'RRA', 'RRC',
  'RRCA', 'RST', 'SBC', 'SCF', 'SET', 'SLA', 'SRA', 'SRL', 'STOP', 'SUB', 'SWAP', 'XOR',
];

module.exports = grammar({
  name: 'rgbasm',

  externals: $ => [
    $.identifier,
    $._peek_global,
    $._peek_local,
    $._peek_qualified,

    $._string_content,
    $._string_content_triple,

    // End-of-line token: injected before ']]' and at EOF
    $._eol,

    $._section_start,
    $._section_end_explicit,
    $._section_trailer,

    $._load_end,

    $._error_sentinel,
  ],

  conflicts: $ => [
    [$.condition_code, $.register],  // both accept 'C'
    [$.global_label_block],
    [$.local_label_block],
    [$.qualified_label_block],
  ],

  extras: $ => [
    $.inline_comment,
    $.block_comment,
    $.line_continuation,
    /[ \t\uFEFF\u2060]+/,
  ],

  supertypes: $ => [
    $.expression,
  ],

  inline: $ => [],

  word: $ => $.identifier,

  reserved: {
    global: $ => [$._constant, ...Object.values(KW)],
  },

  rules: {
    source_file: $ => _top_level_statements($),

    line_continuation: $ =>
      seq(
        field('char', '\\'),
        optional($.inline_comment),
        /\r?\n/,
      ),

    symbol: $ => /[A-Za-z_][A-Za-z0-9_#$@]*/,

    // ----- Reserved keywords -----

    instruction_name: $ => choice(...MNEMONICS.map(kw => KW[kw])),

    _dot: $ => token('.'),

    _constant: $ =>
      token(choice(
        '@', '..', '__SCOPE__', '_RS', '_NARG',
        '__ISO_8601_LOCAL__', '__ISO_8601_UTC__',
        '__UTC_YEAR__', '__UTC_MONTH__', '__UTC_DAY__', '__UTC_HOUR__',
        '__UTC_MINUTE__', '__UTC_SECOND__',
        '__RGBDS_MAJOR__', '__RGBDS_MINOR__', '__RGBDS_PATCH__', '__RGBDS_RC__',
        '__RGBDS_VERSION__',
      )),
    constant: $ => choice(
      $._constant,
      $._dot,
    ),

    register: $ => choice(KW.A, KW.B, KW.C, KW.D, KW.E, KW.H, KW.L, KW.AF, KW.BC, KW.DE, KW.HL, KW.SP),

    condition_code: $ => seq(
      optional('!'),
      field('condition', choice(KW.Z, KW.NZ, KW.C, KW.NC)),
    ),

    directive_keyword: $ =>
      choice(
        KW.ALIGN, KW.BREAK, KW.INCBIN, KW.PRINT, KW.PRINTLN, KW.PURGE, KW.READFILE, KW.DB, KW.DW, KW.DL,
        KW.SHIFT, KW.RSSET, KW.RSRESET, KW.NEWCHARMAP, KW.SETCHARMAP, KW.CHARMAP, KW.PUSHC, KW.POPC,
        KW.FAIL, KW.WARN, KW.FATAL
      ),

    section_type: $ =>
      choice(
        KW.ROM0, KW.ROMX, KW.VRAM, KW.SRAM,
        KW.WRAM0, KW.WRAMX, KW.OAM, KW.HRAM,
      ),

    severity: $ => choice(KW.FAIL, KW.WARN, KW.FATAL),

    // ----- Labels -----

    // Global label blocks: global label and its contents
    global_label_block: $ =>
      seq(
        $._global_label_header,
        repeat($._statement),
        repeat($.local_label_block),
      ),

    _global_label_header: $ =>
      seq(
        field('name', alias($.variable, $.global_symbol)),
        choice(token.immediate('::'), token.immediate(':')),
      ),

    // Local label blocks: local label and its contents
    local_label_block: $ =>
      seq(
        $._local_label_header,
        repeat($._statement)
      ),

    _local_label_header: $ =>
      seq(
        field(
          'name',
          choice($.local_symbol, $.qualified_symbol),
        ),
        optional(token.immediate(':')),
      ),

    qualified_label_block: $ =>
      seq(
        $._qualified_label_header,
        repeat1($._statement)
      ),

    _qualified_label_header: $ =>
      prec(10,
        seq(
          field(
            'name',
            $.qualified_symbol,
          ),
          optional(token.immediate(':')),
        ),
      ),

    // ----- Section statements -----

    _statement: $ => choice(
      seq($.instruction_list, optional($.inline_comment), $._eol),
      seq($.directive, optional($.inline_comment), $._eol),
      $.load_block,
      $.pushs_block,
      seq($.block_comment, $._eol),
      $.anonymous_label,
      seq($.inline_comment, $._eol),
      // Empty line
      /\s*\r?\n/,
    ),

    // ----- Section -----

    // Section blocks: SECTION directive and its contents
    section_block: $ =>
      seq(
        $.section_directive,
        optional($.inline_comment),
        $._eol,
        repeat($._statement),
        repeat(alias($.qualified_label_block, $.local_label_block)),
        repeat($.global_label_block),
        optional(
          seq(
            field('end', alias(KW.ENDSECTION, $.endsection_keyword)),
            optional($.inline_comment),
            $._eol,
            optional($._section_end_explicit),
          ),
        ),
      ),

    _section_args: $ =>
      seq(
        optional(field('fragment', alias(KW.FRAGMENT, $.fragment_keyword))),
        optional(field('union', alias(KW.UNION, $.union_keyword))),
        field('name', $.expression),
        optional(seq(',', $.section_type, optional($.section_address))),
        optional($.section_options)
      ),

    section_directive: $ =>
      seq(
        field('keyword', alias(token(prec(1, KW.SECTION)), $.section_keyword)),
        optional($._section_start),
        $._section_args,
      ),

    section_address: $ =>
      seq(
        '[',
        field('address', $.expression),
        ']'
      ),

    section_options: $ =>
      repeat1(
        seq(',', $.section_option)
      ),

    section_option: $ =>
      choice(
        $.bank_option,
        $.align_option
      ),

    bank_option: $ =>
      seq(
        alias(token(prec(1, KW.BANK)), $.bank_option_keyword),
        '[',
        field('bank', $.expression),
        ']'
      ),

    align_option: $ =>
      seq(
        alias(token(prec(1, KW.ALIGN)), $.align_option_keyword),
        '[',
        field('align', $.expression),
        optional(seq(',', field('offset', $.expression))),
        ']'
      ),

    load_block: $ =>
      seq(
        field('keyword', alias(KW.LOAD, $.load_keyword)),
        $._section_args,
        optional($.inline_comment),
        $._eol,
        repeat($._statement),
        repeat(alias($.qualified_label_block, $.local_label_block)),
        repeat($.global_label_block),
        field('end', alias(choice(KW.ENDL, $._load_end), $.endl_keyword)),
      ),

    pushs_block: $ =>
      seq(
        field('keyword', alias(KW.PUSHS, $.pushs_keyword)),
        $._section_args,
        optional($.inline_comment),
        $._eol,
        repeat($._statement),
        repeat(alias($.qualified_label_block, $.local_label_block)),
        repeat($.global_label_block),
        repeat($.section_block),
        field('end', alias(KW.POPS, $.pops_keyword)),
      ),

    // ----- Directives -----

    directive: $ =>
      choice(
        $.assert_directive,
        $.def_directive,
        $.export_directive,
        $.opt_directive,
        $.pusho_directive,
        $.popo_directive,
        $.ds_directive,
        $.include_directive,
        $.simple_directive,
        $.if_block,
        $.for_block,
        $.macro_invocation,
        $.macro_definition,
        $.rept_block,
        $.union_block,
      ),

    ds_directive: $ =>
      seq(
        field('keyword', alias(KW.DS, $.directive_keyword)),
        choice(
          // DS ALIGN[...] [, value...]
          seq(
            $.align_option,
            repeat(seq(',', field('value', $.expression)))
          ),
          // DS size [, value...]
          seq(
            field('size', $.expression),
            repeat(seq(',', field('value', $.expression)))
          ),
        ),
      ),

    union_block: $ =>
      seq(
        field('keyword', alias(KW.UNION, $.directive_keyword)),
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
        repeat($.nextu_block),
        field('end', alias(KW.ENDU, $.directive_keyword)),
      ),

    nextu_block: $ =>
      seq(
        field('keyword', alias(KW.NEXTU, $.directive_keyword)),
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
      ),

    def_directive: $ =>
      seq(
        field('keyword', alias(choice(
          token(prec(1, KW.DEF)),
          KW.REDEF,
        ), $.def_keyword)),
        field('name', $.variable),
        choice(
          // String constant: DEF name EQUS "value" or #"value"
          seq(
            field('assign_type', alias(KW.EQUS, $.equs_keyword)),
            field('value', $.expression),
          ),
          // Numeric constant (immutable): DEF name EQU value
          seq(
            field('assign_type', alias(KW.EQU, $.equ_keyword)),
            field('value', $.expression)
          ),
          // Variable (mutable): DEF name = value
          seq(
            field('assign_type', choice('=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '|=', '^=')),
            field('value', $.expression)
          ),
          // RS offset constants: DEF name RB/RW/RL count
          seq(
            field('assign_type', alias(choice(KW.RB, KW.RW, KW.RL), $.r_keyword)),
            optional(field('value', $.expression))
          ),
        ),
      ),

    assert_directive: $ =>
      prec.right(seq(
        field('keyword', alias(choice(KW.ASSERT, KW.STATIC_ASSERT), $.directive_keyword)),
        // Optional severity with REQUIRED comma: ASSERT [severity,] condition [, message]
        optional(seq(
          $.severity,
          ','
        )),
        field('condition', $.expression),
        optional(seq(',', field('message', $.string_literal)))
      )),

    export_directive: $ =>
      seq(
        field('keyword', alias(KW.EXPORT, $.directive_keyword)),
        choice(
          $.def_directive,
          $.argument_list,
        ),
      ),

    opt_directive: $ =>
      seq(
        field('keyword', alias(KW.OPT, $.directive_keyword)),
        optional(seq(
          $.opt_arg,
          repeat(seq(',', $.opt_arg))
        ))
      ),

    pusho_directive: $ =>
      seq(
        field('keyword', alias(KW.PUSHO, $.directive_keyword)),
        optional(seq(
          $.opt_arg,
          repeat(seq(',', $.opt_arg))
        )),
      ),

    popo_directive: $ =>
      seq(
        field('keyword', alias(KW.POPO, $.directive_keyword))
      ),

    // OPT arguments are parsed in RAW mode by RGBDS - similar to macro arguments
    // They can contain:
    // - Raw option text (g.oOX, Wdiv, Wtruncation=256, -Wall)
    // - Macro argument references (\1, \<1>, \@)
    // - Escaped commas (\,)
    opt_arg: $ =>
      seq(
        choice(
          // Raw option text: letters, digits, dots, dashes, etc.
          // Excludes unescaped commas (those are argument separators)
          token(/[a-zA-Z0-9_@#*/\-+=]+/),
          // Backslash escapes: \, for escaped comma, \1-\9 for macro args, etc.
          token(/\\./),
        ),
        repeat(
          choice(
            // Raw option text: letters, digits, dots, dashes, etc.
            // Excludes unescaped commas (those are argument separators)
            token(/[a-zA-Z0-9_\.@#*/\-+=]+/),
            // Backslash escapes: \, for escaped comma, \1-\9 for macro args, etc.
            token(/\\./),
          ),
        ),
      ),

    simple_directive: $ =>
      seq(
        field('keyword', $.directive_keyword),
        optional($.argument_list),
      ),

    include_directive: $ =>
      seq(
        field('keyword', alias(KW.INCLUDE, $.include_keyword)),
        optional(alias('?', $.quiet)),
        optional($.argument_list),
      ),

    argument_list: $ =>
      seq(
        $.expression,
        repeat(seq(',', $.expression))
      ),

    // ----- Macros -----

    macro_definition: $ =>
      seq(
        field('keyword', alias(KW.MACRO, $.macro_keyword)),
        optional(alias('?', $.quiet)),
        field('name', $.expression),
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
        field('end', alias(KW.ENDM, $.directive_keyword)),
      ),

    // NOTE: this must only match tokens that are not
    // matched by any other rule in _macro_arg!
    macro_arg_raw: $ => token(repeat1(
      choice(
        '\\,',
        /\?/,
      ),
    )),

    _macro_arg: $ => repeat1(choice(
      $._operand,
      $.section_type,
      $.section_option,
      $.severity,
      $.macro_arg_raw,
    )),

    _macro_args: $ =>
      seq(
        $._macro_arg,
        repeat(seq(',', $._macro_arg))
      ),

    macro_invocation: $ =>
      seq(
        $.variable,
        optional(alias(token.immediate('?'), $.quiet)),
        optional(
          alias($._macro_args, $.argument_list),
        ),
      ),

    // ----- Control structures -----

    if_block: $ =>
      seq(
        field('keyword', alias(KW.IF, $.if_keyword)),
        field('condition', $.expression),
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
        repeat($.elif_clause),
        optional($.else_clause),
        field('end', alias(KW.ENDC, $.endc_keyword)),
      ),

    elif_clause: $ =>
      seq(
        alias(KW.ELIF, $.elif_keyword),
        $.expression,
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
      ),

    else_clause: $ =>
      seq(
        alias(KW.ELSE, $.else_keyword),
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
      ),

    rept_block: $ =>
      seq(
        field('keyword', alias(KW.REPT, $.rept_keyword)),
        optional(alias('?', $.quiet)),
        field('count', $.expression),
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
        field('end', alias(KW.ENDR, $.endr_keyword)),
      ),

    for_block: $ =>
      seq(
        field('keyword', alias(KW.FOR, $.for_keyword)),
        optional(alias('?', $.quiet)),
        $.expression,
        repeat(
          seq(
            ',',
            $.expression,
          ),
        ),
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
        field('end', alias(KW.ENDR, $.endr_keyword)),
      ),

    // ----- Comments -----

    inline_comment: $ => token(seq(';', /[^\r\n]*/)),

    // C-style block comments (RGBDS behavior: no nesting)
    block_comment: $ =>
      token(
        seq(
          '/*',
          repeat(
            choice(
              /[^*]/,
              /\*+[^/]/
            )
          ),
          '*/'
        )
      ),

    // ----- Labels -----

    anonymous_label: $ => token(':'),

    // Anonymous label reference like :+, :++, :-, :--
    anonymous_label_ref: $ =>
      token(choice(
        seq(':', repeat1('+')),
        seq(':', repeat1('-')),
      )),

    // ----- Instructions -----

    instruction_list: $ =>
      seq(
        $.instruction,
        repeat(seq('::', $.instruction))
      ),

    instruction: $ =>
      seq(
        field('mnemonic', $.instruction_name),
        optional($.operand_list),
      ),

    operand_list: $ =>
      seq(
        $._operand,
        repeat(seq(',', $._operand))
      ),

    _operand: $ =>
      choice(
        $.condition_code,
        $.address,
        $.register,
        $.expression,
      ),

    _hl_special: $ => choice(
      KW.HLI,
      KW.HLD,
      seq(KW.HL, token.immediate(/[\-\+]/)),
    ),

    address: $ =>
      seq('[',
        choice(
          $.register,
          $.expression,
          alias($._hl_special, $.register),
        ),
        ']',
      ),

    // ----- Expressions -----

    paren: $ => seq('(', $.expression, ')'),

    any_identifier: $ => seq(
      $.identifier,
      optional($.uniqueness_affix),
    ),

    expression: $ =>
      choice(
        $.binary_expression,
        $.unary_expression,
        $.number_literal,
        $.string_literal,
        $.raw_string_literal,
        $.graphics_literal,
        $.char_literal,
        $.anonymous_label_ref,
        $.constant,
        $.fragment_literal,
        $.macro_argument,
        $.macro_arguments_spread,
        $.function_call,
        $.variable,
        $.local_symbol,
        $.qualified_symbol,
        $.paren,
      ),

    fragment_literal: $ =>
      seq(
        '[[',
        _top_level_statements($),
        field('end', ']]')
      ),

    _func_arg: $ => choice(
      $.address,
      $.register,
      $.expression,
    ),

    function_name: $ =>
      choice(
        // NOTE: SIZEOF and STARTOF are handled specially, they accept a section_type
        KW.ACOS, KW.ASIN, KW.ATAN2, KW.ATAN, KW.BANK, KW.BITWIDTH, KW.BYTELEN, KW.CEIL, KW.CHARCMP,
        KW.CHARLEN, KW.CHARSIZE, KW.CHARVAL, KW.COS, KW.DEF, KW.DIV, KW.FLOOR, KW.FMOD, KW.HIGH,
        KW.LOW, KW.INCHARMAP, KW.ISCONST, KW.LOG, KW.MUL, KW.POW, KW.READFILE, KW.REVCHAR, KW.ROUND,
        KW.SECTION, KW.SIN, KW.STRBYTE, KW.STRCAT, KW.STRCHAR, KW.STRCMP, KW.STRFIND, KW.STRFMT,
        KW.STRLEN, KW.STRLWR, KW.STRRFIND, KW.STRRPL, KW.STRSLICE, KW.STRUPR, KW.TAN, KW.TZCOUNT,
        // deprecated
        KW.CHARSUB, KW.STRIN, KW.STRRIN, KW.STRSUB,
      ),

    function_call: $ =>
      choice(
        $.startof_function,
        $.sizeof_function,
        seq(
          $.function_name,
          '(',
          optional(
            seq(
              $._func_arg,
              repeat(seq(',', $._func_arg)),
            ),
          ),
          ')'
        ),
      ),

    startof_function: $ =>
      seq(
        alias(KW.STARTOF, $.function_name),
        '(',
        choice($.section_type, $._func_arg),
        ')',
      ),

    sizeof_function: $ =>
      seq(
        alias(KW.SIZEOF, $.function_name),
        '(',
        choice($.section_type, $._func_arg),
        ')',
      ),

    binary_expression: $ =>
      choice(
        ...binary_ops($),
        // FIXME: maybe move this to operand?
        //        functions may accept registers as arguments, maybe add operand as option there, too?
        //
        // this is used for the "LD HL,SP+e8" instruction,
        // the only case where a register may show up in an expression,
        prec.left(4,
          seq(
            field('left', alias(KW.SP, $.register)),
            field('operator', /[\+\-]/),
            field('right', $.expression)
          ),
        ),
      ),

    unary_expression: $ =>
      prec.right(
        seq(
          choice('+', '-', '!', '~'),
          $.expression
        )
      ),

    number_literal: $ =>
      token(
        choice(
          // Precise fixed-point: 12.34q8 (q or Q, underscores allowed)
          /\d[\d_]*\.\d[\d_]*[qQ]\d[\d_]*/,
          // Fixed-point: 123.45 (underscores allowed)
          /\d[\d_]*\.\d[\d_]*/,
          // Hexadecimal: $12_AB or 0x12_AB
          /\$[0-9A-Fa-f][0-9A-Fa-f_]*/,
          /0[xX][0-9A-Fa-f][0-9A-Fa-f_]*/,
          // Octal: &123_456 or 0o123_456
          /&[0-7][0-7_]*/,
          /0[oO][0-7][0-7_]*/,
          // Binary: %1010_0101 or 0b1010_0101
          /%[01][01_]*/,
          /0[bB][01][01_]*/,
          // Decimal integer (underscores allowed)
          /\d[\d_]*/
        )
      ),

    // Single-character numeric constants like 'A' or '\n'
    char_literal: $ =>
      token(seq("'", /([^'\\\r\n]|\\.)+/, "'")),

    graphics_literal: $ =>
      token(seq('`', /[0-3A-Za-z.#@]+/)),

    // ----- Strings -----

    string_literal: $ =>
      choice(
        $._triple_quote_string,
        $._regular_string
      ),

    _global: $ => seq($._peek_global, $.identifier),

    _triple_quote_string: $ =>
      seq(
        '"""',
        repeat(choice(
          $._string_content_triple,
          seq($._peek_global, $.identifier),
          $.escape,
          $.macro_argument,
          $.macro_arguments_spread,
          $.wrong_escape,
        )),
        '"""',
      ),

    _regular_string: $ =>
      seq(
        '"',
        repeat(choice(
          $._string_content,
          seq($._peek_global, $.identifier),
          $.escape,
          $.macro_argument,
          $.macro_arguments_spread,
          $.wrong_escape,
        )),
        '"'
      ),

    escape: $ => token(prec(10, /\\[\\"'\{\}nrt0]/)),

    raw_string_literal: $ =>
      token(
        choice(
          // Triple-quoted raw strings (multi-line)
          /#"""[\s\S]*?"""/,
          // Single-line raw strings (no escapes, no inner ")
          /#"[^\n"]*"/
        )
      ),

    // ----- Macro arguments -----

    // Macro argument escapes usable inside macro/rept bodies
    macro_argument: $ =>
      token(prec(5, seq(
        '\\',
        choice(
          // \1 through \9
          /[1-9]/,
          // \<10>, \<-1>, \<identifier>, \<v{d:x}> (accept until closing '>')
          seq('<', /[^>\r\n]+/, '>')
        )
      ))),

    macro_arguments_spread: $ =>
      token(prec(5, seq('\\', '#'))),

    wrong_escape: $ => /\\./,

    // ---- Identifiers and symbols -----

    uniqueness_affix: $ => token.immediate('\\@'),
    variable: $ => seq($._peek_global, $.identifier, optional($.uniqueness_affix)),
    local_symbol: $ => seq($._peek_local, $.identifier, optional($.uniqueness_affix)),
    qualified_symbol: $ => seq($._peek_qualified, $.identifier, optional($.uniqueness_affix)),
  },
});

function binary_ops($) {
  const table = [
    ['||', 1],
    ['&&', 2],
    ['===', 3], ['!==', 3], ['==', 3], ['!=', 3], ['<', 3], ['<=', 3], ['>', 3], ['>=', 3],
    ['++', 4], ['+', 4], ['-', 4],
    ['&', 5], ['|', 5], ['^', 5],
    ['<<', 6], ['>>', 6], ['>>>', 6],
    ['*', 7], ['/', 7], ['%', 7],
    ['**', 8],
  ];

  return table.map(([op, precedence]) => {
    const assoc = op === '**' ? prec.right : prec.left;
    return assoc(
      precedence,
      seq(
        field('left', $.expression),
        field('operator', op),
        field('right', $.expression)
      )
    );
  });
}

function ciRegex(...keywords) {
  const patterns = keywords.map(keyword => {
    const charPattern = keyword
      .split('')
      .map(c => {
        const lower = c.toLowerCase();
        const upper = c.toUpperCase();
        // Check if lower and upper are the same to avoid duplicates
        if (lower === upper) {
          // Escape special regex characters
          return RegExp.escape(c);
        }
        // Escape characters in character classes
        const escapedLower = RegExp.escape(lower);
        const escapedUpper = RegExp.escape(upper);
        return `[${escapedLower}${escapedUpper}]`;
      })
      .join('');

    return new RegExp(charPattern);
  });
  return patterns;
}

function ci(...keywords) {
  const patterns = ciRegex(...keywords);
  // Do not wrap in choice if only one keyword
  return patterns.length === 1 ? patterns[0] : choice(...patterns);
}
