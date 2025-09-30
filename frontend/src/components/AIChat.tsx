import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, AlertCircle } from 'lucide-react';
import { Paper } from '../types/Paper';

interface AIChatProps {
  paper: Paper;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const AIChat: React.FC<AIChatProps> = ({ paper }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pdfContext, setPdfContext] = useState<string | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installedModels, setInstalledModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama3.1:8b');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    extractPdfText();
    loadChatHistory();
    loadInstalledModels();
  }, [paper.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        // Convertir les timestamps en objets Date
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

  const loadInstalledModels = async () => {
    try {
      const response = await fetch('/api/ollama/models/installed');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setInstalledModels(data.data);
          // Si le modèle par défaut n'est pas installé, prendre le premier disponible
          if (data.data.length > 0 && !data.data.some((m: any) => m.name === selectedModel)) {
            setSelectedModel(data.data[0].name);
          }
        }
      }
    } catch (err) {
      console.error('Erreur chargement modèles:', err);
    }
  };

  const extractPdfText = async () => {
    try {
      setContextLoading(true);
      setError(null);

      const response = await fetch('/api/pdf/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paperId: paper.id }),
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de l'extraction du PDF: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('PDF extraction response:', data);
      setPdfContext(data.data?.text || data.text);

      // Message de bienvenue avec contexte du document
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `Bonjour ! J'ai analysé l'article "${paper.title}" de ${paper.authors}. Je peux maintenant répondre à vos questions sur ce document. Que souhaitez-vous savoir ?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);

    } catch (err) {
      console.error('Erreur extraction PDF:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du document');
    } finally {
      setContextLoading(false);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading || !pdfContext) return;

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          context: pdfContext,
          modelName: selectedModel,
          history: messages // Envoyer l'historique à l'IA
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de la communication avec l'IA: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('AI response:', data);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.data?.response || data.response || 'Pas de réponse',
        timestamp: new Date(),
      };

      setMessages(prev => {
        const updatedMessages = [...prev, aiMessage];
        // Sauvegarder l'historique après chaque échange
        saveChatHistory(updatedMessages);
        return updatedMessages;
      });

    } catch (err) {
      console.error('Erreur chat:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Désolé, une erreur s\'est produite lors de la communication avec l\'IA. Veuillez réessayer.',
        timestamp: new Date(),
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
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Assistant IA</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{paper.title}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Analyse du document en cours...</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Extraction du texte PDF</p>
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
              onClick={extractPdfText}
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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center space-x-3">
          <Bot className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Assistant IA</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-md">{paper.title}</p>
          </div>
        </div>
      </div>

      {/* Sélecteur de modèle */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Modèle IA :</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="flex-1 text-sm border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            disabled={isLoading}
          >
            {installedModels.length === 0 ? (
              <option value="">Aucun modèle installé</option>
            ) : (
              installedModels.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name} {model.size ? `(${(model.size / 1024 / 1024 / 1024).toFixed(1)} GB)` : ''}
                </option>
              ))
            )}
          </select>
        </div>
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
                  : 'bg-purple-100 text-purple-600'
              }`}>
                {message.type === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              <div className={`rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
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
                  <span>L'IA analyse votre question...</span>
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
          Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne
        </p>
      </form>
    </div>
  );
};

export default AIChat;