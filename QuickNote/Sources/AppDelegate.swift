import AppKit
import Carbon.HIToolbox

enum ScreenCapture {
    /// Runs the system's interactive region picker. Calls back with nil if the user pressed esc.
    static func captureRegion(completion: @escaping (NSImage?) -> Void) {
        let url = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("quicknote-\(UUID().uuidString).png")
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
        process.arguments = ["-i", "-x", "-t", "png", url.path]
        process.terminationHandler = { _ in
            DispatchQueue.main.async {
                var image: NSImage?
                if let data = try? Data(contentsOf: url) { image = NSImage(data: data) }
                try? FileManager.default.removeItem(at: url)
                completion(image)
            }
        }
        do {
            try process.run()
        } catch {
            completion(nil)
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem?
    private let editor = EditorController()
    private let board = BoardController()
    private var reopenBoardAfterEditor = false
    private var capturing = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMainMenu()
        buildStatusItem()

        editor.onClosed = { [weak self] in self?.editorClosed() }
        editor.onCaptureRequested = { [weak self] in self?.startCapture() }
        editor.onShowBoard = { [weak self] in
            self?.editor.close()
            self?.board.show()
        }
        board.onNewNote = { [weak self] in self?.editor.present(noteID: nil, text: "", image: nil) }
        board.onCapture = { [weak self] in self?.startCapture() }
        board.onEdit = { [weak self] id in
            guard let note = NoteStore.shared.note(id: id) else { return }
            self?.editor.present(noteID: id, text: note.text, image: NoteStore.shared.image(for: note))
        }

        let hotKeys = HotKeyCenter.shared
        hotKeys.register(keyCode: kVK_Space, modifiers: optionKey) { [weak self] in self?.toggleQuickNote() }
        hotKeys.register(keyCode: kVK_ANSI_S, modifiers: controlKey | optionKey) { [weak self] in self?.startCapture() }
        hotKeys.register(keyCode: kVK_ANSI_A, modifiers: controlKey | optionKey) { [weak self] in self?.toggleBoard() }

        if !UserDefaults.standard.bool(forKey: "welcomed") {
            UserDefaults.standard.set(true, forKey: "welcomed")
            showHelp()
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !editor.isVisible { board.show() }
        return true
    }

    // MARK: Actions

    @objc private func toggleQuickNote() {
        guard !capturing else { return }
        if editor.isVisible {
            editor.cancel()
        } else {
            editor.present(noteID: nil, text: "", image: nil)
        }
    }

    @objc private func toggleBoard() {
        guard !capturing else { return }
        if editor.isVisible { editor.close() }
        if board.isVisible {
            board.hide()
            NSApp.hide(nil)
        } else {
            board.show()
        }
    }

    @objc private func startCapture() {
        guard !capturing, screenRecordingAllowed() else { return }
        capturing = true

        // Remember what was being written so the screenshot attaches to it.
        let wasEditing = editor.isVisible
        let pendingID = editor.editingID
        let pendingText = editor.currentText
        let previousImage = wasEditing ? editor.currentImage() : nil
        if board.isVisible { reopenBoardAfterEditor = true }
        editor.close()
        board.hide()

        ScreenCapture.captureRegion { [weak self] image in
            guard let self = self else { return }
            self.capturing = false
            if let image = image {
                self.editor.present(noteID: pendingID, text: pendingText, image: image)
            } else if wasEditing {
                self.editor.present(noteID: pendingID, text: pendingText, image: previousImage)
            } else {
                self.editorClosed()
            }
        }
    }

    private func editorClosed() {
        if board.isVisible {
            board.reload()
        } else if reopenBoardAfterEditor {
            board.show()
        } else {
            NSApp.hide(nil)
        }
        reopenBoardAfterEditor = false
    }

    /// macOS only lets apps see other apps' windows after the user allows Screen Recording.
    private func screenRecordingAllowed() -> Bool {
        if CGPreflightScreenCaptureAccess() { return true }
        CGRequestScreenCaptureAccess()

        NSApp.activate(ignoringOtherApps: true)
        let alert = NSAlert()
        alert.messageText = "Allow QuickNote to capture your screen"
        alert.informativeText = "Open System Preferences → Security & Privacy → Privacy → Screen Recording and tick QuickNote. Then quit QuickNote from its menu bar icon and open it again.\n\nWithout this, screenshots only show your desktop wallpaper."
        alert.addButton(withTitle: "Open System Preferences")
        alert.addButton(withTitle: "Capture Anyway")
        alert.addButton(withTitle: "Cancel")
        switch alert.runModal() {
        case .alertFirstButtonReturn:
            if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") {
                NSWorkspace.shared.open(url)
            }
            return false
        case .alertSecondButtonReturn:
            return true
        default:
            return false
        }
    }

    @objc private func showHelp() {
        NSApp.activate(ignoringOtherApps: true)
        let alert = NSAlert()
        alert.messageText = "QuickNote is running in your menu bar"
        alert.informativeText = """
        ⌥ Space — write a quick note (⌘↩ saves, esc closes)
        ⌃⌥ S — capture part of the screen, annotate it, add a note
        ⌃⌥ A — show all notes on the whole screen

        On the board: drag notes around, double-click to edit, and press Clean Up to snap them back into a grid.
        """
        alert.addButton(withTitle: "Got It")
        alert.runModal()
    }

    @objc private func newNoteFromMenu() {
        guard !capturing else { return }
        editor.present(noteID: nil, text: "", image: nil)
    }

    @objc private func showBoardFromMenu() {
        guard !capturing else { return }
        if editor.isVisible { editor.close() }
        board.show()
    }

    // MARK: Menus

    private func buildStatusItem() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let image = NSImage(systemSymbolName: "note.text", accessibilityDescription: "QuickNote") {
            item.button?.image = image
        } else {
            item.button?.title = "Note"
        }

        let menu = NSMenu()
        let entries: [(String, Selector)] = [
            ("New Quick Note        ⌥Space", #selector(newNoteFromMenu)),
            ("Screenshot Note        ⌃⌥S", #selector(startCapture)),
            ("Show All Notes          ⌃⌥A", #selector(showBoardFromMenu)),
        ]
        for (title, action) in entries {
            let menuItem = NSMenuItem(title: title, action: action, keyEquivalent: "")
            menuItem.target = self
            menu.addItem(menuItem)
        }
        menu.addItem(.separator())
        let help = NSMenuItem(title: "Shortcuts…", action: #selector(showHelp), keyEquivalent: "")
        help.target = self
        menu.addItem(help)
        menu.addItem(NSMenuItem(title: "Quit QuickNote", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        item.menu = menu
        statusItem = item
    }

    /// Never shown (the app has no Dock icon) but it makes ⌘C/⌘V/⌘Z etc. work in the note field.
    private func buildMainMenu() {
        let main = NSMenu()

        let appItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(NSMenuItem(title: "Quit QuickNote", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        appItem.submenu = appMenu
        main.addItem(appItem)

        let editItem = NSMenuItem()
        let edit = NSMenu(title: "Edit")
        edit.addItem(NSMenuItem(title: "Undo", action: Selector(("undo:")), keyEquivalent: "z"))
        let redo = NSMenuItem(title: "Redo", action: Selector(("redo:")), keyEquivalent: "z")
        redo.keyEquivalentModifierMask = [.command, .shift]
        edit.addItem(redo)
        edit.addItem(.separator())
        edit.addItem(NSMenuItem(title: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x"))
        edit.addItem(NSMenuItem(title: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c"))
        edit.addItem(NSMenuItem(title: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v"))
        edit.addItem(NSMenuItem(title: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a"))
        editItem.submenu = edit
        main.addItem(editItem)

        NSApp.mainMenu = main
    }
}
