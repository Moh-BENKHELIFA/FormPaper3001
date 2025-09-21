import React from 'react';
import { PaperFilters as PaperFiltersType, Paper } from '../types/Paper';

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
  const handleFilterChange = (key: keyof PaperFiltersType, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'unread', label: 'Non lus' },
    { value: 'reading', label: 'En cours' },
    { value: 'read', label: 'Lus' },
    { value: 'favorite', label: 'Favoris' },
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
  );
};

export default PaperFilters;