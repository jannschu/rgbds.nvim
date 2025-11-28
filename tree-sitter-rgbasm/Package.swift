// swift-tools-version:5.3

import Foundation
import PackageDescription

var sources = ["src/parser.c"]
if FileManager.default.fileExists(atPath: "src/scanner.c") {
    sources.append("src/scanner.c")
}

let package = Package(
    name: "TreeSitterRgbasm",
    products: [
        .library(name: "TreeSitterRgbasm", targets: ["TreeSitterRgbasm"]),
    ],
    dependencies: [
        .package(name: "SwiftTreeSitter", url: "https://github.com/tree-sitter/swift-tree-sitter", from: "0.9.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterRgbasm",
            dependencies: [],
            path: ".",
            sources: sources,
            resources: [
                .copy("queries")
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")]
        ),
        .testTarget(
            name: "TreeSitterRgbasmTests",
            dependencies: [
                "SwiftTreeSitter",
                "TreeSitterRgbasm",
            ],
            path: "bindings/swift/TreeSitterRgbasmTests"
        )
    ],
    cLanguageStandard: .c11
)
