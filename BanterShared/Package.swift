// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "BanterShared",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "BanterShared",
            targets: ["BanterShared"]
        )
    ],
    targets: [
        .target(
            name: "BanterShared"
        ),
        .testTarget(
            name: "BanterSharedTests",
            dependencies: ["BanterShared"]
        )
    ]
)
