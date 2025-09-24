import React from 'react';
import { SeparatorBlockData } from '../../types/BlockTypes';

interface SeparatorBlockProps {
  block: SeparatorBlockData;
  isSelected: boolean;
  isFocused: boolean;
  onUpdate: (block: SeparatorBlockData) => void;
  onDelete: () => void;
  onEnterPressed: () => void;
  readonly?: boolean;
}

const SeparatorBlock: React.FC<SeparatorBlockProps> = ({
  block,
  isSelected,
  isFocused,
  onUpdate,
  onDelete,
  onEnterPressed,
  readonly = false,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnterPressed();
    }

    if (e.key === 'Backspace' && !readonly) {
      e.preventDefault();
      onDelete();
    }
  };

  const getLineStyle = () => {
    const style = block.style || 'solid';
    const baseClasses = 'w-full h-px border-0 my-4';

    switch (style) {
      case 'dashed':
        return `${baseClasses} border-t border-dashed border-gray-300`;
      case 'dotted':
        return `${baseClasses} border-t border-dotted border-gray-300`;
      default:
        return `${baseClasses} bg-gray-300`;
    }
  };

  return (
    <div
      className={`w-full py-2 ${isSelected ? 'ring-1 ring-blue-500 rounded' : ''}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className={getLineStyle()} />
    </div>
  );
};

export default SeparatorBlock;