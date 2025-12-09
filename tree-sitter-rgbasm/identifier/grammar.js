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
          $.interpolation,
        ),
        repeat(choice($.interpolation, /[\w#$@]+/)),
      ),
      seq(
        $._identifier,
        $.interpolation,
        repeat(choice($.interpolation, /[\w#$@]+/)),
      ),
      seq(
        $.interpolation,
        repeat(choice($.interpolation, /[\w#$@]+/)),
      ),
    ),

    local: $ => seq(
      ".",
      repeat1(
        choice(
          /[\w#$@]+/,
          $.interpolation,
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

    uniqueness_affix: $ => token.immediate('\\@'),

    interpolation: $ => seq(
      "{",
      optional(seq($.format_string, ':')),
      $.global,
      optional($.uniqueness_affix),
      "}",
    ),
  }
});
