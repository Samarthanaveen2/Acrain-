import AppKit
import QuartzCore

/// One sticky note on the board. Drag to move, double-click to open, ✕ to delete.
final class NoteCardView: NSView {
    static let size = NSSize(width: 230, height: 230)
    static let colors: [NSColor] = [
        NSColor(srgbRed: 1.00, green: 0.93, blue: 0.55, alpha: 1), // yellow
        NSColor(srgbRed: 1.00, green: 0.80, blue: 0.82, alpha: 1), // pink
        NSColor(srgbRed: 0.75, green: 0.93, blue: 0.78, alpha: 1), // green
        NSColor(srgbRed: 0.75, green: 0.87, blue: 1.00, alpha: 1), // blue
        NSColor(srgbRed: 0.90, green: 0.82, blue: 1.00, alpha: 1), // purple
    ]
    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .short
        return f
    }()

    let noteID: String
    var onMoved: ((String, CGPoint) -> Void)?
    var onOpen: ((String) -> Void)?
    var onDelete: ((String) -> Void)?

    private var deleteButton: NSButton!
    private var dragStartMouse = CGPoint.zero
    private var dragStartOrigin = CGPoint.zero
    private var didDrag = false

    override var isFlipped: Bool { true }

    init(note: Note, image: NSImage?) {
        noteID = note.id
        super.init(frame: NSRect(origin: CGPoint(x: note.x, y: note.y), size: NoteCardView.size))
        appearance = NSAppearance(named: .aqua)
        wantsLayer = true
        let colors = NoteCardView.colors
        layer?.backgroundColor = colors[abs(note.colorIndex) % colors.count].cgColor
        layer?.cornerRadius = 10
        let shadow = NSShadow()
        shadow.shadowColor = NSColor.black.withAlphaComponent(0.45)
        shadow.shadowBlurRadius = 8
        shadow.shadowOffset = NSSize(width: 0, height: -3)
        self.shadow = shadow

        let w = NoteCardView.size.width
        let h = NoteCardView.size.height

        let date = NSTextField(labelWithString: NoteCardView.dateFormatter.string(from: note.created))
        date.font = .systemFont(ofSize: 10)
        date.textColor = NSColor.black.withAlphaComponent(0.5)
        date.frame = NSRect(x: 10, y: 8, width: w - 44, height: 14)
        addSubview(date)

        deleteButton = NSButton(title: "✕", target: self, action: #selector(deleteClicked))
        deleteButton.isBordered = false
        deleteButton.font = .systemFont(ofSize: 12, weight: .bold)
        deleteButton.contentTintColor = NSColor.black.withAlphaComponent(0.6)
        deleteButton.toolTip = "Delete note"
        deleteButton.frame = NSRect(x: w - 30, y: 4, width: 24, height: 22)
        addSubview(deleteButton)

        var y: CGFloat = 28
        if let image = image {
            let imageView = NSImageView(frame: NSRect(x: 10, y: y, width: w - 20, height: 112))
            imageView.image = image
            imageView.imageScaling = .scaleProportionallyUpOrDown
            imageView.wantsLayer = true
            imageView.layer?.backgroundColor = NSColor.black.withAlphaComponent(0.08).cgColor
            imageView.layer?.cornerRadius = 4
            addSubview(imageView)
            y += 118
        }

        let label = NSTextField(wrappingLabelWithString: note.text)
        label.font = .systemFont(ofSize: 13)
        label.textColor = NSColor.black.withAlphaComponent(0.85)
        label.isSelectable = false
        label.cell?.truncatesLastVisibleLine = true
        label.frame = NSRect(x: 10, y: y, width: w - 20, height: h - y - 10)
        addSubview(label)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not used")
    }

    // The whole card is the drag handle, except the delete button.
    override func hitTest(_ point: NSPoint) -> NSView? {
        guard let hit = super.hitTest(point) else { return nil }
        if hit === deleteButton { return hit }
        return self
    }

    override func mouseDown(with event: NSEvent) {
        guard let parent = superview else { return }
        if event.clickCount == 2 {
            onOpen?(noteID)
            return
        }
        parent.addSubview(self, positioned: .above, relativeTo: nil) // bring to front
        dragStartMouse = parent.convert(event.locationInWindow, from: nil)
        dragStartOrigin = frame.origin
        didDrag = false
    }

    override func mouseDragged(with event: NSEvent) {
        guard let parent = superview else { return }
        let p = parent.convert(event.locationInWindow, from: nil)
        var origin = CGPoint(x: dragStartOrigin.x + p.x - dragStartMouse.x,
                             y: dragStartOrigin.y + p.y - dragStartMouse.y)
        origin.x = min(max(origin.x, 0), max(0, parent.bounds.width - frame.width))
        origin.y = max(origin.y, 0)
        setFrameOrigin(origin)
        didDrag = true
    }

    override func mouseUp(with event: NSEvent) {
        if didDrag { onMoved?(noteID, frame.origin) }
        didDrag = false
    }

    @objc private func deleteClicked() {
        onDelete?(noteID)
    }
}

