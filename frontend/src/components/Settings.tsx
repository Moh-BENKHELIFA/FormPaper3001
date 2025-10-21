import React, { useState, useEffect } from 'react';
import { useNavigation } from '../hooks/useNavigation';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { PaperStats, Tag } from '../types/Paper';
import { paperService } from '../services/paperService';
import { collectionService, Collection } from '../services/collectionService';
import { zoteroService, ZoteroConfig } from '../services/zoteroService';
import Sidebar from './Sidebar';
import Modal from './Modal';

const Settings: React.FC = () => {
  const { goToHome, goToCreateCollection } = useNavigation();
  const { success, error } = useToast();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<'general' | 'tags' | 'collections' | 'integrations' | 'ai'>('general');
  const [tags, setTags] = useState<Tag[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [showEditTagModal, setShowEditTagModal] = useState(false);
  const [showDeleteTagModal, setShowDeleteTagModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [showDeleteCollectionModal, setShowDeleteCollectionModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [showResetDatabaseModal, setShowResetDatabaseModal] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');

  // Form states
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#3B82F6');
  const [collectionName, setCollectionName] = useState('');

  // AI/Ollama states
  const [aiProvider, setAiProvider] = useState<'ollama' | 'groq'>('ollama');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [hasGroqApiKey, setHasGroqApiKey] = useState(false);
  const [groqModels, setGroqModels] = useState<any[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<{
    installed: boolean;
    running: boolean;
    models: any[];
  }>({ installed: false, running: false, models: [] });
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [installedModels, setInstalledModels] = useState<any[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);

  // Search states
  const [showModelSearch, setShowModelSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Zotero states
  const [zoteroConfig, setZoteroConfig] = useState<ZoteroConfig | null>(null);
  const [zoteroUserId, setZoteroUserId] = useState('');
  const [zoteroApiKey, setZoteroApiKey] = useState('');
  const [zoteroLibraryType, setZoteroLibraryType] = useState<'user' | 'group'>('user');
  const [isTestingZotero, setIsTestingZotero] = useState(false);
  const [isSavingZotero, setIsSavingZotero] = useState(false);
  const [showZoteroConfig, setShowZoteroConfig] = useState(false);

  const emptyStats: PaperStats = {
    total: 0,
    unread: 0,
    reading: 0,
    read: 0,
    favorite: 0,
  };

  useEffect(() => {
    if (activeSection === 'tags') {
      loadTags();
    } else if (activeSection === 'collections') {
      loadCollections();
    } else if (activeSection === 'ai') {
      loadOllamaData();
    } else if (activeSection === 'integrations') {
      loadZoteroConfig();
    }
  }, [activeSection]);

  const loadTags = async () => {
    try {
      setIsLoading(true);
      const tagsData = await paperService.getTags();
      setTags(tagsData);
    } catch (err) {
      error('Erreur', 'Impossible de charger les tags');
      console.error('Error loading tags:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCollections = async () => {
    try {
      setIsLoading(true);
      const collectionsData = await collectionService.getAllCollections();
      setCollections(collectionsData);
    } catch (err) {
      error('Erreur', 'Impossible de charger les collections');
      console.error('Error loading collections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOllamaData = async () => {
    try {
      setIsLoadingAI(true);

      // Load AI settings
      const settingsResponse = await fetch('http://localhost:5004/api/settings');
      const settingsData = await settingsResponse.json();

      if (settingsData.success) {
        setAiProvider(settingsData.data.aiProvider || 'ollama');
        setHasGroqApiKey(settingsData.data.hasGroqApiKey || false);
      }

      // Load Groq models
      const groqModelsResponse = await fetch('http://localhost:5004/api/groq/models');
      const groqModelsData = await groqModelsResponse.json();
      if (groqModelsData.success) {
        setGroqModels(groqModelsData.data);
      }

      // Charger le statut d'Ollama
      const statusResponse = await fetch('http://localhost:5004/api/ollama/status');
      const statusData = await statusResponse.json();

      if (statusData.success) {
        setOllamaStatus(statusData.data);
        setInstalledModels(statusData.data.models);
      }

      // Charger les modèles disponibles
      const modelsResponse = await fetch('http://localhost:5004/api/ollama/models/available');
      const modelsData = await modelsResponse.json();

      if (modelsData.success) {
        setAvailableModels(modelsData.data);
      }
    } catch (err) {
      error('Erreur', 'Impossible de charger les données IA');
      console.error('Error loading Ollama data:', err);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSaveAiProvider = async (provider: 'ollama' | 'groq') => {
    try {
      const response = await fetch('http://localhost:5004/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ aiProvider: provider }),
      });

      const data = await response.json();

      if (data.success) {
        setAiProvider(provider);
        success('Paramètres enregistrés', `Fournisseur IA: ${provider === 'ollama' ? 'Ollama (Local)' : 'Groq (API)'}`);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      error('Erreur', 'Impossible d\'enregistrer le fournisseur IA');
      console.error('Error saving AI provider:', err);
    }
  };

  const handleSaveGroqApiKey = async () => {
    try {
      const response = await fetch('http://localhost:5004/api/groq/api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: groqApiKey }),
      });

      const data = await response.json();

      if (data.success) {
        setHasGroqApiKey(true);
        setGroqApiKey(''); // Clear input for security
        success('Clé API enregistrée', 'La clé API Groq a été validée et enregistrée avec succès');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      error('Erreur', err.message || 'Clé API invalide ou erreur de connexion');
      console.error('Error saving Groq API key:', err);
    }
  };

  const handleDownloadModel = async (modelName: string) => {
    try {
      setDownloadingModel(modelName);

      const response = await fetch('http://localhost:5004/api/ollama/models/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modelName }),
      });

      const data = await response.json();

      if (data.success) {
        success(
          'Téléchargement démarré ⏳',
          `${modelName} est en cours de téléchargement. Cela peut prendre plusieurs minutes selon la taille du modèle.`
        );

        // Créer un système de vérification périodique
        const checkDownload = async () => {
          try {
            const checkResponse = await fetch('http://localhost:5004/api/ollama/models/installed');
            const checkData = await checkResponse.json();

            if (checkData.success) {
              const isInstalled = checkData.data.some((model: any) =>
                model.name === modelName || model.name.startsWith(modelName.split(':')[0])
              );

              if (isInstalled) {
                success('Téléchargement terminé ✅', `${modelName} a été installé avec succès !`);
                loadOllamaData();
                return true;
              }
            }
            return false;
          } catch (error) {
            console.error('Error checking download:', error);
            return false;
          }
        };

        // Vérifier toutes les 10 secondes pendant 5 minutes max
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes
        const checkInterval = setInterval(async () => {
          attempts++;
          const isComplete = await checkDownload();

          if (isComplete || attempts >= maxAttempts) {
            clearInterval(checkInterval);
            if (attempts >= maxAttempts && !isComplete) {
              error(
                'Timeout de vérification',
                `Le téléchargement de ${modelName} prend plus de temps que prévu. Vérifiez manuellement avec le bouton "Actualiser".`
              );
            }
            setDownloadingModel(null);
          }
        }, 10000);

        // Message informatif après 30 secondes
        setTimeout(() => {
          if (downloadingModel === modelName) {
            success(
              'Téléchargement en cours... 📥',
              `${modelName} est toujours en cours de téléchargement. Patience, les gros modèles prennent du temps !`
            );
          }
        }, 30000);

      } else {
        error('Erreur', data.error || 'Impossible de démarrer le téléchargement');
        setDownloadingModel(null);
      }
    } catch (err) {
      error('Erreur', 'Impossible de télécharger le modèle');
      console.error('Error downloading model:', err);
      setDownloadingModel(null);
    }
  };

  const handleTestModel = async (modelName: string) => {
    try {
      setIsLoadingAI(true);

      const response = await fetch('http://localhost:5004/api/ollama/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modelName }),
      });

      const data = await response.json();

      if (data.success) {
        success('Test réussi', `Le modèle ${modelName} fonctionne correctement`);
      } else {
        error('Test échoué', data.error || 'Le modèle ne répond pas');
      }
    } catch (err) {
      error('Erreur', 'Impossible de tester le modèle');
      console.error('Error testing model:', err);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le modèle ${modelName} ?`)) {
      return;
    }

    try {
      setIsLoadingAI(true);

      const response = await fetch(`http://localhost:5004/api/ollama/models/${modelName}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        success('Suppression réussie', `Le modèle ${modelName} a été supprimé`);
        loadOllamaData();
      } else {
        error('Erreur', data.error || 'Impossible de supprimer le modèle');
      }
    } catch (err) {
      error('Erreur', 'Impossible de supprimer le modèle');
      console.error('Error deleting model:', err);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSearchModels = async (query: string) => {
    try {
      setIsSearching(true);

      const url = new URL('http://localhost:5004/api/ollama/models/search');
      if (query.trim()) {
        url.searchParams.append('q', query.trim());
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data.models);
      } else {
        error('Erreur', data.error || 'Impossible de rechercher les modèles');
      }
    } catch (err) {
      error('Erreur', 'Impossible de rechercher les modèles');
      console.error('Error searching models:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenModelSearch = () => {
    setShowModelSearch(true);
    handleSearchModels(''); // Charger tous les modèles au départ
  };

  const handleSearchInputChange = (query: string) => {
    setSearchQuery(query);
    // Debounce la recherche
    const timeoutId = setTimeout(() => {
      handleSearchModels(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleCreateTag = async () => {
    if (!tagName.trim()) {
      error('Erreur', 'Le nom du tag est requis');
      return;
    }

    try {
      await paperService.createTag(tagName.trim(), tagColor);
      success('Succès', 'Tag créé avec succès');
      setShowCreateTagModal(false);
      setTagName('');
      setTagColor('#3B82F6');
      loadTags();
    } catch (err) {
      error('Erreur', 'Impossible de créer le tag');
      console.error('Error creating tag:', err);
    }
  };

  const handleEditTag = async () => {
    if (!selectedTag || !tagName.trim()) {
      error('Erreur', 'Le nom du tag est requis');
      return;
    }

    try {
      await paperService.updateTag(selectedTag.id, tagName.trim(), tagColor);
      success('Succès', 'Tag modifié avec succès');
      setShowEditTagModal(false);
      setSelectedTag(null);
      setTagName('');
      setTagColor('#3B82F6');
      loadTags();
    } catch (err) {
      error('Erreur', 'Impossible de modifier le tag');
      console.error('Error editing tag:', err);
    }
  };

  const handleDeleteTag = async () => {
    if (!selectedTag) return;

    try {
      await paperService.deleteTag(selectedTag.id);
      success('Succès', 'Tag supprimé avec succès');
      setShowDeleteTagModal(false);
      setSelectedTag(null);
      loadTags();
    } catch (err) {
      error('Erreur', 'Impossible de supprimer le tag');
      console.error('Error deleting tag:', err);
    }
  };

  const openCreateTagModal = () => {
    setTagName('');
    setTagColor('#3B82F6');
    setShowCreateTagModal(true);
  };

  const openEditTagModal = (tag: Tag) => {
    setSelectedTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setShowEditTagModal(true);
  };

  const openDeleteTagModal = (tag: Tag) => {
    setSelectedTag(tag);
    setShowDeleteTagModal(true);
  };

  const handleDeleteCollection = async () => {
    if (!selectedCollection) return;

    try {
      await collectionService.deleteCollection(selectedCollection.id);
      success('Succès', 'Collection supprimée avec succès');
      setShowDeleteCollectionModal(false);
      setSelectedCollection(null);
      loadCollections();
    } catch (err) {
      error('Erreur', 'Impossible de supprimer la collection');
      console.error('Error deleting collection:', err);
    }
  };

  const openEditCollectionModal = (collection: Collection) => {
    goToCreateCollection(collection.id);
  };

  const openDeleteCollectionModal = (collection: Collection) => {
    setSelectedCollection(collection);
    setShowDeleteCollectionModal(true);
  };

  const handleResetDatabase = async () => {
    if (resetConfirmationText !== 'RESET') {
      error('Erreur', 'Veuillez taper "RESET" pour confirmer');
      return;
    }

    try {
      setIsLoading(true);
      await paperService.resetDatabase();
      success('Succès', 'Base de données réinitialisée avec succès');
      setShowResetDatabaseModal(false);
      setResetConfirmationText('');
      // Recharger la page pour refléter les changements
      window.location.reload();
    } catch (err) {
      error('Erreur', 'Impossible de réinitialiser la base de données');
      console.error('Error resetting database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openResetDatabaseModal = () => {
    setResetConfirmationText('');
    setShowResetDatabaseModal(true);
  };

  const loadZoteroConfig = async () => {
    try {
      const config = await zoteroService.getConfig();
      setZoteroConfig(config);
      if (config.configured) {
        setShowZoteroConfig(true);
      }
    } catch (err) {
      console.error('Error loading Zotero config:', err);
    }
  };

  const handleTestZoteroConnection = async () => {
    if (!zoteroUserId.trim() || !zoteroApiKey.trim()) {
      error('Erreur', 'User ID et API Key sont requis');
      return;
    }

    try {
      setIsTestingZotero(true);
      const result = await zoteroService.testConnection(zoteroUserId.trim(), zoteroApiKey.trim());

      if (result.success) {
        success('Connexion réussie', result.message);
      } else {
        error('Échec de connexion', result.message);
      }
    } catch (err: any) {
      error('Erreur', err.message || 'Impossible de tester la connexion');
    } finally {
      setIsTestingZotero(false);
    }
  };

  const handleSaveZoteroConfig = async () => {
    if (!zoteroUserId.trim() || !zoteroApiKey.trim()) {
      error('Erreur', 'User ID et API Key sont requis');
      return;
    }

    try {
      setIsSavingZotero(true);
      const result = await zoteroService.saveConfig(
        zoteroUserId.trim(),
        zoteroApiKey.trim(),
        zoteroLibraryType
      );

      if (result.success) {
        success('Configuration sauvegardée', result.message);
        setZoteroUserId('');
        setZoteroApiKey('');
        loadZoteroConfig();
      }
    } catch (err: any) {
      error('Erreur', err.message || 'Impossible de sauvegarder la configuration');
    } finally {
      setIsSavingZotero(false);
    }
  };

  const handleDeleteZoteroConfig = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer la configuration Zotero ?')) {
      return;
    }

    try {
      const result = await zoteroService.deleteConfig();
      if (result.success) {
        success('Configuration supprimée', result.message);
        setZoteroConfig(null);
        setShowZoteroConfig(false);
      }
    } catch (err: any) {
      error('Erreur', err.message || 'Impossible de supprimer la configuration');
    }
  };

  const predefinedColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6',
    '#F97316', '#84CC16', '#06B6D4', '#8B5A2B'
  ];

  const menuItems = [
    { id: 'general', label: 'Général', icon: '⚙️' },
    { id: 'tags', label: 'Gestion des Tags', icon: '🏷️' },
    { id: 'collections', label: 'Gestion des Collections', icon: '📁' },
    { id: 'ai', label: 'Intelligence Artificielle', icon: '🤖' },
    { id: 'integrations', label: 'Intégrations', icon: '🔗' },
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Apparence</h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Thème</h4>
              <p className="text-sm text-gray-500 dark:text-gray-500">Choisissez le thème de l'application</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setTheme('light')}
                className={`px-4 py-2 text-sm rounded border transition-colors ${
                  theme === 'light'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Clair
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-4 py-2 text-sm rounded border transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Sombre
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Préférences</h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Mode d'affichage par défaut</h4>
              <p className="text-sm text-gray-500 dark:text-gray-500">Choisissez la vue par défaut pour les articles</p>
            </div>
            <select className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              <option value="grid">Grille</option>
              <option value="list">Liste</option>
              <option value="table">Tableau</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Création automatique de dossiers</h4>
              <p className="text-sm text-gray-500 dark:text-gray-500">Créer automatiquement des dossiers pour chaque article</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Zone de Danger</h3>
        <div className="bg-red-50 dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-red-900 dark:text-red-400">Réinitialiser la base de données</h4>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                    Supprime définitivement tous les articles, catégories, tags et données de la base.
                    Cette action est irréversible.
                  </p>
                </div>
                <button
                  onClick={openResetDatabaseModal}
                  className="ml-4 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex-shrink-0"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTagsSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Gestion des Tags</h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Tags existants ({tags.length})</h4>
              <button
                onClick={openCreateTagModal}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                + Nouveau Tag
              </button>
            </div>
          </div>

          <div className="p-4">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-500">
                <p>Chargement des tags...</p>
              </div>
            ) : tags.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-500">
                <p>Aucun tag créé</p>
                <p className="text-sm mt-2">Créez votre premier tag pour organiser vos articles</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{tag.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {(tag as any).paper_count || 0} article{((tag as any).paper_count || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditTagModal(tag)}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => openDeleteTagModal(tag)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCollectionsSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Gestion des Collections</h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Collections existantes ({collections.length})</h4>
            </div>
          </div>

          <div className="p-4">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-500">
                <p>Chargement des collections...</p>
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-500">
                <p>Aucune collection créée</p>
                <p className="text-sm mt-2">Créez votre première collection pour organiser vos articles</p>
              </div>
            ) : (
              <div className="space-y-3">
                {collections.map((collection) => (
                  <div key={collection.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">📁</span>
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{collection.name}</span>
                        <p className="text-xs text-gray-500 dark:text-gray-500">{collection.count || 0} article{(collection.count || 0) !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditCollectionModal(collection)}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => openDeleteCollectionModal(collection)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderIntegrationsSettings = () => (
    <div className="space-y-6">
      {/* Zotero Integration */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Intégrations</h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📚</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Zotero</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {zoteroConfig?.configured
                      ? `Connecté: ${zoteroConfig.user_id} (${zoteroConfig.library_type})`
                      : 'Synchroniser avec votre bibliothèque Zotero'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {zoteroConfig?.configured ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 dark:text-green-400">Configuré</span>
                  </>
                ) : (
                  <button
                    onClick={() => setShowZoteroConfig(!showZoteroConfig)}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Configurer
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          {(showZoteroConfig || zoteroConfig?.configured) && (
            <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              {zoteroConfig?.configured ? (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-gray-900 border border-green-200 dark:border-green-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="text-sm font-medium text-green-800 dark:text-green-400 mb-2">Configuration active</h5>
                        <div className="space-y-1 text-sm text-green-700 dark:text-green-400">
                          <p><strong>User ID:</strong> {zoteroConfig.user_id}</p>
                          <p><strong>Type:</strong> {zoteroConfig.library_type === 'user' ? 'Bibliothèque personnelle' : 'Bibliothèque de groupe'}</p>
                          <p><strong>API Key:</strong> {zoteroConfig.api_key_preview || '••••••'}</p>
                          {zoteroConfig.last_sync && (
                            <p><strong>Dernière sync:</strong> {new Date(zoteroConfig.last_sync).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleDeleteZoteroConfig}
                        className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded border border-red-300 dark:border-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-gray-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">Comment utiliser l'intégration Zotero</h5>
                    <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 ml-4">
                      <li>• Allez dans "Ajouter un article"</li>
                      <li>• Cliquez sur "Importer depuis Zotero"</li>
                      <li>• Sélectionnez les articles à importer</li>
                      <li>• Les métadonnées seront automatiquement récupérées</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-gray-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">Configuration Zotero</h5>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Pour connecter votre bibliothèque Zotero, vous aurez besoin de votre User ID et d'une clé API.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type de bibliothèque
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="user"
                          checked={zoteroLibraryType === 'user'}
                          onChange={(e) => setZoteroLibraryType(e.target.value as 'user')}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Personnelle</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="group"
                          checked={zoteroLibraryType === 'group'}
                          onChange={(e) => setZoteroLibraryType(e.target.value as 'group')}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Groupe</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      User ID Zotero
                    </label>
                    <input
                      type="text"
                      value={zoteroUserId}
                      onChange={(e) => setZoteroUserId(e.target.value)}
                      placeholder="Votre User ID Zotero"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Trouvez votre User ID dans <a href="https://www.zotero.org/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Zotero Settings</a>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Clé API Zotero
                    </label>
                    <input
                      type="password"
                      value={zoteroApiKey}
                      onChange={(e) => setZoteroApiKey(e.target.value)}
                      placeholder="Votre clé API Zotero"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Créez une nouvelle clé API sur <a href="https://www.zotero.org/settings/keys/new" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Zotero Keys</a>
                    </p>
                  </div>

                  <div className="flex items-center justify-end space-x-3">
                    <button
                      onClick={handleTestZoteroConnection}
                      disabled={isTestingZotero || !zoteroUserId.trim() || !zoteroApiKey.trim()}
                      className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      {isTestingZotero ? 'Test en cours...' : 'Tester la connexion'}
                    </button>
                    <button
                      onClick={handleSaveZoteroConfig}
                      disabled={isSavingZotero || !zoteroUserId.trim() || !zoteroApiKey.trim()}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSavingZotero ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAISettings = () => (
    <div className="space-y-6">
      {/* AI Provider Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Fournisseur d'IA</h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Choisissez le fournisseur d'IA pour le chat avec vos articles
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSaveAiProvider('ollama')}
              className={`p-4 rounded-lg border-2 transition-all ${
                aiProvider === 'ollama'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Ollama</h4>
                {aiProvider === 'ollama' && <span className="text-blue-500">✓</span>}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">IA locale, gratuite, aucune connexion Internet requise</p>
            </button>

            <button
              onClick={() => handleSaveAiProvider('groq')}
              className={`p-4 rounded-lg border-2 transition-all ${
                aiProvider === 'groq'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Groq</h4>
                {aiProvider === 'groq' && <span className="text-blue-500">✓</span>}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">API cloud, ultra-rapide, nécessite une clé API</p>
            </button>
          </div>
        </div>
      </div>

      {/* Groq Configuration */}
      {aiProvider === 'groq' && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Configuration Groq</h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Clé API Groq
              </label>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={groqApiKey}
                  onChange={(e) => setGroqApiKey(e.target.value)}
                  placeholder={hasGroqApiKey ? 'Clé API configurée' : 'Entrez votre clé API Groq'}
                  className="flex-1 input-field bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={handleSaveGroqApiKey}
                  disabled={!groqApiKey}
                  className="btn-primary disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {hasGroqApiKey ? (
                  <span className="text-green-600 dark:text-green-400">✓ Clé API configurée</span>
                ) : (
                  <>Obtenez votre clé API gratuite sur <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">console.groq.com</a></>
                )}
              </p>
            </div>

            {hasGroqApiKey && groqModels.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Modèles disponibles
                </label>
                <div className="space-y-2">
                  {groqModels.map((model) => (
                    <div
                      key={model.name}
                      className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{model.displayName}</h4>
                          {model.recommended && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">Recommandé</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{model.description}</p>
                        {model.contextWindow && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Context: {model.contextWindow.toLocaleString()} tokens</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statut Ollama */}
      {aiProvider === 'ollama' && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Configuration Ollama</h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                ollamaStatus.running ? 'bg-green-100 dark:bg-green-900' : ollamaStatus.installed ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-red-100 dark:bg-red-900'
              }`}>
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Ollama</h4>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {!ollamaStatus.installed
                    ? 'Non installé'
                    : ollamaStatus.running
                      ? 'En cours d\'exécution'
                      : 'Installé mais arrêté'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                ollamaStatus.running ? 'bg-green-500' : ollamaStatus.installed ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <button
                onClick={loadOllamaData}
                disabled={isLoadingAI}
                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 border border-blue-200 dark:border-blue-700"
              >
                {isLoadingAI ? 'Vérification...' : 'Actualiser'}
              </button>
            </div>
          </div>

          {!ollamaStatus.installed && (
            <div className="bg-yellow-50 dark:bg-gray-800 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-2">Installation requise</h5>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
                Ollama n'est pas installé sur ce système. Téléchargez-le depuis le site officiel.
              </p>
              <a
                href="https://ollama.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Télécharger Ollama
              </a>
            </div>
          )}

          {ollamaStatus.installed && !ollamaStatus.running && (
            <div className="bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h5 className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">Démarrage nécessaire</h5>
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                Ollama est installé mais n'est pas en cours d'exécution. Démarrez-le depuis votre terminal avec :
              </p>
              <code className="block bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-sm font-mono text-gray-900 dark:text-gray-100">ollama serve</code>
            </div>
          )}
        </div>

        {/* Gestion des modèles */}
        {ollamaStatus.running && (
          <div>
            <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Modèles disponibles</h3>
            <button
              onClick={handleOpenModelSearch}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <span>🔍</span>
              <span>Rechercher plus de modèles</span>
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Modèles recommandés</h4>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Choisissez et téléchargez les modèles adaptés à votre matériel</p>
            </div>

            <div className="p-4 space-y-4">
              {isLoadingAI ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-500">
                  <p>Chargement des modèles...</p>
                </div>
              ) : (
                availableModels.map((model) => {
                  const isInstalled = installedModels.some(installed => installed.name === model.name);
                  const isDownloading = downloadingModel === model.name;

                  return (
                    <div key={model.name} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            isInstalled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}></div>
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                              <span>{model.name}</span>
                              {model.recommended && (
                                <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                                  Recommandé
                                </span>
                              )}
                            </h5>
                            <p className="text-sm text-gray-500 dark:text-gray-500">{model.description}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-400">Taille: {model.size}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isInstalled ? (
                          <>
                            <button
                              onClick={() => handleTestModel(model.name)}
                              disabled={isLoadingAI}
                              className="px-3 py-1 text-xs text-green-600 hover:bg-green-50 rounded border border-green-200"
                            >
                              Tester
                            </button>
                            <button
                              onClick={() => handleDeleteModel(model.name)}
                              disabled={isLoadingAI}
                              className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200"
                            >
                              Supprimer
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleDownloadModel(model.name)}
                            disabled={isDownloading || isLoadingAI}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isDownloading ? 'Téléchargement...' : 'Télécharger'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modèles installés */}
      {ollamaStatus.running && installedModels.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Modèles installés ({installedModels.length})</h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="space-y-3">
              {installedModels.map((model) => (
                <div key={model.name} className="flex items-center justify-between p-3 bg-green-50 dark:bg-gray-700 border border-green-200 dark:border-green-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">{model.name}</h5>
                      {model.size && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">Taille: {Math.round(model.size / (1024 * 1024 * 1024) * 10) / 10} GB</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTestModel(model.name)}
                      disabled={isLoadingAI}
                      className="px-3 py-1 text-xs text-green-600 hover:bg-green-100 rounded border border-green-300"
                    >
                      Tester
                    </button>
                    <button
                      onClick={() => handleDeleteModel(model.name)}
                      disabled={isLoadingAI}
                      className="px-3 py-1 text-xs text-red-600 hover:bg-red-100 rounded border border-red-300"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tutorial d'utilisation */}
      {ollamaStatus.running && installedModels.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">🎓 Comment utiliser l'IA</h3>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 rounded-lg border border-blue-200 dark:border-gray-700 p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-300 font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">📄 Ouvrir un article</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Dans la liste des articles, cliquez sur un paper pour ouvrir ses notes.
                    L'IA pourra analyser le contenu du PDF automatiquement.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-300 font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">💬 Utiliser le chat IA</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Dans la page de notes, vous trouverez un bouton "Chat IA" qui ouvre une interface
                    pour poser des questions sur l'article.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-300 font-bold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">🤖 Exemples de questions</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>• "Peux-tu me résumer cet article en 3 points clés ?"</p>
                    <p>• "Quelles sont les principales contributions de cette recherche ?"</p>
                    <p>• "Explique-moi la méthodologie utilisée"</p>
                    <p>• "Quelles sont les limites de cette étude ?"</p>
                    <p>• "Comment cette recherche se compare-t-elle aux travaux précédents ?"</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-blue-200 dark:border-gray-600">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">💡</span>
                  <h5 className="font-medium text-gray-900 dark:text-gray-100">Conseils pour de meilleurs résultats</h5>
                </div>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-6">
                  <li>• Soyez spécifique dans vos questions</li>
                  <li>• Demandez des clarifications si nécessaire</li>
                  <li>• L'IA a accès à tout le contenu du PDF</li>
                  <li>• Vous pouvez poser des questions de suivi</li>
                  <li>• Utilisez les résumés pour vous faire une idée générale avant d'approfondir</li>
                </ul>
              </div>

              <div className="bg-yellow-50 dark:bg-gray-700 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">⚠️</span>
                  <h5 className="font-medium text-yellow-800 dark:text-yellow-400">Limitations importantes</h5>
                </div>
                <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1 ml-6">
                  <li>• L'IA peut parfois faire des erreurs d'interprétation</li>
                  <li>• Vérifiez toujours les informations critiques dans le PDF original</li>
                  <li>• Les réponses dépendent de la qualité de l'extraction du texte</li>
                  <li>• L'IA n'a pas accès à des informations externes à l'article</li>
                </ul>
              </div>

              <div className="text-center pt-4">
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  L'interface de chat IA sera bientôt disponible dans les pages d'articles ! 🚀
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                  Modèle actuel : {installedModels.length > 0 ? installedModels[0].name : 'Aucun'} |
                  Statut : {ollamaStatus.running ? '🟢 Actif' : '🔴 Arrêté'}
                </p>
              </div>
            </div>
          </div>
          </div>
        )}
        </div>
      )}
    </div>
  );

  const renderColorPicker = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Couleur</label>
      <div className="grid grid-cols-6 gap-2 mb-3">
        {predefinedColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setTagColor(color)}
            className={`w-8 h-8 rounded-full border-2 ${
              tagColor === color ? 'border-gray-800 dark:border-gray-300' : 'border-gray-300 dark:border-gray-700'
            } transition-all hover:scale-110`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <input
        type="color"
        value={tagColor}
        onChange={(e) => setTagColor(e.target.value)}
        className="w-full h-10 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
      />
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar stats={emptyStats} />

      <div className="flex-1 flex flex-col">
        {/* Simple header for Settings page */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Paramètres</h1>
            <button
              onClick={goToHome}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <span>←</span>
              <span>Retour à l'accueil</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Settings Sidebar */}
          <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Paramètres</h2>
            </div>

            <nav className="p-4 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeSection === item.id
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {menuItems.find(item => item.id === activeSection)?.label}
                </h1>
              </div>

              {activeSection === 'general' && renderGeneralSettings()}
              {activeSection === 'tags' && renderTagsSettings()}
              {activeSection === 'collections' && renderCollectionsSettings()}
              {activeSection === 'ai' && renderAISettings()}
              {activeSection === 'integrations' && renderIntegrationsSettings()}
            </div>
          </div>
        </div>
      </div>

      {/* Create Tag Modal */}
      <Modal
        isOpen={showCreateTagModal}
        onClose={() => setShowCreateTagModal(false)}
        title="Créer un nouveau tag"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom du tag</label>
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Entrez le nom du tag"
              autoFocus
            />
          </div>

          {renderColorPicker()}

          <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: tagColor }}
            ></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Aperçu: </span>
            <span
              className="px-2 py-1 text-xs rounded-full text-white"
              style={{ backgroundColor: tagColor }}
            >
              {tagName || 'Nom du tag'}
            </span>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowCreateTagModal(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Annuler
            </button>
            <button
              onClick={handleCreateTag}
              disabled={!tagName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Créer
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Tag Modal */}
      <Modal
        isOpen={showEditTagModal}
        onClose={() => setShowEditTagModal(false)}
        title="Modifier le tag"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom du tag</label>
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Entrez le nom du tag"
              autoFocus
            />
          </div>

          {renderColorPicker()}

          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: tagColor }}
            ></div>
            <span className="text-sm text-gray-700">Aperçu: </span>
            <span
              className="px-2 py-1 text-xs rounded-full text-white"
              style={{ backgroundColor: tagColor }}
            >
              {tagName || 'Nom du tag'}
            </span>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowEditTagModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
            <button
              onClick={handleEditTag}
              disabled={!tagName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Modifier
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Tag Modal */}
      <Modal
        isOpen={showDeleteTagModal}
        onClose={() => setShowDeleteTagModal(false)}
        title="Supprimer le tag"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Êtes-vous sûr de vouloir supprimer le tag{' '}
            <span className="font-medium">"{selectedTag?.name}"</span> ?
          </p>

          {selectedTag && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-gray-800 rounded-lg">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedTag.color }}
              ></div>
              <span
                className="px-2 py-1 text-xs rounded-full text-white"
                style={{ backgroundColor: selectedTag.color }}
              >
                {selectedTag.name}
              </span>
            </div>
          )}

          <p className="text-sm text-red-600 dark:text-red-400">
            ⚠️ Cette action est irréversible. Le tag sera retiré de tous les articles associés.
          </p>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowDeleteTagModal(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Annuler
            </button>
            <button
              onClick={handleDeleteTag}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Supprimer
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Collection Modal */}
      <Modal
        isOpen={showDeleteCollectionModal}
        onClose={() => setShowDeleteCollectionModal(false)}
        title="Supprimer la collection"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Êtes-vous sûr de vouloir supprimer la collection{' '}
            <span className="font-medium">"{selectedCollection?.name}"</span> ?
          </p>

          {selectedCollection && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-gray-800 rounded-lg">
              <span className="text-xl">📁</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedCollection.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                ({selectedCollection.count || 0} article{(selectedCollection.count || 0) !== 1 ? 's' : ''})
              </span>
            </div>
          )}

          <p className="text-sm text-red-600 dark:text-red-400">
            ⚠️ Cette action est irréversible. Les articles ne seront pas supprimés, seulement retirés de cette collection.
          </p>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowDeleteCollectionModal(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Annuler
            </button>
            <button
              onClick={handleDeleteCollection}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Supprimer
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset Database Modal */}
      <Modal
        isOpen={showResetDatabaseModal}
        onClose={() => setShowResetDatabaseModal(false)}
        title="⚠️ Réinitialiser la base de données"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-400 font-medium mb-2">
              ⚠️ ATTENTION : Cette action est irréversible !
            </p>
            <p className="text-red-700 dark:text-red-400 text-sm">
              Vous êtes sur le point de supprimer définitivement :
            </p>
            <ul className="text-red-700 dark:text-red-400 text-sm mt-2 ml-4 space-y-1">
              <li>• Tous les articles de recherche</li>
              <li>• Toutes les catégories et tags</li>
              <li>• Toutes les données associées</li>
              <li>• Tous les fichiers PDF et images</li>
            </ul>
            <p className="text-red-700 dark:text-red-400 text-sm mt-2 font-medium">
              Cette action ne peut pas être annulée.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pour confirmer, tapez "RESET" dans le champ ci-dessous :
            </label>
            <input
              type="text"
              value={resetConfirmationText}
              onChange={(e) => setResetConfirmationText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Tapez RESET pour confirmer"
              autoFocus
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowResetDatabaseModal(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              onClick={handleResetDatabase}
              disabled={resetConfirmationText !== 'RESET' || isLoading}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Réinitialisation...' : 'Réinitialiser définitivement'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Model Search Modal */}
      <Modal
        isOpen={showModelSearch}
        onClose={() => setShowModelSearch(false)}
        title="🔍 Rechercher des modèles LLM"
      >
        <div className="space-y-4 max-h-96 flex flex-col">
          {/* Barre de recherche */}
          <div className="sticky top-0 bg-white dark:bg-gray-800">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearchInputChange(e.target.value);
              }}
              placeholder="Rechercher par nom, description, ou catégorie..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              autoFocus
            />
            {isSearching && (
              <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">Recherche en cours...</div>
            )}
          </div>

          {/* Résultats de recherche */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {searchResults.length === 0 && !isSearching ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-500">
                <p>Aucun modèle trouvé</p>
                <p className="text-sm mt-1">Essayez avec d'autres termes de recherche</p>
              </div>
            ) : (
              searchResults.map((model) => {
                const isInstalled = installedModels.some(installed => installed.name === model.name);
                const isDownloading = downloadingModel === model.name;

                // Couleurs par catégorie
                const categoryColors: { [key: string]: string } = {
                  'LLaMA': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
                  'Mistral': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
                  'Phi': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
                  'Qwen': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
                  'Code': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
                  'Gemma': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
                  'Vision': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
                  'Embedding': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
                  'Chat': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
                  'Uncensored': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
                  'Reasoning': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
                  'Dolphin': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
                };

                return (
                  <div key={model.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`w-3 h-3 rounded-full ${
                            isInstalled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}></div>
                          <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                            <span>{model.name}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              categoryColors[model.category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {model.category}
                            </span>
                            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                              {model.params}
                            </span>
                          </h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{model.description}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-400">Taille: {model.size}</p>
                      </div>

                      <div className="ml-4 flex items-center space-x-2">
                        {isInstalled ? (
                          <>
                            <button
                              onClick={() => {
                                handleTestModel(model.name);
                                setShowModelSearch(false);
                              }}
                              disabled={isLoadingAI}
                              className="px-3 py-1 text-xs text-green-600 hover:bg-green-50 rounded border border-green-200"
                            >
                              Tester
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteModel(model.name);
                                setShowModelSearch(false);
                              }}
                              disabled={isLoadingAI}
                              className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200"
                            >
                              Supprimer
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              handleDownloadModel(model.name);
                              setShowModelSearch(false);
                            }}
                            disabled={isDownloading || isLoadingAI}
                            className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            {isDownloading ? 'Téléchargement...' : 'Télécharger'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer avec statistiques */}
          {searchResults.length > 0 && (
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-sm text-gray-500 dark:text-gray-500 text-center">
                {searchResults.length} modèle(s) trouvé(s)
                {searchQuery && ` pour "${searchQuery}"`}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Settings;