; Block constructs with immediate indentation
([
  (if_block)
  (macro_definition)
  (rept_block)
  (for_block)
  (union_block)
  (fragment_literal)
  (load_block)
] @indent.begin
  (#set! indent.immediate 1))

; Label block constructs (hierarchical structure for label-scoped indentation)
; These create parent-child relationships so instructions under labels can be indented
([
  (global_label_block)
  (local_label_block)
] @indent.begin
  (#set! indent.immediate 1))

; Branch constructs (intermediate indentation points)
[
  (elif_clause)
  (else_clause)
] @indent.branch

; Union separator branches
(union_block
  (directive_keyword)) @indent.branch

; Parentheses and brackets alignment - use primary_expression for parentheses
; Note: RGBASM grammar handles parentheses within primary_expression
((argument_list) @indent.align
  (#set! indent.open_delimiter "(")
  (#set! indent.close_delimiter ")"))

; Fragment literal end marker
(fragment_literal "]]") @indent.end

; Block terminators (parsed as end fields within block nodes)
(if_block
  end: (directive_keyword) @indent.end)

(macro_definition  
  end: (directive_keyword) @indent.end)

(rept_block
  end: (directive_keyword) @indent.end)

(for_block
  (directive_keyword) @indent.end)

(union_block
  (directive_keyword) @indent.end)

(load_block
  end: (directive_keyword) @indent.end)

; Top-level constructs at column 0
[
  (section_directive)
] @indent.zero

; Comments and subsequent labels preserve indentation
(inline_comment) @indent.auto
