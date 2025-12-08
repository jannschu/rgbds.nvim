local M = {}

local function buffer_contains_rgbasm(bufnr)
	bufnr = bufnr or 0
	local lines = vim.api.nvim_buf_get_lines(bufnr, 0, 100, false)
	local content = table.concat(lines, "\n")

	local patterns = {
		"SECTION%s+[\"']", -- SECTION "Name"
		"%sROM[0X]", -- ROM0, ROMX
		"%sWRAM[0X]", -- WRAM0, WRAMX
		"%sSRAM", -- SRAM
		"%sHRAM", -- HRAM
		"hardware%.inc", -- hardware.inc include
		"ldh%s+", -- ldh instruction
		"%[hl[%+%-]%]", -- [hl+] or [hl-]
		"rLCDC", -- hardware register
		"rSTAT",
		"rSCY",
		"rSCX",
	}

	for _, pattern in ipairs(patterns) do
		if content:match(pattern) then
			return true
		end
	end

	return false
end

local function has_rgbds_makefile(bufnr)
	local path = vim.api.nvim_buf_get_name(bufnr or 0)
	if path == "" then
		-- buffer has no name
		return false
	end
	local makefiles = vim.fs.find(
		{ "Makefile", "makefile", "GNUmakefile", "hardware.inc" },
		{ upward = true, type = "file", path = vim.fs.dirname(path), limit = 5 }
	)

	if #makefiles == 0 then
		return false
	end

	for _, p in pairs(makefiles) do
		if vim.fs.basename(p) == "hardware.inc" then
			return true
		end
	end

	local file = io.open(makefiles[1], "r")
	if not file then
		return false
	end

	local content = file:read("*a")
	file:close()

	-- Nach rgbasm, rgblink, rgbfix suchen
	return content:match("rgbasm") or content:match("rgblink") or content:match("rgbfix") ~= nil
end

---@param path string
---@param bufnr number|nil
function M.detect(path, bufnr)
	if buffer_contains_rgbasm(bufnr) or has_rgbds_makefile(bufnr) then
		return "rgbasm"
	end
	return nil
end

return M
