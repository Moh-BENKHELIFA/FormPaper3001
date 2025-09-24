const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Find existing article directory and ensure imported_image subdirectory exists
async function ensureImportedImageDir(articleId) {
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

    let baseDir;
    if (articleDirName) {
      baseDir = path.join(myPapersDir, articleDirName);
    } else {
      // Fallback: create directory with just the ID if article folder doesn't exist
      baseDir = path.join(myPapersDir, articleId.toString());
      await fs.mkdir(baseDir, { recursive: true });
    }

    const importedImageDir = path.join(baseDir, 'imported_image');

    try {
      await fs.access(importedImageDir);
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(importedImageDir, { recursive: true });
    }

    return importedImageDir;
  } catch (error) {
    // If MyPapers doesn't exist, create it along with the article and image directories
    const fallbackDir = path.join(myPapersDir, articleId.toString());
    const importedImageDir = path.join(fallbackDir, 'imported_image');
    await fs.mkdir(importedImageDir, { recursive: true });
    return importedImageDir;
  }
}

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
      // Fallback: use directory with just the ID if exists
      const fallbackDir = path.join(myPapersDir, articleId.toString());
      try {
        const stat = require('fs').statSync(fallbackDir);
        if (stat.isDirectory()) {
          return fallbackDir;
        }
      } catch (error) {
        // Directory doesn't exist
      }
      return null;
    }
  } catch (error) {
    return null;
  }
}

// Upload image endpoint
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { articleId } = req.body;
    if (!articleId) {
      return res.status(400).json({ error: 'Article ID is required' });
    }

    // Generate unique filename
    const fileExtension = path.extname(req.file.originalname);
    const filename = `${uuidv4()}${fileExtension}`;

    // Ensure directory exists
    const importedImageDir = await ensureImportedImageDir(articleId);
    const filePath = path.join(importedImageDir, filename);

    // Save file to disk
    await fs.writeFile(filePath, req.file.buffer);

    // Return the relative path that can be used by the frontend
    res.json({
      filename,
      path: `imported_image/${filename}`,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Serve images from article directories
router.get('/image/:articleId/:filename', async (req, res) => {
  try {
    const { articleId, filename } = req.params;

    const articleDir = await findArticleDir(articleId);
    if (!articleDir) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const filePath = path.join(articleDir, 'imported_image', filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Set appropriate headers
    res.sendFile(path.resolve(filePath));

  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// Delete image endpoint
router.delete('/image/:articleId/:filename', async (req, res) => {
  try {
    const { articleId, filename } = req.params;

    const articleDir = await findArticleDir(articleId);
    if (!articleDir) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const filePath = path.join(articleDir, 'imported_image', filename);

    await fs.unlink(filePath);
    res.json({ message: 'Image deleted successfully' });

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

module.exports = router;