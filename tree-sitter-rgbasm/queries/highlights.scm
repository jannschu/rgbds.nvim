; ==============================================================================
; Labels and Label Blocks
; ==============================================================================

; Global label names - exported (::)
((global_label_block
  (global_symbol) @module.builtin
  "::" @punctuation.bracket.label.export
  (#set! priority 120)))

; Global label names - non-exported (:)
((global_label_block
  (global_symbol) @module
  ":" @punctuation.bracket.label
  (#set! priority 120)))

; Local label names (includes both .local and Parent.local forms)
((local_label_block
  [(local_symbol) (qualified_symbol)] @label))

(local_label_block ":" @punctuation.bracket)

; Anonymous labels
(anonymous_label) @label

(uniqueness_affix) @punctuation.special


; ==============================================================================
; Variables and Identifiers
; ==============================================================================

(anonymous_label_ref) @label

; ==============================================================================
; Instructions
; ==============================================================================

(generic_instruction
  mnemonic: (instruction_name) @function.call)

(call_instruction
  mnemonic: (instruction_name) @function.call)

(jp_instruction
  mnemonic: (instruction_name) @function.call)

(jr_instruction
  mnemonic: (instruction_name) @function.call)

(ret_instruction
  mnemonic: (instruction_name) @function.call)

(register) @variable.builtin

(condition_code) @keyword.conditional

; ==============================================================================
; Directives - Control Flow
; ==============================================================================

[
  (if_keyword)
  (elif_clause)
  (else_clause)
  (endc_keyword)
] @keyword.conditional

[
 (rept_keyword)
 (for_keyword)
 (endr_keyword)
] @keyword.repeat

; ==============================================================================
; Directives - Definitions and Declarations
; ==============================================================================

(def_keyword) @keyword.directive.define

[
 (equ_keyword)
 (equs_keyword)
] @keyword.modifier

; DEF x (RB | RW | RL) 1
(r_keyword) @keyword.modifier

(def_directive
  assign_type: ["=" "+=" "-=" "*=" "/=" "%=" "<<=" ">>=" "&=" "|=" "^="] @operator)

; ==============================================================================
; Directives - Sections and Blocks
; ==============================================================================

[
 (section_keyword)
 (load_keyword)
 (pushs_keyword)
] @markup.heading

[
 (fragment_keyword)
 (union_keyword)
 (bank_option_keyword)
 (align_option_keyword)
] @keyword.modifier

(section_type) @type

(load_block end: _ @markup.heading)
(section_block end: _ @markup.heading)
(pushs_block end: _ @markup.heading)


; ==============================================================================
; Directives - Options
; ==============================================================================

(opt_arg) @string.special

; ==============================================================================
; Directives - Assertions and Misc
; ==============================================================================

(directive_keyword) @keyword.directive

(severity) @keyword.modifier

; Include directive keyword as preprocessor
(include_keyword) @keyword.directive.include

(include_directive
  (argument_list 
    (string_literal) @string.special.path (#set! priority 105)))

; Include paths
(simple_directive
  keyword: _ @_kw
  (argument_list (string_literal) @string.special.path (#set! priority 105))
  (#match? @_kw "^[Ii][Nn][Cc][Bb][Ii][Nn]$"))

; ==============================================================================
; Macros
; ==============================================================================

(macro_keyword) @keyword.directive.macro
(macro_definition
  end: _ @keyword.directive.define)

(macro_definition
  name: (variable) @function.macro (#set! priority 120))

; Macro invocations - global identifier nodes
(macro_invocation
  (variable) @function.macro (#set! priority 120))

; Macro arguments and unique affix
(macro_argument) @variable.parameter
(macro_arguments_spread) @variable.parameter

; ==============================================================================
; Functions
; ==============================================================================

(_ (function_name) @function.builtin)

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

(string_literal
  (escape) @string.escape)

(string_literal
  [(macro_argument) (macro_arguments_spread)] @punctuation.special)

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

; Quiet token for suppressing error backtraces
(quiet) @punctuation.special

(line_continuation char: _ @punctuation.bracket)

; ==============================================================================
; Fragment Literals
; ==============================================================================

(fragment_literal) @punctuation.bracket
