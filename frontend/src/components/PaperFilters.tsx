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

  const handleFilterChange = (key: keyof PaperFiltersType, value: string | boolean | number[] | string[]) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleStatusToggle = (status: string) => {
    const currentStatuses = filters.statuses || ['unread', 'reading', 'read'];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];

    handleFilterChange('statuses', newStatuses.length === 0 ? ['unread', 'reading', 'read'] : newStatuses);
  };

  const handleTagToggle = (tagId: number) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];

    handleFilterChange('tags', newTags);
  };

  const statusOptions = [
    { value: 'unread', label: 'Non lus', color: '#6B7280' }, // gray-500
    { value: 'reading', label: 'En cours', color: '#F59E0B' }, // yellow-500
    { value: 'read', label: 'Lus', color: '#10B981' }, // green-500
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
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
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
            <label htmlFor="showFavorites" className="ml-2 text-sm text-gray-700 dark:text-gray-200">
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
            <label htmlFor="sortFavorites" className="ml-2 text-sm text-gray-700 dark:text-gray-200">
              Trier favoris en premier
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Statut de lecture
        </label>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {statusOptions.map((option) => {
            const isSelected = (filters.statuses || ['unread', 'reading', 'read']).includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => handleStatusToggle(option.value)}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all duration-200"
                style={{
                  backgroundColor: isSelected ? option.color : 'transparent',
                  color: isSelected ? '#FFFFFF' : option.color,
                  boxShadow: isSelected ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
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

      {/* Section Tags séparée */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Filtrer par Tags
        </label>
        {tagsLoading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Chargement des tags...</div>
        ) : availableTags.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Aucun tag disponible</div>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleTagToggle(tag.id)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border ${
                  filters.tags?.includes(tag.id)
                    ? 'text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
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
                    className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                    style={{
                      backgroundColor: filters.tags?.includes(tag.id) ? 'rgba(255,255,255,0.8)' : tag.color
                    }}
                  ></div>
                )}
                <span className="truncate">{tag.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaperFilters;