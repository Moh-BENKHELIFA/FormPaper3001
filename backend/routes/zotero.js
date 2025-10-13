const express = require('express');
const router = express.Router();
const zoteroService = require('../src/services/zoteroService');
const pdfFinderService = require('../src/services/pdfFinderService');
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
 * Récupérer les DOIs des articles déjà importés
 * GET /api/zotero/existing-dois
 */
router.get('/zotero/existing-dois', async (req, res) => {
  try {
    const papers = await db.all('SELECT doi FROM papers WHERE doi IS NOT NULL AND doi != ""');
    const dois = papers.map(p => p.doi.toLowerCase().trim());
    res.json({ dois });
  } catch (error) {
    console.error('Error fetching existing DOIs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des DOIs existants',
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

        // Créer le dossier de l'article et télécharger le PDF si disponible
        let folderPath = null;
        try {
          // Nettoyer le titre pour créer le nom du dossier
          let cleanTitle = paper.title
            .replace(/[^\w\s-]/g, '') // Supprimer les caractères spéciaux
            .replace(/\s+/g, '_') // Remplacer les espaces par des underscores
            .toLowerCase();

          if (cleanTitle.length > 50) {
            cleanTitle = cleanTitle.substring(0, 50);
          }

          folderPath = `${cleanTitle}_${paperId}`;
          const paperFolderPath = path.join(__dirname, '..', 'MyPapers', folderPath);

          // Créer le dossier de l'article
          await fs.mkdir(paperFolderPath, { recursive: true });
          console.log(`✅ Created folder for paper ${paperId}: ${paperFolderPath}`);

          // Mettre à jour le paper avec le folder_path
          await db.run(
            'UPDATE papers SET folder_path = ? WHERE id = ?',
            [folderPath, paperId]
          );

          // Télécharger le PDF si disponible
          const children = await zoteroService.getItemChildren(item.key);
          const pdfAttachment = children.find(child =>
            child.data.itemType === 'attachment' &&
            child.data.contentType === 'application/pdf'
          );

          let pdfData = null;
          let pdfFilePath = null;

          if (pdfAttachment) {
            // PDF disponible dans Zotero
            pdfData = await zoteroService.downloadFile(pdfAttachment.key);
            const pdfFileName = `${cleanTitle}_${paperId}.pdf`;
            pdfFilePath = path.join(paperFolderPath, pdfFileName);

            // Sauvegarder le PDF dans le dossier de l'article
            await fs.writeFile(pdfFilePath, pdfData);
            console.log(`✅ PDF downloaded from Zotero: ${pdfFilePath}`);
          } else {
            // Pas de PDF dans Zotero, chercher automatiquement
            console.log(`🔍 No PDF in Zotero, searching automatically for: ${paper.title}`);
            try {
              const findResult = await pdfFinderService.findPdf(item);

              if (findResult.success) {
                console.log(`✅ PDF found on ${findResult.source}, downloading...`);
                pdfData = await pdfFinderService.downloadPdf(findResult.pdfUrl);

                const pdfFileName = `${cleanTitle}_${paperId}.pdf`;
                pdfFilePath = path.join(paperFolderPath, pdfFileName);

                // Sauvegarder le PDF trouvé
                await fs.writeFile(pdfFilePath, pdfData);
                console.log(`✅ PDF downloaded from ${findResult.source}: ${pdfFilePath}`);
              } else {
                console.log(`❌ No PDF found for: ${paper.title}`);
              }
            } catch (searchError) {
              console.error(`⚠️ Error searching for PDF: ${searchError.message}`);
              // Ne pas bloquer l'import si la recherche échoue
            }
          }

          // Extraire l'image de couverture seulement si un PDF existe
          if (pdfFilePath && pdfData) {

            // Extraire la première image pour la couverture
            try {
              const { spawn } = require('child_process');
              const pythonScript = path.join(__dirname, '..', 'scripts', 'extract_images.py');
              const tempExtractDir = path.join(paperFolderPath, 'temp_extract');
              await fs.mkdir(tempExtractDir, { recursive: true });

              // Extraire les images du PDF
              const extractedImages = await new Promise((resolve, reject) => {
                const python = spawn('python', [pythonScript, pdfFilePath, tempExtractDir]);
                let result = '';
                let error = '';

                python.stdout.on('data', (data) => { result += data.toString(); });
                python.stderr.on('data', (data) => { error += data.toString(); });

                python.on('close', (code) => {
                  if (code === 0 && result.trim()) {
                    try {
                      const images = JSON.parse(result);
                      resolve(images);
                    } catch (e) {
                      resolve([]);
                    }
                  } else {
                    resolve([]);
                  }
                });
              });

              // Filtrer les logos (images < 30KB) et trouver la première image significative
              const imagesWithoutLogos = extractedImages.filter(img => img.size > 30000);

              let coverImage = null;
              if (imagesWithoutLogos.length > 0) {
                // Ignorer la première image si elle est petite (probablement un logo)
                // et prendre la suivante si elle existe, sinon prendre la première
                if (imagesWithoutLogos.length > 1 && imagesWithoutLogos[0].size < 100000) {
                  coverImage = imagesWithoutLogos[1];
                } else {
                  coverImage = imagesWithoutLogos[0];
                }
              }

              if (coverImage) {
                const coverFileName = `paper_Cover_${paperId}${path.extname(coverImage.filename)}`;
                const coverFilePath = path.join(paperFolderPath, coverFileName);

                // Copier l'image comme couverture
                await fs.copyFile(coverImage.path, coverFilePath);

                // Mettre à jour le paper avec l'image de couverture
                const coverImagePath = `MyPapers/${folderPath}/${coverFileName}`;
                await db.run(
                  'UPDATE papers SET image = ? WHERE id = ?',
                  [coverImagePath, paperId]
                );

                console.log(`✅ Cover image extracted and saved: ${coverFilePath}`);
              }

              // Nettoyer le dossier temporaire
              await fs.rm(tempExtractDir, { recursive: true, force: true });

            } catch (coverError) {
              console.error(`Error extracting cover image for ${item.key}:`, coverError);
              // Ne pas bloquer l'import si l'extraction échoue
            }
          } // Fin du if (pdfFilePath && pdfData)
        } catch (pdfError) {
          console.error(`Error creating folder or downloading PDF for ${item.key}:`, pdfError);
          // Ne pas bloquer l'import si le PDF échoue
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

/**
 * Chercher et télécharger un PDF pour un item Zotero
 * POST /api/zotero/find-pdf
 */
router.post('/zotero/find-pdf', async (req, res) => {
  try {
    const { itemKey, paperId } = req.body;

    if (!itemKey) {
      return res.status(400).json({
        success: false,
        message: 'itemKey est requis',
      });
    }

    // Récupérer l'item depuis Zotero
    const { items } = await zoteroService.fetchItems({ limit: 1000 });
    const item = items.find(i => i.key === itemKey);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item Zotero non trouvé',
      });
    }

    // Chercher le PDF avec toutes les sources
    console.log(`🔍 Starting PDF search for: ${item.data.title}`);
    const findResult = await pdfFinderService.findPdf(item);

    if (!findResult.success) {
      return res.json({
        success: false,
        message: 'PDF non trouvé',
        attemptedSources: findResult.attemptedSources,
      });
    }

    // Télécharger le PDF
    console.log(`📥 Downloading PDF from ${findResult.source}`);
    const pdfBuffer = await pdfFinderService.downloadPdf(findResult.pdfUrl);

    // Si un paperId est fourni, sauvegarder le PDF dans le dossier MyPapers
    if (paperId) {
      const paper = await db.get('SELECT * FROM papers WHERE id = ?', [paperId]);

      if (paper) {
        // Extraire le nom du dossier depuis folder_path s'il existe
        let folderPath = paper.folder_path;

        if (!folderPath) {
          // Créer le dossier si nécessaire
          let cleanTitle = paper.title
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '_')
            .toLowerCase();

          if (cleanTitle.length > 50) {
            cleanTitle = cleanTitle.substring(0, 50);
          }

          folderPath = `${cleanTitle}_${paperId}`;
          const paperFolderPath = path.join(__dirname, '..', 'MyPapers', folderPath);
          await fs.mkdir(paperFolderPath, { recursive: true });

          // Mettre à jour folder_path dans la BD
          await db.run('UPDATE papers SET folder_path = ? WHERE id = ?', [folderPath, paperId]);
        }

        const paperFolderPath = path.join(__dirname, '..', 'MyPapers', folderPath);

        // Créer le dossier s'il n'existe pas
        await fs.mkdir(paperFolderPath, { recursive: true });

        // Nom du fichier PDF
        const pdfFileName = `${folderPath}.pdf`;
        const pdfFilePath = path.join(paperFolderPath, pdfFileName);

        // Sauvegarder le PDF
        await fs.writeFile(pdfFilePath, pdfBuffer);

        // Mettre à jour le chemin du PDF dans la base de données
        const pdfDbPath = `MyPapers/${folderPath}/${pdfFileName}`;
        await db.run('UPDATE papers SET pdf_path = ? WHERE id = ?', [pdfDbPath, paperId]);

        console.log(`✅ PDF saved to: ${pdfFilePath}`);

        return res.json({
          success: true,
          message: `PDF trouvé et téléchargé depuis ${findResult.source}`,
          source: findResult.source,
          pdfPath: pdfDbPath,
        });
      }
    }

    // Si pas de paperId, juste retourner le succès de la recherche
    return res.json({
      success: true,
      message: `PDF trouvé sur ${findResult.source}`,
      source: findResult.source,
      pdfUrl: findResult.pdfUrl,
    });

  } catch (error) {
    console.error('Error finding PDF:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la recherche du PDF',
    });
  }
});

