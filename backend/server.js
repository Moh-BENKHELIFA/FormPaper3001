const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');

const database = require('./src/database');
const notesRoutes = require('./src/routes/notesRoutes');
const tagsRoutes = require('./src/routes/tagsRoutes');

const app = express();
const PORT = process.env.PORT || 5003;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/MyPapers', express.static(path.join(__dirname, 'MyPapers')));

// Servir les images extraites depuis n'importe quel dossier uploads/extracted_images
app.use('/uploads/extracted_images', express.static(path.join(__dirname, 'uploads'), {
  dotfiles: 'ignore',
  index: false,
  setHeaders: function (res, path) {
    // Permettre seulement l'accès aux dossiers extracted_images
    if (path.includes('extracted_images')) {
      res.set('Cache-Control', 'public, max-age=31557600'); // 1 an
    }
  }
}));

// Servir l'image par défaut
app.get('/api/default-image', (req, res) => {
  const defaultImagePath = path.join(__dirname, 'default_image.png');
  res.sendFile(defaultImagePath);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Configuration multer pour les images
const imageUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB pour les images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  }
});

app.get('/api/papers', async (req, res) => {
  try {
    const papers = await database.getAllPapers();
    res.json({ success: true, data: papers });
  } catch (error) {
    console.error('Error fetching papers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch papers' });
  }
});

app.get('/api/papers/stats', async (req, res) => {
  try {
    const stats = await database.getPaperStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

app.get('/api/papers/doi/:doi', async (req, res) => {
  try {
    const doi = decodeURIComponent(req.params.doi);
    const metadata = await fetchDOIMetadata(doi);
    res.json({ success: true, data: metadata });
  } catch (error) {
    console.error('Error fetching DOI metadata:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch DOI metadata' });
  }
});

app.get('/api/papers/check-doi/:doi', async (req, res) => {
  try {
    const doi = decodeURIComponent(req.params.doi);
    const exists = await database.checkDoiExists(doi);
    res.json({ success: true, data: { exists, doi } });
  } catch (error) {
    console.error('Error checking DOI existence:', error);
    res.status(500).json({ success: false, error: 'Failed to check DOI existence' });
  }
});

app.get('/api/papers/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }
    const papers = await database.searchPapers(q);
    res.json({ success: true, data: papers });
  } catch (error) {
    console.error('Error searching papers:', error);
    res.status(500).json({ success: false, error: 'Failed to search papers' });
  }
});

app.get('/api/papers/:id', async (req, res) => {
  try {
    const paper = await database.getPaper(req.params.id);
    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found' });
    }
    res.json({ success: true, data: paper });
  } catch (error) {
    console.error('Error fetching paper:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch paper' });
  }
});

app.post('/api/papers', async (req, res) => {
  try {
    const paper = await database.createPaper(req.body);
    res.status(201).json({ success: true, data: paper });
  } catch (error) {
    console.error('Error creating paper:', error);

    // Détecter si c'est une erreur de DOI en doublon
    console.log('Error message:', error.message);
    console.log('Checking DOI conflict:', error.message && error.message.includes('existe déjà dans la base de données'));
    if (error.message && error.message.includes('existe déjà dans la base de données')) {
      console.log('Returning 409 status for DOI conflict');
      return res.status(409).json({ success: false, error: error.message });
    }

    res.status(500).json({ success: false, error: 'Failed to create paper' });
  }
});

app.put('/api/papers/:id', async (req, res) => {
  try {
    const paper = await database.updatePaper(req.params.id, req.body);
    res.json({ success: true, data: paper });
  } catch (error) {
    console.error('Error updating paper:', error);
    res.status(500).json({ success: false, error: 'Failed to update paper' });
  }
});

app.delete('/api/papers/:id', async (req, res) => {
  try {
    await database.deletePaper(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting paper:', error);
    res.status(500).json({ success: false, error: 'Failed to delete paper' });
  }
});

app.patch('/api/papers/:id/status', async (req, res) => {
  try {
    const { reading_status } = req.body;
    const paper = await database.updatePaperStatus(req.params.id, reading_status);
    res.json({ success: true, data: paper });
  } catch (error) {
    console.error('Error updating paper status:', error);
    res.status(500).json({ success: false, error: 'Failed to update paper status' });
  }
});

app.patch('/api/papers/:id/favorite', async (req, res) => {
  try {
    const { is_favorite } = req.body;
    const paper = await database.updatePaperFavorite(req.params.id, is_favorite);
    res.json({ success: true, data: paper });
  } catch (error) {
    console.error('Error updating paper favorite status:', error);
    res.status(500).json({ success: false, error: 'Failed to update paper favorite status' });
  }
});

app.post('/api/papers/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No PDF file uploaded' });
    }

    const filePath = req.file.path;
    console.log('Processing PDF:', filePath);

    // Extraire le DOI et les images du PDF
    const [extractedData, images] = await Promise.all([
      extractDOIFromPDF(filePath),
      extractImagesFromPDF(filePath)
    ]);

    console.log('Extracted PDF data:', extractedData);

    let fullMetadata = null;

    // Si on a extrait un DOI, récupérer les métadonnées complètes
    if (extractedData && extractedData.doi) {
      try {
        console.log('Fetching metadata for DOI:', extractedData.doi);
        fullMetadata = await fetchDOIMetadata(extractedData.doi);
        console.log('Full metadata retrieved:', fullMetadata);
      } catch (doiError) {
        console.error('Error fetching DOI metadata:', doiError);
        // Si échec récupération DOI, utiliser les données extraites du PDF
        fullMetadata = extractedData;
      }
    } else {
      // Pas de DOI trouvé, utiliser les données basiques extraites
      fullMetadata = extractedData;
    }

    console.log('=== BACKEND DEBUG ===');
    console.log('Images object:', images);
    console.log('Images type:', typeof images);
    console.log('Images.images:', images?.images);
    console.log('Images.total:', images?.total);

    const response = {
      success: true,
      data: {
        filePath,
        metadata: fullMetadata,
        images,
        extractedDoi: extractedData?.doi || null,
        originalFileName: req.file.originalname
      }
    };

    console.log('Response complete:', JSON.stringify(response, null, 2));

    res.json(response);

  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ success: false, error: 'Failed to process PDF' });
  }
});

