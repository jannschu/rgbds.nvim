-- RGBASM filetype plugin

-- Set comment string for commenting/uncommenting
vim.bo.commentstring = "; %s"

-- Set up indentation
vim.bo.expandtab = false  -- Use tabs (common in assembly)
vim.bo.tabstop = 8
vim.bo.shiftwidth = 8
vim.bo.softtabstop = 8

-- Enable tree-sitter based folding
vim.wo.foldmethod = "expr"
vim.wo.foldexpr = "v:lua.vim.treesitter.foldexpr()"
vim.wo.foldenable = false  -- Don't fold by default

-- Enable tree-sitter based indentation
vim.bo.indentexpr = "v:lua.vim.treesitter.get_indent()"
