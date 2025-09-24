import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, FileText, ExternalLink, Eye, BookOpen, CheckCircle, Heart } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { useToast } from '../contexts/ToastContext';
import { paperService } from '../services/paperService';
import { fileNotesStorage } from '../services/fileNotesStorage';
import { Paper } from '../types/Paper';
import { Block } from '../types/BlockTypes';
import BlockEditor from './BlockEditor';

interface PaperNotesProps {
  paperId: number;
}

const PaperNotes: React.FC<PaperNotesProps> = ({ paperId }) => {
  const { goToHome } = useNavigation();
  const { success, error } = useToast();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadPaper();
    loadNotes();
  }, [paperId]);

  const loadPaper = async () => {
    try {
      const paperData = await paperService.getPaper(paperId);
      setPaper(paperData);
    } catch (err) {
      error('Erreur', 'Impossible de charger l\'article');
      goToHome();
    }
  };

  const loadNotes = async () => {
    try {
      const notesData = await fileNotesStorage.loadNotes(paperId);
      setBlocks(notesData);
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotes = async (blocksToSave: Block[]) => {
    try {
      setIsSaving(true);
      await fileNotesStorage.saveNotes(paperId, blocksToSave);
    } catch (err) {
      error('Erreur', 'Impossible de sauvegarder les notes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlocksChange = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
  };

  const formatPublicationDate = () => {
    if (paper?.publication_date) {
      const date = new Date(paper.publication_date);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } else if (paper?.year) {
      if (paper?.month) {
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        return `${monthNames[paper.month - 1]} ${paper.year}`;
      }
      return paper.year.toString();
    }
    return null;
  };

  const formatCreationDate = () => {
    if (!paper) return null;
    const date = new Date(paper.created_at);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusLabel = (status: Paper['reading_status']) => {
    switch (status) {
      case 'unread': return 'Non lu';
      case 'reading': return 'En cours';
      case 'read': return 'Lu';
      default: return 'Non lu';
    }
  };

  const getStatusIcon = (status: Paper['reading_status']) => {
    switch (status) {
      case 'unread': return <BookOpen className="w-4 h-4" />;
      case 'reading': return <Eye className="w-4 h-4" />;
      case 'read': return <CheckCircle className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: Paper['reading_status']) => {
    switch (status) {
      case 'unread': return '#6B7280'; // gray-500
      case 'reading': return '#F59E0B'; // yellow-500
      case 'read': return '#10B981'; // green-500
      default: return '#6B7280'; // gray-500
    }
  };

  const handlePDFOpen = () => {
    if (paper?.folder_path) {
      const pdfUrl = `/api/papers/${paper.id}/pdf`;
      window.open(pdfUrl, '_blank');
    }
  };

  const hasPDF = () => {
    return paper?.folder_path !== null && paper?.folder_path !== '';
  };

  const handleStatusChange = async (newStatus: Paper['reading_status'], event: React.MouseEvent) => {
    event.stopPropagation();

    if (isUpdating || !paper) return;

    try {
      setIsUpdating(true);
      await paperService.updateReadingStatus(paper.id, newStatus);

      // Mise à jour locale immédiate
      setPaper(prev => prev ? { ...prev, reading_status: newStatus } : null);

      success('Statut mis à jour');
    } catch (err) {
      error('Erreur', 'Impossible de mettre à jour le statut');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFavoriteToggle = async (event: React.MouseEvent) => {
    event.stopPropagation();

    if (isUpdating || !paper) return;

    try {
      setIsUpdating(true);
      const newFavoriteStatus = !paper.is_favorite;
      await paperService.updateFavoriteStatus(paper.id, newFavoriteStatus);

      // Mise à jour locale immédiate
      setPaper(prev => prev ? { ...prev, is_favorite: newFavoriteStatus } : null);

      success(newFavoriteStatus ? 'Ajouté aux favoris' : 'Retiré des favoris');
    } catch (err) {
      error('Erreur', 'Impossible de mettre à jour les favoris');
    } finally {
      setIsUpdating(false);
    }
  };

  const statusOptions = [
    { value: 'unread', label: 'Non lu', icon: BookOpen },
    { value: 'reading', label: 'En cours', icon: Eye },
    { value: 'read', label: 'Lu', icon: CheckCircle },
  ] as const;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Article non trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec image de couverture en background */}
      <div className="sticky top-0 z-10">
        <div
          className="relative flex flex-col justify-between bg-cover bg-center bg-no-repeat overflow-hidden"
          style={{
            height: '90px',
            backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 100%), url(${paper.image ? `/api/${paper.image}` : '/api/default-image'})`
          }}
        >
          {/* Header supérieur - Navigation et actions */}
          <div className="flex justify-between items-center p-2">
            {/* Navigation à gauche */}
            <button
              onClick={goToHome}
              className="p-1.5 rounded-full bg-white bg-opacity-90 hover:bg-opacity-100 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>

            {/* Actions à droite */}
            <div className="flex items-center space-x-1">
              {/* Bouton Favoris */}
              <button
                onClick={handleFavoriteToggle}
                className="p-1.5 rounded-full bg-white bg-opacity-90 hover:bg-opacity-100 transition-all shadow-sm"
                disabled={isUpdating}
                title={paper.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    paper.is_favorite
                      ? 'text-red-500 fill-red-500'
                      : 'text-gray-600'
                  }`}
                />
              </button>

              {/* Bouton PDF si disponible */}
              {hasPDF() && (
                <button
                  onClick={handlePDFOpen}
                  className="p-1.5 rounded-full bg-white bg-opacity-90 hover:bg-opacity-100 transition-all shadow-sm"
                  title="Ouvrir le PDF"
                >
                  <FileText className="w-4 h-4 text-red-600" />
                </button>
              )}

              {/* Lien DOI si disponible */}
              {paper.doi && (
                <a
                  href={`https://doi.org/${paper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-full bg-white bg-opacity-90 hover:bg-opacity-100 transition-all shadow-sm"
                  title={`DOI: ${paper.doi}`}
                >
                  <ExternalLink className="w-4 h-4 text-green-600" />
                </a>
              )}
            </div>
          </div>

          {/* Contenu principal */}
          <div className="flex-1 text-white px-3 pb-2 min-w-0">
            {/* Titre */}
            <h1 className="font-bold text-sm line-clamp-1 drop-shadow-lg mb-1">
              {paper.title}
            </h1>

            {/* Auteurs */}
            <p className="text-xs text-white text-opacity-90 drop-shadow line-clamp-1 mb-1">
              {paper.authors}
            </p>

            {/* Informations en ligne */}
            <div className="flex items-center justify-between text-xs text-white text-opacity-80">
              <div className="flex items-center space-x-2">
                {/* Date de publication */}
                {formatPublicationDate() && (
                  <span className="drop-shadow">{formatPublicationDate()}</span>
                )}

                {/* Conférence */}
                {paper.conference && formatPublicationDate() && (
                  <span className="drop-shadow">•</span>
                )}
                {paper.conference && (
                  <span className="drop-shadow line-clamp-1 max-w-32">{paper.conference}</span>
                )}

                {/* DOI */}
                {paper.doi && (
                  <>
                    <span className="drop-shadow">•</span>
                    <span className="drop-shadow line-clamp-1 max-w-24">{paper.doi}</span>
                  </>
                )}

                {/* Date d'ajout */}
                <span className="drop-shadow">• Ajouté: {formatCreationDate()}</span>
              </div>

              {/* Statut de lecture cliquable */}
              <div className="flex items-center space-x-1">
                {statusOptions.map((status) => (
                  <button
                    key={status.value}
                    onClick={(e) => handleStatusChange(status.value, e)}
                    disabled={isUpdating}
                    className={`p-1 rounded-full transition-all duration-200 ${
                      paper.reading_status === status.value
                        ? 'bg-white bg-opacity-20 scale-105'
                        : 'hover:bg-white hover:bg-opacity-10 opacity-60 hover:opacity-100'
                    }`}
                    title={status.label}
                  >
                    {React.createElement(status.icon, {
                      className: `w-3 h-3 text-white drop-shadow`,
                      style: {
                        color: paper.reading_status === status.value
                          ? getStatusColor(status.value)
                          : 'white'
                      }
                    })}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white">
        <BlockEditor
          articleId={paperId.toString()}
          initialBlocks={blocks}
          onSave={saveNotes}
        />
      </div>
    </div>
  );
};

export default PaperNotes;