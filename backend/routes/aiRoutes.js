const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs-extra');
const path = require('path');
const pdf = require('pdf-parse');

const router = express.Router();
const execAsync = promisify(exec);

// Vérifier le statut d'Ollama
router.get('/ollama/status', async (req, res) => {
  try {
    // Vérifier si Ollama est installé et en cours d'exécution
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();

    res.json({
      success: true,
      data: {
        installed: true,
        running: true,
        models: data.models || []
      }
    });
  } catch (error) {
    // Vérifier si Ollama est installé mais pas en cours d'exécution
    try {
      await execAsync('ollama --version');
      res.json({
        success: true,
        data: {
          installed: true,
          running: false,
          models: []
        }
      });
    } catch (versionError) {
      res.json({
        success: true,
        data: {
          installed: false,
          running: false,
          models: []
        }
      });
    }
  }
});

// Obtenir la liste des modèles disponibles
router.get('/ollama/models/available', async (req, res) => {
  try {
    const availableModels = [
      {
        name: 'llama3.2:3b',
        size: '2.0GB',
        description: 'Modèle léger, excellent pour commencer',
        recommended: true
      },
      {
        name: 'phi3:mini',
        size: '2.3GB',
        description: 'Très efficace pour Q&A, optimisé Microsoft',
        recommended: true
      },
      {
        name: 'mistral:7b',
        size: '4.1GB',
        description: 'Modèle plus puissant, nécessite plus de VRAM',
        recommended: false
      },
      {
        name: 'llama3.2:1b',
        size: '1.3GB',
        description: 'Ultra-léger, pour machines très limitées',
        recommended: false
      },
      {
        name: 'qwen2.5:7b',
        size: '4.7GB',
        description: 'Excellent pour l\'analyse de documents',
        recommended: false
      }
    ];

    res.json({
      success: true,
      data: availableModels
    });
  } catch (error) {
    console.error('Error getting available models:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des modèles disponibles'
    });
  }
});

// Rechercher dans la bibliothèque complète des modèles Ollama
router.get('/ollama/models/search', async (req, res) => {
  try {
    const { q: query } = req.query;

    // Base de données étendue des modèles populaires Ollama
    const fullModelLibrary = [
      // LLaMA Family
      { name: 'llama3.2:1b', size: '1.3GB', description: 'Ultra-léger, pour machines très limitées', category: 'LLaMA', params: '1B' },
      { name: 'llama3.2:3b', size: '2.0GB', description: 'Modèle léger, excellent pour commencer', category: 'LLaMA', params: '3B' },
      { name: 'llama3.1:8b', size: '4.7GB', description: 'Modèle équilibré performance/taille', category: 'LLaMA', params: '8B' },
      { name: 'llama3.1:70b', size: '40GB', description: 'Modèle très puissant, nécessite beaucoup de VRAM', category: 'LLaMA', params: '70B' },

      // Mistral Family
      { name: 'mistral:7b', size: '4.1GB', description: 'Modèle puissant, excellent pour le français', category: 'Mistral', params: '7B' },
      { name: 'mistral-nemo:12b', size: '7.1GB', description: 'Version améliorée de Mistral', category: 'Mistral', params: '12B' },
      { name: 'mixtral:8x7b', size: '26GB', description: 'Modèle mixture of experts très performant', category: 'Mistral', params: '47B' },

      // Phi Family (Microsoft)
      { name: 'phi3:mini', size: '2.3GB', description: 'Très efficace pour Q&A, optimisé Microsoft', category: 'Phi', params: '3.8B' },
      { name: 'phi3:medium', size: '7.9GB', description: 'Version plus puissante de Phi-3', category: 'Phi', params: '14B' },

      // Qwen Family (Alibaba)
      { name: 'qwen2.5:0.5b', size: '0.4GB', description: 'Ultra-compact, idéal pour tests', category: 'Qwen', params: '0.5B' },
      { name: 'qwen2.5:1.5b', size: '0.9GB', description: 'Très léger mais performant', category: 'Qwen', params: '1.5B' },
      { name: 'qwen2.5:3b', size: '1.9GB', description: 'Bon équilibre taille/performance', category: 'Qwen', params: '3B' },
      { name: 'qwen2.5:7b', size: '4.7GB', description: 'Excellent pour l\'analyse de documents', category: 'Qwen', params: '7B' },
      { name: 'qwen2.5:14b', size: '8.2GB', description: 'Version plus puissante', category: 'Qwen', params: '14B' },
      { name: 'qwen2.5:32b', size: '18GB', description: 'Très performant pour les tâches complexes', category: 'Qwen', params: '32B' },

      // Code Models
      { name: 'codellama:7b', size: '3.8GB', description: 'Spécialisé dans la génération de code', category: 'Code', params: '7B' },
      { name: 'codegemma:7b', size: '5.0GB', description: 'Modèle Google spécialisé code', category: 'Code', params: '7B' },
      { name: 'deepseek-coder:6.7b', size: '3.8GB', description: 'Excellent pour le code, très performant', category: 'Code', params: '6.7B' },
      { name: 'starcoder2:3b', size: '1.7GB', description: 'Modèle de code léger et efficace', category: 'Code', params: '3B' },

      // Specialized Models
      { name: 'gemma2:2b', size: '1.6GB', description: 'Modèle Google compact et efficace', category: 'Gemma', params: '2B' },
      { name: 'gemma2:9b', size: '5.4GB', description: 'Version plus puissante de Gemma', category: 'Gemma', params: '9B' },
      { name: 'gemma2:27b', size: '16GB', description: 'Modèle Google haut de gamme', category: 'Gemma', params: '27B' },

      // Embedding Models
      { name: 'nomic-embed-text', size: '274MB', description: 'Modèle d\'embeddings pour la recherche sémantique', category: 'Embedding', params: '137M' },
      { name: 'mxbai-embed-large', size: '669MB', description: 'Embeddings haute qualité', category: 'Embedding', params: '335M' },

      // Vision Models
      { name: 'llava:7b', size: '4.7GB', description: 'Modèle multimodal (texte + images)', category: 'Vision', params: '7B' },
      { name: 'llava:13b', size: '8.0GB', description: 'Version plus puissante de LLaVA', category: 'Vision', params: '13B' },

      // Other Popular Models
      { name: 'neural-chat:7b', size: '4.1GB', description: 'Optimisé pour les conversations', category: 'Chat', params: '7B' },
      { name: 'openchat:7b', size: '4.1GB', description: 'Modèle de chat très performant', category: 'Chat', params: '7B' },
      { name: 'wizard-vicuna-uncensored:7b', size: '4.1GB', description: 'Modèle sans censure pour créativité', category: 'Uncensored', params: '7B' },
      { name: 'orca2:7b', size: '4.1GB', description: 'Modèle Microsoft pour raisonnement', category: 'Reasoning', params: '7B' },
      { name: 'dolphin-mixtral:8x7b', size: '26GB', description: 'Version fine-tunée de Mixtral', category: 'Dolphin', params: '47B' },
    ];

    let results = fullModelLibrary;

    // Filtrer par query si fournie
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase();
      results = fullModelLibrary.filter(model =>
        model.name.toLowerCase().includes(searchTerm) ||
        model.description.toLowerCase().includes(searchTerm) ||
        model.category.toLowerCase().includes(searchTerm)
      );
    }

    // Trier par popularité/recommandation (les plus petits d'abord dans chaque catégorie)
    results.sort((a, b) => {
      // D'abord par catégorie
      if (a.category !== b.category) {
        const categoryOrder = ['LLaMA', 'Mistral', 'Phi', 'Qwen', 'Gemma', 'Code', 'Chat', 'Vision', 'Embedding'];
        return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      }
      // Puis par taille (plus petit d'abord)
      const sizeA = parseFloat(a.size);
      const sizeB = parseFloat(b.size);
      return sizeA - sizeB;
    });

    res.json({
      success: true,
      data: {
        models: results,
        total: results.length,
        query: query || ''
      }
    });
  } catch (error) {
    console.error('Error searching models:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche de modèles'
    });
  }
});

