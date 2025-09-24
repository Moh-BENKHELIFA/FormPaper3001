import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
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
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={goToHome}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 line-clamp-1">
                  {paper.title}
                </h1>
                <p className="text-sm text-gray-500">
                  {paper.authors}
                </p>
              </div>
            </div>

            <button
              onClick={() => saveNotes(blocks)}
              disabled={isSaving}
              className="btn-primary flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
            </button>
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