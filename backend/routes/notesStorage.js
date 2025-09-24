const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Find existing article directory
async function findArticleDir(articleId) {
  const myPapersDir = path.join(__dirname, '../MyPapers');

  try {
    const items = await fs.readdir(myPapersDir);

    // Look for directory that ends with _articleId
    const articleDirName = items.find(item => {
      const itemPath = path.join(myPapersDir, item);
      try {
        const stat = require('fs').statSync(itemPath);
        return stat.isDirectory() && item.endsWith(`_${articleId}`);
      } catch (error) {
        return false;
      }
    });

    if (articleDirName) {
      return path.join(myPapersDir, articleDirName);
    } else {
      // Fallback: create directory with just the ID if article folder doesn't exist
      const fallbackDir = path.join(myPapersDir, articleId.toString());
      await fs.mkdir(fallbackDir, { recursive: true });
      return fallbackDir;
    }
  } catch (error) {
    // If MyPapers doesn't exist, create it along with the article directory
    const fallbackDir = path.join(myPapersDir, articleId.toString());
    await fs.mkdir(fallbackDir, { recursive: true });
    return fallbackDir;
  }
}

// Save notes to file
router.post('/notes/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;
    const { blocks } = req.body;

    if (!articleId) {
      return res.status(400).json({ error: 'Article ID is required' });
    }

    if (!blocks || !Array.isArray(blocks)) {
      return res.status(400).json({ error: 'Blocks array is required' });
    }

    // Find existing article directory
    const articleDir = await findArticleDir(articleId);
    const notesFilePath = path.join(articleDir, 'notes.json');

    // Create notes data structure
    const notesData = {
      paperId: parseInt(articleId),
      blocks,
      lastModified: new Date().toISOString(),
      version: '1.0'
    };

    // Write to file
    await fs.writeFile(notesFilePath, JSON.stringify(notesData, null, 2));

    res.json({
      success: true,
      message: 'Notes saved successfully',
      filePath: `MyPapers/${articleId}/notes.json`
    });

  } catch (error) {
    console.error('Error saving notes:', error);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

// Load notes from file
router.get('/notes/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;

    if (!articleId) {
      return res.status(400).json({ error: 'Article ID is required' });
    }

    const articleDir = await findArticleDir(articleId);
    const notesFilePath = path.join(articleDir, 'notes.json');

    try {
      // Check if notes file exists
      await fs.access(notesFilePath);

      // Read and parse notes file
      const notesContent = await fs.readFile(notesFilePath, 'utf-8');
      const notesData = JSON.parse(notesContent);

      res.json({
        success: true,
        data: {
          blocks: notesData.blocks || [],
          lastModified: notesData.lastModified,
          version: notesData.version
        }
      });

    } catch (error) {
      // File doesn't exist or can't be read, return empty blocks
      res.json({
        success: true,
        data: {
          blocks: [],
          lastModified: null,
          version: '1.0'
        }
      });
    }

  } catch (error) {
    console.error('Error loading notes:', error);
    res.status(500).json({ error: 'Failed to load notes' });
  }
});

// Delete notes file
router.delete('/notes/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;

    if (!articleId) {
      return res.status(400).json({ error: 'Article ID is required' });
    }

    const articleDir = await findArticleDir(articleId);
    const notesFilePath = path.join(articleDir, 'notes.json');

    try {
      await fs.unlink(notesFilePath);
      res.json({ success: true, message: 'Notes deleted successfully' });
    } catch (error) {
      // File doesn't exist, that's fine
      res.json({ success: true, message: 'No notes to delete' });
    }

  } catch (error) {
    console.error('Error deleting notes:', error);
    res.status(500).json({ error: 'Failed to delete notes' });
  }
});

// Get all articles that have notes
router.get('/notes', async (req, res) => {
  try {
    const myPapersDir = path.join(__dirname, '../MyPapers');

    try {
      const articleDirs = await fs.readdir(myPapersDir);
      const articlesWithNotes = [];

      for (const articleId of articleDirs) {
        const articlePath = path.join(myPapersDir, articleId);
        const notesFilePath = path.join(articlePath, 'notes.json');

        try {
          // Check if this is a directory and has notes.json
          const stat = await fs.stat(articlePath);
          if (stat.isDirectory()) {
            await fs.access(notesFilePath);

            // Read notes metadata
            const notesContent = await fs.readFile(notesFilePath, 'utf-8');
            const notesData = JSON.parse(notesContent);

            articlesWithNotes.push({
              articleId: parseInt(articleId),
              lastModified: notesData.lastModified,
              blocksCount: notesData.blocks ? notesData.blocks.length : 0
            });
          }
        } catch (error) {
          // Skip if not a directory or no notes file
          continue;
        }
      }

      res.json({
        success: true,
        data: articlesWithNotes
      });

    } catch (error) {
      // MyPapers directory doesn't exist
      res.json({
        success: true,
        data: []
      });
    }

  } catch (error) {
    console.error('Error listing articles with notes:', error);
    res.status(500).json({ error: 'Failed to list articles with notes' });
  }
});

module.exports = router;