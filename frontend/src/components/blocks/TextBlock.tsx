import React, { useState, useRef, useEffect } from 'react';
import { TextBlockData } from '../../types/BlockTypes';
import { blockFactory } from '../../utils/blockFactory';

interface TextBlockProps {
  block: TextBlockData;
  isSelected: boolean;
  isFocused: boolean;
  onUpdate: (block: TextBlockData) => void;
  onDelete: () => void;
  onEnterPressed: () => void;
  readonly?: boolean;
}

const TextBlock: React.FC<TextBlockProps> = ({
  block,
  isSelected,
  isFocused,
  onUpdate,
  onDelete,
  onEnterPressed,
  readonly = false,
}) => {
  const [content, setContent] = useState(block.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(block.content);
  }, [block.content]);

  useEffect(() => {
    if (isFocused && textareaRef.current) {
      textareaRef.current.focus();
      // Position cursor at end
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isFocused]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    const updatedBlock = blockFactory.updateBlock(block, { content: newContent });
    onUpdate(updatedBlock);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Entrée et Maj+Entrée = saut de ligne (comportement par défaut du textarea)
    // Pas de création de nouveau bloc depuis TextBlock

    if (e.key === 'Backspace' && content === '' && !readonly) {
      e.preventDefault();
      onDelete();
    }
  };

  const handleBlur = () => {
    // Save changes on blur
    if (content !== block.content) {
      const updatedBlock = blockFactory.updateBlock(block, { content });
      onUpdate(updatedBlock);
    }
  };

  return (
    <div className="w-full">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Tapez votre texte ici... (ou '/' pour les commandes)"
        className={`
          w-full resize-none border-none outline-none bg-transparent
          text-gray-900 placeholder-gray-400
          ${readonly ? 'cursor-default' : 'cursor-text'}
        `}
        style={{
          minHeight: '1.5rem',
          fontFamily: 'inherit',
          fontSize: '1rem',
          lineHeight: '1.5',
        }}
        disabled={readonly}
        rows={1}
      />
    </div>
  );
};

export default TextBlock;