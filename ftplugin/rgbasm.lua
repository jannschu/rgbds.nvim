vim.treesitter.start()

-- Set comment string for commenting/uncommenting
vim.bo.commentstring = "; %s"

vim.bo.expandtab = true
vim.bo.shiftwidth = 4

vim.bo.autoindent = true
vim.bo.smartindent = false
vim.bo.cindent = false

vim.wo.foldexpr = "v:lua.vim.treesitter.foldexpr()"
vim.wo.foldmethod = "expr"
