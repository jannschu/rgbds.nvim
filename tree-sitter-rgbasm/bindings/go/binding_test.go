package tree_sitter_rgbasm_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_rgbasm "github.com/tree-sitter/tree-sitter-rgbasm/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_rgbasm.Language())
	if language == nil {
		t.Errorf("Error loading Game Boy assembly grammar")
	}
}
