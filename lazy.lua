---@type LazyPluginSpec
local spec = {
	"jannschu/rgbds.nvim",
	ft = { "rgbasm" },
	init = function(spec)
		vim.filetype.add({
			extension = {
				-- TODO: refine this
				asm = "rgbasm",
				s = "rgbasm",
				gbz80 = "rgbasm",
				z80 = "rgbasm",
				inc = "rgbasm",
			},
			pattern = {
				[".*%.rgbasm"] = "rgbasm",
			},
		})
		vim.api.nvim_create_autocmd("User", {
			pattern = "TSUpdate",
			callback = function()
				require("nvim-treesitter.parsers").rgbasm = {
					install_info = {
						path = spec.dir,
						location = "tree-sitter-rgbasm",
						generate = false,
						queries = "tree-sitter-rgbasm/queries",
					},
					filetype = "rgbasm",
				}
			end,
		})
	end,
	build = ":TSUpdate rgbasm",
	dependencies = {
		"nvim-treesitter/nvim-treesitter",
	},
}
return spec