// Obtenir la liste des modèles installés
router.get('/ollama/models/installed', async (req, res) => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();

    res.json({
      success: true,
      data: data.models || []
    });
  } catch (error) {
    console.error('Error getting installed models:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des modèles installés'
    });
  }
});

// Télécharger un modèle
router.post('/ollama/models/pull', async (req, res) => {
  const { modelName } = req.body;

  if (!modelName) {
    return res.status(400).json({
      success: false,
      error: 'Le nom du modèle est requis'
    });
  }

  try {
    // Démarrer le téléchargement en arrière-plan avec logging amélioré
    console.log(`🚀 Démarrage du téléchargement de ${modelName}...`);

    const pullProcess = exec(`ollama pull ${modelName}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Erreur lors du téléchargement de ${modelName}:`, error);
        return;
      }
      console.log(`✅ Modèle ${modelName} téléchargé avec succès`);
      console.log('Sortie:', stdout);
    });

    // Log progress en temps réel
    pullProcess.stdout?.on('data', (data) => {
      console.log(`📥 ${modelName}: ${data.toString().trim()}`);
    });

    pullProcess.stderr?.on('data', (data) => {
      console.log(`🔄 ${modelName}: ${data.toString().trim()}`);
    });

    res.json({
      success: true,
      message: `Téléchargement du modèle ${modelName} démarré. Vérifiez les logs du serveur pour le progrès.`,
      data: {
        modelName,
        tip: 'Le téléchargement peut prendre plusieurs minutes selon la taille du modèle. Utilisez le bouton "Actualiser" pour vérifier l\'installation.'
      }
    });
  } catch (error) {
    console.error('Error starting model pull:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du démarrage du téléchargement'
    });
  }
});

