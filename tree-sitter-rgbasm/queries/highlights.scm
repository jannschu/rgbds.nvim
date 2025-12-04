; ==============================================================================
; Labels and Label Blocks
; ==============================================================================

; Global label names - exported (::)
((global_label_block
  (global_identifier) @module.builtin
  "::" @punctuation.bracket.label.export))

; Global label names - non-exported (:)
((global_label_block
  (global_identifier) @module
  ":" @punctuation.bracket.label))

; Local label names (includes both .local and Parent.local forms)
((local_label_block
  [(local_identifier) (qualified_identifier)] @label))

(local_label_block ":" @punctuation.bracket)

(qualified_identifier "." @punctuation.delimiter)

(local_identifier "." @punctuation.delimiter) @label

; Anonymous labels
(anonymous_label) @label

(uniqueness_affix) @punctuation.special


; ==============================================================================
; Variables and Identifiers
; ==============================================================================

(anonymous_label_ref) @label

(expression 
  (identifier
    (global_identifier
      (symbol) @constant
        (#match? @constant "^r?[A-Z][A-Z_]+"))))
(expression 
  (identifier
    (global_identifier
      (symbol) @variable
        (#not-match? @variable "^r?[A-Z][A-Z_]+"))))

; ==============================================================================
; Instructions
; ==============================================================================

(instruction
  opcode: (instruction_name) @function.method.call)

(register) @variable.builtin

(condition_code) @keyword.conditional

; ==============================================================================
; Directives - Control Flow
; ==============================================================================

(if_block
  keyword: (directive_keyword) @keyword.conditional
  end: (directive_keyword) @keyword.conditional)

(elif_clause
  (directive_keyword) @keyword.conditional)

(else_clause
  (directive_keyword) @keyword.conditional)

(rept_block
  keyword: (directive_keyword) @keyword.repeat
  end: (directive_keyword) @keyword.repeat)

(for_block
  (directive_keyword) @keyword.repeat)

; ==============================================================================
; Directives - Definitions and Declarations
; ==============================================================================

(def_directive
  keyword: (directive_keyword) @keyword.directive.define
  name: (global_identifier) @variable)

(def_directive
  assign_type: (directive_keyword) @keyword.modifier)  ; EQU, EQUS, RB, RW, RL

(def_directive
  assign_type: ["=" "+=" "-=" "*=" "/=" "%=" "<<=" ">>=" "&=" "|=" "^="] @operator)

; ==============================================================================
; Directives - Sections and Blocks
; ==============================================================================

(section_directive
  keyword: (directive_keyword) @markup.heading)

(section_directive
  fragment: (directive_keyword) @keyword.modifier)

(section_directive
  union: (directive_keyword) @keyword.modifier)

; ENDSECTION keyword
(section_block
  (directive_keyword) @markup.heading)

(section_type) @type

(bank_option
  "BANK" @keyword.modifier)

(align_option
  "ALIGN" @keyword.modifier
  align: (_) @attribute.builtin
  offset: (_)? @attribute.builtin)

(load_block
  keyword: (directive_keyword) @markup.heading
  end: (directive_keyword) @markup.heading)

(pushs_block
  keyword: (directive_keyword) @markup.heading
  end: (directive_keyword) @markup.heading)

(union_block
  keyword: (directive_keyword) @keyword.directive
  end: (directive_keyword) @keyword.directive)

(nextu_block
  keyword: (directive_keyword) @keyword.directive)

; ==============================================================================
; Directives - Options
; ==============================================================================

(opt_directive
  keyword: (directive_keyword) @keyword.directive)

(opt_arg) @string.special

(pusho_directive
  keyword: (directive_keyword) @keyword.directive)

(popo_directive
  keyword: (directive_keyword) @keyword.directive)

; ==============================================================================
; Directives - Assertions and Misc
; ==============================================================================

(assert_directive
  keyword: (directive_keyword) @keyword.directive)

(severity) @comment.error

(export_directive
  keyword: (directive_keyword) @keyword.directive)

(ds_directive
  keyword: (directive_keyword) @keyword.directive)

(simple_directive
  keyword: (directive_keyword) @keyword.directive)

; Include directive keyword as preprocessor
(include_directive
  keyword: (directive_keyword) @keyword.directive.include)

; Include paths
((simple_directive
   keyword: (directive_keyword) @_kw
   (argument_list (expression (string_literal) @string.special)))
  (#any-of? @_kw "INCBIN"))

; ==============================================================================
; Macros
; ==============================================================================

(macro_definition
  keyword: (directive_keyword) @keyword.directive.define
  end: (directive_keyword) @keyword.directive.define)

; Macro invocations - global identifier nodes
(macro_invocation
  (global_identifier) @function.macro)

; Macro arguments and unique affix
(macro_argument) @variable.parameter
(macro_arguments_spread) @variable.parameter

; ==============================================================================
; Functions
; ==============================================================================

; Standard function calls
(function_call
  (function_name) @function.builtin)

; Special functions with section type arguments
(startof_function
  (function_name) @function.builtin)

(sizeof_function
  (function_name) @function.builtin)

; ==============================================================================
; Constants and Built-ins
; ==============================================================================

(constant) @constant.builtin

; ==============================================================================
; Literals
; ==============================================================================

; Fixed-point must come before general numbers
((number_literal) @number.float
  (#match? @number.float "\\.[0-9]"))

(number_literal) @number
(graphics_literal) @number
(char_literal) @character

; ==============================================================================
; Strings and Interpolation
; ==============================================================================

(string_literal) @string
(raw_string_literal) @string

(interpolation
  "{" @punctuation.special
  "}" @punctuation.special)

(interpolation
  format: (format_spec) @keyword.operator)

; Interpolation content highlighting
(interpolation
  (symbol) @variable)

(interpolation
  (raw_symbol) @variable)

; Symbols in interpolated identifiers are handled by the interpolation patterns above
; (The _interpolated_* nodes are internal and can't be queried directly)

; ==============================================================================
; Comments
; ==============================================================================

[
  (block_comment)
  (inline_comment)
] @comment @spell

; ==============================================================================
; Operators and Punctuation
; ==============================================================================

[
  "+" "-" "*" "/" "%"
  "<<" ">>" ">>>"
  "&" "|" "^" "~" "!"
  "**"
  "==" "!=" "===" "!=="
  "<=" ">=" "<" ">"
  "++"
  "&&" "||"
] @operator

["(" ")" "[" "]"] @punctuation.bracket
[","] @punctuation.delimiter

; Instruction separator
; "::" @punctuation.delimiter

; Quiet token for suppressing error backtraces
(quiet) @punctuation.special

; ==============================================================================
; Fragment Literals
; ==============================================================================

(fragment_literal) @punctuation.bracket
