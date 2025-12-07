# rgbds.nvim

A Neovim plugin for the [rgbasm](https://rgbds.gbdev.io/) assembler providing
syntax highlighting based on [tree-sitter](https://tree-sitter.github.io/tree-sitter/).

<img width="846" height="664" alt="SCR-20251205-prlx" src="https://github.com/user-attachments/assets/ab8847ac-e8a3-4a02-9a0f-975f8d280e9c" />

## Features

- Extensive syntax highlighting for rgbasm source files based on a tree-sitter grammar.
- [hardware.inc](https://github.com/gbdev/hardware.inc) aware highlighting.
- Heuristic based file type detection for ambiguous file extensions like `.inc`, `.s`, and `.asm`.
- Folds based on the syntax tree.

## Installation

Using [lazy.nvim](https://github.com/folke/lazy.nvim):

```lua
{
  "jannschu/rgbds.nvim",
}
```

Using [packer.nvim](https://github.com/wbthomason/packer.nvim):

```lua
use {
  "jannschu/rgbds.nvim",
  requires = { "nvim-treesitter/nvim-treesitter" },
  run = ":TSUpdate rgbasm rgbasm_identifier",
}
```

### Configuration

No configuration options are defined at the moment.

## References

- [rgbasm.5](https://rgbds.gbdev.io/docs/master/rgbasm.5) assembly syntax man page
- [gbz80.7](https://rgbds.gbdev.io/docs/master/gbz80.7) CPU instruction man page
- [rgbds source code](https://github.com/gbdev/rgbds)
- Open Source games listed in the [Homebrew Hub](https://hh.gbdev.io/) for real word usage studies
