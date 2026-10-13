"use client";

import { useState } from "react";
import { ChevronLeft, MoreHorizontal, NotebookPen } from "lucide-react";
import type { Canvas, Shape } from "@/lib/board";
import Board from "./Board";

/** One canvas, full screen: a slim bar on top (back, title, menu) and the board below */
export default function CanvasScreen({
  canvas,
  title,
  inNote,
  noteTitles,
  focus,
  onSave,
  onRename,
  onDelete,
  onBack,
  onOpenNote,
}: {
  canvas: Canvas;
  title: string;
  /** The note this canvas belongs to (its title can't be changed from here) */
  inNote?: string;
  noteTitles: string[];
  focus?: string | null;
  onSave: (shapes: Shape[]) => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onBack: () => void;
  onOpenNote: (title: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(title);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="bd-screen flex flex-col">
      <div className="bd-topbar">
        <button type="button" aria-label="Back" onClick={onBack} className="bd-btn">
          <ChevronLeft size={22} />
        </button>
        {renaming ? (
          <form
            className="min-w-0 flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) onRename(name.trim());
              setRenaming(false);
            }}
          >
            <input
              autoFocus
              aria-label="Canvas name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (name.trim()) onRename(name.trim());
                setRenaming(false);
              }}
              className="w-full border-b-[1.5px] border-[#111] bg-transparent font-serif text-[1.55rem] outline-none"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => (inNote ? onOpenNote(inNote) : setRenaming(true))}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
            aria-label={inNote ? `Open note ${inNote}` : "Rename canvas"}
          >
            {inNote && <NotebookPen size={15} className="shrink-0 text-[var(--path-b)]" />}
            <span className="truncate font-serif text-[1.55rem]">{title}</span>
          </button>
        )}
        <div className="relative">
          <button type="button" aria-label="Canvas menu" onClick={() => setMenu((m) => !m)} className="bd-btn">
            <MoreHorizontal size={20} />
          </button>
          {menu && (
            <div className="bd-menu" role="menu">
              {!inNote && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    setRenaming(true);
                  }}
                >
                  Rename
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => (confirm ? onDelete() : setConfirm(true))}
                className={confirm ? "bg-[#8b0000] text-[#fffff8]" : "text-[#8b0000]"}
              >
                {confirm ? "Tap again to delete" : "Delete canvas"}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <Board
          key={canvas.id}
          camKey={canvas.id}
          board={canvas}
          noteTitles={noteTitles}
          onSave={(b) => onSave(b.shapes)}
          onOpenNote={onOpenNote}
          focus={focus}
        />
      </div>
    </div>
  );
}
