import React, { useState, useRef, useEffect } from 'react';
import { QuoteBlockData } from '../../types/BlockTypes';
import { blockFactory } from '../../utils/blockFactory';

interface QuoteBlockProps {
  block: QuoteBlockData;
  isSelected: boolean;
  isFocused: boolean;
  onUpdate: (block: QuoteBlockData) => void;
  onDelete: () => void;
  onEnterPressed: () => void;
  readonly?: boolean;
}

const QuoteBlock: React.FC<QuoteBlockProps> = ({
  block,
  isSelected,
  isFocused,
  onUpdate,
  onDelete,
  onEnterPressed,
  readonly = false,
}) => {
  const [content, setContent] = useState(block.content);
  const [author, setAuthor] = useState(block.author || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const authorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContent(block.content);
    setAuthor(block.author || '');
  }, [block.content, block.author]);

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
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    const updatedBlock = blockFactory.updateBlock(block, { content: newContent });
    onUpdate(updatedBlock);
  };

  const handleAuthorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAuthor = e.target.value;
    setAuthor(newAuthor);

    const updatedBlock = blockFactory.updateBlock(block, { author: newAuthor });
    onUpdate(updatedBlock);
  };

  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnterPressed();
    }

    if (e.key === 'Backspace' && content === '' && author === '' && !readonly) {
      e.preventDefault();
      onDelete();
    }
  };

  const handleAuthorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnterPressed();
    }
  };

  const handleContentBlur = () => {
    if (content !== block.content) {
      const updatedBlock = blockFactory.updateBlock(block, { content });
      onUpdate(updatedBlock);
    }
  };

  const handleAuthorBlur = () => {
    if (author !== block.author) {
      const updatedBlock = blockFactory.updateBlock(block, { author });
      onUpdate(updatedBlock);
    }
  };

  return (
    <div className="w-full">
      <div className="border-l-4 border-gray-300 pl-4 py-2 bg-gray-50 rounded-r-lg">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleContentKeyDown}
          onBlur={handleContentBlur}
          placeholder="Votre citation..."
          className={`
            w-full resize-none border-none outline-none bg-transparent
            text-gray-700 placeholder-gray-400 italic text-lg
            ${readonly ? 'cursor-default' : 'cursor-text'}
          `}
          style={{
            minHeight: '1.5rem',
            fontFamily: 'inherit',
            lineHeight: '1.6',
          }}
          disabled={readonly}
          rows={1}
        />
        {(author || !readonly) && (
          <div className="mt-2">
            <input
              ref={authorInputRef}
              type="text"
              value={author}
              onChange={handleAuthorChange}
              onKeyDown={handleAuthorKeyDown}
              onBlur={handleAuthorBlur}
              placeholder="— Auteur"
              className={`
                border-none outline-none bg-transparent
                text-gray-600 placeholder-gray-400 text-sm font-medium
                ${readonly ? 'cursor-default' : 'cursor-text'}
              `}
              disabled={readonly}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteBlock;