/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'rgbasm',

  externals: $ => [
    $.symbol,
  ],

  conflicts: $ => [
    [$.condition_code, $.register],  // both accept 'C'
  ],

  extras: $ => [
    $.comment,
    $.block_comment,
    /[ \t\uFEFF\u2060]+/,  // Spaces and tabs only, NOT newlines
    // FIXME: allow inline comment after \
    /\\[ \t]*\r?\n/,  // Line continuation: backslash + optional spaces + newline
  ],

  supertypes: $ => [
    // $.expression,
  ],

  // TODO: test inputs without trailing newlines

  rules: {
    source_file: $ => seq(
      // we allow statements outside sections/labels
      // to support macro generated code we can not see and files that are included
      repeat($._statement),
      repeat($.local_label_block),
      repeat($.global_label_block),
      repeat($.section_block),
    ),

    // Section blocks: SECTION directive and its contents
    section_block: $ =>
      // FIXME: POPS PUSHS implementation
      seq(
        $._section_header,
        repeat($._statement),
        // TODO: is a local label valid before a global label in a section?
        //       maybe if files are included into other sections, what about PUSHS, maybe there?
        repeat($.global_label_block),
        optional(seq(
          alias(ci('ENDSECTION'), $.directive_keyword),
        )),
      ),

    _section_header: $ =>
      seq(
        $.section_directive,
        // TODO: is this newline required?
        // optional($.inline_comment),
        // /\r?\n/
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
        $.global_label,
      ),

    // Local label blocks: local label and its contents
    local_label_block: $ =>
      seq(
        $._local_label_header,
        repeat($._statement)
      ),

    _local_label_header: $ =>
      seq(
        $.local_label,
        // TODO: remove
        // optional($.inline_comment),
        // /\r?\n/
      ),

    // ----- Section statements -----

    _statement: $ => choice(
      seq($.instruction_list, optional($.inline_comment), /\r?\n/),
      seq($.directive, optional($.inline_comment), /\r?\n/),
      seq($.block_comment, /\r?\n/),
      $.anonymous_label,
      // Blank line or line with only comment
      seq(optional($.inline_comment), /\r?\n/),
    ),

    // ----- Section -----

    section_directive: $ =>
      seq(
        // FIXME: anonymous label here?
        field('keyword', alias(ci('SECTION'), $.directive_keyword)),
        optional(field('fragment', alias(ci('FRAGMENT'), $.directive_keyword))),
        optional(field('union', alias(ci('UNION'), $.directive_keyword))),
        $.string_literal,
        optional(seq(',', $.section_type, optional($.section_address))),
        optional($.section_options)
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
        // $.macro_definition,
        // $.if_block,
        $.redef_directive,
        $.def_directive,
        $.assert_directive,
        $.purge_directive,
        $.align_directive,
        $.ds_directive,
        $.db_directive,
        $.dw_directive,
        $.shift_directive,
        $.break_directive,
        // $.load_block,
        $.include_directive,
        $.incbin_directive,
        // $.union_block,
        // $.fragment_literal,
        $.charmap_directive,
        $.newcharmap_directive,
        $.setcharmap_directive,
        $.export_directive,
        $.opt_directive,
        $.simple_directive,
      ),

    def_directive: $ =>
      seq(
        field('keyword', alias(ci('DEF'), $.directive_keyword)),
        field('name', choice(
          $.interpolatable_identifier,
          $.raw_identifier,
          $.symbol,
        )),
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
          )
        )
      ),

    redef_directive: $ =>
      seq(
        field('keyword', alias(ci('REDEF'), $.directive_keyword)),
        field('name', choice(
          $.interpolatable_identifier,
          $.raw_identifier,
          $.symbol,
        )),
        choice(
          // String constant: REDEF name EQUS "value" or #"value"
          seq(
            field('assign_type', alias(ci('EQUS'), $.directive_keyword)),
            field('value', choice($.string_literal, $.raw_string_literal))
          ),
          // Numeric constant: REDEF name EQU value
          seq(
            field('assign_type', alias(ci('EQU'), $.directive_keyword)),
            field('value', $.expression)
          ),
          // Variable: REDEF name = value
          seq(
            field('assign_type', choice('=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '|=', '^=')),
            field('value', $.expression)
          ),
          // RS offset constants: REDEF name RB/RW/RL count
          seq(
            field('assign_type', ci('RB', 'RW', 'RL')),
            optional(field('value', $.expression))
          )
        )
      ),

    assert_directive: $ =>
      prec.right(seq(
        field('keyword', alias(ci('ASSERT', 'STATIC_ASSERT'), $.directive_keyword)),
        // Optional severity with REQUIRED comma: ASSERT [severity,] condition [, message]
        optional(seq(
          field('severity', ci('FAIL', 'WARN')),
          ','
        )),
        field('condition', $.expression),
        optional(seq(',', field('message', $.string_literal)))
      )),

    purge_directive: $ =>
      seq(
        field('keyword', alias(ci('PURGE'), $.directive_keyword)),
        choice($.interpolatable_identifier, $.raw_identifier, $.symbol, $.macro_argument),
        repeat(seq(',', choice($.interpolatable_identifier, $.raw_identifier, $.symbol, $.macro_argument)))
      ),

    align_directive: $ =>
      seq(
        field('keyword', alias(ci('ALIGN'), $.directive_keyword)),
        field('align', $.expression),
        optional(seq(',', field('offset', $.expression)))
      ),

    ds_directive: $ =>
      seq(
        field('keyword', alias(ci('DS'), $.directive_keyword)),
        choice(
          seq($.align_option, optional(seq(',', $.argument_list))),
          $.argument_list
        )
      ),

    db_directive: $ =>
      seq(
        field('keyword', alias(ci('DB'), $.directive_keyword)),
        $.argument_list
      ),

    dw_directive: $ =>
      seq(
        field('keyword', alias(ci('DW'), $.directive_keyword)),
        $.argument_list
      ),

    shift_directive: $ =>
      prec.right(seq(
        field('keyword', alias(ci('SHIFT'), $.directive_keyword)),
        optional(field('count', $.expression))
      )),

    break_directive: $ =>
      field('keyword', alias(ci('BREAK'), $.directive_keyword)),

    include_directive: $ =>
      seq(
        field('keyword', alias(ci('INCLUDE'), $.directive_keyword)),
        // TODO: allow expressions?
        field('path', $.string_literal)
      ),

    incbin_directive: $ =>
      seq(
        field('keyword', alias(ci('INCBIN'), $.directive_keyword)),
        field('path', $.string_literal),
        optional(
          seq(
            ',',
            field('offset', $.expression),
            optional(seq(',', field('length', $.expression)))
          )
        )
      ),

    export_directive: $ =>
      seq(
        field('keyword', alias(ci('EXPORT'), $.directive_keyword)),
        // TODO: "EXPORT DEF ..." / "EXPORT REDEF ..."?
        choice($.interpolatable_identifier, $.raw_identifier, $.symbol, $.macro_argument),
        repeat(seq(',', choice($.interpolatable_identifier, $.raw_identifier, $.symbol, $.macro_argument)))
      ),

    charmap_directive: $ =>
      seq(
        field('keyword', alias(ci('CHARMAP'), $.directive_keyword)),
        field('key', choice(
          $.string_literal,
          $.char_literal,
          $.macro_argument
        )),
        optional(
          seq(
            ',',
            optional(seq(
              field('value', $.expression),
              repeat(seq(',', field('value', $.expression)))
            ))
          )
        )
      ),

    newcharmap_directive: $ =>
      seq(
        field('keyword', alias(ci('NEWCHARMAP'), $.directive_keyword)),
        // TODO: allow raw_identifier and interpolatable_identifier?
        field('name', $.symbol),
        optional(seq(',', field('base', $.symbol)))
      ),

    setcharmap_directive: $ =>
      seq(
        // TODO: allow raw_identifier and interpolatable_identifier?
        field('keyword', alias(ci('SETCHARMAP'), $.directive_keyword)),
        field('name', $.symbol)
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

    // TODO: add the parameters to these directives?
    simple_directive: $ =>
      seq(
        field('keyword', $.directive_keyword),
        optional($.argument_list)
      ),

    directive_keyword: $ =>
      token(
        ci(
          // 'EQU',
          // 'EQUS',
          // 'CHAR',
          // 'READFILE',
          'PRINT',
          'PRINTLN',
          // 'FAIL',
          // 'WARN',
          // 'IMPORT',
          // 'RSSET',
          // 'RSRESET',
          // 'PUSHO',
          // 'POPO',
          // 'PUSHS',
          // 'POPS',
          // 'PUSHC',
          // 'POPC',
        )
      ),

    argument_list: $ =>
      seq(
        $.expression,
        repeat(seq(',', $.expression))
      ),

    // ----- Control structures -----
    // FIXME: What statements should be valid inside these blocks?
    //        They can be used _everywhere_, pre-processor-style.
    //        In particular, they may "mask" a section start:
    //
    //        IF 0
    //        SECTION "A"
    //        ELSE
    //        SECTION "B"
    //        ENDC
    //          nop
    //
    // This does not fit into the current section/block structure!
    // Should they just contain "source_file" and we add
    // allow such preprocessor statements as alternatives to section and global label headers?
    //
    // if_block: $ =>
    //   seq(
    //     field('keyword', alias(/[Ii][Ff]/, $.directive_keyword)),
    //     field('condition', $.expression),
    //     /\r?\n/,
    //     repeat($._top_level_statement),
    //     repeat($.elif_clause),
    //     optional($.else_clause),
    //     field('end', alias(/[Ee][Nn][Dd][Cc]/, $.directive_keyword))
    //   ),
    //
    // elif_clause: $ =>
    //   seq(
    //     alias(/[Ee][Ll][Ii][Ff]/, $.directive_keyword),
    //     $.expression,
    //     /\r?\n/,
    //     repeat($._top_level_statement)
    //   ),
    //
    // else_clause: $ =>
    //   seq(
    //     alias(/[Ee][Ll][Ss][Ee]/, $.directive_keyword),
    //     choice(
    //       // ELSE followed by newline and body
    //       seq(/\r?\n/, repeat($._top_level_statement)),
    //       // ELSE followed by statement on same line, then newline and body
    //       seq(
    //         choice(
    //           $.label_definition,
    //           $.macro_invocation_line,
    //           $.instruction_line,
    //           $.directive
    //         ),
    //         optional($.inline_comment),
    //         /\r?\n/,
    //         repeat($._top_level_statement)
    //       )
    //     )
    //   ),
    //
    // rept_block: $ =>
    //   seq(
    //     field('keyword', alias(/[Rr][Ee][Pp][Tt]/, $.directive_keyword)),
    //     field('count', $.expression),
    //     /\r?\n/,
    //     repeat($._top_level_statement),
    //     field('end', alias(/[Ee][Nn][Dd][Rr]/, $.directive_keyword))
    //   ),
    //
    // for_block: $ =>
    //   seq(
    //     field('keyword', alias(/[Ff][Oo][Rr]/, $.directive_keyword)),
    //     field('var', choice(
    //       $.identifier,
    //       $.interpolatable_identifier
    //     )),
    //     ',',
    //     choice(
    //       // Single argument form: FOR var, count (iterate 0 to count-1)
    //       field('count', $.expression),
    //       // Two or three argument form: FOR var, start, end [, step]
    //       seq(
    //         field('start', $.expression),
    //         ',',
    //         field('end', $.expression),
    //         optional(seq(',', field('step', $.expression)))
    //       )
    //     ),
    //     /\r?\n/,
    //     repeat($._top_level_statement),
    //     field('end', alias(/[Ee][Nn][Dd][Rr]/, $.directive_keyword))
    //   ),

    // ----- Comments -----

    comment: $ => token(seq(';', /.*/)),

    inline_comment: $ => prec(1, $.comment),

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

    global_label: $ =>
      seq(
        field('name', choice($.symbol, $.raw_identifier)),
        choice(token.immediate('::'), token.immediate(':')),
      ),

    local_label: $ => field('name', seq($.local_identifier, optional(token.immediate(':')))),

    anonymous_label: $ => token(':'),

    // Local label / symbol reference like `.loop` or `Global.loop`
    // TODO: clarify usage of #$@ in identifiers, also see raw_identifier and
    //       identifier_fragment
    local_identifier: $ => token(/(?:[A-Za-z_][A-Za-z0-9_#$@]*)?\.[A-Za-z_][A-Za-z0-9_#$@]*/),

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
        $.expression
      ),

    address: $ =>
      seq('[',
        choice(
          $.expression,
          $.register,
          alias(ci('HLD', 'HL-', 'HLI', 'HL+'), $.register),
        ),
        ']'),

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
        // FIXME: add back fragment literal support
        // $.fragment_literal,
        // TODO: add interpolatable_identifier
        // TODO: add macro paramater
        $.macro_argument,
        $.macro_arguments_spread,
        $.macro_unique_suffix,
        $.function_call,
        $.symbol,
        $.raw_identifier,
        $.local_identifier,
        seq('(', $.expression, ')')
      ),

    function_name: $ => ci(
      "ACOS",
      "ASIN",
      "ATAN",
      "ATAN2",
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
      "INCHARMAP",
      "ISCONST",
      "LOG",
      "LOW",
      "MUL",
      "POW",
      "READFILE",
      "REVCHAR",
      "ROUND",
      "SECTION",
      "SIN",
      "SIZEOF",
      "STARTOF",
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

    macro_unique_suffix: $ =>
      token(seq('\\', '@')),

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
