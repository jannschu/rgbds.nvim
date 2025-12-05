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
    repeat($.section_block),
  );
}

module.exports = grammar({
  name: 'rgbasm',

  externals: $ => [
    $.symbol,
    $._raw_symbol_begin,
    $._raw_symbol,
    $.local_symbol,
    $._symbol_fragment,

    $._identifier_boundary,
    $._global_symbol_begin,
    $._local_symbol_begin,
    $._qualified_symbol_begin,

    $._format_spec,

    // End-of-line token: injected before ']]' and at EOF
    $._eol,
    $._load_end,
    $._error_sentinel,
  ],

  conflicts: $ => [
    [$.condition_code, $.register],  // both accept 'C'
    [$.macro_invocation],
    [$.ds_directive],
    [$.global_label_block],
    [$.local_label_block],
    [$.qualified_label_block],
    [$._qualified_label_header, $._local_label_header],
  ],

  extras: $ => [
    $.inline_comment,
    $.block_comment,
    $.line_continuation,
    /[ \t\uFEFF\u2060]+/,
  ],

  supertypes: $ => [],

  inline: $ => [],

  rules: {
    source_file: $ => _top_level_statements($),

    line_continuation: $ =>
      seq(
        field('char', '\\'),
        optional($.inline_comment),
        /\r?\n/,
      ),

    // ----- Labels -----

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
            field('end', alias(ci('ENDSECTION'), $.directive_keyword)),
            optional($.inline_comment),
            $._eol,
            repeat($._statement),
          ),
        ),
      ),

    _colon: $ => token.immediate(':'),

    // Global label blocks: global label and its contents
    global_label_block: $ =>
      seq(
        $._global_label_header,
        repeat($._statement),
        repeat($.local_label_block),
      ),

    _global_label_header: $ =>
      seq(
        field('name', $.global_identifier),
        choice(token.immediate('::'), $._colon),
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
          choice(
            $.local_identifier,
            $.qualified_identifier,
          ),
        ),
        optional($._colon),
      ),

    qualified_label_block: $ =>
      seq(
        $._qualified_label_header,
        repeat1($._statement)
      ),

    _qualified_label_header: $ =>
      seq(
        field(
          'name',
          $.qualified_identifier,
        ),
        optional($._colon),
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

    _section_args: $ =>
      seq(
        optional(field('fragment', alias(ci('FRAGMENT'), $.directive_keyword))),
        optional(field('union', alias(ci('UNION'), $.directive_keyword))),
        $.string_literal,
        optional(seq(',', $.section_type, optional($.section_address))),
        optional($.section_options)
      ),

    section_directive: $ =>
      seq(
        field('keyword', alias(ci('SECTION'), $.directive_keyword)),
        $._section_args,
      ),

    section_type: $ =>
      ci(
        'ROM0',
        'ROMX',
        'VRAM',
        'SRAM',
        'WRAM0',
        'WRAMX',
        'OAM',
        'HRAM',
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
        alias(ci('BANK'), 'BANK'),
        '[',
        field('bank', $.expression),
        ']'
      ),

    align_option: $ =>
      seq(
        alias(ci('ALIGN'), 'ALIGN'),
        '[',
        field('align', $.expression),
        optional(seq(',', field('offset', $.expression))),
        ']'
      ),

    load_block: $ =>
      seq(
        field('keyword', alias(ci('LOAD'), $.directive_keyword)),
        $._section_args,
        optional($.inline_comment),
        $._eol,
        repeat($._statement),
        repeat(alias($.qualified_label_block, $.local_label_block)),
        repeat($.global_label_block),
        field('end', alias($._load_end, $.directive_keyword)),
      ),

    pushs_block: $ =>
      seq(
        field('keyword', alias(ci('PUSHS'), $.directive_keyword)),
        $._section_args,
        optional($.inline_comment),
        $._eol,
        repeat($._statement),
        repeat(alias($.qualified_label_block, $.local_label_block)),
        repeat($.global_label_block),
        repeat($.section_block),
        field('end', alias(ci('POPS'), $.directive_keyword)),
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
        field('keyword', alias(ci('DS'), $.directive_keyword)),
        choice(
          seq(
            $.align_option,
            optional(seq(',', field('size', $.expression))),
          ),
          seq(
            field('size', $.expression),
          ),
        ),
        optional(seq(',', field('value', $.expression))),
      ),

    union_block: $ =>
      seq(
        field('keyword', alias(ci('UNION'), $.directive_keyword)),
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
        repeat($.nextu_block),
        field('end', alias(ci('ENDU'), $.directive_keyword)),
      ),

    nextu_block: $ =>
      seq(
        field('keyword', alias(ci('NEXTU'), $.directive_keyword)),
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
      ),

    def_directive: $ =>
      seq(
        field('keyword', alias(ci('DEF', 'REDEF'), $.directive_keyword)),
        field('name', $.global_identifier),
        choice(
          // String constant: DEF name EQUS "value" or #"value"
          seq(
            field('assign_type', alias(ci('EQUS'), $.directive_keyword)),
            field('value', choice($.string_literal, $.raw_string_literal))
          ),
          // Numeric constant (immutable): DEF name EQU value
          seq(
            field('assign_type', alias(ci('EQU'), $.directive_keyword)),
            field('value', $.expression)
          ),
          // Variable (mutable): DEF name = value
          seq(
            field('assign_type', choice('=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '|=', '^=')),
            field('value', $.expression)
          ),
          // RS offset constants: DEF name RB/RW/RL count
          seq(
            field('assign_type', ci('RB', 'RW', 'RL')),
            optional(field('value', $.expression))
          ),
        ),
      ),

    severity: $ => ci('FAIL', 'WARN', 'FATAL'),

    assert_directive: $ =>
      prec.right(seq(
        field('keyword', alias(ci('ASSERT', 'STATIC_ASSERT'), $.directive_keyword)),
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
        field('keyword', alias(ci('EXPORT'), $.directive_keyword)),
        choice(
          $.def_directive,
          $.argument_list,
        ),
      ),

    opt_directive: $ =>
      seq(
        field('keyword', alias(ci('OPT'), $.directive_keyword)),
        optional(seq(
          $.opt_arg,
          repeat(seq(',', $.opt_arg))
        ))
      ),

    pusho_directive: $ =>
      seq(
        field('keyword', alias(ci('PUSHO'), $.directive_keyword)),
        optional(seq(
          $.opt_arg,
          repeat(seq(',', $.opt_arg))
        )),
      ),

    popo_directive: $ =>
      seq(
        field('keyword', alias(ci('POPO'), $.directive_keyword))
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
        field('keyword', alias(ci('INCLUDE'), $.directive_keyword)),
        optional(alias('?', $.quiet)),
        optional($.argument_list),
      ),

    directive_keyword: $ =>
      token(
        ci(
          'ALIGN',
          'BREAK',
          'INCBIN',
          'PRINT',
          'PRINTLN',
          'PURGE',
          'READFILE',
          'DB',
          'DW',
          'SHIFT',
          'RSSET',
          'RSRESET',
          'NEWCHARMAP',
          'SETCHARMAP',
          'CHARMAP',
          'PUSHC',
          'POPC',
          'WARN',
          'FAIL',
          'FATAL',
        )
      ),

    argument_list: $ =>
      seq(
        $.expression,
        repeat(seq(',', $.expression))
      ),

    // ----- Macros -----

    macro_definition: $ =>
      seq(
        field('keyword', alias(ci('MACRO'), $.directive_keyword)),
        optional(alias('?', $.quiet)),
        field('name', $.expression),
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
        field('end', alias(ci('ENDM'), $.directive_keyword)),
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
        $.global_identifier,
        optional(alias(token.immediate('?'), $.quiet)),
        optional(
          alias($._macro_args, $.argument_list),
        ),
        optional($.inline_comment),
        // $._eol,
        // /\r?\n/,
      ),

    // ----- Control structures -----

    if_block: $ =>
      seq(
        field('keyword', alias(ci('IF'), $.directive_keyword)),
        field('condition', $.expression),
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
        repeat($.elif_clause),
        optional($.else_clause),
        field('end', alias(ci('ENDC'), $.directive_keyword)),
      ),

    elif_clause: $ =>
      seq(
        alias(ci('ELIF'), $.directive_keyword),
        $.expression,
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
      ),

    else_clause: $ =>
      seq(
        alias(ci('ELSE'), $.directive_keyword),
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
      ),

    rept_block: $ =>
      seq(
        field('keyword', alias(ci('REPT'), $.directive_keyword)),
        optional(alias('?', $.quiet)),
        field('count', $.expression),
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
        field('end', alias(ci('ENDR'), $.directive_keyword)),
      ),

    for_block: $ =>
      seq(
        field('keyword', alias(ci('FOR'), $.directive_keyword)),
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
        field('end', alias(ci('ENDR'), $.directive_keyword)),
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

    instruction_name: $ => ci(
      'ADC',
      'ADD',
      'AND',
      'BIT',
      'CALL',
      'CCF',
      'CP',
      'CPL',
      'DAA',
      'DEC',
      'DI',
      'EI',
      'HALT',
      'INC',
      'JP',
      'JR',
      'LD',
      'LDD',
      'LDH',
      'LDI',
      'NOP',
      'OR',
      'POP',
      'PUSH',
      'RES',
      'RET',
      'RETI',
      'RL',
      'RLA',
      'RLC',
      'RLCA',
      'RR',
      'RRA',
      'RRC',
      'RRCA',
      'RST',
      'SBC',
      'SCF',
      'SET',
      'SLA',
      'SRA',
      'SRL',
      'STOP',
      'SUB',
      'SWAP',
      'XOR',
    ),

    _dot: $ => '.',

    constant: $ =>
      choice(
        $._dot,
        ci(
          '@',
          '..',
          '__SCOPE__',
          '_RS',
          '_NARG',
          '__ISO_8601_LOCAL__',
          '__ISO_8601_UTC__',
          '__UTC_YEAR__',
          '__UTC_MONTH__',
          '__UTC_DAY__',
          '__UTC_HOUR__',
          '__UTC_MINUTE__',
          '__UTC_SECOND__',
          '__RGBDS_MAJOR__',
          '__RGBDS_MINOR__',
          '__RGBDS_PATCH__',
          '__RGBDS_RC__',
          '__RGBDS_VERSION__',
        ),
      ),

    register: $ => ci('A', 'B', 'C', 'D', 'E', 'H', 'L', 'AF', 'BC', 'DE', 'HL', 'SP'),

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

    condition_code: $ => seq(
      optional('!'),
      field('condition', ci('Z', 'NZ', 'C', 'NC')),
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
        $.expression,
      ),

    address: $ =>
      seq('[',
        choice(
          $.expression,
          alias(ci('HLD', 'HL-', 'HLI', 'HL+'), $.register),
        ),
        ']',
      ),

    // ----- Expressions -----

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
        $.register,
        $.fragment_literal,
        $.macro_argument,
        $.macro_arguments_spread,
        $.function_call,
        $.identifier,
        seq('(', $.expression, ')')
      ),

    fragment_literal: $ =>
      seq(
        '[[',
        _top_level_statements($),
        field('end', ']]')
      ),

    function_name: $ => ci(
      "ACOS",
      "ASIN",
      "ATAN2",
      "ATAN",
      "BANK",
      "BITWIDTH",
      "BYTELEN",
      "CEIL",
      "CHARCMP",
      "CHARLEN",
      "CHARSIZE",
      "CHARVAL",
      "COS",
      "DEF",
      "DIV",
      "FLOOR",
      "FMOD",
      "HIGH",
      "LOW",
      "INCHARMAP",
      "ISCONST",
      "LOG",
      "MUL",
      "POW",
      "READFILE",
      "REVCHAR",
      "ROUND",
      "SECTION",
      "SIN",
      // handled specially, accepts a section type
      // "SIZEOF",
      // "STARTOF",
      "STRBYTE",
      "STRCAT",
      "STRCHAR",
      "STRCMP",
      "STRFIND",
      "STRFMT",
      "STRLEN",
      "STRLWR",
      "STRRFIND",
      "STRRPL",
      "STRSLICE",
      "STRUPR",
      "TAN",
      "TZCOUNT",
      // deprecated
      "CHARSUB",
      "STRIN",
      "STRRIN",
      "STRSUB",
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
              $.expression,
              repeat(seq(',', $.expression))
            )
          ),
          ')'
        ),
      ),

    startof_function: $ =>
      seq(
        alias(ci('STARTOF'), $.function_name),
        '(',
        choice($.section_type, $.expression),
        ')',
      ),

    sizeof_function: $ =>
      seq(
        alias(ci('SIZEOF'), $.function_name),
        '(',
        choice($.section_type, $.expression),
        ')',
      ),

    binary_expression: $ =>
      choice(...binary_ops($)),

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
      // TODO: support '&euro;'?
      token(seq("'", /([^'\\\r\n]|\\.)+/, "'")),

    graphics_literal: $ =>
      token(seq('`', /[0-3A-Za-z.#@]+/)),

    string_literal: $ =>
      choice(
        $._triple_quote_string,
        $._regular_string
      ),

    _triple_quote_string: $ =>
      seq(
        '"""',
        repeat(choice(
          $.interpolation,
          $._string_content_triple
        )),
        '"""'
      ),

    _regular_string: $ =>
      seq(
        '"',
        repeat(choice(
          $.interpolation,
          $._string_content
        )),
        '"'
      ),

    _string_content: $ =>
      token.immediate(prec(1, /([^"\\{]|\\.)+/)),

    _string_content_triple: $ =>
      token.immediate(prec(1, /([^"{]|\\.)+/)),

    // Macro argument escapes usable inside macro/rept bodies
    macro_argument: $ =>
      token(seq(
        '\\',
        choice(
          // \1 through \9
          /[1-9]/,
          // \<10>, \<-1>, \<identifier>, \<v{d:x}> (accept until closing '>')
          seq('<', /[^>\r\n]+/, '>')
        )
      )),

    macro_arguments_spread: $ =>
      token(seq('\\', '#')),

    raw_string_literal: $ =>
      token(
        choice(
          // Triple-quoted raw strings (multi-line)
          /#"""[\s\S]*?"""/,
          // Single-line raw strings (no escapes, no inner ")
          /#"[^\n"]*"/
        )
      ),

    // ----- Identifiers -----

    uniqueness_affix: $ => token.immediate('\\@'),

    identifier: $ => choice(
      $.global_identifier,
      $.local_identifier,
      $.qualified_identifier,
    ),

    raw_symbol: $ => seq(
      $._raw_symbol_begin,
      field('raw_marker', '#'),
      $._raw_symbol,
    ),

    // -- Global Identifiers --

    // A global identifier, without the uniqueness affix
    _global_identifier_part: $ => choice(
      $.symbol,
      $._interpolated_global_identifier,
      $.raw_symbol,
    ),

    global_identifier: $ => seq(
      $._global_symbol_begin,
      field('global', $._global_identifier_part),
      $._identifier_boundary,
      optional($.uniqueness_affix),
    ),

    // -- Local Identifiers --

    // Part after the '.' in a local identifier,
    // without any uniqueness affix.
    //
    // NOTE: This must only match if immediate to 
    // prevent whitespace between '.' and the identifier part
    _local_identifier_part: $ => choice(
      $._interpolated_local_identifier,
      $.local_symbol,
    ),

    local_identifier: $ => seq(
      $._dot,
      $._local_identifier_part,
      $._identifier_boundary,
      optional($.uniqueness_affix),
    ),

    // -- Qualified Identifiers --

    qualified_identifier: $ => seq(
      $._qualified_symbol_begin,
      field('global', $._global_identifier_part),
      token.immediate('.'),
      field('local', $._local_identifier_part),
      $._identifier_boundary,
      optional($.uniqueness_affix),
    ),

    // ----- Interpolations -----

    _interpolated_global_identifier: $ =>
      seq(
        optional(
          field('raw_marker', '#'),
        ),
        optional(alias(/[A-Za-z_][A-Za-z0-9_#$@]*/, $.symbol)),
        $.interpolation,
        repeat(
          choice(
            alias($._symbol_fragment, $.symbol),
            $._immediate_interpolation,
          ),
        ),
      ),

    _interpolated_local_identifier: $ =>
      seq(
        optional(alias($._symbol_fragment, $.local_symbol)),
        $._immediate_interpolation,
        repeat(
          choice(
            alias($._symbol_fragment, $.local_symbol),
            $._immediate_interpolation,
          ),
        )
      ),

    _immediate_interpolation_: $ =>
      seq(
        token.immediate('{'),
        optional(field('format', $.format_spec)),
        repeat1($._interpolation_content),
        '}',
      ),
    _immediate_interpolation: $ =>
      alias($._immediate_interpolation_, $.interpolation),

    interpolation: $ =>
      seq(
        '{',
        optional(field('format', $.format_spec)),
        repeat1($._interpolation_content),
        '}',
      ),

    _interpolation_content: $ =>
      choice(
        $._interpolated_global_identifier,
        $.symbol,
        $.raw_symbol,
      ),

    // Format specifier for interpolation: {formatspec:symbol}
    // Syntax: [sign][exact][align][pad][width][frac][prec]type:
    // NOTE: Single letter format types (d, x, X, etc.) conflict with symbol matching
    format_spec: $ =>
      seq(
        $._format_spec,
        token.immediate(':'),
      ),
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

function ci(...keywords) {
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

  // Do not wrap in choice if only one keyword
  return patterns.length === 1 ? patterns[0] : choice(...patterns);
}
