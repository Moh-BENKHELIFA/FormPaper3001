import React, { useState, useRef, useEffect } from 'react';
import { GripVertical, Trash2, Copy } from 'lucide-react';
import { Block } from '../../types/BlockTypes';

interface BaseBlockProps {
  block: Block;
  index: number;
  isSelected: boolean;
  isFocused: boolean;
  onUpdate: (index: number, block: Block) => void;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  onFocus: (index: number) => void;
  onEnterPressed: (index: number) => void;
  onDragStart?: (index: number) => void;
  onDragEnd?: () => void;
  onDragOver?: (index: number) => void;
  onDrop?: (index: number) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  children: React.ReactNode;
  className?: string;
}

const BaseBlock: React.FC<BaseBlockProps> = ({
  block,
  index,
  isSelected,
  isFocused,
  onUpdate,
  onDelete,
  onDuplicate,
  onFocus,
  onEnterPressed,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging = false,
  isDropTarget = false,
  children,
  className = '',
}) => {
  const [isDragHovered, setIsDragHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    setShowActions(true);
    setIsDragHovered(true);
  };

  const handleMouseLeave = () => {
    setShowActions(false);
    setIsDragHovered(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', block.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver?.(index);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop?.(index);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  const handleClick = () => {
    onFocus(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't handle Enter at BaseBlock level - let individual blocks handle it
    return;
  };

  return (
    <div className="flex items-start group" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {/* Block Container */}
      <div
        ref={blockRef}
        className={`
          flex-1 relative transition-all duration-200 rounded-lg
          ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
          ${isFocused ? 'bg-blue-50' : (!isSelected ? 'hover:bg-gray-50' : '')}
          ${isDragging ? 'opacity-50 transform rotate-1' : ''}
          ${isDropTarget ? 'ring-2 ring-green-400 bg-green-50' : ''}
          ${className}
        `}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {/* Drag Handle */}
        <div
          className={`
            absolute left-0 top-0 h-full w-8 flex items-center justify-center cursor-grab
            transition-opacity duration-200 z-10
            ${showActions ? 'opacity-100' : 'opacity-0'}
            hover:bg-gray-200 rounded-l-lg
            ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
          `}
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Block Content */}
        <div className="pl-8 pr-4 py-2 min-h-[40px] flex items-center">
          {children}
        </div>
      </div>

      {/* Action Buttons - Outside and attached to the right */}
      <div
        className={`
          flex items-center space-x-1 ml-2 flex-shrink-0
          transition-opacity duration-200
          ${showActions ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(index);
          }}
          className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 bg-white shadow-sm border border-gray-200"
          title="Dupliquer le bloc"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(index);
          }}
          className="p-1 rounded hover:bg-red-100 text-gray-500 hover:text-red-600 bg-white shadow-sm border border-gray-200"
          title="Supprimer le bloc"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default BaseBlock;