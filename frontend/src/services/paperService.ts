import axios from 'axios';
import { Paper, PaperFormData, DOIMetadata, ExtractedImages, Category, Tag, PaperStats, APIResponse } from '../types/Paper';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const paperService = {
  async getAllPapers(): Promise<Paper[]> {
    const response = await api.get<APIResponse<Paper[]>>('/papers');
    return response.data.data || [];
  },

  async getPaper(id: number): Promise<Paper> {
    const response = await api.get<APIResponse<Paper>>(`/papers/${id}`);
    if (!response.data.data) {
      throw new Error('Paper not found');
    }
    return response.data.data;
  },

  async createPaper(paperData: PaperFormData): Promise<Paper> {
    try {
      const response = await api.post<APIResponse<Paper>>('/papers', paperData);
      if (!response.data.data) {
        throw new Error(response.data.error || 'Impossible de créer l\'article - DOI peut-être déjà existant');
      }
      return response.data.data;
    } catch (error) {
      if (error.response) {
        // Erreur HTTP avec réponse du serveur
        if (error.response.status === 409) {
          // Conflit DOI
          throw new Error(error.response.data.error || 'Un article avec ce DOI existe déjà dans la base de données');
        } else if (error.response.data?.error) {
          // Autre erreur avec message du serveur
          throw new Error(error.response.data.error);
        }
      }
      // Erreur réseau ou autre
      throw new Error(error instanceof Error ? error.message : 'Erreur lors de la création de l\'article');
    }
  },

  async updatePaper(id: number, paperData: Partial<PaperFormData>): Promise<Paper> {
    const response = await api.put<APIResponse<Paper>>(`/papers/${id}`, paperData);
    if (!response.data.data) {
      throw new Error(response.data.error || 'Failed to update paper');
    }
    return response.data.data;
  },

  async deletePaper(id: number): Promise<void> {
    const response = await api.delete<APIResponse<void>>(`/papers/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete paper');
    }
  },

  async updateReadingStatus(id: number, status: Paper['reading_status']): Promise<Paper> {
    const response = await api.patch<APIResponse<Paper>>(`/papers/${id}/status`, { reading_status: status });
    if (!response.data.data) {
      throw new Error(response.data.error || 'Failed to update reading status');
    }
    return response.data.data;
  },

  async updateFavoriteStatus(id: number, isFavorite: boolean): Promise<Paper> {
    const response = await api.patch<APIResponse<Paper>>(`/papers/${id}/favorite`, { is_favorite: isFavorite ? 1 : 0 });
    if (!response.data.data) {
      throw new Error(response.data.error || 'Failed to update favorite status');
    }
    return response.data.data;
  },

  async fetchDOIMetadata(doi: string): Promise<DOIMetadata> {
    const response = await api.get<APIResponse<DOIMetadata>>(`/papers/doi/${encodeURIComponent(doi)}`);
    if (!response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch DOI metadata');
    }
    return response.data.data;
  },

  async checkDoiExists(doi: string): Promise<boolean> {
    try {
      const response = await api.get<APIResponse<{ exists: boolean; doi: string }>>(`/papers/check-doi/${encodeURIComponent(doi)}`);
      return response.data.data?.exists || false;
    } catch (error) {
      console.error('Error checking DOI existence:', error);
      return false;
    }
  },

  async uploadPDF(file: File): Promise<{ filePath: string; metadata: DOIMetadata | null; images: ExtractedImages }> {
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await api.post<APIResponse<{
      filePath: string;
      metadata: DOIMetadata | null;
      images: ExtractedImages;
    }>>('/papers/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.data.data) {
      throw new Error(response.data.error || 'Failed to upload PDF');
    }
    return response.data.data;
  },

  async getCategories(): Promise<Category[]> {
    const response = await api.get<APIResponse<Category[]>>('/categories');
    return response.data.data || [];
  },

  async createCategory(name: string): Promise<Category> {
    const response = await api.post<APIResponse<Category>>('/categories', { name });
    if (!response.data.data) {
      throw new Error(response.data.error || 'Failed to create category');
    }
    return response.data.data;
  },

  async getPaperStats(): Promise<PaperStats> {
    const response = await api.get<APIResponse<PaperStats>>('/papers/stats');
    return response.data.data || {
      total: 0,
      unread: 0,
      reading: 0,
      read: 0,
      favorite: 0,
    };
  },

  async searchPapers(query: string): Promise<Paper[]> {
    const response = await api.get<APIResponse<Paper[]>>(`/papers/search`, {
      params: { q: query }
    });
    return response.data.data || [];
  },

  async getPapersByCategory(categoryId: number): Promise<Paper[]> {
    const response = await api.get<APIResponse<Paper[]>>(`/categories/${categoryId}/papers`);
    return response.data.data || [];
  },

  async addPaperToCategory(paperId: number, categoryId: number): Promise<void> {
    const response = await api.post<APIResponse<void>>(`/papers/${paperId}/categories/${categoryId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to add paper to category');
    }
  },

  async removePaperFromCategory(paperId: number, categoryId: number): Promise<void> {
    const response = await api.delete<APIResponse<void>>(`/papers/${paperId}/categories/${categoryId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to remove paper from category');
    }
  },

  async getExtractedImages(filePath: string): Promise<ExtractedImages> {
    const response = await api.post<APIResponse<ExtractedImages>>('/papers/extract-images', { filePath });
    if (!response.data.data) {
      throw new Error(response.data.error || 'Failed to extract images');
    }
    return response.data.data;
  },

  // Tags
  async getTags(): Promise<Tag[]> {
    const response = await api.get<APIResponse<Tag[]>>('/tags');
    return response.data.data || [];
  },

  async createTag(name: string, color?: string): Promise<Tag> {
    try {
      console.log('Creating tag:', { name, color });
      const response = await api.post<APIResponse<Tag>>('/tags', { name, color });
      console.log('Tag creation response:', response.data);
      if (!response.data.data) {
        throw new Error(response.data.error || 'Failed to create tag');
      }
      return response.data.data;
    } catch (error) {
      console.error('Tag creation error:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        throw new Error(error.response.data.error || error.response.data.message || 'Failed to create tag');
      }
      throw error;
    }
  },

  async updateTag(id: number, name: string, color?: string): Promise<Tag> {
    try {
      console.log('Updating tag:', { id, name, color });
      const response = await api.put<APIResponse<Tag>>(`/tags/${id}`, { name, color });
      console.log('Tag update response:', response.data);
      if (!response.data.data) {
        throw new Error(response.data.error || 'Failed to update tag');
      }
      return response.data.data;
    } catch (error) {
      console.error('Tag update error:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        throw new Error(error.response.data.error || error.response.data.message || 'Failed to update tag');
      }
      throw error;
    }
  },

  async deleteTag(id: number): Promise<void> {
    const response = await api.delete<APIResponse<void>>(`/tags/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete tag');
    }
  },

  async addTagToPaper(paperId: number, tagId: number): Promise<void> {
    const response = await api.post<APIResponse<void>>(`/tags/${tagId}/papers/${paperId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to add tag to paper');
    }
  },

  async removeTagFromPaper(paperId: number, tagId: number): Promise<void> {
    const response = await api.delete<APIResponse<void>>(`/tags/${tagId}/papers/${paperId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to remove tag from paper');
    }
  },

  async getPaperTags(paperId: number): Promise<Tag[]> {
    const response = await api.get<APIResponse<Tag[]>>(`/tags/papers/${paperId}`);
    return response.data.data || [];
  },

  async uploadCoverImage(paperId: number, imageFile: File): Promise<string> {
    const formData = new FormData();
    formData.append('coverImage', imageFile);

    const response = await api.post<APIResponse<{ imagePath: string }>>(`/papers/${paperId}/cover-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.data.data) {
      throw new Error(response.data.error || 'Failed to upload cover image');
    }
    return response.data.data.imagePath;
  },

  async savePdfAssets(paperId: number, data: {
    pdfPath: string;
    selectedImages: string[];
    coverImagePath?: string;
  }): Promise<{ pdfPath: string; savedImages: any[]; coverImage?: string }> {
    const response = await api.post<APIResponse<{
      pdfPath: string;
      savedImages: any[];
      coverImage?: string;
    }>>(`/papers/${paperId}/save-pdf-assets`, data);

    if (!response.data.data) {
      throw new Error(response.data.error || 'Failed to save PDF assets');
    }
    return response.data.data;
  },
};