-- Filetype detection for RGBASM (Game Boy assembly)
vim.filetype.add({
  extension = {
    asm = function(path, bufnr)
      -- Check if it's RGBASM by looking for RGBASM-specific syntax
      local lines = vim.filetype.getlines(bufnr, 1)
      if lines and #lines > 0 then
        local first_line = lines[1]:lower()
        if first_line:match("^%s*section%s+") or
           first_line:match("^%s*def%s+") or
           first_line:match("rgbasm") or
           first_line:match("rgbds") then
          return "rgbasm"
        end
      end
      -- Default to asm if can't determine
      return "asm"
    end,
    inc = "rgbasm",
    gbz80 = "rgbasm",
  },
  pattern = {
    [".*%.z80"] = "rgbasm",
  }
})

-- Register the parser
vim.treesitter.language.register("rgbasm", "rgbasm")

-- Tree-sitter highlight group links to match filtered theme groups
-- (kept minimal so users can override in colorscheme)
local links = {
  ["@keyword.directive"]   = "PreProc",
  ["@keyword.modifier"]    = "Keyword",
  ["@punctuation.bracket"] = "Delimiter",
  ["@punctuation.delimiter"] = "Delimiter",
  ["@string.special"]      = "SpecialChar",
}

for capture, group in pairs(links) do
  vim.api.nvim_set_hl(0, capture, { link = group, default = true })
end
