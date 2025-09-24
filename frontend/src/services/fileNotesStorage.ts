import { Block } from '../types/BlockTypes';

class FileNotesStorageService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:5004/api';
  }

  async saveNotes(paperId: number, blocks: Block[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/notes/${paperId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blocks }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save notes: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Notes saved to:', result.filePath);
    } catch (error) {
      console.error('Error saving notes to file:', error);
      throw new Error('Failed to save notes to file storage');
    }
  }

  async loadNotes(paperId: number): Promise<Block[]> {
    try {
      const response = await fetch(`${this.baseUrl}/notes/${paperId}`);

      if (!response.ok) {
        throw new Error(`Failed to load notes: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data.blocks || [];
    } catch (error) {
      console.error('Error loading notes from file:', error);
      return [];
    }
  }

  async deleteNotes(paperId: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/notes/${paperId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete notes: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting notes file:', error);
      throw new Error('Failed to delete notes file');
    }
  }

  async getAllNotesMetadata(): Promise<Array<{ articleId: number; lastModified: string; blocksCount: number }>> {
    try {
      const response = await fetch(`${this.baseUrl}/notes`);

      if (!response.ok) {
        throw new Error(`Failed to get notes metadata: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error getting notes metadata:', error);
      return [];
    }
  }

  // Migration function to move from localStorage to file storage
  async migrateFromLocalStorage(): Promise<void> {
    try {
      const STORAGE_KEY = 'formPaper_notes';
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        console.log('No localStorage notes to migrate');
        return;
      }

      const localNotes = JSON.parse(stored);
      let migratedCount = 0;

      for (const [paperIdStr, notesData] of Object.entries(localNotes)) {
        try {
          const paperId = parseInt(paperIdStr);
          const blocks = (notesData as any).blocks || [];

          if (blocks.length > 0) {
            await this.saveNotes(paperId, blocks);
            migratedCount++;
            console.log(`Migrated notes for paper ${paperId}`);
          }
        } catch (error) {
          console.error(`Failed to migrate notes for paper ${paperIdStr}:`, error);
        }
      }

      console.log(`Migration completed: ${migratedCount} articles migrated`);

      // Optionally clear localStorage after successful migration
      // localStorage.removeItem(STORAGE_KEY);

    } catch (error) {
      console.error('Error during migration:', error);
      throw new Error('Failed to migrate notes from localStorage');
    }
  }
}

export const fileNotesStorage = new FileNotesStorageService();