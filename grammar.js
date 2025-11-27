/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

function _top_level_statements($) {
  return seq(
    // we allow statements outside sections/labels
    // to support macro generated code we can not see and files that are included
    repeat($._statement),
    repeat($.local_label_block),
    repeat($.global_label_block),
    repeat($.section_block),
  );
}

module.exports = grammar({
  name: 'rgbasm',

  externals: $ => [
    $.symbol,
    $._label,
    $._local,
    $._eol,  // End-of-line token: injected before ']]' and at EOF
    $._load_end,
    $._error_sentinel,
  ],

  conflicts: $ => [
    [$.condition_code, $.register],  // both accept 'C'
    [$.macro_invocation],
    [$.interpolatable_identifier],
  ],

  extras: $ => [
    $.inline_comment,
    $.block_comment,
    /[ \t\uFEFF\u2060]+/,  // Spaces and tabs only, NOT newlines
    // FIXME: allow inline comment after \
    /\\[ \t]*\r?\n/,  // Line continuation: backslash + optional spaces + newline
  ],

  supertypes: $ => [],

  inline: $ => [],

  rules: {
    source_file: $ => _top_level_statements($),


    local: $ => seq(
      $._local,
      field('uniqueness_affix', optional(token.immediate('\\@'))),
    ),

    label: $ => seq(
      $._label,
      field('uniqueness_affix', optional(token.immediate('\\@'))),
    ),

    _symbol_with_opt_affix: $ => seq(
      $.symbol,
      field('uniqueness_affix', optional(token.immediate('\\@'))),
    ),

    // Section blocks: SECTION directive and its contents
    section_block: $ =>
      seq(
        $.section_directive,
        optional($.inline_comment),
        $._eol,
        repeat($._statement),
        repeat($.global_label_block),
        optional(seq(
          alias(ci('ENDSECTION'), $.directive_keyword),
        )),
      ),


    // Global label blocks: global label and its contents
    global_label_block: $ =>
      seq(
        $._global_label_header,
        repeat($._statement),
        repeat($.local_label_block),
      ),

    _global_label_header: $ =>
      seq(
        field('name', choice($.label, $.raw_identifier)),
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
        field('name', $.local),
        optional(token.immediate(':')),
        // TODO: remove, ensure tests cover this
        // optional($.inline_comment),
        // /\r?\n/
      ),

    // ----- Section statements -----

    // FIXME: move $._eol out of statements, into repeat/seq wrappers
    _statement: $ => choice(
      seq($.instruction_list, optional($.inline_comment), $._eol),
      seq($.directive, optional($.inline_comment), $._eol),
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


    // ----- Directives -----

    directive: $ =>
      choice(
        $.assert_directive,
        $.def_directive,
        $.export_directive,
        $.opt_directive,
        $.simple_directive,
        $.if_block,
        $.for_block,
        $.macro_invocation,
        $.load_block,
        $.macro_definition,
        $.rept_block,
        $.union_block,
      ),

    load_block: $ =>
      seq(
        field('keyword', alias(ci('LOAD'), $.directive_keyword)),
        $._section_args,
        optional($.inline_comment),
        $._eol,
        repeat($._statement),
        repeat($.global_label_block),
        // FIXME: implement the implicit end tokens
        alias($._load_end, $.directive_keyword),
        // alias(ci('ENDL'), $.directive_keyword),
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
        field('name',
          seq(
            choice(
              $.interpolatable_identifier,
              $.raw_identifier,
              $.symbol,
            ),
            field('uniqueness_affix', optional(token.immediate('\\@'))),
          ),
        ),
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

    // OPT arguments are parsed in RAW mode by RGBDS - they can be string literals
    // or raw text that looks like identifiers but may contain special characters
    opt_arg: $ =>
      choice(
        $.string_literal,
        $.raw_string_literal,
        alias($.opt_raw_string, $.raw_string)
      ),

    // Raw string token for OPT arguments - matches RGBDS LEXER_RAW behavior
    // Excludes quotes to allow string_literal to match first
    opt_raw_string: $ =>
      token(/[^\s,"][^\r\n,]*/),

    simple_directive: $ =>
      seq(
        field('keyword', $.directive_keyword),
        optional($.argument_list)
      ),

    directive_keyword: $ =>
      token(
        ci(
          'ALIGN',
          'BREAK',
          'INCBIN',
          'INCLUDE',
          'PRINT',
          'PRINTLN',
          'PURGE',
          'READFILE',
          'DS',
          'DB',
          'DW',
          'SHIFT',
          'RSSET',
          'RSRESET',
          // TODO: 'PUSHO',
          // TODO: 'POPO',
          // TODO: 'PUSHS',
          // TODO: 'POPS',
          'NEWCHARMAP',
          'SETCHARMAP',
          'CHARMAP',
          'PUSHC',
          'POPC',
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
        $.expression,
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
        field('end', alias(ci('ENDM'), $.directive_keyword)),
      ),

    macro_arg_raw: $ => token(choice(
      /[a-zA-Z_\.@#*/\-\d]+/,
      /\\./,
    )),

    _macro_arg: $ => repeat1(choice(
      $._operand,
      $.section_type,
      $.section_option,
      $.severity,
      // Allow raw tokens that are not valid macro args
      prec(-2, $.macro_arg_raw),
    )),

    macro_invocation: $ =>
      seq(
        // Macros must not be nested, so we do not allow \@ affix here
        $.symbol,
        // FIXME: allow "raw mode"
        optional(
          alias(
            seq(
              $._macro_arg,
              repeat(seq(',', $._macro_arg))
            ),
            $.argument_list,
          ),
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
        field('count', $.expression),
        optional($.inline_comment),
        $._eol,
        _top_level_statements($),
        field('end', alias(ci('ENDR'), $.directive_keyword)),
      ),

    for_block: $ =>
      seq(
        alias(ci('FOR'), $.directive_keyword),
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
        alias(ci('ENDR'), $.directive_keyword),
      ),

    // ----- Comments -----

    inline_comment: $ => token(seq(';', /.*/)),

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
      'LDH',
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

    constant: $ =>
      ci(
        '@',
        '.',
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

    register: $ => ci('A', 'B', 'C', 'D', 'E', 'H', 'L', 'BC', 'DE', 'HL', 'SP'),

    instruction_list: $ =>
      seq(
        $.instruction,
        repeat(seq('::', $.instruction))
      ),

    instruction: $ =>
      seq(
        field('opcode', $.instruction_name),
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
        $.register,
        $.expression,
      ),

    address: $ =>
      seq('[',
        choice(
          $.expression,
          $.register,
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
        $.local,
        $.constant,
        $.fragment_literal,
        $.interpolatable_identifier,
        $.macro_argument,
        $.macro_arguments_spread,
        $.function_call,
        $._symbol_with_opt_affix,
        $.raw_identifier,
        seq('(', $.expression, ')')
      ),

    fragment_literal: $ =>
      seq(
        '[[',
        _top_level_statements($),
        ']]'
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
      // handled specially, accepts a register
      // "HIGH",
      // "LOW",
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
      // handled specially, accepts a register or section type
      // "SIZEOF",
      // handled specially, accepts a section type
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
    ),

    function_call: $ =>
      choice(
        $.startof_function,
        $.high_low_function,
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

    high_low_function: $ =>
      seq(
        alias(ci('HIGH', 'LOW'), $.function_name),
        '(',
        choice($.register, $.expression),
        ')',
      ),

    sizeof_function: $ =>
      seq(
        alias(ci('SIZEOF'), $.function_name),
        '(',
        choice($.section_type, $.register, $.expression),
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

    interpolation: $ =>
      seq(
        '{',
        optional(field('format', $.format_spec)),
        field('name', repeat1($.interpolation_content)),
        '}'
      ),

    // Content inside interpolation braces: identifier chars and nested interpolations
    // Matches RGBDS behavior of reading chars until '}' (lexer.cpp:1344-1347)
    // Must be visible (not _hidden) to appear in parse tree
    interpolation_content: $ =>
      choice(
        // Nested interpolation: {inner}
        $.interpolation,
        // Raw identifier characters (don't use $.symbol - avoid external scanner)
        // Matches [A-Za-z_][A-Za-z0-9_#$@]* with different prefix patterns
        // TODO: a predefined keyword without any other interpolation should error
        //       eg "{if}"
        /[A-Za-z_][A-Za-z0-9_#$@]*/,
        // TODO: check if {.foo} is valid, not sure if this local label style identifier is allowed
        // Dot prefix for local labels: .label
        /\.[A-Za-z_][A-Za-z0-9_#$@]*/,
        // Hash prefix for raw identifiers: #keyword
        /#[A-Za-z_][A-Za-z0-9_#$@]*/,
      ),

    // Format specifier for interpolation: {formatspec:symbol}
    // Syntax: [sign][exact][align][pad][width][frac][prec]type:
    // NOTE: Single letter format types (d, x, X, etc.) conflict with symbol matching
    format_spec: $ =>
      token.immediate(seq(
        optional(choice('+', ' ')),  // sign
        optional('#'),                // exact
        optional('-'),                // align
        optional('0'),                // pad
        optional(/[0-9]+/),           // width
        optional(seq('.', /[0-9]*/)), // frac
        optional(/q[0-9]+/),          // prec
        choice('d', 'u', 'x', 'X', 'b', 'o', 'f', 's'), // type
        // TODO: expose this as separate field / node
        ':',
      )),

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

    // Raw identifiers allow using reserved keywords as symbols
    // e.g. #load, #LOAD, #IF, etc.
    raw_identifier: $ =>
      token(seq('#', /[A-Za-z_][A-Za-z0-9_]*(?:\\@)?/)),

    // Interpolatable identifier: identifier containing at least one {interpolation}
    // Examples: {x}, foo{x}, {x}foo, foo{x}bar{y}
    interpolatable_identifier: $ =>
      seq(
        // Optional: identifier fragment before first interpolation
        // Don't use .immediate() for first fragment (no preceding token)
        optional($._identifier_fragment_initial),

        // At least one interpolation required (distinguishes from plain symbol)
        $.interpolation,

        // Then any mix of fragments and interpolations
        // Subsequent fragments use .immediate() to prevent whitespace
        repeat(
          choice(
            $.identifier_fragment,  // Uses .immediate()
            $.interpolation,
          )
        )
      ),

    // First identifier fragment (no .immediate() needed)
    _identifier_fragment_initial: $ =>
      alias(token(/[A-Za-z_][A-Za-z0-9_#$@]*/), $.identifier_fragment),

    // Identifier fragment: part of identifier without braces
    // Must be immediate to prevent whitespace between parts
    // Supports RGBDS identifier chars: A-Za-z0-9_#$@
    identifier_fragment: $ =>
      token.immediate(/[A-Za-z_][A-Za-z0-9_#$@]*/),
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
