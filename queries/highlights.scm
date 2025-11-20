; Labels
(global_label
  name: (identifier) @label)

(global_label
  name: (raw_identifier) @label)

; Highlight the export marker :: differently
(global_label
  export_marker: "::") @keyword.directive

(local_label) @label

(anonymous_label) @label

(anonymous_label_ref) @label

(local_identifier) @label

; Instructions (opcodes)
(instruction
  opcode: (identifier) @function.builtin)

(instruction
  opcode: (interpolatable_identifier) @function.builtin)

; Registers
(register) @constant.builtin

; HL auto-inc/dec address forms
(hl_auto_address) @constant.builtin

; Control flow keywords
((directive_keyword) @keyword.conditional
  (#match? @keyword.conditional "^\\c\\(IF\\|ELIF\\|ELSE\\|ENDC\\)$"))

((directive_keyword) @keyword.repeat  
  (#match? @keyword.repeat "^\\c\\(REPT\\|FOR\\|ENDR\\)$"))

; Definition/declaration keywords
((directive_keyword) @keyword.directive.define
  (#match? @keyword.directive.define "^\\c\\(DEF\\|REDEF\\|EQU\\|EQUS\\|MACRO\\|ENDM\\|PURGE\\)$"))

; Import/include keywords  
((directive_keyword) @keyword.import
  (#match? @keyword.import "^\\c\\(INCLUDE\\|INCBIN\\)$"))

(section_type) @module

; Macros
(macro_definition
  name: (identifier) @function.macro)

; Macro invocations
(macro_invocation
  name: (identifier) @function.macro)

; Macro argument references inside macro bodies (\1, \<arg>)
(macro_argument) @variable.parameter
(macro_arguments_spread) @variable.parameter
(macro_unique_suffix) @constant.builtin

; Macro call arguments (raw text passed to macros)
(macro_argument_raw) @markup.raw

(shift_directive
  keyword: (directive_keyword) @keyword.directive)

(charmap_directive
  keyword: (directive_keyword) @keyword.directive)

(newcharmap_directive
  keyword: (directive_keyword) @keyword.directive)

(setcharmap_directive
  keyword: (directive_keyword) @keyword.directive)

(load_block
  keyword: (directive_keyword) @keyword.directive
  end: (directive_keyword) @keyword.directive)

(union_block
  keyword: (directive_keyword) @keyword.directive
  separator: (directive_keyword) @keyword.directive
  end: (directive_keyword) @keyword.directive)

(fragment_literal) @constant.builtin

((section_directive
   fragment: (directive_keyword) @keyword.directive))

((section_directive
   union: (directive_keyword) @keyword.directive))

; Directives with specific highlighting
(section_directive
  keyword: (directive_keyword) @keyword.directive)

; Section name as module (direct string literal, no field name)
(section_directive
  (string_literal) @module)

; SECTION options (BANK, ALIGN)
(bank_option
  "BANK" @keyword.modifier)

(align_option
  "ALIGN" @keyword.modifier)

; Align directive content [value] 
(align_option
  align: (_) @attribute.builtin)

(align_option
  offset: (_) @attribute.builtin)

(def_directive
  keyword: (directive_keyword) @keyword.directive)

(def_directive
  name: (identifier) @variable)

(def_directive
  name: (raw_identifier) @variable)

(def_directive
  name: (interpolatable_identifier) @variable)

; Highlight EQU/EQUS (constants) differently from = (variables)
(def_directive
  assign_type: (directive_keyword) @keyword.modifier)

; Highlight assignment operators
(def_directive
  assign_type: ["=" "+=" "-=" "*=" "/=" "%=" "<<=" ">>=" "&=" "|=" "^="] @operator)

(redef_directive
  keyword: (directive_keyword) @keyword.directive)

(redef_directive
  name: (identifier) @variable)

(redef_directive
  name: (raw_identifier) @variable)

(redef_directive
  name: (interpolatable_identifier) @variable)

; Highlight EQU/EQUS (constants) differently from = (variables)
(redef_directive
  assign_type: (directive_keyword) @keyword.modifier)

; Highlight assignment operators
(redef_directive
  assign_type: ["=" "+=" "-=" "*=" "/=" "%=" "<<=" ">>=" "&=" "|=" "^="] @operator)

(assert_directive
  keyword: (directive_keyword) @keyword.directive)

(assert_directive
  severity: _ @comment.error)

(purge_directive
  keyword: (directive_keyword) @keyword.directive)

(align_directive
  keyword: (directive_keyword) @keyword.directive)

(ds_directive
  keyword: (directive_keyword) @keyword.directive)

(break_directive
  keyword: (directive_keyword) @keyword.directive)

(include_directive
  keyword: (directive_keyword) @keyword.directive)

(include_directive
  path: (string_literal) @string.special)

(incbin_directive
  keyword: (directive_keyword) @keyword.directive)

(incbin_directive
  path: (string_literal) @string.special)

(export_directive
  keyword: (directive_keyword) @keyword.directive)

(opt_directive
  keyword: (directive_keyword) @keyword.directive)

(simple_directive
  keyword: (directive_keyword) @keyword.directive)

; Built-in functions (math/string/etc.)
; Note: Case-insensitive per RGBASM spec (rgbasm.5:101-102)
(function_call
  function: (identifier) @function.builtin
  (#match? @function.builtin
    "^\\c\\(HIGH\\|LOW\\|BANK\\|SIN\\|COS\\|TAN\\|ASIN\\|ACOS\\|ATAN\\|ATAN2\\|MUL\\|DIV\\|POW\\|LOG\\|CEIL\\|FLOOR\\|FMOD\\|ROUND\\|BITWIDTH\\|TZCOUNT\\|STRLEN\\|STRCAT\\|STRCMP\\|STRFIND\\|STRRFIND\\|STRRPL\\|STRSLICE\\|STRUPR\\|STRLWR\\|STRFMT\\|STRCHAR\\|STRSUB\\|BYTELEN\\|STRBYTE\\|CHARLEN\\|CHARSIZE\\|CHARVAL\\|INCHARMAP\\|REVCHAR\\|CHARCMP\\|READFILE\\|SIZEOF\\|DEF\\|ISCONST\\|SECTION\\|STARTOF\\|HRAM\\|WRAM0\\|VRAM\\|SRAM\\|OAM\\)$"))

((primary_expression
   (identifier) @function.builtin)
  (#match? @function.builtin
    "^\\c\\(HIGH\\|LOW\\|BANK\\|SIN\\|COS\\|TAN\\|ASIN\\|ACOS\\|ATAN\\|ATAN2\\|MUL\\|DIV\\|POW\\|LOG\\|CEIL\\|FLOOR\\|FMOD\\|ROUND\\|BITWIDTH\\|TZCOUNT\\|STRLEN\\|STRCAT\\|STRCMP\\|STRFIND\\|STRRFIND\\|STRRPL\\|STRSLICE\\|STRUPR\\|STRLWR\\|STRFMT\\|STRCHAR\\|STRSUB\\|BYTELEN\\|STRBYTE\\|CHARLEN\\|CHARSIZE\\|CHARVAL\\|INCHARMAP\\|REVCHAR\\|CHARCMP\\|READFILE\\|SIZEOF\\|DEF\\|ISCONST\\|SECTION\\|STARTOF\\|HRAM\\|WRAM0\\|VRAM\\|SRAM\\|OAM\\)$"))

; Special constants
; Note: Case-insensitive per RGBASM spec (rgbasm.5:101-102)
((identifier) @constant.builtin
  (#match? @constant.builtin
    "^\\c\\(_PI\\|_RS\\|_NARG\\|__LINE__\\|__FILE__\\|__DATE__\\|__TIME__\\|__ISO_8601_LOCAL__\\|__ISO_8601_UTC__\\|__UTC_YEAR__\\|__UTC_MONTH__\\|__UTC_DAY__\\|__UTC_HOUR__\\|__UTC_MINUTE__\\|__UTC_SECOND__\\)$"))

((identifier) @constant.builtin
  (#eq? @constant.builtin "@"))

; Literals
; Fixed-point literals (decimal notation) - must come before general @number
(number_literal) @number.float
  (#match? @number.float "\\.[0-9]")

(number_literal) @number

(graphics_literal) @number

(char_literal) @number

; String literals and interpolations
(string_literal) @string

(raw_string_literal) @string

(raw_string) @string

(interpolation
  "{" @punctuation.special
  "}" @punctuation.special)

(interpolation
  format: (format_spec) @keyword.operator)

(interpolation
  symbol: (identifier) @variable)

; Interpolation in identifier contexts
(interpolatable_identifier
  (interpolation
    "{" @punctuation.special
    "}" @punctuation.special))

(interpolatable_identifier
  (interpolation
    format: (format_spec) @keyword.operator))

(interpolatable_identifier
  (interpolation
    symbol: (identifier) @variable))

(interpolatable_identifier
  (identifier_fragment) @variable)

; Comments with special patterns
[
  (comment)
  (block_comment)
  (inline_comment)
] @comment @spell

; TODO/FIXME comments
((comment) @comment.todo
  (#match? @comment.todo "TODO\\|FIXME\\|XXX"))

((comment) @comment.error  
  (#match? @comment.error "ERROR\\|BUG\\|HACK"))

((comment) @comment.warning
  (#match? @comment.warning "WARNING\\|WARN\\|FIX"))

; Operators
[
  "+"
  "-"
  "*"
  "/"
  "%"
  "<<"
  ">>"
  ">>>"
  "&"
  "|"
  "^"
  "~"
  "!"
  "**"
  "=="
  "!="
  "==="
  "!==" 
  "<="
  ">="
  "<"
  ">"
  "++"
  "&&"
  "||"
] @operator

; Assignment operators
[
  "="
  "+="
  "-="
  "*="
  "/="
  "%="
  "<<="
  ">>="
  "&="
  "|="
  "^="
] @operator

; Brackets and delimiters
[
  "("
  ")"
  "["
  "]"
] @punctuation.bracket

[
  ","
] @punctuation.delimiter

; Label colons
(global_label ":" @punctuation.delimiter)
(local_label ":" @punctuation.delimiter)

; Instruction separator
"::" @punctuation.delimiter
