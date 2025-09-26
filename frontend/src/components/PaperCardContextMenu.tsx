import React from 'react';
import {
  Eye,
  Heart,
  BookOpen,
  CheckCircle,
  Trash2,
  FileText,
  ExternalLink,
  Copy,
  Tag as TagIcon,
  X
} from 'lucide-react';
import { Paper } from '../types/Paper';

interface PaperCardContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  paper: Paper;
  onClose: () => void;
  onOpenNotes: () => void;
  onOpenNotesNewTab: () => void;
  onOpenPDF: () => void;
  onCopyTitle: () => void;
  onCopyDOI: () => void;
  onToggleFavorite: () => void;
  onChangeStatus: (status: Paper['reading_status']) => void;
  onManageTags: () => void;
  onDelete: () => void;
}

const PaperCardContextMenu: React.FC<PaperCardContextMenuProps> = ({
  isOpen,
  position,
  paper,
  onClose,
  onOpenNotes,
  onOpenNotesNewTab,
  onOpenPDF,
  onCopyTitle,
  onCopyDOI,
  onToggleFavorite,
  onChangeStatus,
  onManageTags,
  onDelete,
}) => {
  if (!isOpen) return null;

  const menuStyle = {
    position: 'fixed' as const,
    top: Math.min(position.y, window.innerHeight - 400),
    left: Math.min(position.x, window.innerWidth - 250),
    zIndex: 1000,
  };

  const statusOptions = [
    { value: 'unread', label: 'Marquer comme non lu', icon: BookOpen },
    { value: 'reading', label: 'Marquer en cours de lecture', icon: Eye },
    { value: 'read', label: 'Marquer comme lu', icon: CheckCircle },
  ] as const;

  const handleMenuItemClick = (callback: () => void, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    callback();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-transparent z-40"
        onClick={onClose}
      />

      {/* Context Menu */}
      <div
        className="bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-64 z-50"
        style={menuStyle}
      >
        {/* Header avec titre de l'article */}
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
              {paper.title.length > 30 ? `${paper.title.substring(0, 30)}...` : paper.title}
            </h4>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Actions principales */}
        <div className="py-1">
          <button
            onClick={(e) => handleMenuItemClick(onOpenNotes, e)}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-700">Ouvrir les notes</span>
          </button>

          <button
            onClick={(e) => handleMenuItemClick(onOpenNotesNewTab, e)}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 pl-8"
          >
            <ExternalLink className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-600">Dans un nouvel onglet</span>
          </button>

          <button
            onClick={(e) => handleMenuItemClick(onOpenPDF, e)}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3"
          >
            <ExternalLink className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-700">Ouvrir le PDF</span>
          </button>
        </div>

        {/* Séparateur */}
        <hr className="my-1 border-gray-200" />

        {/* Statuts de lecture */}
        <div className="py-1">
          <div className="px-4 py-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Statut de lecture
            </span>
          </div>
          {statusOptions.map((status) => (
            <button
              key={status.value}
              onClick={(e) => handleMenuItemClick(() => onChangeStatus(status.value), e)}
              className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 ${
                paper.reading_status === status.value ? 'bg-blue-50 text-blue-700' : ''
              }`}
            >
              <status.icon className={`w-4 h-4 ${
                paper.reading_status === status.value ? 'text-blue-600' : 'text-gray-500'
              }`} />
              <span className="text-sm text-gray-700">{status.label}</span>
              {paper.reading_status === status.value && (
                <CheckCircle className="w-4 h-4 text-blue-600 ml-auto" />
              )}
            </button>
          ))}
        </div>

        {/* Séparateur */}
        <hr className="my-1 border-gray-200" />

        {/* Actions secondaires */}
        <div className="py-1">
          <button
            onClick={(e) => handleMenuItemClick(onToggleFavorite, e)}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3"
          >
            <Heart className={`w-4 h-4 ${
              paper.is_favorite ? 'text-red-500 fill-red-500' : 'text-gray-500'
            }`} />
            <span className="text-sm text-gray-700">
              {paper.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            </span>
          </button>

          <button
            onClick={(e) => handleMenuItemClick(onManageTags, e)}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3"
          >
            <TagIcon className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-gray-700">Gérer les tags</span>
          </button>
        </div>

        {/* Séparateur */}
        <hr className="my-1 border-gray-200" />

        {/* Actions de copie */}
        <div className="py-1">
          <button
            onClick={(e) => handleMenuItemClick(onCopyTitle, e)}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3"
          >
            <Copy className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">Copier le titre</span>
          </button>

          {paper.doi && (
            <button
              onClick={(e) => handleMenuItemClick(onCopyDOI, e)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3"
            >
              <Copy className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Copier le DOI</span>
            </button>
          )}
        </div>

        {/* Séparateur */}
        <hr className="my-1 border-gray-200" />

        {/* Actions dangereuses */}
        <div className="py-1">
          <button
            onClick={(e) => handleMenuItemClick(onDelete, e)}
            className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-3 text-red-600"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">Supprimer l'article</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default PaperCardContextMenu;