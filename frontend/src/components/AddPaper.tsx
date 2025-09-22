import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Link, Loader2, Plus, X } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { paperService } from '../services/paperService';
import { DOIMetadata, Tag } from '../types/Paper';

const AddPaper: React.FC = () => {
  const { goToHome } = useNavigation();
  const [activeTab, setActiveTab] = useState<'doi' | 'pdf'>('doi');
  const [doi, setDoi] = useState('');
  const [metadata, setMetadata] = useState<DOIMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingPDF, setIsUploadingPDF] = useState(false);
  const [pdfMetadata, setPdfMetadata] = useState<any>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [readingStatus, setReadingStatus] = useState<'unread' | 'reading' | 'read'>('unread');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [extractedImages, setExtractedImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedCoverFromExtracted, setSelectedCoverFromExtracted] = useState<string | null>(null);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const tags = await paperService.getTags();
      setAvailableTags(tags);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setIsCreatingTag(true);
    try {
      const newTag = await paperService.createTag(newTagName.trim());
      setAvailableTags([...availableTags, newTag]);
      setSelectedTags([...selectedTags, newTag]);
      setNewTagName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du tag');
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleTagSelect = (tag: Tag) => {
    if (!selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleTagRemove = (tagId: number) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId));
  };

  const handleImageSelect = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Veuillez sélectionner une image (JPEG, PNG, GIF, WebP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError('L\'image est trop volumineuse (max 10MB)');
      return;
    }

    setCoverImage(file);

    // Créer une preview de l'image
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setError(null);
  };

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleRemoveImage = () => {
    setCoverImage(null);
    setCoverImagePreview(null);
  };

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }
    if (file.size > 50 * 1024 * 1024) { // 50MB
      setError('Le fichier est trop volumineux (max 50MB)');
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  const handleFileInputClick = () => {
    document.getElementById('pdf-file-input')?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');

    if (pdfFile) {
      handleFileSelect(pdfFile);
    } else {
      setError('Veuillez déposer un fichier PDF');
    }
  };

  const handleUploadPDF = async () => {
    if (!selectedFile) return;

    setIsUploadingPDF(true);
    setError(null);

    try {
      console.log('Uploading PDF file:', selectedFile.name);
      const result = await paperService.uploadPDF(selectedFile);
      setPdfMetadata(result);
      console.log('PDF upload result:', result);

      // Si on a des métadonnées extraites, les utiliser
      if (result.metadata) {
        console.log('Metadata found:', result.metadata);
        // Les métadonnées sont déjà au bon format (récupérées via CrossRef si DOI trouvé)
        setMetadata(result.metadata);

        // Afficher un message sur le DOI extrait
        if (result.extractedDoi) {
          console.log('DOI extrait du PDF:', result.extractedDoi);
        }
      } else {
        console.log('No metadata found in result');
        // Pour test : créer des métadonnées de démonstration
        const testMetadata: DOIMetadata = {
          title: `Article extrait de ${selectedFile.name}`,
          authors: 'Auteurs à déterminer',
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          journal: 'Journal à déterminer',
          journal_short: 'JTD',
          abstract: 'Résumé à compléter après extraction des métadonnées du PDF.',
          doi: '',
          url: ''
        };
        setMetadata(testMetadata);
        setError('Métadonnées de test créées. Le script d\'extraction DOI doit être vérifié.');
      }

      // Gérer les images extraites
      console.log('=== DEBUG IMAGES ===');
      console.log('Result complet:', result);
      console.log('result.images:', result.images);
      console.log('Type de result.images:', typeof result.images);
      console.log('result.images.images:', result.images?.images);
      console.log('Type de result.images.images:', typeof result.images?.images);
      console.log('Array.isArray(result.images.images):', Array.isArray(result.images?.images));

      if (result.images && result.images.images && Array.isArray(result.images.images)) {
        console.log('✅ Images extraites trouvées:', result.images.images);
        setExtractedImages(result.images.images);
        // Sélectionner toutes les images par défaut
        setSelectedImages(result.images.images);
      } else {
        console.log('❌ Aucune image extraite trouvée', result.images);
        setExtractedImages([]);
        setSelectedImages([]);
      }
    } catch (err) {
      console.error('PDF upload error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement du PDF');
    } finally {
      setIsUploadingPDF(false);
    }
  };

  const handleAddPaper = async () => {
    if (!metadata) return;

    setIsLoading(true);
    setError(null);

    try {
      // Construire la date de publication
      const publicationDate = metadata.month
        ? `${metadata.year}-${metadata.month.toString().padStart(2, '0')}-01`
        : `${metadata.year}-01-01`;

      // Créer les données du paper
      const paperData = {
        title: metadata.title,
        authors: metadata.authors,
        publication_date: publicationDate,
        conference: metadata.journal,
        conference_short: metadata.journal_short || '',
        reading_status: readingStatus,
        is_favorite: isFavorite ? 1 : 0,
        year: metadata.year,
        month: metadata.month,
        doi: metadata.doi,
        url: metadata.url || '',
        categories: [], // TODO: ajouter gestion des catégories si nécessaire
        tags: selectedTags.map(tag => tag.name)
      };

      // Créer l'article
      const newPaper = await paperService.createPaper(paperData);

      // Si nous avons un PDF à sauvegarder avec des images extraites
      if (pdfMetadata?.filePath && (selectedImages.length > 0 || selectedCoverFromExtracted)) {
        try {
          const savePdfData = {
            pdfPath: pdfMetadata.filePath,
            selectedImages: selectedImages,
            coverImagePath: selectedCoverFromExtracted || undefined
          };
          await paperService.savePdfAssets(newPaper.id, savePdfData);
          console.log('PDF et images sauvegardés avec succès');
        } catch (pdfError) {
          console.error('Erreur lors de la sauvegarde du PDF et des images:', pdfError);
          // Continue même si la sauvegarde échoue
        }
      }

      // Uploader l'image de couverture si sélectionnée manuellement (et pas d'image extraite sélectionnée)
      if (coverImage && !selectedCoverFromExtracted) {
        try {
          await paperService.uploadCoverImage(newPaper.id, coverImage);
        } catch (imageError) {
          console.error('Error uploading cover image:', imageError);
          // Continue même si l'upload d'image échoue
        }
      }

      // Associer les tags
      for (const tag of selectedTags) {
        await paperService.addTagToPaper(newPaper.id, tag.id);
      }

      // Rediriger vers l'accueil ou afficher un message de succès
      goToHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout de l\'article');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchMetadata = async () => {
    if (!doi.trim()) {
      setError('Veuillez saisir un DOI');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await paperService.fetchDOIMetadata(doi.trim());
      setMetadata(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la récupération des métadonnées');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    {
      id: 'doi' as const,
      label: 'Ajouter par DOI',
      icon: Link,
      description: 'Récupérer automatiquement les métadonnées',
    },
    {
      id: 'pdf' as const,
      label: 'Télécharger PDF',
      icon: Upload,
      description: 'Extraire DOI et images du PDF',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={goToHome}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Ajouter un article
              </h1>
              <p className="text-sm text-gray-500">
                Importez un article scientifique par DOI ou en téléchargeant un PDF
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 py-4 border-b-2 font-medium text-sm
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h3>
              <p className="text-gray-600">
                {tabs.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>

            {activeTab === 'doi' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    DOI de l'article
                  </label>
                  <input
                    type="text"
                    value={doi}
                    onChange={(e) => setDoi(e.target.value)}
                    placeholder="10.1000/182"
                    className="input-field w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Exemple: 10.48550/arXiv.1706.03762
                  </p>
                </div>

                <button
                  onClick={handleFetchMetadata}
                  disabled={isLoading || !doi.trim()}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {isLoading ? 'Récupération...' : 'Récupérer les métadonnées'}
                  </span>
                </button>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                {metadata && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-green-800 mb-4">
                      Métadonnées récupérées
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Titre:</span>
                        <p className="text-gray-900 mt-1">{metadata.title}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Auteurs:</span>
                        <p className="text-gray-900 mt-1">{metadata.authors}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Journal:</span>
                        <p className="text-gray-900 mt-1">
                          {metadata.journal}
                          {metadata.journal_short && (
                            <span className="text-gray-500 ml-2">({metadata.journal_short})</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Date:</span>
                        <p className="text-gray-900 mt-1">
                          {metadata.month ? `${metadata.month}/${metadata.year}` : metadata.year}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">DOI:</span>
                        <p className="text-gray-900 mt-1">{metadata.doi}</p>
                      </div>
                      {metadata.url && (
                        <div>
                          <span className="font-medium text-gray-700">URL:</span>
                          <a href={metadata.url} target="_blank" rel="noopener noreferrer"
                             className="text-blue-600 hover:underline mt-1 block">
                            Voir l'article
                          </a>
                        </div>
                      )}
                      {metadata.abstract && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-700">Résumé:</span>
                          <p className="text-gray-900 mt-1 text-justify leading-relaxed">{metadata.abstract}</p>
                        </div>
                      )}
                    </div>

                    {/* Section Tags */}
                    <div className="mt-6 pt-4 border-t border-green-200">
                      <h5 className="text-md font-medium text-green-800 mb-3">Tags</h5>

                      {/* Tags sélectionnés */}
                      {selectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {selectedTags.map(tag => (
                            <span key={tag.id}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              {tag.name}
                              <button
                                onClick={() => handleTagRemove(tag.id)}
                                className="ml-1 text-blue-600 hover:text-blue-800"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Sélection de tags existants */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sélectionner des tags existants
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {availableTags
                            .filter(tag => !selectedTags.find(st => st.id === tag.id))
                            .map(tag => (
                              <button
                                key={tag.id}
                                onClick={() => handleTagSelect(tag)}
                                className="px-3 py-1 rounded-full text-sm border border-gray-300 hover:bg-gray-50 transition-colors"
                                style={{ borderColor: tag.color, color: tag.color }}
                              >
                                {tag.name}
                              </button>
                            ))}
                        </div>
                      </div>

                      {/* Création d'un nouveau tag */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          placeholder="Nouveau tag..."
                          className="flex-1 input-field text-sm"
                          onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                        />
                        <button
                          onClick={handleCreateTag}
                          disabled={!newTagName.trim() || isCreatingTag}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {isCreatingTag ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Section Image de couverture */}
                    <div className="mt-6 pt-4 border-t border-green-200">
                      <h5 className="text-md font-medium text-green-800 mb-3">Image de couverture (optionnel)</h5>

                      {(coverImagePreview || selectedCoverFromExtracted) ? (
                        <div className="flex items-start space-x-4">
                          <div className="w-32 h-40 bg-gray-100 rounded-lg overflow-hidden border shadow-sm">
                            <img
                              src={selectedCoverFromExtracted ? `/${selectedCoverFromExtracted}` : coverImagePreview}
                              alt="Aperçu de la couverture"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 mb-2">
                              {selectedCoverFromExtracted ? (
                                <span>Image de couverture: <span className="font-medium text-green-700">Extraite du PDF</span></span>
                              ) : (
                                <span>Image sélectionnée: <span className="font-medium">{coverImage?.name}</span></span>
                              )}
                            </p>
                            <div className="space-y-2">
                              <button
                                onClick={() => {
                                  if (selectedCoverFromExtracted) {
                                    setSelectedCoverFromExtracted(null);
                                  } else {
                                    handleRemoveImage();
                                  }
                                  setCoverImagePreview(null);
                                }}
                                className="text-sm text-red-600 hover:text-red-800 flex items-center space-x-1"
                              >
                                <X className="w-4 h-4" />
                                <span>Annuler cette image</span>
                              </button>
                              <label className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageInputChange}
                                  className="hidden"
                                />
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Importer une autre image</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600 mb-2">
                            Ajoutez une image de couverture pour votre article
                          </p>
                          <button
                            onClick={() => document.getElementById('cover-image-input')?.click()}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Choisir une image
                          </button>
                          <p className="text-xs text-gray-500 mt-2">
                            JPG, PNG, GIF, WebP • Max 10MB
                          </p>
                        </div>
                      )}

                      <input
                        id="cover-image-input"
                        type="file"
                        accept="image/*"
                        onChange={handleImageInputChange}
                        className="hidden"
                      />
                    </div>

                    {/* Section Statut et Favoris */}
                    <div className="mt-6 space-y-4">
                      {/* Statut de lecture */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Statut de lecture
                        </label>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setReadingStatus('unread')}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                              readingStatus === 'unread'
                                ? 'bg-gray-500 text-white border-gray-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            Non lu
                          </button>
                          <button
                            type="button"
                            onClick={() => setReadingStatus('reading')}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                              readingStatus === 'reading'
                                ? 'bg-yellow-500 text-white border-yellow-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            En cours
                          </button>
                          <button
                            type="button"
                            onClick={() => setReadingStatus('read')}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                              readingStatus === 'read'
                                ? 'bg-green-500 text-white border-green-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            Lu
                          </button>
                        </div>
                      </div>

                      {/* Favori */}
                      <div>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isFavorite}
                            onChange={(e) => setIsFavorite(e.target.checked)}
                            className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Marquer comme favori
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-green-200">
                      <button
                        onClick={handleAddPaper}
                        disabled={isLoading}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>
                          {isLoading ? 'Ajout en cours...' : 'Ajouter cet article'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pdf' && (
              <div className="space-y-6">
                {/* Zone de téléchargement */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragging
                      ? 'border-blue-400 bg-blue-50'
                      : selectedFile
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleFileInputClick}
                >
                  <Upload className={`w-12 h-12 mx-auto mb-4 ${
                    selectedFile ? 'text-green-500' : 'text-gray-400'
                  }`} />

                  {selectedFile ? (
                    <>
                      <h4 className="text-lg font-medium text-green-800 mb-2">
                        Fichier sélectionné
                      </h4>
                      <p className="text-green-600 mb-4">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-green-500 mb-4">
                        Taille: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setPdfMetadata(null);
                          setMetadata(null);
                        }}
                        className="btn-secondary mr-3"
                      >
                        Changer de fichier
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUploadPDF();
                        }}
                        disabled={isUploadingPDF}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 inline-flex"
                      >
                        {isUploadingPDF && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>
                          {isUploadingPDF ? 'Traitement...' : 'Traiter le PDF'}
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Télécharger un fichier PDF
                      </h4>
                      <p className="text-gray-500 mb-4">
                        {isDragging
                          ? 'Déposez votre fichier PDF ici'
                          : 'Glissez-déposez votre fichier PDF ici ou cliquez pour parcourir'
                        }
                      </p>
                      <button className="btn-secondary">
                        Choisir un fichier
                      </button>
                      <p className="mt-2 text-xs text-gray-500">
                        Taille maximum: 50MB
                      </p>
                    </>
                  )}
                </div>

                {/* Input file caché */}
                <input
                  id="pdf-file-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {/* Affichage des métadonnées extraites (même interface que DOI) */}
                {metadata && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-green-800">
                        Métadonnées récupérées
                      </h4>
                      {pdfMetadata?.extractedDoi && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          DOI trouvé: {pdfMetadata.extractedDoi}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Titre:</span>
                        <p className="text-gray-900 mt-1">{metadata.title}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Auteurs:</span>
                        <p className="text-gray-900 mt-1">{metadata.authors}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Journal:</span>
                        <p className="text-gray-900 mt-1">
                          {metadata.journal}
                          {metadata.journal_short && (
                            <span className="text-gray-500 ml-2">({metadata.journal_short})</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Date:</span>
                        <p className="text-gray-900 mt-1">
                          {metadata.month ? `${metadata.month}/${metadata.year}` : metadata.year}
                        </p>
                      </div>
                      {metadata.doi && (
                        <div>
                          <span className="font-medium text-gray-700">DOI:</span>
                          <p className="text-gray-900 mt-1">{metadata.doi}</p>
                        </div>
                      )}
                      {metadata.url && (
                        <div>
                          <span className="font-medium text-gray-700">URL:</span>
                          <a href={metadata.url} target="_blank" rel="noopener noreferrer"
                             className="text-blue-600 hover:underline mt-1 block">
                            Voir l'article
                          </a>
                        </div>
                      )}
                      {metadata.abstract && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-700">Résumé:</span>
                          <p className="text-gray-900 mt-1 text-justify leading-relaxed">{metadata.abstract}</p>
                        </div>
                      )}
                    </div>

                    {/* Section Tags (identique à l'onglet DOI) */}
                    <div className="mt-6 pt-4 border-t border-green-200">
                      <h5 className="text-md font-medium text-green-800 mb-3">Tags</h5>

                      {/* Tags sélectionnés */}
                      {selectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {selectedTags.map(tag => (
                            <span key={tag.id}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              {tag.name}
                              <button
                                onClick={() => handleTagRemove(tag.id)}
                                className="ml-1 text-blue-600 hover:text-blue-800"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Sélection de tags existants */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sélectionner des tags existants
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {availableTags
                            .filter(tag => !selectedTags.find(st => st.id === tag.id))
                            .map(tag => (
                              <button
                                key={tag.id}
                                onClick={() => handleTagSelect(tag)}
                                className="px-3 py-1 rounded-full text-sm border border-gray-300 hover:bg-gray-50 transition-colors"
                                style={{ borderColor: tag.color, color: tag.color }}
                              >
                                {tag.name}
                              </button>
                            ))}
                        </div>
                      </div>

                      {/* Création d'un nouveau tag */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          placeholder="Nouveau tag..."
                          className="flex-1 input-field text-sm"
                          onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                        />
                        <button
                          onClick={handleCreateTag}
                          disabled={!newTagName.trim() || isCreatingTag}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {isCreatingTag ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Section Images extraites du PDF */}
                    {extractedImages.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-green-200">
                        <h5 className="text-md font-medium text-green-800 mb-3">
                          Images extraites du PDF ({extractedImages.length})
                        </h5>
                        <p className="text-sm text-gray-600 mb-4">
                          Sélectionnez les images que vous souhaitez sauvegarder et choisissez une image de couverture.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {extractedImages.map((imagePath, index) => (
                            <div key={index} className="relative group">
                              <div
                                className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer transform hover:scale-105 hover:shadow-lg"
                                style={{
                                  borderColor: selectedImages.includes(imagePath) ? '#3B82F6' : '#E5E7EB',
                                  boxShadow: selectedImages.includes(imagePath) ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none'
                                }}
                                onClick={() => {
                                  if (selectedImages.includes(imagePath)) {
                                    // Déselectionner l'image
                                    setSelectedImages(selectedImages.filter(img => img !== imagePath));
                                    // Si c'était la couverture sélectionnée, la déselectionner et mettre à jour l'aperçu
                                    if (selectedCoverFromExtracted === imagePath) {
                                      setSelectedCoverFromExtracted(null);
                                      setCoverImagePreview(null);
                                    }
                                  } else {
                                    // Sélectionner l'image
                                    setSelectedImages([...selectedImages, imagePath]);
                                  }
                                }}
                              >
                                <img
                                  src={`/${imagePath}`}
                                  alt={`Image extraite ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />

                                {/* Overlay avec effet de sélection */}
                                <div className={`absolute inset-0 transition-all duration-200 ${
                                  selectedImages.includes(imagePath)
                                    ? 'bg-blue-500 bg-opacity-20'
                                    : 'bg-black bg-opacity-0 hover:bg-opacity-10'
                                }`}>
                                  {/* Bouton pour définir comme couverture - visible seulement si l'image est sélectionnée */}
                                  {selectedImages.includes(imagePath) && (
                                    <div className="absolute bottom-2 left-2 right-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedCoverFromExtracted(imagePath);
                                          setCoverImagePreview(`/${imagePath}`);
                                          setCoverImage(null);
                                        }}
                                        className={`w-full px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                                          selectedCoverFromExtracted === imagePath
                                            ? 'bg-green-600 text-white'
                                            : 'bg-white text-gray-800 hover:bg-gray-100 shadow-sm'
                                        }`}
                                      >
                                        {selectedCoverFromExtracted === imagePath ? '⭐ Couverture' : 'Définir comme couverture'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Indicateurs visuels améliorés */}
                              <div className="absolute top-2 left-2 space-y-1">
                                {selectedImages.includes(imagePath) && (
                                  <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                                {selectedCoverFromExtracted === imagePath && (
                                  <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  </div>
                                )}
                              </div>

                              <p className="text-xs text-gray-500 mt-2 text-center font-medium">
                                Image {index + 1}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Actions globales */}
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => setSelectedImages(extractedImages)}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
                          >
                            Tout sélectionner
                          </button>
                          <button
                            onClick={() => {
                              setSelectedImages([]);
                              setSelectedCoverFromExtracted(null);
                            }}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
                          >
                            Tout désélectionner
                          </button>
                        </div>

                        {selectedImages.length > 0 && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                              {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} sélectionnée{selectedImages.length > 1 ? 's' : ''} pour sauvegarde
                              {selectedCoverFromExtracted && (
                                <span className="ml-2 text-green-700">
                                  • Image {extractedImages.indexOf(selectedCoverFromExtracted) + 1} définie comme couverture
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Section Image de couverture */}
                    <div className="mt-6 pt-4 border-t border-green-200">
                      <h5 className="text-md font-medium text-green-800 mb-3">Image de couverture (optionnel)</h5>

                      {(coverImagePreview || selectedCoverFromExtracted) ? (
                        <div className="flex items-start space-x-4">
                          <div className="w-32 h-40 bg-gray-100 rounded-lg overflow-hidden border shadow-sm">
                            <img
                              src={selectedCoverFromExtracted ? `/${selectedCoverFromExtracted}` : coverImagePreview}
                              alt="Aperçu de la couverture"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 mb-2">
                              {selectedCoverFromExtracted ? (
                                <span>Image de couverture: <span className="font-medium text-green-700">Extraite du PDF</span></span>
                              ) : (
                                <span>Image sélectionnée: <span className="font-medium">{coverImage?.name}</span></span>
                              )}
                            </p>
                            <div className="space-y-2">
                              <button
                                onClick={() => {
                                  if (selectedCoverFromExtracted) {
                                    setSelectedCoverFromExtracted(null);
                                  } else {
                                    handleRemoveImage();
                                  }
                                  setCoverImagePreview(null);
                                }}
                                className="text-sm text-red-600 hover:text-red-800 flex items-center space-x-1"
                              >
                                <X className="w-4 h-4" />
                                <span>Annuler cette image</span>
                              </button>
                              <label className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageInputChange}
                                  className="hidden"
                                />
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Importer une autre image</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600 mb-2">
                            Ajoutez une image de couverture pour votre article
                          </p>
                          <button
                            onClick={() => document.getElementById('cover-image-input')?.click()}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Choisir une image
                          </button>
                          <p className="text-xs text-gray-500 mt-2">
                            JPG, PNG, GIF, WebP • Max 10MB
                          </p>
                        </div>
                      )}

                      <input
                        id="cover-image-input"
                        type="file"
                        accept="image/*"
                        onChange={handleImageInputChange}
                        className="hidden"
                      />
                    </div>

                    {/* Section Statut et Favoris */}
                    <div className="mt-6 space-y-4">
                      {/* Statut de lecture */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Statut de lecture
                        </label>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setReadingStatus('unread')}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                              readingStatus === 'unread'
                                ? 'bg-gray-500 text-white border-gray-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            Non lu
                          </button>
                          <button
                            type="button"
                            onClick={() => setReadingStatus('reading')}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                              readingStatus === 'reading'
                                ? 'bg-yellow-500 text-white border-yellow-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            En cours
                          </button>
                          <button
                            type="button"
                            onClick={() => setReadingStatus('read')}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                              readingStatus === 'read'
                                ? 'bg-green-500 text-white border-green-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            Lu
                          </button>
                        </div>
                      </div>

                      {/* Favori */}
                      <div>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isFavorite}
                            onChange={(e) => setIsFavorite(e.target.checked)}
                            className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Marquer comme favori
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-green-200">
                      <button
                        onClick={handleAddPaper}
                        disabled={isLoading}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>
                          {isLoading ? 'Ajout en cours...' : 'Ajouter cet article'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPaper;