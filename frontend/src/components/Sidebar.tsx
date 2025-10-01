import React, { useState } from 'react';
import {
  BookOpen,
  Eye,
  CheckCircle,
  Heart,
  FileText,
  Plus,
  Home,
  TrendingUp,
  Settings,
  FolderOpen,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { PaperStats } from '../types/Paper';

interface SidebarProps {
  stats: PaperStats;
  onStatsRefresh?: () => void;
  onStatFilterClick?: (filterType: string) => void;
  activeStatFilter?: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ stats, onStatFilterClick, activeStatFilter }) => {
  const { goToHome, goToAddPaper, goToSettings, currentPage } = useNavigation();
  const [categories, setCategories] = useState([
    { id: 1, name: 'Machine Learning', count: 12 },
    { id: 2, name: 'Computer Vision', count: 8 },
    { id: 3, name: 'NLP', count: 5 },
  ]);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);

  const menuItems = [
    {
      id: 'home',
      label: 'Accueil',
      icon: Home,
      onClick: goToHome,
      isActive: currentPage === 'home',
    },
    {
      id: 'add',
      label: 'Ajouter un article',
      icon: Plus,
      onClick: goToAddPaper,
      isActive: currentPage === 'add-paper',
    },
  ];

  const statItems = [
    {
      label: 'Total',
      value: stats.total,
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      filterType: 'total',
    },
    {
      label: 'Non lus',
      value: stats.unread,
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      filterType: 'unread',
    },
    {
      label: 'En cours',
      value: stats.reading,
      icon: Eye,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      filterType: 'reading',
    },
    {
      label: 'Lus',
      value: stats.read,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      filterType: 'read',
    },
    {
      label: 'Favoris',
      value: stats.favorite,
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      filterType: 'favorite',
    },
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">FormPaper</h1>
            <p className="text-xs text-gray-500 dark:text-gray-500">3001</p>
          </div>
        </div>
      </div>

      <nav className="px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`
                w-full sidebar-item
                ${item.isActive
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-r-2 border-blue-700 dark:border-blue-500'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }
              `}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

      <div className="px-3">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">
          Statistiques
        </h3>
        <div className="space-y-1">
          {statItems.map((stat) => {
            const Icon = stat.icon;
            const isActive = activeStatFilter === stat.filterType;
            return (
              <button
                key={stat.label}
                onClick={() => onStatFilterClick?.(stat.filterType)}
                className={`w-full flex items-center justify-between p-1.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900 ring-2 ring-blue-500 dark:ring-blue-400'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-7 h-7 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  </div>
                  <span className={`text-sm ${isActive ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                    {stat.label}
                  </span>
                </div>
                <span className={`text-sm font-medium ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                  {stat.value}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

      {/* Categories Section */}
      <div className="px-3 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
            className="flex items-center space-x-2 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-400"
          >
            {isCategoriesExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span>Collections</span>
          </button>
        </div>

        {isCategoriesExpanded && (
          <div className="flex-1 overflow-y-auto">
            {/* Add New Category Button */}
            <button
              className="w-full flex items-center space-x-2 p-2 mb-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Nouvelle collection</span>
            </button>

            {/* Categories List */}
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <FolderOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{category.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-500">{category.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto">
        <div className="px-3 pb-4">
          <button
            onClick={goToSettings}
            className={`
              w-full sidebar-item
              ${currentPage === 'settings'
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-r-2 border-blue-700 dark:border-blue-500'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }
            `}
          >
            <Settings className="w-5 h-5 mr-3" />
            Paramètres
          </button>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-500">
            <p>FormPaper 3001</p>
            <p>Gestion d'articles scientifiques</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;