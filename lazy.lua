---@type LazyPluginSpec
local spec = {
	"jannschu/rgbds.nvim",
	ft = { "rgbasm" },
	init = function(spec)
		require("rgbds").init(spec.dir)
	end,
	build = ":TSUpdate rgbasm",
	dependencies = {
		"nvim-treesitter/nvim-treesitter",
	},
}
return spec
