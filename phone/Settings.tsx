import { useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Download, Upload } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import type { Note } from "@/lib/notes";

declare const __APP_VERSION__: string;

/** Settings: a backup file you can keep in Files or iCloud, and restoring from one */
export default function Settings({ notes, onRestore }: { notes: Note[]; onRestore: (notes: Note[]) => Promise<void> }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const backUp = async () => {
    setBusy(true);
    setMsg("");
    const day = new Date().toISOString().slice(0, 10);
    const name = `Acrain backup ${day}.json`;
    const json = JSON.stringify({ acrain: 1, exported: new Date().toISOString(), notes }, null, 1);
    try {
      if (Capacitor.isNativePlatform()) {
        const { uri } = await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
        await Share.share({ title: "Acrain backup", files: [uri] });
        setMsg("Pick “Save to Files” (or iCloud Drive) to keep the backup.");
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        a.download = name;
        a.click();
        setMsg("Backup file downloaded.");
      }
    } catch (e) {
      const m = (e as { message?: string })?.message ?? String(e);
      setMsg(/cancel/i.test(m) ? "" : `Couldn't make the backup (${m}).`);
    } finally {
      setBusy(false);
    }
  };

  const restore = async (f: File) => {
    setMsg("");
    try {
      const parsed = JSON.parse(await f.text());
      const list: Note[] = (Array.isArray(parsed) ? parsed : (parsed.notes ?? [])).filter(
        (n: Note) => n?.id && typeof n.title === "string",
      );
      if (!list.length) throw new Error("no notes in that file");
      await onRestore(list);
      setMsg(`Restored ${list.length} ${list.length === 1 ? "note" : "notes"}. Notes with the same name were replaced; the rest were kept.`);
    } catch (e) {
      setMsg(`Couldn't restore (${(e as { message?: string })?.message ?? String(e)}). Pick an Acrain backup file.`);
    }
  };

  const row = "flex w-full items-center gap-3 border-b border-[#666]/20 py-3.5 text-left text-[1.35rem] disabled:opacity-50";
  return (
    <div className="mx-auto max-w-[700px] px-4 pb-10">
      <SiteHeader title="Settings" />

      <h2 className="font-mono text-[11px] tracking-wide text-[#777] uppercase">Your notes</h2>
      <p className="mt-1 text-[1.15rem] leading-snug text-[#555]">
        {notes.length} {notes.length === 1 ? "note" : "notes"}, saved on this phone. Keep a backup somewhere safe in case the
        app is ever deleted.
      </p>
      <div className="mt-3 border-t border-[#666]/20">
        <button type="button" className={row} onClick={backUp} disabled={busy || !notes.length}>
          <Download size={20} /> Back up to Files
        </button>
        <button type="button" className={row} onClick={() => file.current?.click()}>
          <Upload size={20} /> Restore from a backup file
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Backup file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) restore(f);
            e.target.value = "";
          }}
        />
      </div>
      {msg && <p className="mt-3 font-mono text-[12px] leading-relaxed text-[#555]">{msg}</p>}

      <p className="mt-12 font-mono text-[11px] text-[#999]">Acrain {typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev"}</p>
    </div>
  );
}
