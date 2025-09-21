import React from 'react';
import {
  BookOpen,
  Eye,
  CheckCircle,
  Heart,
  FileText,
  Plus,
  Home,
  TrendingUp,
  Settings
} from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { PaperStats } from '../types/Paper';

interface SidebarProps {
  stats: PaperStats;
  onStatsRefresh?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ stats }) => {
  const { goToHome, goToAddPaper, goToSettings, currentPage } = useNavigation();

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
    },
    {
      label: 'Non lus',
      value: stats.unread,
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'En cours',
      value: stats.reading,
      icon: Eye,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      label: 'Lus',
      value: stats.read,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Favoris',
      value: stats.favorite,
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">FormPaper</h1>
            <p className="text-xs text-gray-500">3001</p>
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
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:text-gray-900'
                }
              `}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-8 px-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Statistiques
        </h3>
        <div className="space-y-2">
          {statItems.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <span className="text-sm text-gray-700">{stat.label}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {stat.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-auto">
        <div className="px-3 pb-4">
          <button
            onClick={goToSettings}
            className={`
              w-full sidebar-item
              ${currentPage === 'settings'
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                : 'text-gray-700 hover:text-gray-900'
              }
            `}
          >
            <Settings className="w-5 h-5 mr-3" />
            Paramètres
          </button>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <p>FormPaper 3001</p>
            <p>Gestion d'articles scientifiques</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;