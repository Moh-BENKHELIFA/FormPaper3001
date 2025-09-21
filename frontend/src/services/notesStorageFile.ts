import axios from 'axios';
import { NotesData, Block } from '../types/BlockTypes';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const notesStorageFile = {
  async saveNotes(paperId: number, blocks: Block[]): Promise<void> {
    try {
      const notesData: NotesData = {
        paperId,
        blocks,
        lastModified: new Date().toISOString(),
      };

      await api.post(`/notes/${paperId}`, notesData);
    } catch (error) {
      console.error('Error saving notes to file:', error);
      throw new Error('Failed to save notes to server');
    }
  },

  async loadNotes(paperId: number): Promise<Block[]> {
    try {
      const response = await api.get(`/notes/${paperId}`);
      return response.data.blocks || [];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      console.error('Error loading notes from file:', error);
      throw new Error('Failed to load notes from server');
    }
  },

  async deleteNotes(paperId: number): Promise<void> {
    try {
      await api.delete(`/notes/${paperId}`);
    } catch (error) {
      console.error('Error deleting notes file:', error);
      throw new Error('Failed to delete notes from server');
    }
  },

  async hasNotes(paperId: number): Promise<boolean> {
    try {
      await api.head(`/notes/${paperId}`);
      return true;
    } catch (error) {
      return false;
    }
  },

  async getLastModified(paperId: number): Promise<string | null> {
    try {
      const response = await api.get(`/notes/${paperId}/metadata`);
      return response.data.lastModified || null;
    } catch (error) {
      return null;
    }
  },

  async exportNotes(paperId: number): Promise<string> {
    const notes = await this.loadNotes(paperId);
    return JSON.stringify(notes, null, 2);
  },

  async importNotes(paperId: number, notesJson: string): Promise<void> {
    try {
      const blocks: Block[] = JSON.parse(notesJson);
      await this.saveNotes(paperId, blocks);
    } catch (error) {
      console.error('Error importing notes:', error);
      throw new Error('Invalid notes format');
    }
  },

  async getAllNotesMetadata(): Promise<{ paperId: number; lastModified: string }[]> {
    try {
      const response = await api.get('/notes/metadata');
      return response.data || [];
    } catch (error) {
      console.error('Error getting notes metadata:', error);
      return [];
    }
  },

  async syncWithLocalStorage(): Promise<void> {
    try {
      const localStorageKey = 'formPaper_notes';
      const localData = localStorage.getItem(localStorageKey);

      if (localData) {
        const notesStorage = JSON.parse(localData);

        for (const [paperIdStr, notesData] of Object.entries(notesStorage)) {
          const paperId = parseInt(paperIdStr);
          const data = notesData as NotesData;

          await this.saveNotes(paperId, data.blocks);
        }
      }
    } catch (error) {
      console.error('Error syncing with local storage:', error);
      throw new Error('Failed to sync notes with server');
    }
  },
};