import axios from 'axios';

const API_BASE_URL = 'http://localhost:5004/api';

export interface Collection {
  id: number;
  name: string;
  count: number;
  created_at: string;
}

export const collectionService = {
  // Get all collections
  async getAllCollections(): Promise<Collection[]> {
    const response = await axios.get(`${API_BASE_URL}/collections`);
    return response.data;
  },

  // Get a single collection with its papers
  async getCollection(id: number) {
    const response = await axios.get(`${API_BASE_URL}/collections/${id}`);
    return response.data;
  },

  // Create a new collection
  async createCollection(name: string, paperIds: number[] = []): Promise<Collection> {
    const response = await axios.post(`${API_BASE_URL}/collections`, {
      name,
      paperIds,
    });
    return response.data;
  },

  // Update collection name
  async updateCollection(id: number, name: string): Promise<Collection> {
    const response = await axios.put(`${API_BASE_URL}/collections/${id}`, {
      name,
    });
    return response.data;
  },

  // Delete a collection
  async deleteCollection(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/collections/${id}`);
  },

  // Add papers to a collection
  async addPapersToCollection(id: number, paperIds: number[]): Promise<void> {
    await axios.post(`${API_BASE_URL}/collections/${id}/papers`, {
      paperIds,
    });
  },

  // Remove a paper from a collection
  async removePaperFromCollection(collectionId: number, paperId: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/collections/${collectionId}/papers/${paperId}`);
  },
};
