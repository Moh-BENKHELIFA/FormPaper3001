import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Search, X } from 'lucide-react';
import { Paper, PaperFilters as PaperFiltersType } from '../types/Paper';
import { paperService } from '../services/paperService';
import PaperFilters from './PaperFilters';

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCollection: (name: string, paperIds: number[]) => Promise<void>;
}

export const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({
  isOpen,
  onClose,
  onCreateCollection,
}) => {
  const [collectionName, setCollectionName] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<Paper[]>([]);
  const [selectedPaperIds, setSelectedPaperIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filters, setFilters] = useState<PaperFiltersType>({
    search: '',
    status: '',
    conference: '',
    sortBy: 'date',
    showFavorites: false,
    sortFavorites: false,
    tags: [],
  });

  useEffect(() => {
    if (isOpen) {
      loadPapers();
    } else {
      // Reset on close
      setCollectionName('');
      setSelectedPaperIds(new Set());
      setFilters({
        search: '',
        status: '',
        conference: '',
        sortBy: 'date',
        showFavorites: false,
        sortFavorites: false,
        tags: [],
      });
    }
  }, [isOpen]);

  const loadPapers = async () => {
    try {
      setIsLoading(true);
      const papersData = await paperService.getAllPapers();
      setPapers(papersData);
      setFilteredPapers(papersData);
    } catch (err) {
      console.error('Error loading papers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters whenever papers or filters change
  useEffect(() => {
    applyFilters();
  }, [papers, filters]);

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

    // Status
    if (filters.status) {
      filtered = filtered.filter(paper => paper.reading_status === filters.status);
    }

    // Conference
    if (filters.conference) {
      filtered = filtered.filter(paper => paper.conference === filters.conference);
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

    // Sort
    if (filters.sortFavorites) {
      filtered.sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) {
          return b.is_favorite - a.is_favorite;
        }
        return 0;
      });
    }

    // Sort by
    switch (filters.sortBy) {
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'authors':
        filtered.sort((a, b) => a.authors.localeCompare(b.authors));
        break;
      case 'date':
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

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

  const handleCreate = async () => {
    if (!collectionName.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      await onCreateCollection(collectionName.trim(), Array.from(selectedPaperIds));
      onClose();
    } catch (err) {
      console.error('Error creating collection:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle collection" size="xl">
      <div className="space-y-6">
        {/* Collection Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nom de la collection
          </label>
          <input
            type="text"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            placeholder="Ex: Machine Learning, Computer Vision..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        {/* Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rechercher et filtrer les articles
          </label>
          <PaperFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            papers={papers}
          />
        </div>

        {/* Papers Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sélectionner les articles ({selectedPaperIds.size} sélectionné{selectedPaperIds.size !== 1 ? 's' : ''})
            </label>
            {selectedPaperIds.size > 0 && (
              <button
                onClick={() => setSelectedPaperIds(new Set())}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Tout désélectionner
              </button>
            )}
          </div>

          <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Chargement des articles...
              </div>
            ) : filteredPapers.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Aucun article trouvé
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPapers.map((paper) => (
                  <label
                    key={paper.id}
                    className="flex items-start p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPaperIds.has(paper.id)}
                      onChange={() => togglePaperSelection(paper.id)}
                      className="mt-1 mr-3 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 flex-shrink-0"
                    />
                    {paper.image && (
                      <img
                        src={`http://localhost:5004${paper.image}`}
                        alt={paper.title}
                        className="w-16 h-20 object-cover rounded mr-3 flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {paper.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {paper.authors}
                      </p>
                      {paper.conference && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {paper.conference}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={!collectionName.trim() || isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Création...' : 'Créer la collection'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateCollectionModal;