// Supprimer un modèle
router.delete('/ollama/models/:modelName', async (req, res) => {
  const { modelName } = req.params;

  try {
    await execAsync(`ollama rm ${modelName}`);

    res.json({
      success: true,
      message: `Modèle ${modelName} supprimé avec succès`
    });
  } catch (error) {
    console.error(`Error removing model ${modelName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du modèle'
    });
  }
});

// Tester la connexion avec un modèle
router.post('/ollama/test', async (req, res) => {
  const { modelName } = req.body;

  if (!modelName) {
    return res.status(400).json({
      success: false,
      error: 'Le nom du modèle est requis'
    });
  }

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        prompt: 'Réponds simplement "Test réussi" en français.',
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      message: 'Test de connexion réussi',
      data: {
        modelName,
        response: data.response
      }
    });
  } catch (error) {
    console.error(`Error testing model ${modelName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du test de connexion'
    });
  }
});

// Obtenir les informations système (VRAM, etc.)
router.get('/system/info', async (req, res) => {
  try {
    // Utiliser les commandes système pour obtenir des infos sur la VRAM/RAM
    let systemInfo = {
      ram: 'N/A',
      gpu: 'N/A',
      storage: 'N/A'
    };

    try {
      // Tentative d'obtenir des infos RAM (Windows)
      const { stdout: ramInfo } = await execAsync('wmic computersystem get TotalPhysicalMemory /value');
      const ramMatch = ramInfo.match(/TotalPhysicalMemory=(\d+)/);
      if (ramMatch) {
        const ramBytes = parseInt(ramMatch[1]);
        const ramGB = Math.round(ramBytes / (1024 * 1024 * 1024));
        systemInfo.ram = `${ramGB} GB`;
      }
    } catch (error) {
      console.log('Could not get RAM info:', error.message);
    }

    try {
      // Tentative d'obtenir des infos GPU (Windows)
      const { stdout: gpuInfo } = await execAsync('wmic path win32_VideoController get name /value');
      const gpuMatch = gpuInfo.match(/Name=(.+)/);
      if (gpuMatch) {
        systemInfo.gpu = gpuMatch[1].trim();
      }
    } catch (error) {
      console.log('Could not get GPU info:', error.message);
    }

    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    console.error('Error getting system info:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des informations système'
    });
  }
});

// Extraire le texte d'un PDF pour l'analyse IA
router.post('/pdf/extract', async (req, res) => {
  try {
    const { paperId } = req.body;

    if (!paperId) {
      return res.status(400).json({
        success: false,
        error: 'L\'ID du paper est requis'
      });
    }

    // Trouver le fichier PDF dans le dossier MyPapers
    const paperFolderPath = path.join(__dirname, '..', 'MyPapers');
    const folders = await fs.readdir(paperFolderPath);

    let pdfPath = null;
    let foundFolder = null;

    // Chercher le dossier contenant l'ID du paper
    for (const folder of folders) {
      if (folder.includes(`_${paperId}`)) {
        foundFolder = folder;
        const folderPath = path.join(paperFolderPath, folder);
        const files = await fs.readdir(folderPath);

        // Chercher le fichier PDF
        const pdfFile = files.find(file => file.toLowerCase().endsWith('.pdf'));
        if (pdfFile) {
          pdfPath = path.join(folderPath, pdfFile);
          break;
        }
      }
    }

    if (!pdfPath || !await fs.pathExists(pdfPath)) {
      return res.status(404).json({
        success: false,
        error: 'Fichier PDF non trouvé pour cet article'
      });
    }

    // Extraire le texte du PDF
    const dataBuffer = await fs.readFile(pdfPath);
    const data = await pdf(dataBuffer);

    res.json({
      success: true,
      data: {
        text: data.text,
        pages: data.numpages,
        info: data.info,
        metadata: {
          paperId,
          folderPath: foundFolder,
          pdfPath: path.basename(pdfPath),
          extractedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error extracting PDF text:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'extraction du texte PDF'
    });
  }
});

// Chat avec l'IA sur un document
router.post('/chat', async (req, res) => {
  try {
    const { message, context, modelName = 'llama3.1:8b' } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Le message est requis'
      });
    }

    // Construire le prompt avec le contexte du document
    let fullPrompt = '';

    if (context && context.text) {
      fullPrompt = `Tu es un assistant IA spécialisé dans l'analyse d'articles de recherche scientifique.

CONTEXTE - Voici le contenu de l'article à analyser :

${context.text.substring(0, 20000)} ${context.text.length > 20000 ? '...' : ''}

QUESTION DE L'UTILISATEUR :
${message}

INSTRUCTIONS :
- Réponds uniquement en français
- Base ta réponse sur le contenu de l'article fourni
- Sois précis et factuel
- Si l'information n'est pas dans l'article, dis-le clairement
- Structure ta réponse de manière claire et lisible

RÉPONSE :`;
    } else {
      fullPrompt = `Tu es un assistant IA pour l'analyse d'articles scientifiques. Réponds en français à cette question : ${message}`;
    }

    // Appeler Ollama
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.1, // Plus déterministe pour l'analyse académique
          top_p: 0.9,
          top_k: 40
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      data: {
        response: data.response,
        model: modelName,
        timestamp: new Date().toISOString(),
        tokenCount: data.eval_count || 0,
        processingTime: data.eval_duration ? Math.round(data.eval_duration / 1000000) : 0 // Convert to ms
      }
    });

  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la communication avec l\'IA'
    });
  }
});

module.exports = router;