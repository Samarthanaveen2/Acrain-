"use client";

import { createContext, useContext } from "react";
import type { Note } from "@/lib/notes";

/** What the editor's building blocks need from the app: other notes, and how to open one */
export const NotesContext = createContext<{ notes: Note[]; openNote: (title: string) => void }>({
  notes: [],
  openNote: () => {},
});

export const useNotesContext = () => useContext(NotesContext);
