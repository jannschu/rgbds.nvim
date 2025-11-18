; Indent bodies of block directives
((if_block) @indent.begin
  (#set! indent.immediate 1))

((elif_clause) @indent.branch)

((else_clause) @indent.branch)

((macro_definition) @indent.begin
  (#set! indent.immediate 1))

((rept_block) @indent.begin
  (#set! indent.immediate 1))

((for_block) @indent.begin
  (#set! indent.immediate 1))

((union_block) @indent.begin
  (#set! indent.immediate 1))

((union_block
   separator: (directive_keyword)) @indent.branch)

((fragment_literal) @indent.begin
  (#set! indent.immediate 1))

((load_block) @indent.begin
  (#set! indent.immediate 1))

; Fragment literal terminator resets indent
((fragment_literal "]]") @indent.dedent)

; Dedent on block terminators
; Note: Case-insensitive per RGBASM spec (rgbasm.5:101-102)
((directive_keyword) @indent.dedent
  (#match? @indent.dedent "^(?i)(ENDM|ENDC|ENDR|ENDU|ENDL)$"))

; Top-level constructs stay at column 0
((global_label) @indent.zero)

((section_directive) @indent.zero)