// Ajouter un item à Zotero depuis les métadonnées (DOI/PDF)
router.post('/zotero/add-item', async (req, res) => {
  try {
    const { doi, title, authors, year, journal, url } = req.body;

    console.log('📚 Ajout item à Zotero:', { doi, title });

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Le titre est requis',
      });
    }

    // Récupérer la config Zotero
    const config = await zoteroService.getConfig();
    if (!config || !config.user_id || !config.api_key_full) {
      return res.status(400).json({
        success: false,
        message: 'Zotero n\'est pas configuré',
      });
    }

    // Créer l'objet item Zotero
    const zoteroItem = {
      itemType: 'journalArticle',
      title: title,
      creators: authors ? authors.split(',').map(a => ({
        creatorType: 'author',
        name: a.trim()
      })) : [],
      date: year ? year.toString() : '',
      publicationTitle: journal || '',
      DOI: doi || '',
      url: url || '',
    };

    // Envoyer à Zotero
    const result = await zoteroService.createItem(zoteroItem);

    if (result.success) {
      console.log('✅ Item ajouté à Zotero:', result.key);
      res.json({
        success: true,
        zoteroKey: result.key,
        message: 'Article ajouté à Zotero avec succès',
      });
    } else {
      throw new Error(result.message || 'Échec de l\'ajout à Zotero');
    }

  } catch (error) {
    console.error('❌ Error adding item to Zotero:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'ajout à Zotero',
    });
  }
});

module.exports = router;
