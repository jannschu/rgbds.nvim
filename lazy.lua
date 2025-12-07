---@type LazyPluginSpec
local spec = {
	"jannschu/rgbds.nvim",
	ft = { "rgbasm" },
	init = function(spec)
		require("rgbds").init(spec.dir)
	end,
	build = ":TSUpdate rgbasm rgbasm_identifier",
	dependencies = {
		"nvim-treesitter/nvim-treesitter",
	},
}
return spec
