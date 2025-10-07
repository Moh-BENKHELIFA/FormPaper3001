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
    <div className="flex flex-wrap items-center gap-4">
      {/* Favoris */}
      <div className="flex items-center space-x-3">
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

      {/* Statut */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700 dark:text-gray-300">Statut:</span>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {statusOptions.map((option) => {
            const isSelected = (filters.statuses || ['unread', 'reading', 'read']).includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => handleStatusToggle(option.value)}
                className="px-3 py-1 text-xs font-medium rounded transition-all duration-200"
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

      {/* Conférence */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700 dark:text-gray-300">Conférence:</span>
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="input-field text-sm py-1"
        >
          <option value="">Toutes</option>
          {uniqueConferences.map((conference) => (
            <option key={conference} value={conference}>
              {conference}
            </option>
          ))}
        </select>
      </div>

      {/* Tri */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700 dark:text-gray-300">Tri:</span>
        <select
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value as PaperFiltersType['sortBy'])}
          className="input-field text-sm py-1"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={filters.sortOrder}
          onChange={(e) => handleFilterChange('sortOrder', e.target.value as PaperFiltersType['sortOrder'])}
          className="input-field text-sm py-1"
        >
          <option value="desc">↓</option>
          <option value="asc">↑</option>
        </select>
      </div>

      {/* Tags */}
      {!tagsLoading && availableTags.length > 0 && (
        <div className="flex items-center space-x-2 flex-wrap">
          <span className="text-sm text-gray-700 dark:text-gray-300">Tags:</span>
          <div className="flex flex-wrap gap-1">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleTagToggle(tag.id)}
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-all duration-200"
                style={{
                  backgroundColor: filters.tags?.includes(tag.id) ? tag.color : `${tag.color}20`,
                  color: filters.tags?.includes(tag.id) ? '#FFFFFF' : tag.color,
                  border: `1px solid ${tag.color}`
                }}
                title={`Filtrer par ${tag.name}`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperFilters;