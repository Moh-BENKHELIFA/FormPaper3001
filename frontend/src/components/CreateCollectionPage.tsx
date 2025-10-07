import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Grid, List, Image as ImageIcon } from 'lucide-react';
import { Paper, PaperFilters as PaperFiltersType } from '../types/Paper';
import { paperService } from '../services/paperService';
import { collectionService } from '../services/collectionService';
import { useNavigation } from '../hooks/useNavigation';
import { useToast } from '../contexts/ToastContext';
import PaperFilters from './PaperFilters';
import SelectablePaperCard from './SelectablePaperCard';

type ViewMode = 'grid' | 'table' | 'table-images';

const CreateCollectionPage: React.FC = () => {
  const { goToHome, selectedCollectionId } = useNavigation();
  const { success, error } = useToast();
  const [collectionName, setCollectionName] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<Paper[]>([]);
  const [selectedPaperIds, setSelectedPaperIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<PaperFiltersType>({
    search: '',
    status: '',
    statuses: ['unread', 'reading', 'read'],
    category: '',
    sortBy: 'date',
    sortOrder: 'desc',
    showFavorites: false,
    sortFavorites: false,
    tags: [],
  });

  useEffect(() => {
    loadPapers();
  }, []);

  useEffect(() => {
    console.log('CreateCollectionPage - selectedCollectionId:', selectedCollectionId);
    if (selectedCollectionId && selectedCollectionId > 0) {
      console.log('Mode édition - chargement de la collection', selectedCollectionId);
      loadCollectionData(selectedCollectionId);
    } else {
      console.log('Mode création - réinitialisation');
      // Mode création : réinitialiser les états
      setIsEditMode(false);
      setCollectionName('');
      setSelectedPaperIds(new Set());
    }
  }, [selectedCollectionId]);

  // Apply filters whenever papers or filters change
  useEffect(() => {
    applyFilters();
  }, [papers, filters]);

  const loadPapers = async () => {
    try {
      setIsLoading(true);
      const papersData = await paperService.getAllPapers();
      setPapers(papersData);
      setFilteredPapers(papersData);
    } catch (err) {
      console.error('Error loading papers:', err);
      error('Erreur', 'Impossible de charger les articles');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCollectionData = async (collectionId: number) => {
    try {
      setIsLoading(true);
      setIsEditMode(true);
      const collection = await collectionService.getCollection(collectionId);
      setCollectionName(collection.name);

      // Charger les IDs des papiers de la collection
      if (collection.papers && collection.papers.length > 0) {
        const paperIds = new Set(collection.papers.map(p => p.id));
        setSelectedPaperIds(paperIds);
      }
    } catch (err) {
      console.error('Error loading collection:', err);
      error('Erreur', 'Impossible de charger la collection');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...papers];

    // Search
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(paper =>
        paper.title.toLowerCase().includes(query) ||
        paper.authors.toLowerCase().includes(query) ||
        (paper.conference && paper.conference.toLowerCase().includes(query))
      );
    }

    // Status - use statuses array for multi-select
    if (filters.statuses && filters.statuses.length > 0) {
      filtered = filtered.filter(paper => filters.statuses!.includes(paper.reading_status));
    }

    // Conference
    if (filters.category) {
      filtered = filtered.filter(paper => paper.conference === filters.category);
    }

    // Tags
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(paper => {
        const paperTags = paper.tags || [];
        return filters.tags!.some(tagId => paperTags.some(tag => tag.id === tagId));
      });
    }

    // Show favorites only
    if (filters.showFavorites) {
      filtered = filtered.filter(paper => paper.is_favorite === 1);
    }

    // Extract last name from first author
    const getFirstAuthorLastName = (authors: string): string => {
      // Split by 'and', ',', ';' or 'et' to get first author
      const firstAuthor = authors.split(/\s+(?:and|et)\s+|,|;/)[0].trim();
      // Get the last word as the last name
      const parts = firstAuthor.trim().split(/\s+/);
      return parts[parts.length - 1].toLowerCase();
    };

    // Sort by selected field
    filtered.sort((a, b) => {
      // First, sort by favorites if enabled
      if (filters.sortFavorites && a.is_favorite !== b.is_favorite) {
        return b.is_favorite - a.is_favorite;
      }

      // Then apply the main sort
      switch (filters.sortBy) {
        case 'title':
          const titleComparison = a.title.localeCompare(b.title);
          return filters.sortOrder === 'asc' ? titleComparison : -titleComparison;
        case 'authors':
          const lastNameA = getFirstAuthorLastName(a.authors);
          const lastNameB = getFirstAuthorLastName(b.authors);
          const authorComparison = lastNameA.localeCompare(lastNameB);
          return filters.sortOrder === 'asc' ? authorComparison : -authorComparison;
        case 'date':
        default:
          const dateComparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          return filters.sortOrder === 'asc' ? -dateComparison : dateComparison;
      }
    });

    setFilteredPapers(filtered);
  };

  const handleFiltersChange = (newFilters: PaperFiltersType) => {
    setFilters(newFilters);
  };

  const togglePaperSelection = (paperId: number) => {
    setSelectedPaperIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paperId)) {
        newSet.delete(paperId);
      } else {
        newSet.add(paperId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedPaperIds.size === filteredPapers.length) {
      setSelectedPaperIds(new Set());
    } else {
      setSelectedPaperIds(new Set(filteredPapers.map(p => p.id)));
    }
  };

  const handleCreate = async () => {
    if (!collectionName.trim()) {
      error('Erreur', 'Le nom de la collection est requis');
      return;
    }

    try {
      setIsSaving(true);

      if (isEditMode && selectedCollectionId) {
        // Mode édition : mettre à jour la collection
        await collectionService.updateCollection(selectedCollectionId, collectionName.trim());

        // Récupérer les papiers actuels de la collection
        const currentCollection = await collectionService.getCollection(selectedCollectionId);
        const currentPaperIds = new Set(currentCollection.papers?.map(p => p.id) || []);

        // Trouver les papiers à ajouter et à supprimer
        const papersToAdd = Array.from(selectedPaperIds).filter(id => !currentPaperIds.has(id));
        const papersToRemove = Array.from(currentPaperIds).filter(id => !selectedPaperIds.has(id));

        // Ajouter les nouveaux papiers
        if (papersToAdd.length > 0) {
          await collectionService.addPapersToCollection(selectedCollectionId, papersToAdd);
        }

        // Supprimer les papiers retirés
        for (const paperId of papersToRemove) {
          await collectionService.removePaperFromCollection(selectedCollectionId, paperId);
        }

        success('Collection modifiée', `La collection "${collectionName}" a été mise à jour avec succès`);
      } else {
        // Mode création : créer une nouvelle collection
        await collectionService.createCollection(collectionName.trim(), Array.from(selectedPaperIds));
        success('Collection créée', `La collection "${collectionName}" a été créée avec succès`);
      }

      goToHome();
    } catch (err: any) {
      if (err.response?.status === 409) {
        error('Erreur', 'Une collection avec ce nom existe déjà');
      } else {
        error('Erreur', isEditMode ? 'Impossible de modifier la collection' : 'Impossible de créer la collection');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <button
              onClick={goToHome}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {isEditMode ? 'Modifier la collection' : 'Créer une nouvelle collection'}
              </h1>
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  placeholder="Ex: Machine Learning, Computer Vision..."
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 w-96"
                />
                <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                  <span>{filteredPapers.length} article{filteredPapers.length !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {selectedPaperIds.size} sélectionné{selectedPaperIds.size !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* View Mode Selector */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    title="Vue grille"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    title="Vue tableau"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table-images')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'table-images'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    title="Vue tableau avec images"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!collectionName.trim() || isSaving}
            className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check className="w-5 h-5" />
            <span>
              {isSaving
                ? (isEditMode ? 'Modification...' : 'Création...')
                : (isEditMode ? 'Modifier la collection' : 'Créer la collection')
              }
            </span>
          </button>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Filters */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Filtres de recherche
            </h2>
            <PaperFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              papers={papers}
            />
          </div>
        </div>

        {/* Right Content - Papers Selection */}
        <div className="flex-1 overflow-y-auto">
          <div className="h-full">

            {isLoading ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                Chargement des articles...
              </div>
            ) : filteredPapers.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                Aucun article trouvé
              </div>
            ) : viewMode === 'grid' ? (
              <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {filteredPapers.map((paper) => (
                  <SelectablePaperCard
                    key={paper.id}
                    paper={paper}
                    isSelected={selectedPaperIds.has(paper.id)}
                    onToggleSelection={togglePaperSelection}
                  />
                ))}
              </div>
            ) : viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="w-12 px-6 py-3"></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Titre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Auteurs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Conférence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredPapers.map((paper) => (
                      <tr
                        key={paper.id}
                        onClick={() => togglePaperSelection(paper.id)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedPaperIds.has(paper.id)}
                            onChange={() => togglePaperSelection(paper.id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {paper.title}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {paper.authors}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {paper.conference || '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            paper.reading_status === 'read'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : paper.reading_status === 'reading'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {paper.reading_status === 'read' ? 'Lu' : paper.reading_status === 'reading' ? 'En cours' : 'Non lu'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="w-12 px-6 py-3"></th>
                      <th className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Titre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Auteurs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Conférence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredPapers.map((paper) => (
                      <tr
                        key={paper.id}
                        onClick={() => togglePaperSelection(paper.id)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedPaperIds.has(paper.id)}
                            onChange={() => togglePaperSelection(paper.id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-6 py-4">
                          {paper.image ? (
                            <img
                              src={`http://localhost:5004/api/${paper.image}`}
                              alt={paper.title}
                              className="w-16 h-20 object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.src = 'http://localhost:5004/api/default-image';
                              }}
                            />
                          ) : (
                            <div className="w-16 h-20 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {paper.title}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {paper.authors}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {paper.conference || '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            paper.reading_status === 'read'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : paper.reading_status === 'reading'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {paper.reading_status === 'read' ? 'Lu' : paper.reading_status === 'reading' ? 'En cours' : 'Non lu'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCollectionPage;
