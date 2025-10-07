const express = require('express');
const router = express.Router();
const zoteroService = require('../src/services/zoteroService');
const db = require('../src/database/database');
const fs = require('fs').promises;
const path = require('path');

/**
 * Tester la connexion Zotero
 * POST /api/zotero/test
 */
router.post('/zotero/test', async (req, res) => {
  try {
    const { userId, apiKey } = req.body;

    if (!userId || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'User ID et API Key sont requis',
      });
    }

    const result = await zoteroService.testConnection(userId, apiKey);
    res.json(result);
  } catch (error) {
    console.error('Error testing Zotero connection:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test de connexion',
    });
  }
});

/**
 * Sauvegarder la configuration Zotero
 * POST /api/zotero/config
 */
router.post('/zotero/config', async (req, res) => {
  try {
    const { userId, apiKey, libraryType } = req.body;

    if (!userId || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'User ID et API Key sont requis',
      });
    }

    const result = await zoteroService.saveConfig(userId, apiKey, libraryType);
    res.json(result);
  } catch (error) {
    console.error('Error saving Zotero config:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la sauvegarde de la configuration',
    });
  }
});

/**
 * Récupérer la configuration Zotero
 * GET /api/zotero/config
 */
router.get('/zotero/config', async (req, res) => {
  try {
    const config = await zoteroService.getConfig();

    if (!config) {
      return res.json({ configured: false });
    }

    // Ne pas exposer la clé API complète
    res.json({
      configured: true,
      user_id: config.user_id,
      library_type: config.library_type,
      last_sync: config.last_sync,
      api_key_preview: config.api_key,
    });
  } catch (error) {
    console.error('Error getting Zotero config:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la configuration',
    });
  }
});

/**
 * Supprimer la configuration Zotero
 * DELETE /api/zotero/config
 */
router.delete('/zotero/config', async (req, res) => {
  try {
    const result = await zoteroService.deleteConfig();
    res.json(result);
  } catch (error) {
    console.error('Error deleting Zotero config:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la configuration',
    });
  }
});

/**
 * Récupérer les items depuis Zotero
 * GET /api/zotero/items
 */
router.get('/zotero/items', async (req, res) => {
  try {
    const {
      limit,
      start,
      itemType,
      tag,
      q,
      since,
    } = req.query;

    const result = await zoteroService.fetchItems({
      limit: limit ? parseInt(limit) : 100,
      start: start ? parseInt(start) : 0,
      itemType,
      tag,
      q,
      since,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching Zotero items:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des items',
    });
  }
});

/**
 * Récupérer les collections depuis Zotero
 * GET /api/zotero/collections
 */
router.get('/zotero/collections', async (req, res) => {
  try {
    const collections = await zoteroService.fetchCollections();
    res.json(collections);
  } catch (error) {
    console.error('Error fetching Zotero collections:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des collections',
    });
  }
});

/**
 * Importer des items depuis Zotero
 * POST /api/zotero/import
 */
router.post('/zotero/import', async (req, res) => {
  try {
    const { itemKeys } = req.body;

    if (!itemKeys || !Array.isArray(itemKeys) || itemKeys.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'itemKeys est requis et doit être un tableau',
      });
    }

    // Récupérer tous les items depuis Zotero
    const { items } = await zoteroService.fetchItems({ limit: 1000 });

    // Filtrer les items sélectionnés
    const selectedItems = items.filter(item => itemKeys.includes(item.key));

    const imported = [];
    const errors = [];

    for (const item of selectedItems) {
      try {
        // Vérifier si l'item existe déjà
        const existing = await db.get(
          'SELECT id FROM papers WHERE zotero_key = ?',
          [item.key]
        );

        if (existing) {
          errors.push({
            key: item.key,
            title: item.data.title,
            error: 'Article déjà importé',
          });
          continue;
        }

        // Mapper l'item
        const paper = zoteroService.mapZoteroItemToPaper(item);

        // Insérer dans la base de données
        const result = await db.run(
          `INSERT INTO papers (
            title, authors, publication_date, conference, conference_short,
            doi, url, zotero_key, reading_status, is_favorite
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            paper.title,
            paper.authors,
            paper.publication_date,
            paper.conference,
            paper.conference_short,
            paper.doi,
            paper.url,
            paper.zotero_key,
            paper.reading_status,
            paper.is_favorite,
          ]
        );

        const paperId = result.id;

        // Gérer les tags Zotero
        if (item.data.tags && item.data.tags.length > 0) {
          for (const zoteroTag of item.data.tags) {
            const tagName = zoteroTag.tag.trim();
            if (!tagName) continue;

            // Chercher un tag similaire dans FormPaper (insensible à la casse)
            let existingTag = await db.get(
              'SELECT id, name FROM tags WHERE LOWER(name) = LOWER(?)',
              [tagName]
            );

            // Si le tag n'existe pas, le créer
            if (!existingTag) {
              const tagResult = await db.run(
                'INSERT INTO tags (name, color) VALUES (?, ?)',
                [tagName, '#3B82F6'] // Couleur bleue par défaut
              );
              existingTag = { id: tagResult.id, name: tagName };
            }

            // Associer le tag au paper
            await db.run(
              'INSERT OR IGNORE INTO paper_tags (paper_id, tag_id) VALUES (?, ?)',
              [paperId, existingTag.id]
            );
          }
        }

        imported.push({
          id: paperId,
          zotero_key: item.key,
          title: paper.title,
        });
      } catch (error) {
        console.error(`Error importing item ${item.key}:`, error);
        errors.push({
          key: item.key,
          title: item.data.title,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      imported: imported.length,
      errors: errors.length,
      details: {
        imported,
        errors,
      },
    });
  } catch (error) {
    console.error('Error importing Zotero items:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'importation',
    });
  }
});

module.exports = router;
