const express = require('express');
const router = express.Router();
const db = require('../src/database/database');

// Get all collections with paper counts
router.get('/collections', async (req, res) => {
  try {
    const collections = await db.all(`
      SELECT
        c.id,
        c.name,
        c.created_at,
        COUNT(pc.paper_id) as count
      FROM collections c
      LEFT JOIN paper_collections pc ON c.id = pc.collection_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    res.json(collections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// Get a single collection with its papers
router.get('/collections/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const collection = await db.get(
      'SELECT * FROM collections WHERE id = ?',
      [id]
    );

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const papers = await db.all(`
      SELECT p.*
      FROM papers p
      INNER JOIN paper_collections pc ON p.id = pc.paper_id
      WHERE pc.collection_id = ?
      ORDER BY p.created_at DESC
    `, [id]);

    res.json({ ...collection, papers });
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

// Create a new collection
router.post('/collections', async (req, res) => {
  try {
    const { name, paperIds = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Collection name is required' });
    }

    // Check if collection already exists
    const existing = await db.get(
      'SELECT id FROM collections WHERE name = ?',
      [name.trim()]
    );

    if (existing) {
      return res.status(409).json({ error: 'Collection with this name already exists' });
    }

    // Create collection
    const result = await db.run(
      'INSERT INTO collections (name) VALUES (?)',
      [name.trim()]
    );

    const collectionId = result.id || result.lastID;

    // Add papers to collection if provided
    if (paperIds.length > 0) {
      for (const paperId of paperIds) {
        await db.run(
          'INSERT OR IGNORE INTO paper_collections (paper_id, collection_id) VALUES (?, ?)',
          [paperId, collectionId]
        );
      }
    }

    // Fetch the created collection with count
    const collection = await db.get(`
      SELECT
        c.id,
        c.name,
        c.created_at,
        COUNT(pc.paper_id) as count
      FROM collections c
      LEFT JOIN paper_collections pc ON c.id = pc.collection_id
      WHERE c.id = ?
      GROUP BY c.id
    `, [collectionId]);

    res.status(201).json(collection);
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

// Update collection name
router.put('/collections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Collection name is required' });
    }

    const result = await db.run(
      'UPDATE collections SET name = ? WHERE id = ?',
      [name.trim(), id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const collection = await db.get(
      'SELECT * FROM collections WHERE id = ?',
      [id]
    );

    res.json(collection);
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({ error: 'Failed to update collection' });
  }
});

// Delete a collection
router.delete('/collections/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.run(
      'DELETE FROM collections WHERE id = ?',
      [id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

// Add papers to a collection
router.post('/collections/:id/papers', async (req, res) => {
  try {
    const { id } = req.params;
    const { paperIds } = req.body;

    if (!Array.isArray(paperIds) || paperIds.length === 0) {
      return res.status(400).json({ error: 'paperIds must be a non-empty array' });
    }

    // Verify collection exists
    const collection = await db.get(
      'SELECT id FROM collections WHERE id = ?',
      [id]
    );

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Add papers to collection
    for (const paperId of paperIds) {
      await db.run(
        'INSERT OR IGNORE INTO paper_collections (paper_id, collection_id) VALUES (?, ?)',
        [paperId, id]
      );
    }

    res.json({ message: 'Papers added to collection successfully' });
  } catch (error) {
    console.error('Error adding papers to collection:', error);
    res.status(500).json({ error: 'Failed to add papers to collection' });
  }
});

// Remove a paper from a collection
router.delete('/collections/:id/papers/:paperId', async (req, res) => {
  try {
    const { id, paperId } = req.params;

    const result = await db.run(
      'DELETE FROM paper_collections WHERE collection_id = ? AND paper_id = ?',
      [id, paperId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Paper not found in collection' });
    }

    res.json({ message: 'Paper removed from collection successfully' });
  } catch (error) {
    console.error('Error removing paper from collection:', error);
    res.status(500).json({ error: 'Failed to remove paper from collection' });
  }
});

module.exports = router;
