const express = require('express');
const path = require('path');
const fs = require('fs-extra');

const router = express.Router();

const NOTES_DIR = path.join(__dirname, '../../notes');

fs.ensureDirSync(NOTES_DIR);

function getNotesFilePath(paperId) {
  return path.join(NOTES_DIR, `paper_${paperId}_notes.json`);
}

router.post('/:paperId', async (req, res) => {
  try {
    const { paperId } = req.params;
    const notesData = req.body;

    if (!paperId || isNaN(paperId)) {
      return res.status(400).json({ success: false, error: 'Invalid paper ID' });
    }

    if (!notesData || !notesData.blocks) {
      return res.status(400).json({ success: false, error: 'Invalid notes data' });
    }

    const filePath = getNotesFilePath(paperId);

    const dataToSave = {
      ...notesData,
      paperId: parseInt(paperId),
      lastModified: new Date().toISOString()
    };

    await fs.writeJSON(filePath, dataToSave, { spaces: 2 });

    res.json({ success: true, message: 'Notes saved successfully' });

  } catch (error) {
    console.error('Error saving notes:', error);
    res.status(500).json({ success: false, error: 'Failed to save notes' });
  }
});

router.get('/:paperId', async (req, res) => {
  try {
    const { paperId } = req.params;

    if (!paperId || isNaN(paperId)) {
      return res.status(400).json({ success: false, error: 'Invalid paper ID' });
    }

    const filePath = getNotesFilePath(paperId);

    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ success: false, error: 'Notes not found' });
    }

    const notesData = await fs.readJSON(filePath);

    res.json({
      success: true,
      data: notesData
    });

  } catch (error) {
    console.error('Error loading notes:', error);
    res.status(500).json({ success: false, error: 'Failed to load notes' });
  }
});

router.delete('/:paperId', async (req, res) => {
  try {
    const { paperId } = req.params;

    if (!paperId || isNaN(paperId)) {
      return res.status(400).json({ success: false, error: 'Invalid paper ID' });
    }

    const filePath = getNotesFilePath(paperId);

    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ success: false, error: 'Notes not found' });
    }

    await fs.remove(filePath);

    res.json({ success: true, message: 'Notes deleted successfully' });

  } catch (error) {
    console.error('Error deleting notes:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notes' });
  }
});

router.head('/:paperId', async (req, res) => {
  try {
    const { paperId } = req.params;

    if (!paperId || isNaN(paperId)) {
      return res.status(400).end();
    }

    const filePath = getNotesFilePath(paperId);
    const exists = await fs.pathExists(filePath);

    if (exists) {
      res.status(200).end();
    } else {
      res.status(404).end();
    }

  } catch (error) {
    console.error('Error checking notes existence:', error);
    res.status(500).end();
  }
});

router.get('/:paperId/metadata', async (req, res) => {
  try {
    const { paperId } = req.params;

    if (!paperId || isNaN(paperId)) {
      return res.status(400).json({ success: false, error: 'Invalid paper ID' });
    }

    const filePath = getNotesFilePath(paperId);

    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ success: false, error: 'Notes not found' });
    }

    const notesData = await fs.readJSON(filePath);

    res.json({
      success: true,
      data: {
        paperId: notesData.paperId,
        lastModified: notesData.lastModified,
        blocksCount: notesData.blocks ? notesData.blocks.length : 0
      }
    });

  } catch (error) {
    console.error('Error getting notes metadata:', error);
    res.status(500).json({ success: false, error: 'Failed to get notes metadata' });
  }
});

router.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(NOTES_DIR);
    const notesFiles = files.filter(file => file.startsWith('paper_') && file.endsWith('_notes.json'));

    const metadata = await Promise.all(
      notesFiles.map(async (file) => {
        try {
          const filePath = path.join(NOTES_DIR, file);
          const notesData = await fs.readJSON(filePath);
          return {
            paperId: notesData.paperId,
            lastModified: notesData.lastModified,
            blocksCount: notesData.blocks ? notesData.blocks.length : 0
          };
        } catch (error) {
          console.error(`Error reading notes file ${file}:`, error);
          return null;
        }
      })
    );

    const validMetadata = metadata.filter(item => item !== null);

    res.json({
      success: true,
      data: validMetadata
    });

  } catch (error) {
    console.error('Error getting all notes metadata:', error);
    res.status(500).json({ success: false, error: 'Failed to get notes metadata' });
  }
});

router.post('/:paperId/export', async (req, res) => {
  try {
    const { paperId } = req.params;
    const { format = 'json' } = req.body;

    if (!paperId || isNaN(paperId)) {
      return res.status(400).json({ success: false, error: 'Invalid paper ID' });
    }

    const filePath = getNotesFilePath(paperId);

    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ success: false, error: 'Notes not found' });
    }

    const notesData = await fs.readJSON(filePath);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="paper_${paperId}_notes.json"`);
      res.json(notesData);
    } else if (format === 'markdown') {
      const markdown = convertNotesToMarkdown(notesData);
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="paper_${paperId}_notes.md"`);
      res.send(markdown);
    } else {
      res.status(400).json({ success: false, error: 'Unsupported export format' });
    }

  } catch (error) {
    console.error('Error exporting notes:', error);
    res.status(500).json({ success: false, error: 'Failed to export notes' });
  }
});

function convertNotesToMarkdown(notesData) {
  if (!notesData.blocks || notesData.blocks.length === 0) {
    return '# Notes\n\nAucune note disponible.';
  }

  let markdown = '# Notes\n\n';

  notesData.blocks.forEach(block => {
    switch (block.type) {
      case 'heading1':
        markdown += `# ${block.content}\n\n`;
        break;
      case 'heading2':
        markdown += `## ${block.content}\n\n`;
        break;
      case 'heading3':
        markdown += `### ${block.content}\n\n`;
        break;
      case 'list':
        const listItems = block.content.split('\n').filter(item => item.trim());
        listItems.forEach(item => {
          markdown += `- ${item.trim()}\n`;
        });
        markdown += '\n';
        break;
      case 'image':
        if (block.metadata && block.metadata.src) {
          markdown += `![${block.metadata.alt || 'Image'}](${block.metadata.src})\n\n`;
          if (block.metadata.caption) {
            markdown += `*${block.metadata.caption}*\n\n`;
          }
        }
        break;
      case 'text':
      default:
        markdown += `${block.content}\n\n`;
        break;
    }
  });

  return markdown;
}

module.exports = router;