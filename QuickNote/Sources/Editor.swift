import AppKit

final class FlippedView: NSView {
    override var isFlipped: Bool { true }
}

enum Screens {
    /// The screen the mouse is on.
    static var current: NSScreen {
        let mouse = NSEvent.mouseLocation
        return NSScreen.screens.first { NSMouseInRect(mouse, $0.frame, false) }
            ?? NSScreen.main ?? NSScreen.screens[0]
    }
}

final class EditorPanel: NSPanel {
    var onEscape: (() -> Void)?
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
    override func cancelOperation(_ sender: Any?) { onEscape?() }
}

final class NoteTextView: NSTextView {
    var onEscape: (() -> Void)?
    override func keyDown(with event: NSEvent) {
        if event.keyCode == 53 { // esc
            onEscape?()
            return
        }
        super.keyDown(with: event)
    }
}

/// The Spotlight-style note window. With a screenshot it grows an annotation canvas.
final class EditorController: NSObject, NSTextViewDelegate {
    private var panel: EditorPanel?
    private var textView: NoteTextView?
    private var placeholder: NSTextField?
    private var canvas: AnnotationView?
    private var colorButtons: [NSButton] = []
    private(set) var editingID: String?

    var onClosed: (() -> Void)?
    var onCaptureRequested: (() -> Void)?
    var onShowBoard: (() -> Void)?

    var isVisible: Bool { panel?.isVisible ?? false }
    var currentText: String { textView?.string ?? "" }

    /// The current screenshot including annotations drawn so far.
    func currentImage() -> NSImage? {
        guard let data = canvas?.flattenedPNG() else { return nil }
        return NSImage(data: data)
    }

