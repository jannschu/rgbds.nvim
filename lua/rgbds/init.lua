local M = {}

local init = false

local function get_plugin_dir()
	local dir
	local source = require("debug").getinfo(1, "S").source
	for parent in vim.fs.parents(source) do
		local lazy_path = vim.fs.joinpath(parent, "lazy.lua")
		local exists = vim.fn.filereadable(lazy_path) == 1
		if exists then
			dir = parent
			break
		end
	end
	return dir
end

local function detect()
	return require("rgbds.filetype").detect(unpack(arg))
end

---@param dir string|nil
function M.init(dir)
	if dir == nil then
		dir = get_plugin_dir()
		if dir == nil then
			vim.notify("rgbds.nvim: could not determine plugin directory", vim.log.levels.ERROR)
			return
		end
	end
	vim.filetype.add({
		extension = {
			gbz80 = "rgbasm",
			rgbasm = "rgbasm",
			asm = detect,
			s = detect,
			inc = detect,
		},
	})
	vim.api.nvim_create_autocmd("User", {
		pattern = "TSUpdate",
		callback = function()
			require("nvim-treesitter.parsers").rgbasm = {
				install_info = {
					path = dir,
					location = "tree-sitter-rgbasm",
					generate = false,
					queries = "tree-sitter-rgbasm/queries",
				},
				filetype = "rgbasm",
			}
		end,
	})
	init = true
end

---@param spec LazyPluginSpec
function M.setup(opts)
	if not init then
		M.init(dir)
	end
end

return M
