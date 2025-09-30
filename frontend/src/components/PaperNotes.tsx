import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, FileText, Globe, Eye, BookOpen, CheckCircle, Heart, X, Columns2, PanelRightOpen, MessageCircle } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { useToast } from '../contexts/ToastContext';
import { paperService } from '../services/paperService';
import { fileNotesStorage } from '../services/fileNotesStorage';
import { Paper } from '../types/Paper';
import { Block } from '../types/BlockTypes';
import BlockEditor from './BlockEditor';
import SplitView from './SplitView';
import TripleSplitView from './TripleSplitView';
import PDFViewer from './PDFViewer';
import AIChat from './AIChat';

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
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [splitPercentage, setSplitPercentage] = useState(50);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiChatSplitPercentage, setAiChatSplitPercentage] = useState(40);
  const [tripleLeftPercentage, setTripleLeftPercentage] = useState(30);
  const [tripleRightPercentage, setTripleRightPercentage] = useState(30);

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

  const handlePDFToggle = () => {
    setIsPdfOpen(!isPdfOpen);
  };

  const handleAIChatToggle = () => {
    setIsAIChatOpen(!isAIChatOpen);
  };

  const handleSplitChange = (percentage: number) => {
    setSplitPercentage(percentage);
    // Sauvegarder la préférence dans le localStorage
    localStorage.setItem(`split_${paperId}`, percentage.toString());
  };

  const handleAIChatSplitChange = (percentage: number) => {
    setAiChatSplitPercentage(percentage);
    localStorage.setItem(`aiChatSplit_${paperId}`, percentage.toString());
  };

  const handleTripleSplitChange = (leftPercentage: number, rightPercentage: number) => {
    setTripleLeftPercentage(leftPercentage);
    setTripleRightPercentage(rightPercentage);
    localStorage.setItem(`tripleSplitLeft_${paperId}`, leftPercentage.toString());
    localStorage.setItem(`tripleSplitRight_${paperId}`, rightPercentage.toString());
  };

  // Charger la préférence de split au chargement
  useEffect(() => {
    const savedSplit = localStorage.getItem(`split_${paperId}`);
    if (savedSplit) {
      setSplitPercentage(parseFloat(savedSplit));
    }
  }, [paperId]);

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Article non trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header avec image de couverture en background */}
      <div className="sticky top-0 z-10">
        <div
          className="relative bg-cover bg-center bg-no-repeat overflow-hidden px-2 py-2 flex"
          style={{
            height: '90px',
            backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 100%), url(${paper.image ? `/api/${paper.image}` : '/api/default-image'})`
          }}
        >
          {/* Colonne de gauche - Navigation et contenu principal */}
          <div className="flex-1 flex flex-col">
            {/* Première ligne - Navigation et titre */}
            <div className="flex items-start mb-1">
              {/* Navigation à gauche */}
              <button
                onClick={goToHome}
                className="p-1.5 rounded-full bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 hover:bg-opacity-100 dark:hover:bg-opacity-100 transition-all shadow-sm flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>

              {/* Titre */}
              <div className="flex-1 text-white px-3 min-w-0">
                <h1 className="font-bold line-clamp-1 drop-shadow-lg" style={{ fontSize: '1.3rem' }}>
                  {paper.title}
                </h1>
              </div>
            </div>

            {/* Deuxième ligne - Auteurs */}
            <div className="text-white px-3 mb-1" style={{ marginLeft: '52px' }}>
              <p className="text-xs text-white text-opacity-90 drop-shadow line-clamp-1">
                {paper.authors}
              </p>
            </div>

            {/* Troisième ligne - Informations */}
            <div className="text-white px-3" style={{ marginLeft: '52px' }}>
              <div className="flex items-center text-xs text-white text-opacity-80 flex-wrap">
                {/* Date de publication */}
                {formatPublicationDate() && (
                  <span className="drop-shadow whitespace-nowrap mr-2">{formatPublicationDate()}</span>
                )}

                {/* Conférence */}
                {paper.conference && formatPublicationDate() && (
                  <span className="drop-shadow mr-2">•</span>
                )}
                {paper.conference && (
                  <span className="drop-shadow mr-2" style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 'calc(100vw - 250px)'
                  }}>
                    {paper.conference}
                  </span>
                )}

                {/* DOI */}
                {paper.doi && (
                  <>
                    <span className="drop-shadow mr-2">•</span>
                    <span className="drop-shadow" style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 'calc(100vw - 350px)'
                    }}>
                      {paper.doi}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Colonne de droite - Actions sur 3 lignes */}
          <div className="flex flex-col justify-start flex-shrink-0 min-w-0">
            {/* Ligne 1 - Boutons Favoris, PDF, DOI */}
            <div className="flex items-center justify-end space-x-1">
              {/* Bouton Favoris */}
              <button
                onClick={handleFavoriteToggle}
                className="p-1.5 rounded-full bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 hover:bg-opacity-100 dark:hover:bg-opacity-100 transition-all shadow-sm"
                disabled={isUpdating}
                title={paper.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    paper.is_favorite
                      ? 'text-red-500 fill-red-500'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                />
              </button>

              {/* Bouton PDF si disponible */}
              {hasPDF() && (
                <button
                  onClick={handlePDFOpen}
                  className="p-1.5 rounded-full bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 hover:bg-opacity-100 dark:hover:bg-opacity-100 transition-all shadow-sm"
                  title="Ouvrir le PDF dans un nouvel onglet"
                >
                  <FileText className="w-4 h-4 text-red-600" />
                </button>
              )}

              {/* Bouton Chat IA */}
              {hasPDF() && (
                <button
                  onClick={handleAIChatToggle}
                  className="p-1.5 rounded-full bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 hover:bg-opacity-100 dark:hover:bg-opacity-100 transition-all shadow-sm"
                  title="Chat IA - Analyser avec l'intelligence artificielle"
                >
                  <MessageCircle className="w-4 h-4 text-purple-600" />
                </button>
              )}

              {/* Lien DOI si disponible */}
              {paper.doi && (
                <a
                  href={`https://doi.org/${paper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-full bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 hover:bg-opacity-100 dark:hover:bg-opacity-100 transition-all shadow-sm"
                  title={`DOI: ${paper.doi}`}
                >
                  <Globe className="w-4 h-4 text-blue-600" />
                </a>
              )}
            </div>

            {/* Ligne 2 - Boutons de statut de lecture */}
            <div className="flex items-center justify-end">
              <div className="flex items-center space-x-1 bg-black bg-opacity-30 rounded-full px-1.5 py-0.5">
                {statusOptions.map((status) => (
                  <button
                    key={status.value}
                    onClick={(e) => handleStatusChange(status.value, e)}
                    disabled={isUpdating}
                    className={`p-1 rounded-full transition-all duration-200 ${
                      paper.reading_status === status.value
                        ? 'bg-white bg-opacity-90 scale-105'
                        : 'bg-white bg-opacity-20 hover:bg-opacity-40 opacity-70 hover:opacity-100'
                    }`}
                    title={status.label}
                  >
                    {React.createElement(status.icon, {
                      className: `w-3 h-3 transition-colors`,
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

            {/* Ligne 3 - Date d'ajout */}
            <div className="flex items-center justify-end">
              <div className="text-xs text-white text-opacity-80 drop-shadow whitespace-nowrap">
                Ajouté: {formatCreationDate()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal - Notes seules, SplitView double, ou TripleSplitView */}
      <div className="flex-1 bg-white dark:bg-gray-800" style={{ height: 'calc(100vh - 90px)' }}>
        {isPdfOpen && isAIChatOpen && hasPDF() ? (
          /* Triple Split View - Chat IA à gauche, Notes au centre, PDF à droite */
          <TripleSplitView
            leftPanel={
              <div className="h-full bg-white dark:bg-gray-800">
                <AIChat paper={paper} />
              </div>
            }
            centerPanel={
              <div className="h-full bg-white dark:bg-gray-800">
                <BlockEditor
                  articleId={paperId.toString()}
                  initialBlocks={blocks}
                  onSave={saveNotes}
                />
              </div>
            }
            rightPanel={
              <PDFViewer
                paperId={paperId}
                className="h-full"
              />
            }
            defaultLeftPercentage={tripleLeftPercentage}
            defaultRightPercentage={tripleRightPercentage}
            onSplitChange={handleTripleSplitChange}
            minPanelWidth={250}
          />
        ) : isPdfOpen && hasPDF() ? (
          /* Split View avec PDF à droite */
          <SplitView
            leftPanel={
              <div className="h-full bg-white dark:bg-gray-800">
                <BlockEditor
                  articleId={paperId.toString()}
                  initialBlocks={blocks}
                  onSave={saveNotes}
                />
              </div>
            }
            rightPanel={
              <PDFViewer
                paperId={paperId}
                className="h-full"
              />
            }
            defaultSplitPercentage={splitPercentage}
            onSplitChange={handleSplitChange}
            minLeftWidth={350}
            minRightWidth={350}
          />
        ) : isAIChatOpen && hasPDF() ? (
          /* Split View avec Chat IA à gauche */
          <SplitView
            leftPanel={
              <div className="h-full bg-white dark:bg-gray-800">
                <AIChat paper={paper} />
              </div>
            }
            rightPanel={
              <div className="h-full bg-white dark:bg-gray-800">
                <BlockEditor
                  articleId={paperId.toString()}
                  initialBlocks={blocks}
                  onSave={saveNotes}
                />
              </div>
            }
            defaultSplitPercentage={aiChatSplitPercentage}
            onSplitChange={handleAIChatSplitChange}
            minLeftWidth={350}
            minRightWidth={350}
          />
        ) : (
          /* Vue normale - Notes uniquement */
          <div className="h-full">
            <BlockEditor
              articleId={paperId.toString()}
              initialBlocks={blocks}
              onSave={saveNotes}
            />
          </div>
        )}
      </div>

      {/* Boutons flottants pour les vues split */}
      {hasPDF() && (
        <>
          {/* Bouton PDF - à droite */}
          <button
            onClick={handlePDFToggle}
            className={`fixed right-4 top-1/2 transform -translate-y-1/2 z-20 transition-all duration-300 group ${
              isPdfOpen
                ? 'bg-red-600 hover:bg-red-700 shadow-lg'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-700 hover:shadow-lg'
            } rounded-full p-3`}
            title={isPdfOpen ? "Fermer le PDF" : "Ouvrir le PDF en split view"}
          >
            <div className={`transition-all duration-300 ${
              isPdfOpen ? 'scale-100 opacity-100' : 'scale-75 opacity-60 group-hover:scale-100 group-hover:opacity-100'
            }`}>
              {isPdfOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <PanelRightOpen className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </div>
          </button>

          {/* Bouton Chat IA - à gauche */}
          <button
            onClick={handleAIChatToggle}
            className={`fixed left-4 top-1/2 transform -translate-y-1/2 z-20 transition-all duration-300 group ${
              isAIChatOpen
                ? 'bg-purple-600 hover:bg-purple-700 shadow-lg'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-700 hover:shadow-lg'
            } rounded-full p-3`}
            title={isAIChatOpen ? "Fermer le Chat IA" : "Ouvrir le Chat IA en split view"}
          >
            <div className={`transition-all duration-300 ${
              isAIChatOpen ? 'scale-100 opacity-100' : 'scale-75 opacity-60 group-hover:scale-100 group-hover:opacity-100'
            }`}>
              {isAIChatOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <MessageCircle className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </div>
          </button>
        </>
      )}
    </div>
  );
};

export default PaperNotes;