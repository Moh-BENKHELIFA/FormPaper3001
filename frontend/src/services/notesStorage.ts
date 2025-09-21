import { NotesData, Block, NotesStorage } from '../types/BlockTypes';

const STORAGE_KEY = 'formPaper_notes';

export const notesStorage = {
  saveNotes(paperId: number, blocks: Block[]): void {
    try {
      const existingData = this.getAllNotes();
      const notesData: NotesData = {
        paperId,
        blocks,
        lastModified: new Date().toISOString(),
      };

      existingData[paperId.toString()] = notesData;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));
    } catch (error) {
      console.error('Error saving notes:', error);
      throw new Error('Failed to save notes to local storage');
    }
  },

  loadNotes(paperId: number): Block[] {
    try {
      const allNotes = this.getAllNotes();
      const notesData = allNotes[paperId.toString()];
      return notesData?.blocks || [];
    } catch (error) {
      console.error('Error loading notes:', error);
      return [];
    }
  },

  getAllNotes(): NotesStorage {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error parsing notes from storage:', error);
      return {};
    }
  },

  deleteNotes(paperId: number): void {
    try {
      const existingData = this.getAllNotes();
      delete existingData[paperId.toString()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));
    } catch (error) {
      console.error('Error deleting notes:', error);
      throw new Error('Failed to delete notes from local storage');
    }
  },

  hasNotes(paperId: number): boolean {
    const notes = this.loadNotes(paperId);
    return notes.length > 0;
  },

  getLastModified(paperId: number): string | null {
    try {
      const allNotes = this.getAllNotes();
      const notesData = allNotes[paperId.toString()];
      return notesData?.lastModified || null;
    } catch (error) {
      console.error('Error getting last modified date:', error);
      return null;
    }
  },

  exportNotes(paperId: number): string {
    const notes = this.loadNotes(paperId);
    return JSON.stringify(notes, null, 2);
  },

  importNotes(paperId: number, notesJson: string): void {
    try {
      const blocks: Block[] = JSON.parse(notesJson);
      this.saveNotes(paperId, blocks);
    } catch (error) {
      console.error('Error importing notes:', error);
      throw new Error('Invalid notes format');
    }
  },

  clearAllNotes(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing all notes:', error);
      throw new Error('Failed to clear notes storage');
    }
  },

  getStorageSize(): number {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Blob([stored]).size : 0;
    } catch (error) {
      console.error('Error calculating storage size:', error);
      return 0;
    }
  },
};