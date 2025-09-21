import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { useToast } from '../contexts/ToastContext';
import { paperService } from '../services/paperService';
import { notesStorage } from '../services/notesStorage';
import { Paper } from '../types/Paper';
import { Block } from '../types/BlockTypes';

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
      const notesData = notesStorage.loadNotes(paperId);
      setBlocks(notesData);
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotes = async () => {
    try {
      setIsSaving(true);
      notesStorage.saveNotes(paperId, blocks);
      success('Notes sauvegardées');
    } catch (err) {
      error('Erreur', 'Impossible de sauvegarder les notes');
    } finally {
      setIsSaving(false);
    }
  };

  const addTextBlock = () => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type: 'text',
      content: '',
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (index: number, updatedBlock: Block) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updatedBlock;
    setBlocks(newBlocks);
  };

  const deleteBlock = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
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
              onClick={saveNotes}
              disabled={isSaving}
              className="btn-primary flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-96">
          <div className="p-6">
            {blocks.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucune note
                </h3>
                <p className="text-gray-500 mb-6">
                  Commencez à prendre des notes sur cet article
                </p>
                <button
                  onClick={addTextBlock}
                  className="btn-primary"
                >
                  Ajouter une note
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <div key={block.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      <textarea
                        value={block.content}
                        onChange={(e) => updateBlock(index, { ...block, content: e.target.value })}
                        placeholder="Écrivez votre note ici..."
                        className="flex-1 border-none outline-none resize-none min-h-[100px]"
                      />
                      <button
                        onClick={() => deleteBlock(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addTextBlock}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                >
                  + Ajouter une note
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaperNotes;