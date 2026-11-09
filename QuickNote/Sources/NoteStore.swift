import AppKit

struct Note: Codable {
    var id: String
    var text: String
    var imageFile: String?
    var x: Double
    var y: Double
    var placed: Bool
    var created: Date
    var colorIndex: Int
}

/// Notes live in ~/Library/Application Support/QuickNote (notes.json + images/).
final class NoteStore {
    static let shared = NoteStore()

    private(set) var notes: [Note] = []
    private let dir: URL
    private let imagesDir: URL
    private var fileURL: URL { dir.appendingPathComponent("notes.json") }

    private init() {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSHomeDirectory())
        dir = base.appendingPathComponent("QuickNote", isDirectory: true)
        imagesDir = dir.appendingPathComponent("images", isDirectory: true)
        try? FileManager.default.createDirectory(at: imagesDir, withIntermediateDirectories: true)
        load()
    }

    /// Newest first.
    var sorted: [Note] { notes.sorted { $0.created > $1.created } }

    func note(id: String) -> Note? { notes.first { $0.id == id } }

    func image(for note: Note) -> NSImage? {
        guard let file = note.imageFile,
              let data = try? Data(contentsOf: imagesDir.appendingPathComponent(file)) else { return nil }
        return NSImage(data: data)
    }

    func add(text: String, imagePNG: Data?) {
        let id = UUID().uuidString
        var note = Note(id: id, text: text, imageFile: nil, x: 0, y: 0, placed: false,
                        created: Date(), colorIndex: Int.random(in: 0..<5))
        note.imageFile = writeImage(imagePNG, id: id)
        notes.append(note)
        save()
    }

    func update(id: String, text: String, imagePNG: Data?) {
        guard let i = notes.firstIndex(where: { $0.id == id }) else { return }
        notes[i].text = text
        if let file = writeImage(imagePNG, id: id) { notes[i].imageFile = file }
        save()
    }

    func delete(id: String) {
        guard let i = notes.firstIndex(where: { $0.id == id }) else { return }
        if let file = notes[i].imageFile {
            try? FileManager.default.removeItem(at: imagesDir.appendingPathComponent(file))
        }
        notes.remove(at: i)
        save()
    }

    func setPositions(_ positions: [String: CGPoint]) {
        for i in notes.indices {
            if let p = positions[notes[i].id] {
                notes[i].x = Double(p.x)
                notes[i].y = Double(p.y)
                notes[i].placed = true
            }
        }
        save()
    }

    private func writeImage(_ png: Data?, id: String) -> String? {
        guard let png = png else { return nil }
        let file = "\(id).png"
        do {
            try png.write(to: imagesDir.appendingPathComponent(file), options: .atomic)
            return file
        } catch {
            return nil
        }
    }

    private func load() {
        guard let data = try? Data(contentsOf: fileURL) else { return }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        notes = (try? decoder.decode([Note].self, from: data)) ?? []
    }

    private func save() {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted]
        guard let data = try? encoder.encode(notes) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }
}
