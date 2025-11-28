vim.treesitter.start()

-- Set comment string for commenting/uncommenting
vim.bo.commentstring = "; %s"

-- Set up indentation
-- FIXME: Should not be hardcoded?
vim.bo.expandtab = true
vim.bo.tabstop = 2
vim.bo.shiftwidth = 2
vim.bo.softtabstop = 2

-- Enable autoindent but disable smart/cindent to let indentexpr work
vim.bo.autoindent = true
vim.bo.smartindent = false
vim.bo.cindent = false
