const axios = require('axios');
const db = require('../database/database');

const ZOTERO_API_BASE = 'https://api.zotero.org';

class ZoteroService {
  /**
   * Tester la connexion avec les credentials Zotero
   */
  async testConnection(userId, apiKey) {
    try {
      const response = await axios.get(`${ZOTERO_API_BASE}/users/${userId}/items`, {
        headers: {
          'Zotero-API-Key': apiKey,
        },
        params: {
          limit: 1,
        },
      });

      return {
        success: true,
        message: 'Connexion réussie',
        libraryVersion: response.headers['last-modified-version'],
      };
    } catch (error) {
      console.error('Zotero connection test failed:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.status === 403
          ? 'Clé API invalide ou permissions insuffisantes'
          : 'Impossible de se connecter à Zotero',
      };
    }
  }

  /**
   * Sauvegarder la configuration Zotero
   */
  async saveConfig(userId, apiKey, libraryType = 'user') {
    try {
      // Vérifier d'abord la connexion
      const testResult = await this.testConnection(userId, apiKey);
      if (!testResult.success) {
        throw new Error(testResult.message);
      }

      // Vérifier si une config existe déjà
      const existing = await db.get('SELECT id FROM zotero_config LIMIT 1');

      if (existing) {
        await db.run(
          'UPDATE zotero_config SET user_id = ?, api_key = ?, library_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [userId, apiKey, libraryType, existing.id]
        );
      } else {
        await db.run(
          'INSERT INTO zotero_config (user_id, api_key, library_type) VALUES (?, ?, ?)',
          [userId, apiKey, libraryType]
        );
      }

      return { success: true, message: 'Configuration sauvegardée' };
    } catch (error) {
      console.error('Error saving Zotero config:', error);
      throw error;
    }
  }

  /**
   * Récupérer la configuration Zotero
   */
  async getConfig() {
    try {
      const config = await db.get('SELECT * FROM zotero_config LIMIT 1');
      if (!config) {
        return null;
      }

      // Ne pas exposer la clé API complète
      return {
        ...config,
        api_key: config.api_key ? '••••••' + config.api_key.slice(-4) : null,
        api_key_full: config.api_key, // Utilisé uniquement côté serveur
      };
    } catch (error) {
      console.error('Error getting Zotero config:', error);
      return null;
    }
  }

  /**
   * Supprimer la configuration Zotero
   */
  async deleteConfig() {
    try {
      await db.run('DELETE FROM zotero_config');
      return { success: true, message: 'Configuration supprimée' };
    } catch (error) {
      console.error('Error deleting Zotero config:', error);
      throw error;
    }
  }

  /**
   * Récupérer les items depuis Zotero (avec pagination automatique)
   */
  async fetchItems(options = {}) {
    try {
      const config = await this.getConfig();
      if (!config || !config.api_key_full) {
        throw new Error('Configuration Zotero non trouvée');
      }

      const {
        limit = 100,
        itemType,
        tag,
        q,
        since,
      } = options;

      // L'API Zotero limite à 100 items par requête
      const maxPerRequest = 100;
      let allItems = [];
      let start = 0;
      let totalResults = 0;

      // Première requête pour connaître le total
      const firstParams = {
        limit: Math.min(limit, maxPerRequest),
        start: 0,
        format: 'json',
        include: 'data',
      };

      if (itemType) firstParams.itemType = itemType;
      if (tag) firstParams.tag = tag;
      if (q) firstParams.q = q;
      if (since) firstParams.since = since;

      const firstResponse = await axios.get(
        `${ZOTERO_API_BASE}/users/${config.user_id}/items`,
        {
          headers: {
            'Zotero-API-Key': config.api_key_full,
          },
          params: firstParams,
        }
      );

      allItems = firstResponse.data;
      totalResults = parseInt(firstResponse.headers['total-results'] || '0');
      const libraryVersion = firstResponse.headers['last-modified-version'];

      // Si on a besoin de plus d'items et qu'il y en a plus, faire des requêtes supplémentaires
      if (limit > maxPerRequest && totalResults > maxPerRequest) {
        const itemsToFetch = Math.min(limit, totalResults) - maxPerRequest;
        const additionalRequests = Math.ceil(itemsToFetch / maxPerRequest);

        for (let i = 0; i < additionalRequests; i++) {
          start = (i + 1) * maxPerRequest;

          const params = {
            limit: maxPerRequest,
            start,
            format: 'json',
            include: 'data',
          };

          if (itemType) params.itemType = itemType;
          if (tag) params.tag = tag;
          if (q) params.q = q;
          if (since) params.since = since;

          const response = await axios.get(
            `${ZOTERO_API_BASE}/users/${config.user_id}/items`,
            {
              headers: {
                'Zotero-API-Key': config.api_key_full,
              },
              params,
            }
          );

          allItems = allItems.concat(response.data);

          // Arrêter si on a atteint la limite demandée
          if (allItems.length >= limit) {
            allItems = allItems.slice(0, limit);
            break;
          }
        }
      }

      return {
        items: allItems,
        total: totalResults.toString(),
        libraryVersion,
      };
    } catch (error) {
      console.error('Error fetching Zotero items:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Récupérer les collections depuis Zotero
   */
  async fetchCollections() {
    try {
      const config = await this.getConfig();
      if (!config || !config.api_key_full) {
        throw new Error('Configuration Zotero non trouvée');
      }

      const response = await axios.get(
        `${ZOTERO_API_BASE}/users/${config.user_id}/collections`,
        {
          headers: {
            'Zotero-API-Key': config.api_key_full,
          },
          params: {
            format: 'json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching Zotero collections:', error);
      throw error;
    }
  }

  /**
   * Télécharger un fichier PDF depuis Zotero
   */
  async downloadFile(itemKey) {
    try {
      const config = await this.getConfig();
      if (!config || !config.api_key_full) {
        throw new Error('Configuration Zotero non trouvée');
      }

      const response = await axios.get(
        `${ZOTERO_API_BASE}/users/${config.user_id}/items/${itemKey}/file`,
        {
          headers: {
            'Zotero-API-Key': config.api_key_full,
          },
          responseType: 'arraybuffer',
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error downloading file from Zotero:', error);
      throw error;
    }
  }

  /**
   * Mapper un item Zotero vers le format FormPaper
   */
  mapZoteroItemToPaper(item) {
    const data = item.data;

    // Extraire les auteurs
    const authors = (data.creators || [])
      .map(creator => {
        if (creator.firstName && creator.lastName) {
          return `${creator.firstName} ${creator.lastName}`;
        }
        return creator.name || '';
      })
      .filter(Boolean)
      .join(', ');

    // Déterminer la conférence/journal
    const conference = data.publicationTitle ||
                      data.conferenceName ||
                      data.bookTitle ||
                      data.university ||
                      '';

    return {
      title: data.title || 'Sans titre',
      authors: authors || 'Auteur inconnu',
      publication_date: data.date || null,
      conference,
      conference_short: data.journalAbbreviation || '',
      doi: data.DOI || null,
      url: data.url || null,
      zotero_key: item.key,
      reading_status: 'unread',
      is_favorite: 0,
    };
  }
}

module.exports = new ZoteroService();
