import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { CodeBlockData } from '../../types/BlockTypes';
import { blockFactory } from '../../utils/blockFactory';

interface CodeBlockProps {
  block: CodeBlockData;
  isSelected: boolean;
  isFocused: boolean;
  onUpdate: (block: CodeBlockData) => void;
  onDelete: () => void;
  onEnterPressed: () => void;
  readonly?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  block,
  isSelected,
  isFocused,
  onUpdate,
  onDelete,
  onEnterPressed,
  readonly = false,
}) => {
  const [content, setContent] = useState(block.content);
  const [language, setLanguage] = useState(block.language || '');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(block.content);
    setLanguage(block.language || '');
  }, [block.content, block.language]);

  useEffect(() => {
    if (isFocused && textareaRef.current) {
      textareaRef.current.focus();
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isFocused]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(textareaRef.current.scrollHeight, 100) + 'px';
    }
  }, [content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    const updatedBlock = blockFactory.updateBlock(block, { content: newContent });
    onUpdate(updatedBlock);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);

    const updatedBlock = blockFactory.updateBlock(block, { language: newLanguage });
    onUpdate(updatedBlock);
  };

  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);

      const updatedBlock = blockFactory.updateBlock(block, { content: newContent });
      onUpdate(updatedBlock);
    }

    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      onEnterPressed();
    }

    if (e.key === 'Backspace' && content === '' && !readonly) {
      e.preventDefault();
      onDelete();
    }
  };

  const handleLanguageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      textareaRef.current?.focus();
    }
  };

  const handleContentBlur = () => {
    if (content !== block.content) {
      const updatedBlock = blockFactory.updateBlock(block, { content });
      onUpdate(updatedBlock);
    }
  };

  const handleLanguageBlur = () => {
    if (language !== block.language) {
      const updatedBlock = blockFactory.updateBlock(block, { language });
      onUpdate(updatedBlock);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="w-full">
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <input
            type="text"
            value={language}
            onChange={handleLanguageChange}
            onKeyDown={handleLanguageKeyDown}
            onBlur={handleLanguageBlur}
            placeholder="Langage (ex: javascript, python, sql...)"
            className="bg-transparent border-none outline-none text-gray-300 placeholder-gray-500 text-sm"
            disabled={readonly}
          />
          {content && (
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 text-gray-400 hover:text-gray-200 text-sm"
              disabled={readonly}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copié!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copier</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Code content */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleContentKeyDown}
            onBlur={handleContentBlur}
            placeholder="Tapez votre code ici... (Tab pour indenter, Ctrl+Enter pour nouvelle ligne)"
            className={`
              w-full resize-none border-none outline-none bg-gray-900
              text-gray-100 placeholder-gray-500 font-mono text-sm
              p-4 leading-relaxed
              ${readonly ? 'cursor-default' : 'cursor-text'}
            `}
            style={{
              minHeight: '100px',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              lineHeight: '1.6',
              tabSize: 2,
            }}
            disabled={readonly}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};

export default CodeBlock;