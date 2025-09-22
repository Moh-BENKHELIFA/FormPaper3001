const db = require('./database');
const { Paper, Category, Description, PaperCategory } = require('./models');
const fs = require('fs-extra');
const path = require('path');

// Fonction utilitaire pour créer le nom de dossier
function createFolderName(title, id) {
  // Supprimer les caractères spéciaux et remplacer les espaces par des underscores
  let cleanTitle = title
    .replace(/[^\w\s-]/g, '') // Supprimer les caractères spéciaux
    .replace(/\s+/g, '_') // Remplacer les espaces par des underscores
    .toLowerCase(); // Convertir en minuscules

  // Limiter la longueur du titre (max 50 caractères)
  if (cleanTitle.length > 50) {
    cleanTitle = cleanTitle.substring(0, 50);
  }

  // Retourner le format: titre_ID
  return `${cleanTitle}_${id}`;
}

// Fonction pour créer le dossier de l'article
async function createPaperFolder(title, id) {
  const folderName = createFolderName(title, id);
  const myPapersDir = path.join(__dirname, '../../MyPapers');
  const paperFolderPath = path.join(myPapersDir, folderName);

  try {
    // Créer le dossier MyPapers s'il n'existe pas
    await fs.ensureDir(myPapersDir);

    // Créer le dossier spécifique de l'article
    await fs.ensureDir(paperFolderPath);

    console.log(`✅ Dossier créé: ${paperFolderPath}`);
    return folderName;
  } catch (error) {
    console.error('❌ Erreur lors de la création du dossier:', error);
    throw error;
  }
}

class PaperOperations {
  static async getAllPapers() {
    const sql = `
      SELECT p.*,
             GROUP_CONCAT(c.name) as category_names,
             d.texte as description_text,
             d.images as description_images
      FROM papers p
      LEFT JOIN paper_categories pc ON p.id = pc.paper_id
      LEFT JOIN categories c ON pc.category_id = c.id
      LEFT JOIN descriptions d ON p.id = d.paper_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;

    const rows = await db.all(sql);
    return rows.map(row => {
      const paper = new Paper(row);
      if (row.category_names) {
        paper.categories = row.category_names.split(',').map(name => ({ name: name.trim() }));
      }
      if (row.description_text || row.description_images) {
        paper.description = {
          texte: row.description_text,
          images: row.description_images ? JSON.parse(row.description_images) : []
        };
      }
      return paper.toJSON();
    });
  }

  static async getPaper(id) {
    const sql = `
      SELECT p.*,
             GROUP_CONCAT(c.name) as category_names,
             d.texte as description_text,
             d.images as description_images
      FROM papers p
      LEFT JOIN paper_categories pc ON p.id = pc.paper_id
      LEFT JOIN categories c ON pc.category_id = c.id
      LEFT JOIN descriptions d ON p.id = d.paper_id
      WHERE p.id = ?
      GROUP BY p.id
    `;

    const row = await db.get(sql, [id]);
    if (!row) return null;

    const paper = new Paper(row);
    if (row.category_names) {
      paper.categories = row.category_names.split(',').map(name => ({ name: name.trim() }));
    }
    if (row.description_text || row.description_images) {
      paper.description = {
        texte: row.description_text,
        images: row.description_images ? JSON.parse(row.description_images) : []
      };
    }

    return paper.toJSON();
  }

  static async createPaper(paperData) {
    const validation = Paper.validate(paperData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // D'abord insérer l'article pour obtenir l'ID
    const sql = `
      INSERT INTO papers (title, authors, publication_date, conference, conference_short, reading_status, is_favorite, year, month, image, doi, url, folder_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      paperData.title,
      paperData.authors,
      paperData.publication_date,
      paperData.conference,
      paperData.conference_short || null,
      paperData.reading_status || 'unread',
      paperData.is_favorite || 0,
      paperData.year || null,
      paperData.month || null,
      paperData.image,
      paperData.doi,
      paperData.url,
      null // folder_path sera mis à jour après la création du dossier
    ];

    const result = await db.run(sql, params);
    const paperId = result.id;

    try {
      // Créer le dossier de l'article
      const folderName = await createPaperFolder(paperData.title, paperId);

      // Mettre à jour le folder_path dans la base de données
      await db.run('UPDATE papers SET folder_path = ? WHERE id = ?', [folderName, paperId]);

      console.log(`✅ Article créé avec dossier: ${folderName}`);
    } catch (folderError) {
      console.error('❌ Erreur lors de la création du dossier:', folderError);
      // L'article est créé même si le dossier échoue
    }

    return this.getPaper(paperId);
  }

