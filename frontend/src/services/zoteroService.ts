import axios from 'axios';
import { APIResponse } from '../types/Paper';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export interface ZoteroConfig {
  configured: boolean;
  user_id?: string;
  library_type?: 'user' | 'group';
  last_sync?: string;
  api_key_preview?: string;
}

export interface ZoteroItem {
  key: string;
  version: number;
  library: {
    type: string;
    id: number;
    name: string;
  };
  meta?: {
    numChildren?: number;
  };
  data: {
    key: string;
    version: number;
    itemType: string;
    title: string;
    creators: Array<{
      creatorType: string;
      firstName?: string;
      lastName?: string;
      name?: string;
    }>;
    abstractNote?: string;
    publicationTitle?: string;
    conferenceName?: string;
    bookTitle?: string;
    university?: string;
    date?: string;
    DOI?: string;
    url?: string;
    journalAbbreviation?: string;
    tags?: Array<{ tag: string }>;
    collections?: string[];
  };
}

export interface ZoteroCollection {
  key: string;
  version: number;
  library: {
    type: string;
    id: number;
    name: string;
  };
  data: {
    key: string;
    version: number;
    name: string;
    parentCollection?: string;
  };
}

export interface ZoteroTestResult {
  success: boolean;
  message: string;
  libraryVersion?: string;
}

export interface ZoteroImportResult {
  success: boolean;
  imported: number;
  errors: number;
  details: {
    imported: Array<{ id: number; zotero_key: string; title: string }>;
    errors: Array<{ key: string; title: string; error: string }>;
  };
}

export const zoteroService = {
  /**
   * Tester la connexion Zotero
   */
  async testConnection(userId: string, apiKey: string): Promise<ZoteroTestResult> {
    try {
      const response = await api.post<ZoteroTestResult>('/zotero/test', {
        userId,
        apiKey,
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Erreur lors du test de connexion');
      }
      throw new Error(error instanceof Error ? error.message : 'Erreur lors du test de connexion');
    }
  },

  /**
   * Sauvegarder la configuration Zotero
   */
  async saveConfig(userId: string, apiKey: string, libraryType: 'user' | 'group' = 'user'): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post<{ success: boolean; message: string }>('/zotero/config', {
        userId,
        apiKey,
        libraryType,
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Erreur lors de la sauvegarde de la configuration');
      }
      throw new Error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde de la configuration');
    }
  },

  /**
   * Récupérer la configuration Zotero
   */
  async getConfig(): Promise<ZoteroConfig> {
    try {
      const response = await api.get<ZoteroConfig>('/zotero/config');
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Erreur lors de la récupération de la configuration');
      }
      throw new Error(error instanceof Error ? error.message : 'Erreur lors de la récupération de la configuration');
    }
  },

  /**
   * Supprimer la configuration Zotero
   */
  async deleteConfig(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete<{ success: boolean; message: string }>('/zotero/config');
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Erreur lors de la suppression de la configuration');
      }
      throw new Error(error instanceof Error ? error.message : 'Erreur lors de la suppression de la configuration');
    }
  },

  /**
   * Récupérer les items depuis Zotero
   */
  async fetchItems(options?: {
    limit?: number;
    start?: number;
    itemType?: string;
    tag?: string;
    q?: string;
    since?: number;
  }): Promise<{ items: ZoteroItem[]; total: string; libraryVersion: string }> {
    try {
      const response = await api.get<{ items: ZoteroItem[]; total: string; libraryVersion: string }>('/zotero/items', {
        params: options,
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Erreur lors de la récupération des items');
      }
      throw new Error(error instanceof Error ? error.message : 'Erreur lors de la récupération des items');
    }
  },

  /**
   * Récupérer les collections depuis Zotero
   */
  async fetchCollections(): Promise<ZoteroCollection[]> {
    try {
      const response = await api.get<ZoteroCollection[]>('/zotero/collections');
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Erreur lors de la récupération des collections');
      }
      throw new Error(error instanceof Error ? error.message : 'Erreur lors de la récupération des collections');
    }
  },

  /**
   * Importer des items sélectionnés depuis Zotero
   */
  async importItems(itemKeys: string[]): Promise<ZoteroImportResult> {
    try {
      const response = await api.post<ZoteroImportResult>('/zotero/import', {
        itemKeys,
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Erreur lors de l\'importation');
      }
      throw new Error(error instanceof Error ? error.message : 'Erreur lors de l\'importation');
    }
  },
};
