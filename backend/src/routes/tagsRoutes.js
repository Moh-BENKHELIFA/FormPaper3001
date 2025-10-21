const express = require('express');
const router = express.Router();
const { db } = require('../database');

// Récupérer tous les tags
router.get('/', async (req, res) => {
  try {
    const tags = await db.all(`
      SELECT t.*, COUNT(DISTINCT p.id) as paper_count
      FROM tags t
      LEFT JOIN paper_tags pt ON t.id = pt.tag_id
      LEFT JOIN papers p ON pt.paper_id = p.id
      GROUP BY t.id
      ORDER BY t.name ASC
    `);
    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tags' });
  }
});

// Créer un nouveau tag
router.post('/', async (req, res) => {
  try {
    console.log('POST /api/tags - Request body:', req.body);
    const { name, color = '#3B82F6' } = req.body;

    if (!name || !name.trim()) {
      console.log('Tag creation failed: name is required');
      return res.status(400).json({ success: false, error: 'Tag name is required' });
    }

    const result = await db.run(
      'INSERT INTO tags (name, color) VALUES (?, ?)',
      [name.trim(), color]
    );

    const tag = await db.get('SELECT * FROM tags WHERE id = ?', [result.id]);
    console.log('Tag created successfully:', tag);
    res.json({ success: true, data: tag });
  } catch (error) {
    console.error('Error creating tag:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      console.log('Tag creation failed: name already exists');
      res.status(400).json({ success: false, error: 'Tag name already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create tag' });
    }
  }
});

// Mettre à jour un tag
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color = '#3B82F6' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Tag name is required' });
    }

    const result = await db.run(
      'UPDATE tags SET name = ?, color = ? WHERE id = ?',
      [name.trim(), color, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Tag not found' });
    }

    const tag = await db.get('SELECT * FROM tags WHERE id = ?', [id]);
    res.json({ success: true, data: tag });
  } catch (error) {
    console.error('Error updating tag:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ success: false, error: 'Tag name already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update tag' });
    }
  }
});

// Supprimer un tag
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.run('DELETE FROM tags WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ success: false, error: 'Failed to delete tag' });
  }
});

// Associer un tag à un paper
router.post('/:tagId/papers/:paperId', async (req, res) => {
  try {
    const { tagId, paperId } = req.params;

    await db.run(
      'INSERT OR IGNORE INTO paper_tags (paper_id, tag_id) VALUES (?, ?)',
      [paperId, tagId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error associating tag with paper:', error);
    res.status(500).json({ success: false, error: 'Failed to associate tag with paper' });
  }
});

// Dissocier un tag d'un paper
router.delete('/:tagId/papers/:paperId', async (req, res) => {
  try {
    const { tagId, paperId } = req.params;

    await db.run(
      'DELETE FROM paper_tags WHERE paper_id = ? AND tag_id = ?',
      [paperId, tagId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error dissociating tag from paper:', error);
    res.status(500).json({ success: false, error: 'Failed to dissociate tag from paper' });
  }
});

// Récupérer les tags d'un paper
router.get('/papers/:paperId', async (req, res) => {
  try {
    const { paperId } = req.params;

    const tags = await db.all(`
      SELECT t.* FROM tags t
      INNER JOIN paper_tags pt ON t.id = pt.tag_id
      WHERE pt.paper_id = ?
      ORDER BY t.name ASC
    `, [paperId]);

    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('Error fetching paper tags:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch paper tags' });
  }
});

module.exports = router;