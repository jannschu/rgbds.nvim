; Block constructs with immediate indentation
([
  (if_block)
  (macro_definition)
  (rept_block)
  (for_block)
  (union_block)
  (fragment_literal)
  (load_block)
  (pushs_block)
] @indent.begin
  (#set! indent.immediate 1))

; Label blocks - indent the body but not the label header line
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

; Parentheses and brackets alignment
((argument_list) @indent.align
  (#set! indent.open_delimiter "(")
  (#set! indent.close_delimiter ")"))

; Fragment literal end marker
(fragment_literal
  end: "]]" @indent.end)

; Block terminators (parsed as end fields within block nodes)
(if_block
  end: (directive_keyword) @indent.end)

(macro_definition
  end: (directive_keyword) @indent.end)

(rept_block
  end: (directive_keyword) @indent.end)

(for_block
  end: (directive_keyword) @indent.end)

(union_block
  end: (directive_keyword) @indent.end)

(load_block
  end: (directive_keyword) @indent.end)

(pushs_block
  end: (directive_keyword) @indent.end)

; Section directive at column 0
(section_directive) @indent.zero

; ENDSECTION terminator
(section_block
  end: (directive_keyword) @indent.end)

; Comments preserve indentation
(inline_comment) @indent.auto
