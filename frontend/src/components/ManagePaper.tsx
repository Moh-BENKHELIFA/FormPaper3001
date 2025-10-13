import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Link, Loader2, Plus, X, Save, Settings, FileText, ExternalLink, Eye, Trash2, ZoomIn, Image } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { useToast } from '../contexts/ToastContext';
import { paperService } from '../services/paperService';
import { DOIMetadata, Tag, Paper } from '../types/Paper';

interface ManagePaperProps {
  paperId: number;
}

const ManagePaper: React.FC<ManagePaperProps> = ({ paperId }) => {
  const { goToHome } = useNavigation();
  const { success: showSuccess, error: showError } = useToast();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingPDF, setIsUploadingPDF] = useState(false);
  const [existingPDF, setExistingPDF] = useState<string | null>(null);
  const [savedImages, setSavedImages] = useState<Array<{ filename: string; url: string; path: string }>>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [extractedImages, setExtractedImages] = useState<string[]>([]);
  const [isLoadingExtractedImages, setIsLoadingExtractedImages] = useState(false);
  const [selectedSavedImages, setSelectedSavedImages] = useState<Set<string>>(new Set());
  const [imagesToDelete, setImagesToDelete] = useState<Set<string>>(new Set());
  const [selectedExtractedImages, setSelectedExtractedImages] = useState<Set<string>>(new Set());
  const [isExtractingImages, setIsExtractingImages] = useState(false);
  const [isCopyingImages, setIsCopyingImages] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    conference: '',
    conference_short: '',
    year: new Date().getFullYear(),
    month: '',
    abstract: '',
    doi: '',
    url: '',
    reading_status: 'unread' as Paper['reading_status'],
    is_favorite: false,
    category_id: null as number | null,
    image: null as string | null,
  });

  useEffect(() => {
    loadPaper();
    loadTags();
  }, [paperId]);

  const loadPaper = async () => {
    try {
      setIsLoading(true);
      const paperData = await paperService.getPaper(paperId);
      setPaper(paperData);

      // Populate form data
      setFormData({
        title: paperData.title || '',
        authors: paperData.authors || '',
        conference: paperData.conference || '',
        conference_short: paperData.conference_short || '',
        year: paperData.year || new Date().getFullYear(),
        month: paperData.month || '',
        abstract: paperData.abstract || '',
        doi: paperData.doi || '',
        url: paperData.url || '',
        reading_status: paperData.reading_status || 'unread',
        is_favorite: paperData.is_favorite || false,
        category_id: paperData.category_id || null,
        image: paperData.image || null,
      });

      // Load existing cover image
      if (paperData.image) {
        setCoverImagePreview(`/api/${paperData.image}`);
      }

      // Load paper tags
      const paperTags = await paperService.getPaperTags(paperId);
      setSelectedTags(paperTags);

      // Load saved images and check if PDF exists
      loadSavedImages();
      checkExistingPDF();

    } catch (err) {
      console.error('Failed to load paper:', err);
      setError(err instanceof Error ? err.message : 'Failed to load paper');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const tags = await paperService.getTags();
      setAvailableTags(tags);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  const loadSavedImages = async () => {
    try {
      setIsLoadingImages(true);
      const imagesData = await paperService.getPaperSavedImages(paperId);
      setSavedImages(imagesData.images);
    } catch (err) {
      console.error('Failed to load saved images:', err);
      setSavedImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const checkExistingPDF = async () => {
    try {
      const response = await fetch(`/api/papers/${paperId}/pdf`);
      if (response.ok) {
        setExistingPDF(`/api/papers/${paperId}/pdf`);
      } else {
        setExistingPDF(null);
      }
    } catch (err) {
      console.error('Failed to check existing PDF:', err);
      setExistingPDF(null);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setIsCreatingTag(true);
    try {
      const newTag = await paperService.createTag(newTagName.trim());
      setAvailableTags(prev => [...prev, newTag]);
      setNewTagName('');
      showSuccess('Tag créé avec succès');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erreur lors de la création du tag');
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleTagSelect = (tag: Tag) => {
    if (!selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const handleTagRemove = (tagId: number) => {
    setSelectedTags(prev => prev.filter(t => t.id !== tagId));
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onload = () => setCoverImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!paper) return;

    setIsSaving(true);
    try {
      // Update paper metadata
      await paperService.updatePaper(paperId, formData);

      // Update tags
      const currentTagIds = selectedTags.map(t => t.id);
      const originalTags = await paperService.getPaperTags(paperId);
      const originalTagIds = originalTags.map(t => t.id);

      // Remove tags that are no longer selected
      for (const tagId of originalTagIds) {
        if (!currentTagIds.includes(tagId)) {
          await paperService.removeTagFromPaper(paperId, tagId);
        }
      }

      // Add new tags
      for (const tagId of currentTagIds) {
        if (!originalTagIds.includes(tagId)) {
          await paperService.addTagToPaper(paperId, tagId);
        }
      }

      // Delete selected saved images first
      if (imagesToDelete.size > 0) {
        try {
          for (const filename of imagesToDelete) {
            await paperService.deleteSavedImage(paperId, filename);
          }
          showSuccess(`${imagesToDelete.size} image(s) supprimée(s)`);
          setImagesToDelete(new Set());
          await loadSavedImages();
        } catch (deleteError) {
          console.error('Error deleting images:', deleteError);
          showError('Erreur lors de la suppression des images');
        }
      }

      // Copy selected extracted images to saved_images
      if (selectedExtractedImages.size > 0) {
        try {
          const result = await paperService.copyImagesToSaved(paperId, Array.from(selectedExtractedImages));
          if (result.copiedCount > 0) {
            showSuccess(`${result.copiedCount} image(s) sauvegardée(s)`);
            // Clear extracted images after successful copy
            setExtractedImages([]);
            setSelectedExtractedImages(new Set());
            // Reload saved images to show the new ones
            await loadSavedImages();
          }
        } catch (imageError) {
          console.error('Error copying images:', imageError);
          showError('Erreur lors de la sauvegarde des images extraites');
        }
      }

      // Upload new PDF if provided
      if (selectedFile) {
        setIsUploadingPDF(true);
        try {
          const pdfResult = await paperService.uploadPDF(selectedFile);

          // Save PDF to paper folder (without cover image path for now)
          await paperService.savePdfAssets(paperId, {
            pdfPath: pdfResult.filePath,
            selectedImages: [], // No image selection in manage mode
          });

          // Recharger les images après l'upload du PDF
          await loadSavedImages();
          setExistingPDF(`/api/papers/${paperId}/pdf`);
          setSelectedFile(null); // Reset file selection

          showSuccess('PDF téléchargé et sauvegardé avec succès');
        } catch (pdfError) {
          console.error('Error uploading PDF:', pdfError);
          showError('Erreur lors du téléchargement du PDF');
        } finally {
          setIsUploadingPDF(false);
        }
      }

      // Upload new cover image if provided
      if (coverImage) {
        const newImagePath = await paperService.uploadCoverImage(paperId, coverImage);
        // Update formData to include the new image path
        const updatedFormData = { ...formData, image: newImagePath };
        await paperService.updatePaper(paperId, updatedFormData);
      }

      showSuccess('Article mis à jour avec succès');
      goToHome();

    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
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
      setSelectedFile(pdfFile);
    }
  };

  const handleExtractImages = async () => {
    if (!existingPDF) {
      showError('Aucun PDF trouvé pour extraire les images');
      return;
    }

    setIsExtractingImages(true);
    try {
      const result = await paperService.previewExtractImagesFromPDF(paperId);
      setExtractedImages(result.newImages);
      setSelectedExtractedImages(new Set()); // Reset selection
      showSuccess(`${result.newCount} nouvelles images trouvées`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erreur lors de l\'extraction des images');
    } finally {
      setIsExtractingImages(false);
    }
  };

  const handleToggleSavedImage = (filename: string) => {
    setSelectedSavedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filename)) {
        newSet.delete(filename);
      } else {
        newSet.add(filename);
      }
      return newSet;
    });
  };

  const handleToggleExtractedImage = (imagePath: string) => {
    const filename = imagePath.split('/').pop() || '';
    setSelectedExtractedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filename)) {
        newSet.delete(filename);
      } else {
        newSet.add(filename);
      }
      return newSet;
    });
  };

  const handleSelectAllSaved = () => {
    setSelectedSavedImages(new Set(savedImages.map(img => img.filename)));
  };

  const handleDeselectAllSaved = () => {
    setSelectedSavedImages(new Set());
  };

  const handleSelectAllExtracted = () => {
    const filenames = extractedImages.map(path => path.split('/').pop() || '');
    setSelectedExtractedImages(new Set(filenames));
  };

  const handleDeselectAllExtracted = () => {
    setSelectedExtractedImages(new Set());
  };

  const handleCopySelectedImages = async () => {
    if (selectedExtractedImages.size === 0) {
      showError('Aucune image sélectionnée');
      return;
    }

    setIsCopyingImages(true);
    try {
      const result = await paperService.copyImagesToSaved(paperId, Array.from(selectedExtractedImages));
      showSuccess(`${result.copiedCount} image(s) copiée(s) vers les images sauvegardées`);

      // Reload saved images and clear extracted images
      await loadSavedImages();
      setExtractedImages([]);
      setSelectedExtractedImages(new Set());

      if (result.errors.length > 0) {
        console.warn('Errors during copy:', result.errors);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erreur lors de la copie des images');
    } finally {
      setIsCopyingImages(false);
    }
  };

  const handleSetSavedImageAsCover = (imageUrl: string) => {
    setCoverImagePreview(imageUrl);
    handleInputChange('image', imageUrl.replace('/api/', ''));
    showSuccess('Image définie comme couverture (pensez à enregistrer)');
  };

  const handleSetExtractedImageAsCover = (imagePath: string) => {
    setCoverImagePreview(imagePath);
    showSuccess('Image définie comme couverture (pensez à enregistrer et copier l\'image)');
  };

  const handleToggleImageForDeletion = (filename: string) => {
    setImagesToDelete(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filename)) {
        newSet.delete(filename);
      } else {
        newSet.add(filename);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Article introuvable'}</p>
          <button
            onClick={goToHome}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={goToHome}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isUploadingPDF}
              className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(isSaving || isUploadingPDF) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isUploadingPDF ? 'Téléchargement PDF...' : isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Settings className="w-6 h-6 text-indigo-600" />
              Gérer l'article
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Modifiez les informations de l'article et gérez ses métadonnées
            </p>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Form Fields */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Titre *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Titre de l'article"
                  />
                </div>

                {/* Authors */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Auteurs
                  </label>
                  <input
                    type="text"
                    value={formData.authors}
                    onChange={(e) => handleInputChange('authors', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Nom des auteurs (séparés par des virgules)"
                  />
                </div>

                {/* Journal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Journal
                    </label>
                    <input
                      type="text"
                      value={formData.conference}
                      onChange={(e) => handleInputChange('conference', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Nom du journal/conférence"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Journal (abrégé)
                    </label>
                    <input
                      type="text"
                      value={formData.conference_short}
                      onChange={(e) => handleInputChange('conference_short', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Nom abrégé"
                    />
                  </div>
                </div>

                {/* Year and Month */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Année
                    </label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="2024"
                      min="1900"
                      max={new Date().getFullYear() + 10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mois
                    </label>
                    <input
                      type="number"
                      value={formData.month}
                      onChange={(e) => handleInputChange('month', e.target.value ? parseInt(e.target.value) : '')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="1-12"
                      min="1"
                      max="12"
                    />
                  </div>
                </div>

                {/* DOI */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    DOI
                  </label>
                  <input
                    type="text"
                    value={formData.doi}
                    onChange={(e) => handleInputChange('doi', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="10.1000/journal.example"
                  />
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => handleInputChange('url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="https://..."
                  />
                </div>

                {/* Abstract */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Résumé
                  </label>
                  <textarea
                    value={formData.abstract}
                    onChange={(e) => handleInputChange('abstract', e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Résumé de l'article..."
                  />
                </div>

                {/* Reading Status and Favorite */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Statut de lecture
                    </label>
                    <select
                      value={formData.reading_status}
                      onChange={(e) => handleInputChange('reading_status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="unread">Non lu</option>
                      <option value="reading">En cours de lecture</option>
                      <option value="read">Lu</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_favorite}
                        onChange={(e) => handleInputChange('is_favorite', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-700 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Article favori</span>
                    </label>
                  </div>
                </div>

                {/* Images Management Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                    Gestion des Images
                  </h3>

                  {/* Section 1: Saved Images (from saved_images folder) */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-400">
                        Images sauvegardées ({savedImages.length})
                      </span>
                    </div>

                    {isLoadingImages ? (
                      <div className="bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 justify-center">
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          <span className="text-sm text-blue-600 dark:text-blue-400">Chargement des images sauvegardées...</span>
                        </div>
                      </div>
                    ) : savedImages.length > 0 ? (
                      <div className="bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-3">
                          {savedImages.map((image, index) => {
                            const isMarkedForDeletion = imagesToDelete.has(image.filename);
                            return (
                              <div key={index} className="relative group">
                                <img
                                  src={image.url}
                                  alt={`Image sauvegardée ${index + 1}`}
                                  className={`w-full h-32 object-cover rounded border-2 cursor-pointer transition-all ${
                                    isMarkedForDeletion
                                      ? 'border-red-500 opacity-50 ring-2 ring-red-200'
                                      : 'border-gray-300 hover:border-blue-400'
                                  }`}
                                  onClick={() => handleToggleImageForDeletion(image.filename)}
                                />
                                <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-sm px-2 py-1 rounded pointer-events-none">
                                  {index + 1}
                                </div>
                                <div className="absolute top-2 right-2 flex gap-1 z-20">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(image.url, '_blank');
                                    }}
                                    className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600"
                                    title="Agrandir"
                                  >
                                    <ZoomIn className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSetSavedImageAsCover(image.url);
                                    }}
                                    className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-600"
                                    title="Définir comme couverture"
                                  >
                                    <Image className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleImageForDeletion(image.filename);
                                    }}
                                    className={`rounded-full w-6 h-6 flex items-center justify-center text-sm transition-all ${
                                      isMarkedForDeletion
                                        ? 'bg-red-600 text-white opacity-100'
                                        : 'bg-red-500 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600'
                                    }`}
                                    title={isMarkedForDeletion ? 'Annuler la suppression' : 'Marquer pour suppression'}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                {isMarkedForDeletion && (
                                  <div
                                    className="absolute inset-0 bg-red-500 bg-opacity-20 rounded border-2 border-red-500 flex items-center justify-center cursor-pointer pointer-events-none"
                                    title="Cliquer pour annuler la suppression"
                                  >
                                    <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
                                      <Trash2 className="w-4 h-4" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {imagesToDelete.size > 0 && (
                          <div className="mt-3 text-center text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            {imagesToDelete.size} image(s) marquée(s) pour suppression - elles seront supprimées lors de l'enregistrement
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <Eye className="w-5 h-5" />
                          <span className="text-sm">Aucune image sauvegardée</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Extract Images Button */}
                  {existingPDF && (
                    <div className="flex justify-center">
                      <button
                        onClick={handleExtractImages}
                        disabled={isExtractingImages}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isExtractingImages ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {isExtractingImages ? 'Extraction en cours...' : 'Extraire les images du PDF'}
                      </button>
                    </div>
                  )}

                  {/* Section 2: Newly Extracted Images */}
                  {extractedImages.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Plus className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-400">
                            Nouvelles images extraites ({extractedImages.length})
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={selectedExtractedImages.size === extractedImages.length ? handleDeselectAllExtracted : handleSelectAllExtracted}
                            className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                          >
                            {selectedExtractedImages.size === extractedImages.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                          </button>
                          {selectedExtractedImages.size > 0 && (
                            <span className="text-xs text-green-600 dark:text-green-400 self-center">
                              {selectedExtractedImages.size} sélectionnée(s)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-green-50 dark:bg-gray-700 border border-green-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          {extractedImages.map((imagePath, index) => {
                            const filename = imagePath.split('/').pop() || '';
                            const isSelected = selectedExtractedImages.has(filename);
                            return (
                              <div key={index} className="relative group">
                                <img
                                  src={imagePath}
                                  alt={`Nouvelle image ${index + 1}`}
                                  className={`w-full h-32 object-cover rounded border-2 cursor-pointer transition-all ${
                                    isSelected
                                      ? 'border-green-500 ring-2 ring-green-200'
                                      : 'border-transparent hover:border-green-400'
                                  }`}
                                  onClick={() => handleToggleExtractedImage(imagePath)}
                                />
                                <div className="absolute top-2 right-2 flex gap-1">
                                  {isSelected && (
                                    <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                                      ✓
                                    </div>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSetExtractedImageAsCover(imagePath);
                                    }}
                                    className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-600"
                                    title="Définir comme couverture"
                                  >
                                    <Image className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-sm px-2 py-1 rounded">
                                  {index + 1}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Info message about saving */}
                        {selectedExtractedImages.size > 0 && (
                          <div className="text-center text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            {selectedExtractedImages.size} image(s) sélectionnée(s) - elles seront sauvegardées lors de l'enregistrement
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Cover Image and Tags */}
            <div className="space-y-6">
              {/* Cover Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image de couverture
                </label>
                <div className="space-y-4">
                  {/* Current/Preview Image */}
                  {coverImagePreview && (
                    <div className="relative">
                      <img
                        src={coverImagePreview}
                        alt="Couverture"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => {
                          setCoverImagePreview(null);
                          setCoverImage(null);
                          // Update formData to remove image
                          setFormData(prev => ({ ...prev, image: null }));
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Upload button */}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                    className="hidden"
                    id="cover-upload"
                  />
                  <label
                    htmlFor="cover-upload"
                    className="block w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Upload className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {coverImagePreview ? 'Changer l\'image' : 'Ajouter une image de couverture'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Tags Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>

                {/* Selected Tags */}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedTags.map(tag => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
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

                {/* Available Tags */}
                <div className="mb-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tags disponibles</div>
                  <div className="flex flex-wrap gap-2">
                    {availableTags
                      .filter(tag => !selectedTags.find(st => st.id === tag.id))
                      .map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => handleTagSelect(tag)}
                          className="px-3 py-1 rounded-full text-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          style={{ borderColor: tag.color, color: tag.color }}
                        >
                          {tag.name}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Create New Tag */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nouveau tag"
                    className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                  />
                  <button
                    onClick={handleCreateTag}
                    disabled={isCreatingTag || !newTagName.trim()}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isCreatingTag ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* PDF Section */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fichier PDF
                </label>

                {/* Existing PDF */}
                {existingPDF && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-400">PDF existant</span>
                      </div>
                      <a
                        href={existingPDF}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ouvrir
                      </a>
                    </div>
                  </div>
                )}


                {/* Upload New PDF */}
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {existingPDF ? 'Remplacer le PDF' : 'Ajouter un PDF'}
                  </div>
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-gray-700'
                        : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="pdf-upload"
                      />
                      <label htmlFor="pdf-upload" className="cursor-pointer text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                        Cliquez pour sélectionner
                      </label>
                      {' ou glissez-déposez un fichier PDF'}
                    </div>
                    {selectedFile && (
                      <div className="mt-2 space-y-1">
                        <div className="text-sm text-green-600 dark:text-green-400">
                          Fichier sélectionné: {selectedFile.name}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          {existingPDF ? 'Remplacera le PDF existant' : 'Sera téléchargé'} lors de l\'enregistrement
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagePaper;