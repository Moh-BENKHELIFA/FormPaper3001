import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { Paper } from '../types/Paper';

interface AIChatProps {
  paper: Paper;
}

interface Citation {
  text: string;
  score: number;
  key: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai' | 'error';
  content: string;
  timestamp: Date;
  errorType?: 'token_limit' | 'network' | 'other';
  suggestion?: string;
  citations?: Citation[];
}

const AIChat: React.FC<AIChatProps> = ({ paper }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<'ollama' | 'groq'>('ollama');
  const [installedModels, setInstalledModels] = useState<any[]>([]);
  const [groqModels, setGroqModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama3.1:8b');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // PaperQA states
  const [usePaperQA, setUsePaperQA] = useState(false);
  const [paperQAAvailable, setPaperQAAvailable] = useState(false);
  const [paperQAIndexed, setPaperQAIndexed] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(0);

  useEffect(() => {
    checkPaperQAHealth();
    loadContext();
    loadChatHistory();
    loadAISettings();
  }, [paper.id]);

  // Trigger indexation when PaperQA is toggled on
  useEffect(() => {
    if (usePaperQA && paperQAAvailable && !paperQAIndexed && !indexing) {
      indexWithPaperQA();
    }
  }, [usePaperQA]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkPaperQAHealth = async () => {
    try {
      const response = await fetch('/api/paperqa/health');
      const data = await response.json();
      setPaperQAAvailable(data.available);

      if (data.available) {
        // Check if paper is already indexed
        const statusResponse = await fetch(`/api/paperqa/status/${paper.id}`);
        const statusData = await statusResponse.json();
        setPaperQAIndexed(statusData.indexed);
        console.log(`📊 PaperQA available. Paper ${paper.id} indexed: ${statusData.indexed}`);
      }
    } catch (err) {
      console.log('⚠️  PaperQA service not available');
      setPaperQAAvailable(false);
    }
  };

  const indexWithPaperQA = async () => {
    try {
      setIndexing(true);
      setIndexingProgress(0);
      console.log(`🔨 Indexing paper ${paper.id} with PaperQA...`);

      // Simulate progress over 5 minutes (estimated time)
      const progressInterval = setInterval(() => {
        setIndexingProgress(prev => {
          if (prev >= 95) return 95; // Don't go to 100% until actually complete
          return prev + 1;
        });
      }, 3000); // Increment every 3 seconds

      const response = await fetch('/api/paperqa/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId: paper.id,
          ollamaModel: 'llama3.1:8b'
        }),
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (data.success) {
        console.log(`✅ PaperQA indexation completed: ${data.chunks} chunks`);
        setIndexingProgress(100);
        setPaperQAIndexed(true);

        // Wait a bit to show 100% before hiding
        setTimeout(() => {
          setIndexing(false);
          setIndexingProgress(0);
        }, 1000);

        const welcomeMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: `✅ Indexation PaperQA terminée ! L'article "${paper.title}" a été analysé et indexé avec ${data.chunks} chunks. Je peux maintenant répondre à vos questions avec des citations précises.`,
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      } else {
        clearInterval(progressInterval);
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('❌ Error indexing with PaperQA:', err);
      setIndexing(false);
      setIndexingProgress(0);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'indexation');
    }
  };

  const loadContext = async () => {
    try {
      setContextLoading(true);
      setError(null);

      // If PaperQA is available and enabled, use it
      if (usePaperQA && paperQAAvailable) {
        if (!paperQAIndexed) {
          await indexWithPaperQA();
        } else {
          const welcomeMessage: Message = {
            id: Date.now().toString(),
            type: 'ai',
            content: `Bonjour ! L'article "${paper.title}" est déjà indexé avec PaperQA. Je peux répondre à vos questions avec des citations précises. Que souhaitez-vous savoir ?`,
            timestamp: new Date(),
          };
          setMessages([welcomeMessage]);
        }
        setContextLoading(false);
        return;
      }

      console.log(`📄 Loading context for paper ${paper.id}`);

      // Extract PDF text (classic mode)
      const response = await fetch('/api/pdf/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paperId: paper.id }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement du document');
      }

      const data = await response.json();

      if (data.success) {
        console.log(`✅ PDF loaded: ${data.data.pages} pages, ${data.data.text.length} characters`);
        setContextLoading(false);

        const welcomeMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: `Bonjour ! J'ai chargé l'article "${paper.title}" de ${paper.authors}. Je peux maintenant répondre à vos questions sur ce document. Que souhaitez-vous savoir ?`,
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      } else {
        throw new Error(data.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      console.error('❌ Error loading context:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du contexte');
      setContextLoading(false);
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`/api/chat/history/${paper.id}`);

      if (!response.ok) {
        console.error('Erreur lors du chargement de l\'historique');
        return;
      }

      const data = await response.json();

      if (data.success && data.data.exists && data.data.messages.length > 0) {
        const messagesWithDates = data.data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
        console.log(`✅ ${messagesWithDates.length} messages chargés depuis l'historique`);
      }
    } catch (err) {
      console.error('Erreur chargement historique:', err);
    }
  };

  const saveChatHistory = async (messagesToSave: Message[]) => {
    try {
      await fetch(`/api/chat/history/${paper.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: messagesToSave }),
      });
    } catch (err) {
      console.error('Erreur sauvegarde historique:', err);
    }
  };

  const loadAISettings = async () => {
    try {
      const settingsResponse = await fetch('/api/settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        if (settingsData.success) {
          const provider = settingsData.data.aiProvider || 'ollama';
          setAiProvider(provider);

          if (provider === 'groq') {
            const groqResponse = await fetch('/api/groq/models');
            if (groqResponse.ok) {
              const groqData = await groqResponse.json();
              if (groqData.success && groqData.data) {
                setGroqModels(groqData.data);
                const defaultModel = groqData.data.find((m: any) => m.recommended);
                if (defaultModel) {
                  setSelectedModel(defaultModel.name);
                } else if (groqData.data.length > 0) {
                  setSelectedModel(groqData.data[0].name);
                }
              }
            }
          } else {
            const ollamaResponse = await fetch('/api/ollama/models/installed');
            if (ollamaResponse.ok) {
              const ollamaData = await ollamaResponse.json();
              if (ollamaData.success && ollamaData.data) {
                setInstalledModels(ollamaData.data);
                if (ollamaData.data.length > 0 && !ollamaData.data.some((m: any) => m.name === selectedModel)) {
                  setSelectedModel(ollamaData.data[0].name);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Erreur chargement paramètres IA:', err);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date(),
    };

    const newUserMessage = userMessage;
    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      let response, data;

      // Use PaperQA if enabled and available
      if (usePaperQA && paperQAAvailable && paperQAIndexed) {
        console.log(`🔍 PaperQA query for paper ${paper.id}: "${message}"`);

        response = await fetch('/api/paperqa/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paperId: paper.id,
            question: message,
            llmModel: selectedModel
          }),
        });

        data = await response.json();
        console.log('PaperQA response:', data);

        if (data.success) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: data.formatted_answer || data.response,
            timestamp: new Date(),
            citations: data.citations || []
          };

          setMessages(prev => {
            const updatedMessages = [...prev, aiMessage];
            saveChatHistory(updatedMessages);
            return updatedMessages;
          });
          setIsLoading(false);
          return;
        }
      } else {
        // Classic mode
        console.log(`💬 Sending chat message for paper ${paper.id}: "${message}"`);

        // Get PDF context
        const pdfResponse = await fetch('/api/pdf/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paperId: paper.id }),
        });

        const pdfData = await pdfResponse.json();
        const context = pdfData.success ? pdfData.data.text : null;

        // Send chat message
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message,
            context: context,
            modelName: selectedModel,
            history: messages,
            provider: aiProvider
          }),
        });

        data = await response.json();
        console.log('Chat response:', data);
      }

      if (!response.ok || !data.success) {
        let errorContent = 'Désolé, une erreur s\'est produite lors de la communication avec l\'IA.';
        let errorType: 'token_limit' | 'network' | 'other' = 'other';
        let suggestion = '';

        if (data.error === 'token_limit_exceeded') {
          errorContent = data.message || 'Limite de tokens dépassée';
          errorType = 'token_limit';
          suggestion = data.details?.suggestion || 'Essayez un modèle avec une limite plus élevée';
        } else if (response.status === 413) {
          errorContent = 'Le document est trop volumineux pour ce modèle';
          errorType = 'token_limit';
          suggestion = 'Utilisez llama-3.3-70b-versatile ou réduisez la taille du document';
        }

        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'error',
          content: errorContent,
          timestamp: new Date(),
          errorType,
          suggestion
        };

        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.data?.response || 'Pas de réponse',
        timestamp: new Date(),
      };

      setMessages(prev => {
        const updatedMessages = [...prev, aiMessage];
        saveChatHistory(updatedMessages);
        return updatedMessages;
      });

    } catch (err) {
      console.error('❌ Error chat:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'error',
        content: 'Erreur de connexion avec le serveur. Veuillez vérifier que le backend est en cours d\'exécution.',
        timestamp: new Date(),
        errorType: 'network'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  if (contextLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center space-x-3">
            <Bot className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Assistant IA avec RAG</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{paper.title}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">Chargement du document...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center space-x-3">
            <Bot className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Assistant IA</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{paper.title}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Erreur de chargement</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{error}</p>
            <button
              onClick={loadContext}
              className="btn-primary mt-4"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Model selector and PaperQA toggle */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 space-y-2">
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {aiProvider === 'groq' ? 'Groq' : 'Ollama'} :
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="flex-1 text-sm border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            disabled={isLoading}
          >
            {aiProvider === 'groq' ? (
              groqModels.length === 0 ? (
                <option value="">Aucun modèle Groq disponible</option>
              ) : (
                groqModels.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.displayName || model.name}
                  </option>
                ))
              )
            ) : (
              installedModels.length === 0 ? (
                <option value="">Aucun modèle installé</option>
              ) : (
                installedModels.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name} {model.size ? `(${(model.size / 1024 / 1024 / 1024).toFixed(1)} GB)` : ''}
                  </option>
                ))
              )
            )}
          </select>
        </div>

        {/* PaperQA Toggle */}
        <div className="flex items-center space-x-2 pt-1">
          <input
            type="checkbox"
            id="paperqa-toggle"
            checked={usePaperQA}
            onChange={(e) => setUsePaperQA(e.target.checked)}
            disabled={!paperQAAvailable || indexing}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="paperqa-toggle" className="text-sm flex items-center gap-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              PaperQA (Citations précises)
            </span>
            {!paperQAAvailable && (
              <span className="text-xs text-red-500">● Service indisponible</span>
            )}
            {paperQAAvailable && !paperQAIndexed && usePaperQA && (
              <span className="text-xs text-orange-500">⚠️ Indexation requise</span>
            )}
            {paperQAAvailable && paperQAIndexed && (
              <span className="text-xs text-green-500">✓ Indexé</span>
            )}
            {indexing && (
              <span className="text-xs text-blue-500">⏳ Indexation en cours... {indexingProgress}%</span>
            )}
          </label>
        </div>

        {/* Progress Bar */}
        {indexing && (
          <div className="pt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${indexingProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              {indexingProgress < 30 ? 'Analyse du PDF...' :
               indexingProgress < 60 ? 'Création des embeddings...' :
               indexingProgress < 90 ? 'Indexation avec Ollama...' :
               indexingProgress < 100 ? 'Finalisation...' : 'Terminé !'}
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-3 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.type === 'error'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-purple-100 text-purple-600'
              }`}>
                {message.type === 'user' ? (
                  <User className="w-4 h-4" />
                ) : message.type === 'error' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              <div className={`rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.type === 'error'
                  ? 'bg-red-100 dark:bg-red-900 border-2 border-red-500 text-red-900 dark:text-red-100'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}>
                <p className="whitespace-pre-wrap font-medium">{message.content}</p>

                {/* Citations PaperQA */}
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      📚 Citations ({message.citations.length}) :
                    </p>
                    <div className="space-y-2">
                      {message.citations.map((citation, idx) => (
                        <div key={idx} className="text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600">
                          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            [{idx + 1}] Score: {citation.score.toFixed(2)}
                          </p>
                          <p className="italic text-gray-600 dark:text-gray-400">
                            "{citation.text.substring(0, 150)}{citation.text.length > 150 ? '...' : ''}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {message.suggestion && (
                  <p className="text-sm mt-2 opacity-90 border-t border-red-300 dark:border-red-700 pt-2">
                    💡 {message.suggestion}
                  </p>
                )}
                <p className={`text-xs mt-1 ${
                  message.type === 'user'
                    ? 'text-blue-100'
                    : message.type === 'error'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3 max-w-3xl">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>L'IA recherche dans les sections pertinentes...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question sur l'article..."
            className="flex-1 resize-none border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>Envoyer</span>
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne • Utilise RAG pour rechercher dans le document
        </p>
      </form>
    </div>
  );
};

export default AIChat;
