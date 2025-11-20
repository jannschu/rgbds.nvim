/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'rgbasm',

  externals: $ => [
    $._macro_arg,              // Raw macro argument (RGBDS-style RAW lexer mode)
    $._macro_arg_end,          // Marks the end of macro-arg mode at EOL / EOF
    $._raw_macro_mode,         // Zero-width token that toggles RAW mode on this line
    $._label_token,            // Identifier immediately followed by : (becomes label)
    $._register_token,         // CPU register token (A, B, C, D, E, H, L, AF, BC, DE, HL, SP, PC)
    $._symbol_token,           // Plain identifier (for macro calls, etc.)
    $._instruction_token,      // Known Z80/GB instruction opcode
  ],

  conflicts: $ => [
    [$.operand, $.primary_expression],
    [$.assert_directive, $.primary_expression],
  ],

  extras: $ => [
    $.comment,
    $.block_comment,
    /[ \t\uFEFF\u2060]+/,  // Spaces and tabs only, NOT newlines
    /\\[ \t]*\r?\n/,  // Line continuation: backslash + optional spaces + newline
  ],

  supertypes: $ => [
    $.expression,
  ],

  rules: {
    source_file: $ => seq(
      repeat($._non_section_statement),
      repeat($.section_block),
    ),

    // Section blocks: SECTION directive and its contents
    section_block: $ =>
      // FIXME: POPS PUSHS implementation
      seq(
        $._section_header,
        repeat($._section_statement),
        repeat($.global_label_block),
        // FIXME: allow optional "ENDSECTION" directive
      ),

    _section_header: $ =>
      seq(
        $.section_directive,
        optional($.inline_comment),
        /\r?\n/
      ),

    // Global label blocks: global label and its contents
    global_label_block: $ =>
      seq(
        $._global_label_header,
        repeat($._section_statement),
        repeat($.local_label_block),
      ),

    _global_label_header: $ =>
      seq(
        $.global_label,
        optional($.inline_comment),
        /\r?\n/
      ),

    // Local label blocks: local label and its contents
    local_label_block: $ =>
      seq(
        $._local_label_header,
        repeat($._section_statement)
      ),

    _local_label_header: $ =>
      seq(
        $.local_label,
        optional($.inline_comment),
        /\r?\n/
      ),

    // ----- Section statements -----

    _section_statement: $ =>
      choice(
        seq($.instruction_list, optional($.inline_comment), /\r?\n/),
        // FIXME: anonymous label here?
        $._non_section_statement,
      ),

    _non_section_statement: $ => choice(
      seq($.directive, optional($.inline_comment), /\r?\n/),
      seq($.block_comment, /\r?\n/),
      // Blank line or line with only comment
      seq(optional($.inline_comment), /\r?\n/),
    ),

    // ----- Section -----

    section_directive: $ =>
      seq(
        field('keyword', alias(/[Ss][Ee][Cc][Tt][Ii][Oo][Nn]/, $.directive_keyword)),
        optional(field('fragment', alias(/[Ff][Rr][Aa][Gg][Mm][Ee][Nn][Tt]/, $.directive_keyword))),
        optional(field('union', alias(/[Uu][Nn][Ii][Oo][Nn]/, $.directive_keyword))),
        $.string_literal,
        optional(seq(',', $.section_type, optional($.section_address))),
        optional($.section_options)
      ),

    section_type: $ =>
      choice(
        /[Rr][Oo][Mm]0/,
        /[Rr][Oo][Mm][Xx]/,
        /[Ww][Rr][Aa][Mm]0/,
        /[Ww][Rr][Aa][Mm][Xx]/,
        /[Hh][Rr][Aa][Mm]/,
        /[Ss][Rr][Aa][Mm]/,
        /[Oo][Aa][Mm]/,
        /[Vv][Rr][Aa][Mm]/
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
        alias(/[Bb][Aa][Nn][Kk]/, 'BANK'),
        '[',
        field('bank', $.expression),
        ']'
      ),

    align_option: $ =>
      seq(
        alias(/[Aa][Ll][Ii][Gg][Nn]/, 'ALIGN'),
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
        field('keyword', alias(/[Dd][Ee][Ff]/, $.directive_keyword)),
        field('name', choice(
          $.identifier,
          $.raw_identifier,
          $.interpolatable_identifier
        )),
        choice(
          // String constant: DEF name EQUS "value" or #"value"
          seq(
            field('assign_type', alias(/[Ee][Qq][Uu][Ss]/, $.directive_keyword)),
            field('value', choice($.string_literal, $.raw_string_literal))
          ),
          // Numeric constant (immutable): DEF name EQU value
          seq(
            field('assign_type', alias(/[Ee][Qq][Uu]/, $.directive_keyword)),
            field('value', $.expression)
          ),
          // Variable (mutable): DEF name = value
          seq(
            field('assign_type', choice('=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '|=', '^=')),
            field('value', $.expression)
          ),
          // RS offset constants: DEF name RB/RW/RL count
          seq(
            field('assign_type', choice(/[Rr][Bb]/, /[Rr][Ww]/, /[Rr][Ll]/)),
            optional(field('value', $.expression))
          )
        )
      ),

    redef_directive: $ =>
      seq(
        field('keyword', alias(/[Rr][Ee][Dd][Ee][Ff]/, $.directive_keyword)),
        field('name', choice(
          $.identifier,
          $.raw_identifier,
          $.interpolatable_identifier
        )),
        choice(
          // String constant: REDEF name EQUS "value" or #"value"
          seq(
            field('assign_type', alias(/[Ee][Qq][Uu][Ss]/, $.directive_keyword)),
            field('value', choice($.string_literal, $.raw_string_literal))
          ),
          // Numeric constant: REDEF name EQU value
          seq(
            field('assign_type', alias(/[Ee][Qq][Uu]/, $.directive_keyword)),
            field('value', $.expression)
          ),
          // Variable: REDEF name = value
          seq(
            field('assign_type', choice('=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '|=', '^=')),
            field('value', $.expression)
          ),
          // RS offset constants: REDEF name RB/RW/RL count
          seq(
            field('assign_type', choice(/[Rr][Bb]/, /[Rr][Ww]/, /[Rr][Ll]/)),
            optional(field('value', $.expression))
          )
        )
      ),

    assert_directive: $ =>
      prec.right(seq(
        field('keyword', choice(
          alias(/[Aa][Ss][Ss][Ee][Rr][Tt]/, $.directive_keyword),
          alias(/[Ss][Tt][Aa][Tt][Ii][Cc]_[Aa][Ss][Ss][Ee][Rr][Tt]/, $.directive_keyword)
        )),
        // Optional severity with REQUIRED comma: ASSERT [severity,] condition [, message]
        optional(seq(
          field('severity', $.identifier),
          ','
        )),
        field('condition', $.expression),
        optional(seq(',', field('message', $.string_literal)))
      )),

    purge_directive: $ =>
      seq(
        field('keyword', alias(/[Pp][Uu][Rr][Gg][Ee]/, $.directive_keyword)),
        choice($.identifier, $.interpolatable_identifier, $.anonymous_label_ref, $.macro_argument),
        repeat(seq(',', choice($.identifier, $.interpolatable_identifier, $.anonymous_label_ref, $.macro_argument)))
      ),

    align_directive: $ =>
      seq(
        field('keyword', alias(/[Aa][Ll][Ii][Gg][Nn]/, $.directive_keyword)),
        field('align', $.expression),
        optional(seq(',', field('offset', $.expression)))
      ),

    ds_directive: $ =>
      seq(
        field('keyword', alias(/[Dd][Ss]/, $.directive_keyword)),
        choice(
          seq($.align_option, optional(seq(',', $.argument_list))),
          $.argument_list
        )
      ),

    shift_directive: $ =>
      prec.right(seq(
        field('keyword', alias(/[Ss][Hh][Ii][Ff][Tt]/, $.directive_keyword)),
        optional(field('count', $.expression))
      )),

    break_directive: $ =>
      field('keyword', alias(/[Bb][Rr][Ee][Aa][Kk]/, $.directive_keyword)),

    include_directive: $ =>
      seq(
        field('keyword', alias(/[Ii][Nn][Cc][Ll][Uu][Dd][Ee]/, $.directive_keyword)),
        field('path', $.string_literal)
      ),

    incbin_directive: $ =>
      seq(
        field('keyword', alias(/[Ii][Nn][Cc][Bb][Ii][Nn]/, $.directive_keyword)),
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
        field('keyword', alias(/[Ee][Xx][Pp][Oo][Rr][Tt]/, $.directive_keyword)),
        choice($.identifier, $.interpolatable_identifier, $.anonymous_label_ref, $.macro_argument),
        repeat(seq(',', choice($.identifier, $.interpolatable_identifier, $.anonymous_label_ref, $.macro_argument)))
      ),

    charmap_directive: $ =>
      seq(
        field('keyword', alias(/[Cc][Hh][Aa][Rr][Mm][Aa][Pp]/, $.directive_keyword)),
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
        field('keyword', alias(/[Nn][Ee][Ww][Cc][Hh][Aa][Rr][Mm][Aa][Pp]/, $.directive_keyword)),
        field('name', $.identifier),
        optional(seq(',', field('base', $.identifier)))
      ),

    setcharmap_directive: $ =>
      seq(
        field('keyword', alias(/[Ss][Ee][Tt][Cc][Hh][Aa][Rr][Mm][Aa][Pp]/, $.directive_keyword)),
        field('name', $.identifier)
      ),

    opt_directive: $ =>
      seq(
        field('keyword', alias(/[Oo][Pp][Tt]/, $.directive_keyword)),
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
        choice(
          // TODO: add the parameters to these directives
          /[Ee][Qq][Uu]/,
          /[Ee][Qq][Uu][Ss]/,
          /[Dd][Bb]/,
          /[Dd][Ww]/,
          /[Cc][Hh][Aa][Rr]/,
          /[Rr][Ee][Aa][Dd][Ff][Ii][Ll][Ee]/,
          /[Pp][Rr][Ii][Nn][Tt]/,
          /[Pp][Rr][Ii][Nn][Tt][Ll][Nn]/,
          /[Ff][Aa][Ii][Ll]/,
          /[Ww][Aa][Rr][Nn]/,
          /[Ii][Mm][Pp][Oo][Rr][Tt]/,
          /[Rr][Ss][Ss][Ee][Tt]/,
          /[Rr][Ss][Rr][Ee][Ss][Ee][Tt]/,
          /[Pp][Uu][Ss][Hh][Oo]/,
          /[Pp][Oo][Pp][Oo]/,
          /[Pp][Uu][Ss][Hh][Ss]/,
          /[Pp][Oo][Pp][Ss]/,
          /[Pp][Uu][Ss][Hh][Cc]/,
          /[Pp][Oo][Pp][Cc]/,
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

    label_definition: $ =>
      choice(
        $.global_label,
        $.local_label,
        $.anonymous_label
      ),

    global_label: $ =>
      choice(
        // identifier followed by ':' or '::' (via LABEL_TOKEN)
        seq(
          field('name', alias($._label_token, $.identifier)),
          field('export_marker', '::')
        ),
        seq(
          field('name', alias($._label_token, $.identifier)),
          ':'
        ),
        // raw identifiers: #load:, #IF:, #ELSE: - colon consumed but not in tree
        seq(
          field('name', $.raw_identifier),
          choice('::', ':')
        ),
      ),

    local_label: $ =>
      field('name', seq($.local_identifier, optional(':'))),

    anonymous_label: $ =>
      token(':'), // ':' at column ≥ 0

    // Local label / symbol reference like `.loop` or `Global.loop`
    local_identifier: $ =>
      token(
        choice(
          /\.[A-Za-z_][A-Za-z0-9_]*(?:\\@)?/,              // .local
          /[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z0-9_]*(?:\\@)?/  // Global.local
        )
      ),

    // Anonymous label reference like :+, :++, :-, :--
    anonymous_label_ref: $ =>
      token(/:[+-]+/),

    // ----- Instructions -----

    instruction_list: $ =>
      seq(
        $.instruction,
        repeat(seq('::', $.instruction))
      ),

    instruction: $ =>
      seq(
        field('opcode', choice(
          alias($._instruction_token, $.identifier),
          $.interpolatable_identifier
        )),
        optional($.operand_list)
      ),

    operand_list: $ =>
      seq(
        $.operand,
        repeat(seq(',', $.operand))
      ),

    operand: $ =>
      choice(
        $.address,
        $.local_identifier,
        $.anonymous_label_ref,
        $.expression
      ),

    address: $ =>
      choice(
        alias(token(/\[[Hh][Ll](\+|-|[Ii][Dd])\]/), $.hl_auto_address), // [HL+]/[HLI]/[HL-]/[HLD]
        seq('[', /[Hh]/, /[Ll]/, ']'), // [hl] form
        seq('[', $.expression, ']'),
      ),

    // ----- Expressions -----

    expression: $ =>
      choice(
        $.binary_expression,
        $.unary_expression,
        $.primary_expression
      ),

    primary_expression: $ =>
      choice(
        $.number_literal,
        $.string_literal,
        $.raw_string_literal,
        $.graphics_literal,
        $.char_literal,
        // FIXME: add back fragment literal support
        // $.fragment_literal,
        $.macro_argument,
        $.macro_arguments_spread,
        $.macro_unique_suffix,
        $.function_call,
        alias('@', $.identifier),
        alias($._register_token, $.register),
        $.identifier,
        $.raw_identifier,
        $.local_identifier,
        seq('(', $.expression, ')')
      ),

    function_call: $ =>
      seq(
        field('function', $.identifier),
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

    interpolated_symbol: $ =>
      seq(
        '{',
        optional($.format_specifier),
        $.identifier,
        '}'
      ),

    format_specifier: $ => /[+# 0-9.*A-Za-z]+/,

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
      choice(
        // Nested interpolation: {{name}} - try first as it's most specific
        seq(
          '{',
          field('inner', $.interpolation),
          '}'
        ),
        // Format with symbol: {fmt:name} - must try before simple symbol
        prec(1, seq(
          '{',
          field('format', $.format_spec),
          field('symbol', choice($.identifier, $.raw_identifier)),
          '}'
        )),
        // Simple symbol: {name} - lowest priority
        seq(
          '{',
          field('symbol', choice($.identifier, $.raw_identifier)),
          '}'
        )
      ),

    format_spec: $ =>
      token(seq(
        optional(choice('+', ' ')),  // sign
        optional('#'),                // exact
        optional('-'),                // align
        optional('0'),                // pad
        optional(/[0-9]+/),           // width
        optional(seq('.', /[0-9]*/)), // frac
        optional(/q[0-9]+/),          // prec
        choice('d', 'u', 'x', 'X', 'b', 'o', 'f', 's'), // type
        ':'                           // disambiguator
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

    // Identifiers for opcodes, symbols, etc. (no dots except standalone dot)
    identifier: $ =>
      token(choice(
        /[A-Za-z_][A-Za-z0-9_]*(?:\\@)?/,
        '.',  // Standalone dot is a valid identifier in RGBDS
        /-?[A-Za-z_][A-Za-z0-9_.=-]*/ // OPT-style identifiers (Wtruncation=256, -Weverything, Q.16)
      )),

    // Raw identifiers allow using reserved keywords as symbols
    // e.g. #load, #LOAD, #IF, etc.
    raw_identifier: $ =>
      token(seq('#', /[A-Za-z_][A-Za-z0-9_]*(?:\\@)?/)),

    // Interpolatable identifier: must start with an interpolation per RGBDS (e.g., {name}, {name}_SUFFIX)
    interpolatable_identifier: $ =>
      prec.left(seq(
        $.interpolation,
        repeat(choice($.identifier_fragment, $.interpolation))
      )),

    // Identifier fragment: part of identifier without braces
    // Must be immediate to prevent whitespace between parts
    identifier_fragment: $ =>
      token.immediate(/[A-Za-z_][A-Za-z0-9_]*/),
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