app.post('/api/papers/extract-images', async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'File path is required' });
    }
    const images = await extractImagesFromPDF(filePath);
    res.json({ success: true, data: images });
  } catch (error) {
    console.error('Error extracting images:', error);
    res.status(500).json({ success: false, error: 'Failed to extract images' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await database.getAllCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name } = req.body;
    const category = await database.createCategory(name);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

app.use('/api/notes', notesRoutes);
app.use('/api/tags', tagsRoutes);

// Route pour uploader l'image de couverture d'un article
app.post('/api/papers/:id/cover-image', imageUpload.single('coverImage'), async (req, res) => {
  try {
    const paperId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    // Vérifier que l'article existe
    const paper = await database.getPaper(paperId);
    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found' });
    }

    const imageFile = req.file;
    console.log('Processing cover image for paper:', paperId, imageFile.originalname);

    // Créer le nom du fichier d'image: paper_Cover_ID.extension
    const fileExtension = path.extname(imageFile.originalname);
    const imageFileName = `paper_Cover_${paperId}${fileExtension}`;

    // Créer le chemin vers le dossier de l'article dans MyPapers
    const paperFolderPath = path.join(__dirname, 'MyPapers', paper.folder_path);
    const imageFilePath = path.join(paperFolderPath, imageFileName);

    try {
      // S'assurer que le dossier de l'article existe
      await fs.ensureDir(paperFolderPath);

      // Copier le fichier uploadé vers le dossier de l'article
      await fs.copyFile(imageFile.path, imageFilePath);

      // Supprimer le fichier temporaire
      await fs.remove(imageFile.path);

      // Mettre à jour la base de données avec le chemin de l'image
      const imagePath = `MyPapers/${paper.folder_path}/${imageFileName}`;
      await database.updatePaper(paperId, { ...paper, image: imagePath });

      console.log(`✅ Cover image saved: ${imageFilePath}`);

      res.json({
        success: true,
        data: {
          imagePath: imagePath
        }
      });

    } catch (fileError) {
      console.error('❌ Error saving cover image:', fileError);
      res.status(500).json({ success: false, error: 'Failed to save cover image' });
    }

  } catch (error) {
    console.error('Error uploading cover image:', error);
    res.status(500).json({ success: false, error: 'Failed to upload cover image' });
  }
});

// Route pour sauvegarder le PDF et les images sélectionnées après création du papier
app.post('/api/papers/:id/save-pdf-assets', async (req, res) => {
  try {
    const paperId = req.params.id;
    const { pdfPath, selectedImages, coverImagePath } = req.body;

    // Récupérer les infos du papier
    const paper = await database.getPaper(paperId);
    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found' });
    }

    const paperFolderPath = path.join(__dirname, 'MyPapers', paper.folder_path);

    // S'assurer que le dossier du papier existe
    await fs.ensureDir(paperFolderPath);

    // Créer le nom du fichier PDF: titre_id.pdf
    let cleanTitle = paper.title
      .replace(/[^\w\s-]/g, '') // Supprimer les caractères spéciaux
      .replace(/\s+/g, '_') // Remplacer les espaces par des underscores
      .toLowerCase();

    if (cleanTitle.length > 50) {
      cleanTitle = cleanTitle.substring(0, 50);
    }

    const pdfFileName = `${cleanTitle}_${paperId}.pdf`;
    const finalPdfPath = path.join(paperFolderPath, pdfFileName);

    // Copier le PDF vers le dossier du papier
    if (await fs.pathExists(pdfPath)) {
      await fs.copyFile(pdfPath, finalPdfPath);
      console.log(`✅ PDF sauvegardé: ${finalPdfPath}`);
    }

    // Créer le dossier saved_images s'il y a des images sélectionnées
    let savedImagesInfo = [];
    if (selectedImages && selectedImages.length > 0) {
      const savedImagesDir = path.join(paperFolderPath, 'saved_images');
      await fs.ensureDir(savedImagesDir);

      for (const imagePath of selectedImages) {
        if (await fs.pathExists(imagePath)) {
          const imageFileName = path.basename(imagePath);
          const savedImagePath = path.join(savedImagesDir, imageFileName);
          await fs.copyFile(imagePath, savedImagePath);
          savedImagesInfo.push({
            original: imagePath,
            saved: `MyPapers/${paper.folder_path}/saved_images/${imageFileName}`
          });
          console.log(`✅ Image sauvegardée: ${savedImagePath}`);
        }
      }
    }

    // Gérer l'image de couverture si spécifiée
    let coverImageUrl = null;
    if (coverImagePath && await fs.pathExists(coverImagePath)) {
      const coverFileName = `paper_Cover_${paperId}${path.extname(coverImagePath)}`;
      const finalCoverPath = path.join(paperFolderPath, coverFileName);
      await fs.copyFile(coverImagePath, finalCoverPath);
      coverImageUrl = `MyPapers/${paper.folder_path}/${coverFileName}`;

      // Mettre à jour le papier avec l'image de couverture
      await database.updatePaper(paperId, { ...paper, image: coverImageUrl });
      console.log(`✅ Image de couverture sauvegardée: ${finalCoverPath}`);
    }

    // Nettoyer les fichiers temporaires
    try {
      if (await fs.pathExists(pdfPath)) {
        await fs.remove(pdfPath);
      }
      for (const imagePath of selectedImages || []) {
        if (await fs.pathExists(imagePath)) {
          await fs.remove(imagePath);
        }
      }
    } catch (cleanupError) {
      console.warn('Warning: Could not clean up temporary files:', cleanupError);
    }

    res.json({
      success: true,
      data: {
        pdfPath: `MyPapers/${paper.folder_path}/${pdfFileName}`,
        savedImages: savedImagesInfo,
        coverImage: coverImageUrl
      }
    });

  } catch (error) {
    console.error('Error saving PDF assets:', error);
    res.status(500).json({ success: false, error: 'Failed to save PDF assets' });
  }
});

