# rgbds.nvim

A Neovim plugin for the [rgbasm](https://rgbds.gbdev.io/) assembler providing
syntax highlighting and indentation using [tree-sitter](https://tree-sitter.github.io/tree-sitter/).

## Features

- Syntax highlighting for rgbasm source files based on a tree-sitter grammar.
- Indentation for rgbasm files using tree-sitter and [nvim-treesitter](https://github.com/nvim-treesitter/nvim-treesitter).

## Installation

Using [lazy.nvim](https://github.com/folke/lazy.nvim):

```lua
{
  "jannschu/rgbds.nvim",
}
```

## References

- [rgbasm.5](https://rgbds.gbdev.io/docs/master/rgbasm.5) assembly syntax man page
- [gbz80.7](https://rgbds.gbdev.io/docs/master/gbz80.7) CPU instruction man page
- [rgbds source code](https://github.com/gbdev/rgbds)
- Open Source games listed in the [Homebrew Hub](https://hh.gbdev.io/) for real word usage studies
