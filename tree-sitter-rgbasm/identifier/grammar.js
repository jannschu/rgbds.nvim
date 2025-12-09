/**
 * @file RgbasmIdentifier grammar for tree-sitter
 * @author Jannik Schuerg <jannik.schuerg@posteo.de>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "rgbasm_identifier",

  externals: $ => [
    $._identifier,
    $.error,
  ],

  rules: {
    input: $ => seq(
      choice(
        $.global,
        $.qualified,
        $.local,
      ),
      // for testing
      repeat(
        seq(
          '\n',
          choice(
            $.global,
            $.qualified,
            $.local,
            $.comment,
          ),
        ),
      ),
    ),

    comment: $ => token(seq(';', /[^\n]*/)),

    qualified: $ => seq(
      $.global,
      $.local,
    ),

    raw_marker: $ => '#',

    global: $ => choice(
      $._identifier,
      seq(
        $.raw_marker,
        choice(
          /\w[\w#$@]*/,
          $._interpolation,
        ),
        repeat(choice($._interpolation, /[\w#$@]+/)),
      ),
      seq(
        $._identifier,
        $._interpolation,
        repeat(choice($._interpolation, /[\w#$@]+/)),
      ),
      seq(
        $._interpolation,
        repeat(choice($._interpolation, /[\w#$@]+/)),
      ),
    ),

    local: $ => seq(
      ".",
      repeat1(
        choice(
          /[\w#$@]+/,
          $._interpolation,
        ),
      ),
    ),

    format_string: $ => token(seq(
      optional(/[\+ ]/), // sign
      choice(
        // exact option, for non decimal types
        seq(
          '#',
          optional('-'),   // align left
          optional('0'),   // zero pad
          optional(/\d+/), // width
          choice(
            seq(
              optional(seq('.', /\d*/)),
              optional(seq('q', /\d+/)),
              'f',
            ),
            /[xXbos]/,
          ),
        ),
        // without exact option
        seq(
          optional('-'),   // align left
          optional('0'),   // zero pad
          optional(/\d+/), // width
          optional(seq('.', /\d*/)),
          optional(seq('q', /\d+/)),
          choice(
            seq(
              optional(seq('.', /\d*/)),
              optional(seq('q', /\d+/)),
              'f',
            ),
            /[duxXbos]/,
          ),
        ),
      ),
    )),

    _interpolation: $ => choice(
      $.variable_interpolation,
      $.macro_interpolation,
    ),

    variable_interpolation: $ => seq(
      "{",
      optional(seq($.format_string, ':')),
      $.global,
      "}",
    ),

    macro_num_arg: $ => /\\[1-9]|\\<-?[1-9]\d*>/,

    macro_uniq: $ => /\\@/,

    macro_interpolation: $ =>
      choice(
        $.macro_num_arg,
        $.macro_uniq,
        seq('\\<', $.global, '>'),
      ),
  }
});