async function fetchDOIMetadata(doi) {
  const axios = require('axios');

  try {
    const response = await axios.get(`https://api.crossref.org/works/${doi}`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    const work = response.data.message;

    const publishedDate = work.published ? work.published['date-parts'][0] : null;

    return {
      title: work.title ? work.title[0] : '',
      authors: work.author ? work.author.map(a => `${a.given || ''} ${a.family || ''}`).join(', ') : '',
      year: publishedDate ? publishedDate[0] : new Date().getFullYear(),
      month: publishedDate && publishedDate[1] ? publishedDate[1] : null,
      journal: work['container-title'] ? work['container-title'][0] : '',
      journal_short: work['short-container-title'] ? work['short-container-title'][0] : null,
      abstract: work.abstract || null,
      doi: work.DOI || doi,
      url: work.URL || `https://doi.org/${doi}`
    };
  } catch (error) {
    throw new Error('Failed to fetch DOI metadata');
  }
}

async function extractDOIFromPDF(filePath) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'scripts', 'extract_doi.py');
    const python = spawn('python', [pythonScript, filePath]);

    let result = '';
    let error = '';

    python.stdout.on('data', (data) => {
      result += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        try {
          const metadata = JSON.parse(result);
          resolve(metadata);
        } catch (e) {
          resolve(null);
        }
      } else {
        console.error('Python script error:', error);
        resolve(null);
      }
    });
  });
}

async function extractImagesFromPDF(filePath) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'scripts', 'extract_images.py');

    // Créer un dossier pour les images extraites
    const extractedDir = path.join(path.dirname(filePath), 'extracted_images');

    const python = spawn('python', [pythonScript, filePath, extractedDir]);

    let result = '';
    let error = '';

    python.stdout.on('data', (data) => {
      result += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        try {
          // Le nouveau script retourne directement un tableau d'images
          const extractedImages = JSON.parse(result);

          // Transformer les chemins d'images en chemins relatifs pour le serveur web
          const webImages = extractedImages.map(img => {
            // Convertir le chemin absolu en chemin relatif depuis le dossier backend
            const relativePath = path.relative(__dirname, img.path);
            // Remplacer les backslashes par des slashes pour les URLs
            const webPath = relativePath.replace(/\\/g, '/');
            return webPath;
          });

          const imagesResult = {
            images: webImages,
            total: extractedImages.length
          };

          console.log(`✅ ${extractedImages.length} images extraites du PDF`);
          resolve(imagesResult);
        } catch (e) {
          console.error('Error parsing image extraction result:', e);
          console.error('Raw result:', result);
          resolve({ images: [], total: 0 });
        }
      } else {
        console.error('Python script error:', error);
        resolve({ images: [], total: 0 });
      }
    });
  });
}

app.listen(PORT, () => {
  console.log(`✅ FormPaper3001 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: http://localhost:8666`);
  console.log(`🔧 Backend URL: http://localhost:${PORT}`);
});