final class BoardWindow: NSWindow {
    var onEscape: (() -> Void)?
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
    override func cancelOperation(_ sender: Any?) { onEscape?() }
    override func keyDown(with event: NSEvent) {
        if event.keyCode == 53 { // esc
            onEscape?()
        } else {
            super.keyDown(with: event)
        }
    }
}

/// Full-screen board showing every saved note.
final class BoardController: NSObject {
    private var window: BoardWindow?
    private var scroll: NSScrollView?
    private var canvas: FlippedView?
    private var countLabel: NSTextField?
    private var emptyLabel: NSTextField?
    private var cards: [String: NoteCardView] = [:]

    private let margin: CGFloat = 30
    private let gap: CGFloat = 20

    var onNewNote: (() -> Void)?
    var onCapture: (() -> Void)?
    var onEdit: ((String) -> Void)?

    var isVisible: Bool { window?.isVisible ?? false }

    func toggle() {
        if isVisible { hide() } else { show() }
    }

    func hide() {
        window?.orderOut(nil)
        window = nil
        scroll = nil
        canvas = nil
        countLabel = nil
        emptyLabel = nil
        cards = [:]
    }

    func show() {
        hide()
        let frame = Screens.current.visibleFrame
        let window = BoardWindow(contentRect: frame, styleMask: [.borderless], backing: .buffered, defer: false)
        window.isReleasedWhenClosed = false
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.level = .floating
        window.collectionBehavior = [.moveToActiveSpace, .fullScreenAuxiliary]
        window.appearance = NSAppearance(named: .darkAqua)
        window.onEscape = { [weak self] in self?.closeClicked() }
        window.setFrame(frame, display: false)

        let size = frame.size
        let effect = NSVisualEffectView(frame: NSRect(origin: .zero, size: size))
        effect.material = .hudWindow
        effect.blendingMode = .behindWindow
        effect.state = .active
        let root = FlippedView(frame: effect.bounds)
        root.autoresizingMask = [.width, .height]
        effect.addSubview(root)
        window.contentView = effect

        let bar: CGFloat = 56
        let title = NSTextField(labelWithString: "All Notes")
        title.font = .systemFont(ofSize: 20, weight: .bold)
        title.textColor = .white
        title.sizeToFit()
        title.frame.origin = NSPoint(x: margin, y: 16)
        root.addSubview(title)

        let count = NSTextField(labelWithString: "")
        count.font = .systemFont(ofSize: 12)
        count.textColor = NSColor.white.withAlphaComponent(0.6)
        count.frame = NSRect(x: title.frame.maxX + 12, y: 23, width: 420, height: 16)
        root.addSubview(count)
        countLabel = count

        var x = size.width - margin
        let buttons: [(String, Selector)] = [
            ("Close", #selector(closeClicked)),
            ("Clean Up", #selector(cleanUp)),
            ("Screenshot Note", #selector(captureClicked)),
            ("New Note", #selector(newClicked)),
        ]
        for (label, action) in buttons {
            let button = NSButton(title: label, target: self, action: action)
            button.bezelStyle = .rounded
            button.sizeToFit()
            x -= button.frame.width
            button.frame.origin = NSPoint(x: x, y: 14)
            root.addSubview(button)
            x -= 8
        }

        let scroll = NSScrollView(frame: NSRect(x: 0, y: bar, width: size.width, height: size.height - bar))
        scroll.hasVerticalScroller = true
        scroll.autohidesScrollers = true
        scroll.drawsBackground = false
        scroll.borderType = .noBorder
        let canvas = FlippedView(frame: NSRect(origin: .zero, size: scroll.contentSize))
        scroll.documentView = canvas
        root.addSubview(scroll)
        self.scroll = scroll
        self.canvas = canvas

        let empty = NSTextField(labelWithString: "No notes yet. Press ⌥Space anywhere to write one.")
        empty.font = .systemFont(ofSize: 16)
        empty.textColor = NSColor.white.withAlphaComponent(0.6)
        empty.sizeToFit()
        empty.frame.origin = NSPoint(x: (size.width - empty.frame.width) / 2, y: size.height * 0.4)
        root.addSubview(empty)
        emptyLabel = empty

        self.window = window
        reload()
        NSApp.activate(ignoringOtherApps: true)
        window.makeKeyAndOrderFront(nil)
    }

    // MARK: Layout

    private var columns: Int {
        let width = scroll?.contentSize.width ?? 800
        let step = NoteCardView.size.width + gap
        return max(1, Int((width - margin * 2 + gap) / step))
    }

    private func slotOrigin(_ index: Int) -> CGPoint {
        let cols = columns
        return CGPoint(x: margin + CGFloat(index % cols) * (NoteCardView.size.width + gap),
                       y: margin + CGFloat(index / cols) * (NoteCardView.size.height + gap))
    }

    private func resizeCanvas() {
        guard let scroll = scroll, let canvas = canvas else { return }
        let bottom = cards.values.map { $0.frame.maxY }.max() ?? 0
        canvas.setFrameSize(NSSize(width: scroll.contentSize.width,
                                   height: max(scroll.contentSize.height, bottom + margin)))
    }

    func reload() {
        guard let canvas = canvas else { return }
        for card in cards.values { card.removeFromSuperview() }
        cards = [:]

        // Give notes that have never been on the board the first free grid slot.
        var notes = NoteStore.shared.sorted
        var taken = notes.filter { $0.placed }.map {
            NSRect(origin: CGPoint(x: $0.x, y: $0.y), size: NoteCardView.size)
        }
        var newPositions: [String: CGPoint] = [:]
        for i in notes.indices where !notes[i].placed {
            var slot = 0
            var origin = slotOrigin(slot)
            while taken.contains(where: { $0.intersects(NSRect(origin: origin, size: NoteCardView.size)) }) {
                slot += 1
                origin = slotOrigin(slot)
            }
            taken.append(NSRect(origin: origin, size: NoteCardView.size))
            notes[i].x = Double(origin.x)
            notes[i].y = Double(origin.y)
            newPositions[notes[i].id] = origin
        }
        if !newPositions.isEmpty { NoteStore.shared.setPositions(newPositions) }

        // Oldest first so the newest cards end up on top.
        for note in notes.reversed() {
            let card = NoteCardView(note: note, image: NoteStore.shared.image(for: note))
            card.onMoved = { [weak self] id, origin in
                NoteStore.shared.setPositions([id: origin])
                self?.resizeCanvas()
            }
            card.onOpen = { [weak self] id in self?.onEdit?(id) }
            card.onDelete = { [weak self] id in self?.confirmDelete(id) }
            canvas.addSubview(card)
            cards[note.id] = card
        }
        resizeCanvas()
        emptyLabel?.isHidden = !notes.isEmpty
        countLabel?.stringValue = notes.isEmpty
            ? ""
            : "\(notes.count) note\(notes.count == 1 ? "" : "s")  ·  drag to move  ·  double-click to edit"
    }

    /// Snap every note back into a tidy grid, newest first.
    @objc func cleanUp() {
        var positions: [String: CGPoint] = [:]
        for (index, note) in NoteStore.shared.sorted.enumerated() {
            positions[note.id] = slotOrigin(index)
        }
        let targets = positions
        let cards = self.cards
        NSAnimationContext.runAnimationGroup({ context in
            context.duration = 0.35
            context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
            for (id, origin) in targets {
                cards[id]?.animator().setFrameOrigin(origin)
            }
        }, completionHandler: nil)
        NoteStore.shared.setPositions(positions)

        guard let scroll = scroll, let canvas = canvas else { return }
        let bottom = (positions.values.map { $0.y }.max() ?? 0) + NoteCardView.size.height
        canvas.setFrameSize(NSSize(width: scroll.contentSize.width,
                                   height: max(scroll.contentSize.height, bottom + margin)))
        canvas.scroll(.zero)
    }

    private func confirmDelete(_ id: String) {
        let alert = NSAlert()
        alert.messageText = "Delete this note?"
        alert.informativeText = "This can't be undone."
        alert.addButton(withTitle: "Delete")
        alert.addButton(withTitle: "Cancel")
        if alert.runModal() == .alertFirstButtonReturn {
            NoteStore.shared.delete(id: id)
            reload()
        }
    }

    @objc private func closeClicked() {
        hide()
        NSApp.hide(nil)
    }

    @objc private func newClicked() {
        onNewNote?()
    }

    @objc private func captureClicked() {
        onCapture?()
    }
}
