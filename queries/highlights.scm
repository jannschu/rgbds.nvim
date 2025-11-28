; ==============================================================================
; Labels and Label Blocks
; ==============================================================================

; Global label names - exported (::)
(global_label_block
  name: (label) @module.builtin
  "::")

(global_label_block
  (raw_identifier) @module.builtin
  "::")

; Global label names - non-exported (:)
(global_label_block
  name: (label) @module
  ":")

(global_label_block
  (raw_identifier) @module
  ":")

; Export marker :: for global labels
(global_label_block
  "::" @keyword.directive)

; Local label names
(local_label_block
  name: (local) @label)

; Local label references in expressions
(expression
  (local) @variable.member)

; Anonymous labels
(anonymous_label) @label
(anonymous_label_ref) @label

; Label colons as punctuation
(global_label_block ":" @punctuation.delimiter)
(local_label_block ":" @punctuation.delimiter)

(uniqueness_affix) @punctuation.special

; ==============================================================================
; Instructions
; ==============================================================================

(instruction
  opcode: (instruction_name) @function.builtin)

(register) @constant

(condition_code
  condition: _ @keyword.conditional)

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
  name: [(symbol) (raw_identifier) (interpolatable_identifier)] @variable)

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
  fragment: (directive_keyword) @keyword.directive)

(section_directive
  union: (directive_keyword) @keyword.directive)

; ENDSECTION keyword
(section_block
  (directive_keyword) @markup.heading)

; Section name highlighting
(section_directive
  (string_literal) @module)

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

; Include paths
((simple_directive
   keyword: (directive_keyword) @_kw
   (argument_list (expression (string_literal) @string.special)))
  (#any-of? @_kw "INCLUDE" "INCBIN"))

; ==============================================================================
; Macros
; ==============================================================================

(macro_definition
  keyword: (directive_keyword) @keyword.directive.define
  end: (directive_keyword) @keyword.directive.define)

; Macro invocations - symbol nodes without affix
(macro_invocation
  (symbol) @function.macro)

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

(interpolation
  name: (interpolation_content) @variable)

(interpolatable_identifier
  (interpolation
    "{" @punctuation.special
    "}" @punctuation.special))

(interpolatable_identifier
  (interpolation
    format: (format_spec) @keyword.operator))

(interpolatable_identifier
  (interpolation
    name: (interpolation_content) @variable))

(interpolatable_identifier
  (identifier_fragment) @variable)

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
"::" @punctuation.delimiter

; ==============================================================================
; Fragment Literals
; ==============================================================================

(fragment_literal) @constant.builtin
