import AppKit

enum AnnotationTool: Int {
    case highlighter = 0, pen, box, arrow
}

struct AnnotationStroke {
    var tool: AnnotationTool
    var color: NSColor
    /// Points normalised to 0...1 of the image, so they render at any size.
    var points: [CGPoint]
}

/// Shows a screenshot and lets the user draw on top of it.
final class AnnotationView: NSView {
    let image: NSImage
    var tool: AnnotationTool = .highlighter
    var color: NSColor = AnnotationView.palette[0]
    private var strokes: [AnnotationStroke] = []
    private var current: AnnotationStroke?

    static let palette: [NSColor] = [
        NSColor(srgbRed: 1.00, green: 0.86, blue: 0.10, alpha: 1), // yellow
        NSColor(srgbRed: 0.95, green: 0.20, blue: 0.20, alpha: 1), // red
        NSColor(srgbRed: 0.20, green: 0.75, blue: 0.35, alpha: 1), // green
        NSColor(srgbRed: 0.15, green: 0.50, blue: 0.95, alpha: 1), // blue
    ]

    init(frame: NSRect, image: NSImage) {
        self.image = image
        super.init(frame: frame)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not used")
    }

    override var mouseDownCanMoveWindow: Bool { false }

    override func resetCursorRects() {
        addCursorRect(bounds, cursor: .crosshair)
    }

    override func draw(_ dirtyRect: NSRect) {
        drawContent(in: bounds, scale: 1)
    }

    private func drawContent(in rect: NSRect, scale: CGFloat) {
        image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1)
        for stroke in strokes { draw(stroke, in: rect, scale: scale) }
        if let stroke = current { draw(stroke, in: rect, scale: scale) }
    }

    private func draw(_ stroke: AnnotationStroke, in rect: NSRect, scale: CGFloat) {
        let pts = stroke.points.map {
            CGPoint(x: rect.minX + $0.x * rect.width, y: rect.minY + $0.y * rect.height)
        }
        guard let first = pts.first, let last = pts.last else { return }
        let path = NSBezierPath()
        path.lineCapStyle = .round
        path.lineJoinStyle = .round

        switch stroke.tool {
        case .highlighter, .pen:
            if stroke.tool == .highlighter {
                stroke.color.withAlphaComponent(0.4).setStroke()
                path.lineWidth = 18 * scale
            } else {
                stroke.color.setStroke()
                path.lineWidth = 3 * scale
            }
            path.move(to: first)
            if pts.count == 1 { path.line(to: first) }
            for p in pts.dropFirst() { path.line(to: p) }
        case .box:
            stroke.color.setStroke()
            path.lineWidth = 3 * scale
            path.appendRect(NSRect(x: min(first.x, last.x), y: min(first.y, last.y),
                                   width: abs(last.x - first.x), height: abs(last.y - first.y)))
        case .arrow:
            stroke.color.setStroke()
            path.lineWidth = 3 * scale
            path.move(to: first)
            path.line(to: last)
            let angle = atan2(last.y - first.y, last.x - first.x)
            let head = 14 * scale
            for offset in [CGFloat.pi - 0.45, CGFloat.pi + 0.45] {
                path.move(to: last)
                path.line(to: CGPoint(x: last.x + head * cos(angle + offset),
                                      y: last.y + head * sin(angle + offset)))
            }
        }
        path.stroke()
    }

    // MARK: Drawing with the mouse

    private func normalised(_ event: NSEvent) -> CGPoint {
        let p = convert(event.locationInWindow, from: nil)
        guard bounds.width > 0, bounds.height > 0 else { return .zero }
        return CGPoint(x: min(max(p.x / bounds.width, 0), 1), y: min(max(p.y / bounds.height, 0), 1))
    }

    override func mouseDown(with event: NSEvent) {
        current = AnnotationStroke(tool: tool, color: color, points: [normalised(event)])
        needsDisplay = true
    }

    override func mouseDragged(with event: NSEvent) {
        guard var stroke = current else { return }
        let p = normalised(event)
        if stroke.tool == .box || stroke.tool == .arrow {
            stroke.points = [stroke.points[0], p]
        } else {
            stroke.points.append(p)
        }
        current = stroke
        needsDisplay = true
    }

    override func mouseUp(with event: NSEvent) {
        if let stroke = current {
            let isShape = stroke.tool == .box || stroke.tool == .arrow
            if !isShape || stroke.points.count == 2 { strokes.append(stroke) }
        }
        current = nil
        needsDisplay = true
    }

    func undo() {
        if !strokes.isEmpty { strokes.removeLast() }
        needsDisplay = true
    }

    func clear() {
        strokes.removeAll()
        needsDisplay = true
    }

    /// The screenshot with all annotations burned in, at full resolution.
    func flattenedPNG() -> Data? {
        var pixelsWide = Int(image.size.width)
        var pixelsHigh = Int(image.size.height)
        if let rep = image.representations.first, rep.pixelsWide > 0, rep.pixelsHigh > 0 {
            pixelsWide = rep.pixelsWide
            pixelsHigh = rep.pixelsHigh
        }
        guard pixelsWide > 0, pixelsHigh > 0,
              let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: pixelsWide, pixelsHigh: pixelsHigh,
                                         bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                         colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
              let context = NSGraphicsContext(bitmapImageRep: rep) else { return nil }
        rep.size = image.size
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = context
        let scale = bounds.width > 0 ? image.size.width / bounds.width : 1
        drawContent(in: NSRect(origin: .zero, size: image.size), scale: scale)
        NSGraphicsContext.restoreGraphicsState()
        return rep.representation(using: .png, properties: [:])
    }
}
