import React, { useState, useRef, useEffect } from 'react';
import { HeadingBlockData } from '../../types/BlockTypes';
import { blockFactory } from '../../utils/blockFactory';

interface HeadingBlockProps {
  block: HeadingBlockData;
  isSelected: boolean;
  isFocused: boolean;
  onUpdate: (block: HeadingBlockData) => void;
  onDelete: () => void;
  onEnterPressed: () => void;
  readonly?: boolean;
}

const HeadingBlock: React.FC<HeadingBlockProps> = ({
  block,
  isSelected,
  isFocused,
  onUpdate,
  onDelete,
  onEnterPressed,
  readonly = false,
}) => {
  const [content, setContent] = useState(block.content);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContent(block.content);
  }, [block.content]);

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
      // Position cursor at end
      const length = inputRef.current.value.length;
      inputRef.current.setSelectionRange(length, length);
    }
  }, [isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    const updatedBlock = blockFactory.updateBlock(block, { content: newContent });
    onUpdate(updatedBlock);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnterPressed();
    }

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

  const getHeadingStyles = () => {
    switch (block.type) {
      case 'h1':
        return 'text-3xl font-bold text-gray-900';
      case 'h2':
        return 'text-2xl font-semibold text-gray-900';
      case 'h3':
        return 'text-xl font-medium text-gray-900';
      default:
        return 'text-lg font-medium text-gray-900';
    }
  };

  const getPlaceholder = () => {
    switch (block.type) {
      case 'h1':
        return 'Titre principal';
      case 'h2':
        return 'Sous-titre';
      case 'h3':
        return 'Sous-sous-titre';
      default:
        return 'Titre';
    }
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="text"
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={getPlaceholder()}
        className={`
          w-full border-none outline-none bg-transparent
          placeholder-gray-400
          ${getHeadingStyles()}
          ${readonly ? 'cursor-default' : 'cursor-text'}
        `}
        disabled={readonly}
      />
    </div>
  );
};

export default HeadingBlock;