    func present(noteID: String?, text: String, image: NSImage?) {
        close()
        editingID = noteID

        var image = image
        if let i = image, i.size.width < 1 || i.size.height < 1 { image = nil }

        let visible = Screens.current.visibleFrame
        let pad: CGFloat = 16
        let header: CGFloat = 30
        var width: CGFloat = 640
        var canvasSize = NSSize.zero
        if let image = image {
            let maxW = visible.width * 0.85 - pad * 2
            let maxH = visible.height * 0.9 - 250
            let scale = min(1, maxW / image.size.width, maxH / image.size.height)
            canvasSize = NSSize(width: max(1, floor(image.size.width * scale)),
                                height: max(1, floor(image.size.height * scale)))
            width = max(640, canvasSize.width + pad * 2)
        }
        let textHeight: CGFloat = image == nil ? 120 : 84
        let toolsHeight: CGFloat = image == nil ? 0 : 28 + 8 + canvasSize.height + 12
        let height = header + toolsHeight + textHeight + 12 + 30 + pad

        let panel = EditorPanel(contentRect: NSRect(x: 0, y: 0, width: width, height: height),
                                styleMask: [.titled, .fullSizeContentView],
                                backing: .buffered, defer: false)
        panel.titleVisibility = .hidden
        panel.titlebarAppearsTransparent = true
        panel.isMovableByWindowBackground = true
        panel.isReleasedWhenClosed = false
        panel.hidesOnDeactivate = false
        panel.level = .modalPanel
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.standardWindowButton(.closeButton)?.isHidden = true
        panel.standardWindowButton(.miniaturizeButton)?.isHidden = true
        panel.standardWindowButton(.zoomButton)?.isHidden = true
        panel.onEscape = { [weak self] in self?.cancel() }

        let effect = NSVisualEffectView(frame: NSRect(x: 0, y: 0, width: width, height: height))
        effect.material = .popover
        effect.blendingMode = .behindWindow
        effect.state = .active
        let root = FlippedView(frame: effect.bounds)
        root.autoresizingMask = [.width, .height]
        effect.addSubview(root)
        panel.contentView = effect

        // Header
        let titleText = noteID != nil ? "Edit Note" : (image != nil ? "Screenshot Note" : "Quick Note")
        let title = NSTextField(labelWithString: titleText)
        title.font = .systemFont(ofSize: 12, weight: .semibold)
        title.textColor = .secondaryLabelColor
        title.frame = NSRect(x: pad, y: 8, width: 300, height: 16)
        root.addSubview(title)

        var y = header

        // Annotation tools + canvas
        colorButtons = []
        canvas = nil
        if let image = image {
            let tools = NSSegmentedControl(labels: ["Highlight", "Pen", "Box", "Arrow"],
                                           trackingMode: .selectOne,
                                           target: self, action: #selector(toolChanged(_:)))
            tools.selectedSegment = 0
            tools.sizeToFit()
            tools.frame.origin = NSPoint(x: pad, y: y + 2)
            root.addSubview(tools)

            var x = tools.frame.maxX + 14
            for (index, color) in AnnotationView.palette.enumerated() {
                let button = NSButton(title: "", target: self, action: #selector(colorPicked(_:)))
                button.isBordered = false
                button.tag = index
                button.wantsLayer = true
                button.layer?.backgroundColor = color.cgColor
                button.layer?.cornerRadius = 10
                button.layer?.borderColor = NSColor.labelColor.cgColor
                button.frame = NSRect(x: x, y: y + 4, width: 20, height: 20)
                root.addSubview(button)
                colorButtons.append(button)
                x += 28
            }

            let clear = NSButton(title: "Clear", target: self, action: #selector(clearStrokes))
            clear.bezelStyle = .rounded
            clear.sizeToFit()
            clear.frame.origin = NSPoint(x: width - pad - clear.frame.width, y: y)
            root.addSubview(clear)
            let undo = NSButton(title: "Undo", target: self, action: #selector(undoStroke))
            undo.bezelStyle = .rounded
            undo.sizeToFit()
            undo.frame.origin = NSPoint(x: clear.frame.minX - 6 - undo.frame.width, y: y)
            root.addSubview(undo)

            y += 28 + 8
            let canvasFrame = NSRect(x: floor((width - canvasSize.width) / 2), y: y,
                                     width: canvasSize.width, height: canvasSize.height)
            let canvas = AnnotationView(frame: canvasFrame, image: image)
            root.addSubview(canvas)
            self.canvas = canvas
            selectColor(0)
            y += canvasSize.height + 12
        }

        // Text area
        let box = NSView(frame: NSRect(x: pad, y: y, width: width - pad * 2, height: textHeight))
        box.wantsLayer = true
        box.layer?.backgroundColor = NSColor.gray.withAlphaComponent(0.14).cgColor
        box.layer?.cornerRadius = 8
        root.addSubview(box)

        let scroll = NSScrollView(frame: box.bounds)
        scroll.hasVerticalScroller = true
        scroll.autohidesScrollers = true
        scroll.drawsBackground = false
        scroll.borderType = .noBorder
        let textView = NoteTextView(frame: NSRect(origin: .zero, size: scroll.contentSize))
        textView.minSize = NSSize(width: 0, height: scroll.contentSize.height)
        textView.maxSize = NSSize(width: CGFloat.greatestFiniteMagnitude, height: CGFloat.greatestFiniteMagnitude)
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.autoresizingMask = [.width]
        textView.textContainer?.containerSize = NSSize(width: scroll.contentSize.width,
                                                       height: CGFloat.greatestFiniteMagnitude)
        textView.textContainer?.widthTracksTextView = true
        textView.font = .systemFont(ofSize: 17)
        textView.textColor = .labelColor
        textView.insertionPointColor = .labelColor
        textView.drawsBackground = false
        textView.isRichText = false
        textView.allowsUndo = true
        textView.textContainerInset = NSSize(width: 6, height: 8)
        textView.string = text
        textView.delegate = self
        textView.onEscape = { [weak self] in self?.cancel() }
        scroll.documentView = textView
        box.addSubview(scroll)
        self.textView = textView

        let placeholder = NSTextField(labelWithString: image == nil ? "Type a note…" : "Write a note about this screenshot…")
        placeholder.font = .systemFont(ofSize: 17)
        placeholder.textColor = .tertiaryLabelColor
        placeholder.frame = NSRect(x: pad + 11, y: y + 8, width: width - pad * 2 - 22, height: 22)
        placeholder.isHidden = !text.isEmpty
        root.addSubview(placeholder)
        self.placeholder = placeholder
        y += textHeight + 12

        // Bottom row
        let capture = NSButton(title: image == nil ? "Capture Screen" : "Recapture",
                               target: self, action: #selector(captureClicked))
        capture.bezelStyle = .rounded
        capture.sizeToFit()
        capture.frame.origin = NSPoint(x: pad, y: y)
        root.addSubview(capture)

        let all = NSButton(title: "All Notes", target: self, action: #selector(boardClicked))
        all.bezelStyle = .rounded
        all.sizeToFit()
        all.frame.origin = NSPoint(x: capture.frame.maxX + 6, y: y)
        root.addSubview(all)

        let save = NSButton(title: "Save", target: self, action: #selector(saveClicked))
        save.bezelStyle = .rounded
        save.keyEquivalent = "\r"
        save.keyEquivalentModifierMask = [.command]
        save.sizeToFit()
        save.frame.size.width += 16
        save.frame.origin = NSPoint(x: width - pad - save.frame.width, y: y)
        root.addSubview(save)

        let hint = NSTextField(labelWithString: "⌘↩ save  ·  esc close")
        hint.font = .systemFont(ofSize: 11)
        hint.textColor = .tertiaryLabelColor
        hint.sizeToFit()
        hint.frame.origin = NSPoint(x: save.frame.minX - 12 - hint.frame.width, y: y + 8)
        root.addSubview(hint)

        // Place it: Spotlight-like for plain notes, centred for screenshots.
        let originX = visible.midX - width / 2
        let originY = image == nil
            ? visible.minY + visible.height * 0.62
            : max(visible.minY, visible.midY - height / 2)
        panel.setFrameOrigin(NSPoint(x: originX, y: originY))

        self.panel = panel
        NSApp.activate(ignoringOtherApps: true)
        panel.makeKeyAndOrderFront(nil)
        panel.makeFirstResponder(textView)
        textView.setSelectedRange(NSRange(location: (text as NSString).length, length: 0))
    }

    /// Hides the window without saving and without notifying anyone.
    func close() {
        panel?.orderOut(nil)
        panel = nil
        textView = nil
        placeholder = nil
        canvas = nil
        colorButtons = []
        editingID = nil
    }

    func cancel() {
        close()
        onClosed?()
    }

    func textDidChange(_ notification: Notification) {
        placeholder?.isHidden = !(textView?.string.isEmpty ?? true)
    }

    private func selectColor(_ index: Int) {
        guard index >= 0, index < AnnotationView.palette.count else { return }
        canvas?.color = AnnotationView.palette[index]
        for button in colorButtons {
            button.layer?.borderWidth = button.tag == index ? 3 : 0
        }
    }

    @objc private func toolChanged(_ sender: NSSegmentedControl) {
        let tool = AnnotationTool(rawValue: sender.selectedSegment) ?? .highlighter
        canvas?.tool = tool
        selectColor(tool == .highlighter ? 0 : 1)
    }

    @objc private func colorPicked(_ sender: NSButton) {
        selectColor(sender.tag)
    }

    @objc private func undoStroke() {
        canvas?.undo()
    }

    @objc private func clearStrokes() {
        canvas?.clear()
    }

    @objc private func captureClicked() {
        onCaptureRequested?()
    }

    @objc private func boardClicked() {
        onShowBoard?()
    }

    @objc private func saveClicked() {
        let text = currentText.trimmingCharacters(in: .whitespacesAndNewlines)
        let png = canvas?.flattenedPNG()
        if text.isEmpty && png == nil {
            cancel()
            return
        }
        if let id = editingID {
            NoteStore.shared.update(id: id, text: text, imagePNG: png)
        } else {
            NoteStore.shared.add(text: text, imagePNG: png)
        }
        close()
        onClosed?()
    }
}