  static async updatePaper(id, paperData) {
    const validation = Paper.validate(paperData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const sql = `
      UPDATE papers
      SET title = ?, authors = ?, publication_date = ?, conference = ?,
          reading_status = ?, image = ?, doi = ?, url = ?, folder_path = ?
      WHERE id = ?
    `;

    const params = [
      paperData.title,
      paperData.authors,
      paperData.publication_date,
      paperData.conference,
      paperData.reading_status,
      paperData.image,
      paperData.doi,
      paperData.url,
      paperData.folder_path,
      id
    ];

    await db.run(sql, params);
    return this.getPaper(id);
  }

  static async deletePaper(id) {
    const sql = 'DELETE FROM papers WHERE id = ?';
    const result = await db.run(sql, [id]);

    if (result.changes === 0) {
      throw new Error('Paper not found');
    }

    return true;
  }

  static async updatePaperStatus(id, status) {
    if (!['unread', 'reading', 'read'].includes(status)) {
      throw new Error('Invalid reading status');
    }

    const sql = 'UPDATE papers SET reading_status = ? WHERE id = ?';
    const result = await db.run(sql, [status, id]);

    if (result.changes === 0) {
      throw new Error('Paper not found');
    }

    return this.getPaper(id);
  }

  static async updatePaperFavorite(id, isFavorite) {
    const favorite = isFavorite ? 1 : 0;
    const sql = 'UPDATE papers SET is_favorite = ? WHERE id = ?';
    const result = await db.run(sql, [favorite, id]);

    if (result.changes === 0) {
      throw new Error('Paper not found');
    }

    return this.getPaper(id);
  }

  static async getPaperStats() {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN reading_status = 'unread' THEN 1 ELSE 0 END) as unread,
        SUM(CASE WHEN reading_status = 'reading' THEN 1 ELSE 0 END) as reading,
        SUM(CASE WHEN reading_status = 'read' THEN 1 ELSE 0 END) as read,
        SUM(CASE WHEN reading_status = 'favorite' THEN 1 ELSE 0 END) as favorite
      FROM papers
    `;

    const stats = await db.get(sql);
    return {
      total: stats.total || 0,
      unread: stats.unread || 0,
      reading: stats.reading || 0,
      read: stats.read || 0,
      favorite: stats.favorite || 0
    };
  }

  static async searchPapers(query) {
    const sql = `
      SELECT p.*,
             GROUP_CONCAT(c.name) as category_names
      FROM papers p
      LEFT JOIN paper_categories pc ON p.id = pc.paper_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.title LIKE ? OR p.authors LIKE ? OR p.conference LIKE ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;

    const searchTerm = `%${query}%`;
    const rows = await db.all(sql, [searchTerm, searchTerm, searchTerm]);

    return rows.map(row => {
      const paper = new Paper(row);
      if (row.category_names) {
        paper.categories = row.category_names.split(',').map(name => ({ name: name.trim() }));
      }
      return paper.toJSON();
    });
  }
}

class CategoryOperations {
  static async getAllCategories() {
    const sql = 'SELECT * FROM categories ORDER BY name';
    const rows = await db.all(sql);
    return rows.map(row => new Category(row).toJSON());
  }

  static async getCategory(id) {
    const sql = 'SELECT * FROM categories WHERE id = ?';
    const row = await db.get(sql, [id]);
    return row ? new Category(row).toJSON() : null;
  }

  static async createCategory(name) {
    const validation = Category.validate({ name });
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const sql = 'INSERT INTO categories (name) VALUES (?)';
    const result = await db.run(sql, [name]);
    return this.getCategory(result.id);
  }

  static async deleteCategory(id) {
    const sql = 'DELETE FROM categories WHERE id = ?';
    const result = await db.run(sql, [id]);

    if (result.changes === 0) {
      throw new Error('Category not found');
    }

    return true;
  }

  static async getPapersByCategory(categoryId) {
    const sql = `
      SELECT p.* FROM papers p
      JOIN paper_categories pc ON p.id = pc.paper_id
      WHERE pc.category_id = ?
      ORDER BY p.created_at DESC
    `;

    const rows = await db.all(sql, [categoryId]);
    return rows.map(row => new Paper(row).toJSON());
  }
}

class PaperCategoryOperations {
  static async addPaperToCategory(paperId, categoryId) {
    const validation = PaperCategory.validate({ paper_id: paperId, category_id: categoryId });
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const sql = 'INSERT OR IGNORE INTO paper_categories (paper_id, category_id) VALUES (?, ?)';
    await db.run(sql, [paperId, categoryId]);
    return true;
  }

  static async removePaperFromCategory(paperId, categoryId) {
    const sql = 'DELETE FROM paper_categories WHERE paper_id = ? AND category_id = ?';
    const result = await db.run(sql, [paperId, categoryId]);

    if (result.changes === 0) {
      throw new Error('Paper-Category relationship not found');
    }

    return true;
  }
}

class DescriptionOperations {
  static async createDescription(descriptionData) {
    const validation = Description.validate(descriptionData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const sql = `
      INSERT INTO descriptions (paper_id, texte, images)
      VALUES (?, ?, ?)
    `;

    const params = [
      descriptionData.paper_id,
      descriptionData.texte,
      JSON.stringify(descriptionData.images || [])
    ];

    const result = await db.run(sql, params);
    return this.getDescription(result.id);
  }

  static async getDescription(id) {
    const sql = 'SELECT * FROM descriptions WHERE id = ?';
    const row = await db.get(sql, [id]);
    return row ? new Description(row).toJSON() : null;
  }

  static async getDescriptionByPaper(paperId) {
    const sql = 'SELECT * FROM descriptions WHERE paper_id = ?';
    const row = await db.get(sql, [paperId]);
    return row ? new Description(row).toJSON() : null;
  }

  static async updateDescription(id, descriptionData) {
    const sql = `
      UPDATE descriptions
      SET texte = ?, images = ?
      WHERE id = ?
    `;

    const params = [
      descriptionData.texte,
      JSON.stringify(descriptionData.images || []),
      id
    ];

    await db.run(sql, params);
    return this.getDescription(id);
  }

  static async deleteDescription(id) {
    const sql = 'DELETE FROM descriptions WHERE id = ?';
    const result = await db.run(sql, [id]);

    if (result.changes === 0) {
      throw new Error('Description not found');
    }

    return true;
  }
}

module.exports = {
  PaperOperations,
  CategoryOperations,
  PaperCategoryOperations,
  DescriptionOperations
};