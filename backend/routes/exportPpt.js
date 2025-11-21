const express = require('express');
const router = express.Router();
const PptxGenJS = require('pptxgenjs');
const path = require('path');
const fs = require('fs-extra');
const { imageSize } = require('image-size');
const database = require('../src/database');

// POST /api/export-ppt - Generate PowerPoint from selected papers
router.post('/export-ppt', async (req, res) => {
  try {
    const { paperIds } = req.body;

    if (!paperIds || !Array.isArray(paperIds) || paperIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Paper IDs are required' });
    }

    console.log(`📊 Generating PowerPoint for ${paperIds.length} papers`);

    // Fetch papers with their tags
    const papers = await Promise.all(
      paperIds.map(async (id) => {
        try {
          const paper = await database.getPaper(id);
          if (paper) {
            // Get tags for this paper
            const tags = await database.db.all(`
              SELECT t.* FROM tags t
              INNER JOIN paper_tags pt ON t.id = pt.tag_id
              WHERE pt.paper_id = ?
              ORDER BY t.name ASC
            `, [id]);
            return { ...paper, tags };
          }
          return null;
        } catch (err) {
          console.error(`Error fetching paper ${id}:`, err);
          return null;
        }
      })
    );

    // Filter out null values (papers not found)
    const validPapers = papers.filter(p => p !== null);

    if (validPapers.length === 0) {
      return res.status(404).json({ success: false, error: 'No valid papers found' });
    }

    console.log(`📄 Found ${validPapers.length} valid papers`);

    // Create PowerPoint
    const pptx = new PptxGenJS();
    pptx.author = 'FormPaper3001';
    pptx.title = 'Articles de Recherche';
    pptx.subject = 'Export PowerPoint';

    // Create a slide for each paper
    for (let index = 0; index < validPapers.length; index++) {
      const paper = validPapers[index];
      const slide = pptx.addSlide();

      // Get first author
      const authors = paper.authors || '';
      const firstAuthor = authors.split(',')[0]?.trim() || 'Unknown Author';
      const authorDisplay = authors.includes(',') ? `${firstAuthor} et al.` : firstAuthor;

      // Conference/Journal
      const conference = paper.conference_short || paper.conference || 'Unknown Venue';

      // DOI URL
      const doiUrl = paper.doi
        ? (paper.doi.startsWith('http') ? paper.doi : `https://doi.org/${paper.doi}`)
        : '';

      // Check if paper has cover image
      let hasCoverImage = false;
      let coverImagePath = null;

      if (paper.image) {
        // Resolve to absolute path from backend directory
        coverImagePath = path.resolve(__dirname, '..', paper.image);
        console.log(`🔍 Checking image path for paper ${paper.id}: ${coverImagePath}`);
        const exists = await fs.pathExists(coverImagePath);
        console.log(`   Path exists: ${exists}`);
        if (exists) {
          hasCoverImage = true;
          console.log(`📷 Cover image found for paper ${paper.id}`);
        } else {
          console.log(`❌ Cover image NOT found for paper ${paper.id}`);
        }
      } else {
        console.log(`⚠️ Paper ${paper.id} has no image field`);
      }

      // Layout calculations
      const headerStartY = 0.15;
      const contentWidth = hasCoverImage ? 7.5 : 9; // Narrower if image present

      // === HEADER SECTION (compact) ===

      // Determine title font size based on length
      const titleLength = (paper.title || 'Untitled').length;
      const titleFontSize = titleLength > 100 ? 11 : 13;
      const titleHeight = titleLength > 100 ? 0.5 : 0.4;

      // Title (bold, smaller)
      slide.addText(paper.title || 'Untitled', {
        x: 0.3,
        y: headerStartY,
        w: contentWidth,
        h: titleHeight,
        fontSize: titleFontSize,
        bold: true,
        color: '1F2937',
        fontFace: 'Arial',
        valign: 'top',
        wrap: true,
      });

      // Author and Conference line (smaller, closer to title)
      slide.addText(`${authorDisplay} - ${conference}`, {
        x: 0.3,
        y: headerStartY + titleHeight,
        w: contentWidth,
        h: 0.15,
        fontSize: 8,
        color: '6B7280',
        fontFace: 'Arial',
      });

      // Tags (smaller, tighter) - positioned after author line
      const tagsY = headerStartY + titleHeight + 0.18;
      if (paper.tags && paper.tags.length > 0) {
        let xPos = 0.3;
        paper.tags.forEach((tag) => {
          const bgColor = (tag.color || '#6B7280').replace('#', '');

          slide.addText(tag.name, {
            x: xPos,
            y: tagsY,
            w: tag.name.length * 0.06 + 0.15,
            h: 0.14,
            fontSize: 6,
            color: 'FFFFFF',
            fill: { color: bgColor },
            fontFace: 'Arial',
            align: 'center',
            valign: 'middle',
          });

          xPos += tag.name.length * 0.06 + 0.18;
        });
      }

      // Cover image (if available) - keep aspect ratio
      if (hasCoverImage) {
        try {
          // Read image file as buffer
          const imageBuffer = await fs.readFile(coverImagePath);
          const base64Image = imageBuffer.toString('base64');

          // Get file extension for mime type
          const ext = path.extname(coverImagePath).toLowerCase();
          let mimeType = 'png';
          if (ext === '.jpg' || ext === '.jpeg') mimeType = 'jpeg';
          else if (ext === '.gif') mimeType = 'gif';
          else if (ext === '.png') mimeType = 'png';

          // Get original image dimensions from buffer
          const dimensions = imageSize(imageBuffer);
          const aspectRatio = dimensions.width / dimensions.height;

          // Max size constraints
          const maxWidth = 1.8;
          const maxHeight = 1.2;

          let imgWidth, imgHeight;

          if (aspectRatio > 1) {
            // Landscape image
            imgWidth = Math.min(maxWidth, maxHeight * aspectRatio);
            imgHeight = imgWidth / aspectRatio;
          } else {
            // Portrait or square image
            imgHeight = Math.min(maxHeight, maxWidth / aspectRatio);
            imgWidth = imgHeight * aspectRatio;
          }

          // Position image at top right
          const imgX = 10 - imgWidth - 0.3;

          // Add image using base64 data
          slide.addImage({
            data: `data:image/${mimeType};base64,${base64Image}`,
            x: imgX,
            y: 0.15,
            w: imgWidth,
            h: imgHeight,
          });

          console.log(`📷 Image added for paper ${paper.id}: ${dimensions.width}x${dimensions.height} -> ${imgWidth.toFixed(2)}x${imgHeight.toFixed(2)} inches`);
        } catch (imgErr) {
          console.error(`Error adding cover image for paper ${paper.id}:`, imgErr.message);
        }
      }

      // === CENTER SECTION - Notes (larger) ===
      slide.addText('Notes:', {
        x: 0.3,
        y: 1.15,
        w: 9.4,
        h: 0.2,
        fontSize: 9,
        color: '9CA3AF',
        fontFace: 'Arial',
        italic: true,
      });

      // Large text box for notes (editable in PowerPoint)
      slide.addText(' ', {
        x: 0.3,
        y: 1.35,
        w: 9.4,
        h: 3.7,
        fontSize: 11,
        color: '374151',
        fontFace: 'Arial',
        valign: 'top',
      });

      // === FOOTER SECTION (closer to bottom edge) ===

      // Footer separator line
      slide.addShape('line', {
        x: 0.3,
        y: 5.15,
        w: 9.4,
        h: 0,
        line: { color: 'E5E7EB', width: 0.5 },
      });

      // DOI link (small, bottom right)
      if (doiUrl) {
        slide.addText(doiUrl.replace('https://', ''), {
          x: 0.3,
          y: 5.22,
          w: 9.4,
          h: 0.2,
          fontSize: 7,
          color: 'AAAAAA',
          fontFace: 'Arial',
          align: 'right',
          hyperlink: { url: doiUrl },
        });
      }

      // Slide number (bottom left)
      slide.addText(`${index + 1} / ${validPapers.length}`, {
        x: 0.3,
        y: 5.22,
        w: 0.8,
        h: 0.2,
        fontSize: 7,
        color: 'AAAAAA',
        fontFace: 'Arial',
        align: 'left',
      });
    }

    // Generate PowerPoint as base64
    console.log('📝 Generating PPTX file...');
    const pptxBase64 = await pptx.write({ outputType: 'base64' });

    console.log(`✅ PowerPoint generated successfully with ${validPapers.length} slides`);

    res.json({
      success: true,
      data: {
        filename: `FormPaper_Export_${new Date().toISOString().split('T')[0]}.pptx`,
        content: pptxBase64,
        paperCount: validPapers.length,
      }
    });

  } catch (error) {
    console.error('Error generating PowerPoint:', error);
    res.status(500).json({ success: false, error: 'Failed to generate PowerPoint: ' + error.message });
  }
});

module.exports = router;
