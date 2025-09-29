import React, { useState, useEffect } from 'react';
import { PaperFilters as PaperFiltersType, Paper, Tag } from '../types/Paper';
import { paperService } from '../services/paperService';

interface PaperFiltersProps {
  filters: PaperFiltersType;
  onFiltersChange: (filters: PaperFiltersType) => void;
  papers: Paper[];
}

const PaperFilters: React.FC<PaperFiltersProps> = ({
  filters,
  onFiltersChange,
  papers,
}) => {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setTagsLoading(true);
      const tags = await paperService.getTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setTagsLoading(false);
    }
  };

  const handleFilterChange = (key: keyof PaperFiltersType, value: string | boolean | number[]) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleTagToggle = (tagId: number) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];

    handleFilterChange('tags', newTags);
  };

  const statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'unread', label: 'Non lus' },
    { value: 'reading', label: 'En cours' },
    { value: 'read', label: 'Lus' },
  ];

  const sortOptions = [
    { value: 'date', label: 'Date d\'ajout' },
    { value: 'title', label: 'Titre' },
    { value: 'authors', label: 'Auteurs' },
  ];

  const uniqueConferences = Array.from(
    new Set(papers.map(paper => paper.conference).filter(Boolean))
  ).sort();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Favoris
        </label>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showFavorites"
              checked={filters.showFavorites}
              onChange={(e) => handleFilterChange('showFavorites', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="showFavorites" className="ml-2 text-sm text-gray-700">
              Favoris uniquement
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="sortFavorites"
              checked={filters.sortFavorites}
              onChange={(e) => handleFilterChange('sortFavorites', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="sortFavorites" className="ml-2 text-sm text-gray-700">
              Trier favoris en premier
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Statut de lecture
        </label>
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="input-field w-full"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Conférence/Journal
        </label>
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="input-field w-full"
        >
          <option value="">Toutes les conférences</option>
          {uniqueConferences.map((conference) => (
            <option key={conference} value={conference}>
              {conference}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Trier par
        </label>
        <select
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value as PaperFiltersType['sortBy'])}
          className="input-field w-full"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ordre
        </label>
        <select
          value={filters.sortOrder}
          onChange={(e) => handleFilterChange('sortOrder', e.target.value as PaperFiltersType['sortOrder'])}
          className="input-field w-full"
        >
          <option value="desc">Décroissant</option>
          <option value="asc">Croissant</option>
        </select>
      </div>
      </div>

      {/* Section Tags séparée */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filtrer par Tags
        </label>
        {tagsLoading ? (
          <div className="text-sm text-gray-500">Chargement des tags...</div>
        ) : availableTags.length === 0 ? (
          <div className="text-sm text-gray-500">Aucun tag disponible</div>
        ) : (
          <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto p-1">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleTagToggle(tag.id)}
                className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 border ${
                  filters.tags?.includes(tag.id)
                    ? 'text-white shadow-sm scale-105'
                    : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 hover:scale-105'
                }`}
                style={{
                  backgroundColor: filters.tags?.includes(tag.id) && tag.color ? tag.color : undefined,
                  borderColor: tag.color || '#D1D5DB',
                  ...(filters.tags?.includes(tag.id) ? {} : {
                    backgroundColor: `${tag.color}10`, // 10% opacity pour l'arrière-plan non sélectionné
                  })
                }}
                title={`Filtrer par ${tag.name}`}
              >
                {tag.color && (
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${
                      filters.tags?.includes(tag.id) ? 'bg-white bg-opacity-80' : ''
                    }`}
                    style={{
                      backgroundColor: filters.tags?.includes(tag.id) ? 'rgba(255,255,255,0.8)' : tag.color
                    }}
                  ></div>
                )}
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaperFilters;