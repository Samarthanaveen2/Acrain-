import AppKit

// Draws the QuickNote icon at every size macOS wants and writes an .iconset folder.
let outDir = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "AppIcon.iconset"
try FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

func render(_ px: Int) -> Data? {
    guard let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: px, pixelsHigh: px,
                                     bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                     colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0) else { return nil }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let s = CGFloat(px)
    let body = NSRect(x: s * 0.1, y: s * 0.1, width: s * 0.8, height: s * 0.8)
    NSColor(srgbRed: 1.0, green: 0.84, blue: 0.25, alpha: 1).setFill()
    NSBezierPath(roundedRect: body, xRadius: s * 0.16, yRadius: s * 0.16).fill()
    NSColor(srgbRed: 0.35, green: 0.27, blue: 0.05, alpha: 1).setStroke()
    for (i, w) in [0.5, 0.5, 0.32].enumerated() {
        let y = s * (0.66 - CGFloat(i) * 0.15)
        let line = NSBezierPath()
        line.lineWidth = s * 0.055
        line.lineCapStyle = .round
        line.move(to: NSPoint(x: s * 0.25, y: y))
        line.line(to: NSPoint(x: s * (0.25 + CGFloat(w)), y: y))
        line.stroke()
    }
    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])
}

for base in [16, 32, 128, 256, 512] {
    for scale in [1, 2] {
        let name = scale == 1 ? "icon_\(base)x\(base).png" : "icon_\(base)x\(base)@2x.png"
        if let data = render(base * scale) {
            try data.write(to: URL(fileURLWithPath: outDir).appendingPathComponent(name))
        }
    }
}
