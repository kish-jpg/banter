// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "BanterShared",
    platforms: [
        .iOS(.v18),
        .macOS(.v15)
    ],
    products: [
        .library(
            name: "BanterShared",
            targets: ["BanterShared"]
        )
    ],
    targets: [
        .target(
            name: "BanterShared",
            resources: [.copy("Resources/taxonomy.json")]
        ),
        .testTarget(
            name: "BanterSharedTests",
            dependencies: ["BanterShared"],
            resources: [.copy("Fixtures")]
        )
    ]
)
