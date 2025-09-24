import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Block, BlockType } from '../types/BlockTypes';
import { blockFactory } from '../utils/blockFactory';
import { SlashCommandMatcher, SLASH_COMMANDS } from '../utils/slashCommands';
import { imageService } from '../services/imageService';

// Import all block components
import BaseBlock from './blocks/BaseBlock';
import TextBlock from './blocks/TextBlock';
import HeadingBlock from './blocks/HeadingBlock';
import ListBlock from './blocks/ListBlock';
import QuoteBlock from './blocks/QuoteBlock';
import CodeBlock from './blocks/CodeBlock';
import ImageBlock from './blocks/ImageBlock';
import TableBlock from './blocks/TableBlock';
import TodoBlock from './blocks/TodoBlock';

interface BlockEditorProps {
  articleId?: string;
  initialBlocks?: Block[];
  readonly?: boolean;
  onSave?: (blocks: Block[]) => void;
}

interface SlashCommandSuggestion {
  id: string;
  label: string;
  description: string;
  icon: string;
  type: BlockType;
}

const BlockEditor: React.FC<BlockEditorProps> = ({
  articleId,
  initialBlocks = [],
  readonly = false,
  onSave,
}) => {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [focusedBlockIndex, setFocusedBlockIndex] = useState<number | null>(null);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashSuggestions, setSlashSuggestions] = useState<SlashCommandSuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [slashMenuPosition, setSlashMenuPosition] = useState<{x: number, y: number} | null>(null);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize with empty text block if no blocks
  useEffect(() => {
    if (blocks.length === 0) {
      const initialBlock = blockFactory.createBlock('text');
      setBlocks([initialBlock]);
      setFocusedBlockIndex(0);
    }
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (blocks.length > 0 && onSave) {
      const timeoutId = setTimeout(() => {
        onSave(blocks);
      }, 1000); // Auto-save after 1 second of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [blocks, onSave]);

  const handleBlockUpdate = useCallback((index: number, updatedBlock: Block) => {
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      newBlocks[index] = {
        ...updatedBlock,
        order: index,
        updatedAt: new Date().toISOString(),
      };
      return newBlocks;
    });

    // Handle slash command detection in text blocks
    if (updatedBlock.type === 'text' && 'content' in updatedBlock) {
      const content = updatedBlock.content as string;
      if (SlashCommandMatcher.isSlashCommand(content)) {
        setSlashQuery(content);
        const suggestions = SlashCommandMatcher.searchCommands(content);
        setSlashSuggestions(suggestions);
        setShowSlashCommands(suggestions.length > 0);
        setSelectedSuggestionIndex(0);

        // Calculate menu position based on current block
        setTimeout(() => {
          const blockElement = blockRefs.current[index];
          if (blockElement && editorRef.current) {
            const blockRect = blockElement.getBoundingClientRect();
            const editorRect = editorRef.current.getBoundingClientRect();
            setSlashMenuPosition({
              x: blockRect.left - editorRect.left + 50,
              y: blockRect.bottom - editorRect.top + 10
            });
          }
        }, 0);
      } else {
        setShowSlashCommands(false);
        setSlashQuery('');
        setSlashMenuPosition(null);
      }
    }
  }, []);

  const handleBlockDelete = useCallback((index: number) => {
    if (blocks.length === 1) {
      // If it's the only block, replace with empty text block
      const newBlock = blockFactory.createBlock('text');
      setBlocks([newBlock]);
      setFocusedBlockIndex(0);
    } else {
      setBlocks(prevBlocks => {
        const newBlocks = prevBlocks.filter((_, i) => i !== index);
        return newBlocks.map((block, i) => ({ ...block, order: i }));
      });

      // Adjust focus
      const newFocusIndex = Math.max(0, index - 1);
      setFocusedBlockIndex(newFocusIndex);
    }
  }, [blocks.length]);

  const handleBlockDuplicate = useCallback((index: number) => {
    const blockToDuplicate = blocks[index];
    const duplicatedBlock = {
      ...blockFactory.createBlock(blockToDuplicate.type),
      ...(blockToDuplicate as any), // Copy all properties
      id: blockFactory.generateId(), // Generate new ID
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      newBlocks.splice(index + 1, 0, duplicatedBlock);
      return newBlocks.map((block, i) => ({ ...block, order: i }));
    });

    setFocusedBlockIndex(index + 1);
  }, [blocks]);

  const handleBlockFocus = useCallback((index: number) => {
    setFocusedBlockIndex(index);
    setSelectedBlockIndex(index);
  }, []);

  const handleEnterPressed = useCallback((index: number) => {
    // Hide slash commands when creating new block
    setShowSlashCommands(false);
    setSlashQuery('');

    // Create new text block after current block
    const newBlock = blockFactory.createBlock('text');
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks.map((block, i) => ({ ...block, order: i }));
    });

    // Focus the new block
    setTimeout(() => {
      setFocusedBlockIndex(index + 1);
    }, 0);
  }, []);

  const handleSlashCommandSelect = useCallback((command: SlashCommandSuggestion) => {
    if (focusedBlockIndex === null) return;

    // Replace current block with the selected block type
    const newBlock = blockFactory.createBlock(command.type);
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      newBlocks[focusedBlockIndex] = {
        ...newBlock,
        order: focusedBlockIndex,
      };
      return newBlocks;
    });

    setShowSlashCommands(false);
    setSlashQuery('');

    // Refocus the block
    setTimeout(() => {
      setFocusedBlockIndex(focusedBlockIndex);
    }, 0);
  }, [focusedBlockIndex]);

  const handleBlockDragStart = useCallback((index: number) => {
    setDraggedBlockIndex(index);
  }, []);

  const handleBlockDragEnd = useCallback(() => {
    setDraggedBlockIndex(null);
    setDropTargetIndex(null);
  }, []);

  const handleBlockDragOver = useCallback((index: number) => {
    if (draggedBlockIndex !== null && draggedBlockIndex !== index) {
      setDropTargetIndex(index);
    }
  }, [draggedBlockIndex]);

  const handleBlockDrop = useCallback((targetIndex: number) => {
    if (draggedBlockIndex !== null && draggedBlockIndex !== targetIndex) {
      setBlocks(prevBlocks => {
        const newBlocks = [...prevBlocks];
        const draggedBlock = newBlocks[draggedBlockIndex];

        // Remove the dragged block
        newBlocks.splice(draggedBlockIndex, 1);

        // Calculate the new insertion index
        const insertIndex = draggedBlockIndex < targetIndex ? targetIndex - 1 : targetIndex;

        // Insert the block at the new position
        newBlocks.splice(insertIndex, 0, draggedBlock);

        // Update the order of all blocks
        return newBlocks.map((block, i) => ({ ...block, order: i }));
      });

      // Update focus to follow the moved block
      const newIndex = draggedBlockIndex < targetIndex ? targetIndex - 1 : targetIndex;
      setFocusedBlockIndex(newIndex);
      setSelectedBlockIndex(newIndex);
    }

    setDraggedBlockIndex(null);
    setDropTargetIndex(null);
  }, [draggedBlockIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showSlashCommands) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex(prev =>
            Math.min(prev + 1, slashSuggestions.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (slashSuggestions[selectedSuggestionIndex]) {
            handleSlashCommandSelect(slashSuggestions[selectedSuggestionIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSlashCommands(false);
          setSlashQuery('');
          break;
      }
    }

    // Handle Ctrl+V for pasting images
    if (e.ctrlKey && e.key === 'v') {
      // Let the paste event handler take care of this
      return;
    }
  }, [showSlashCommands, slashSuggestions, selectedSuggestionIndex, handleSlashCommandSelect]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();

        const file = item.getAsFile();
        if (file && focusedBlockIndex !== null && articleId) {
          try {
            // Upload image to server
            const uploadResult = await imageService.uploadImage(file, articleId);

            const currentBlock = blocks[focusedBlockIndex];

            // Check if current block is empty (text block with no content)
            const isEmptyTextBlock = currentBlock?.type === 'text' &&
              ('content' in currentBlock) &&
              (!currentBlock.content || currentBlock.content.trim() === '');

            if (isEmptyTextBlock) {
              // Transform current empty block into image block
              const newImageBlock = blockFactory.createBlock('image', {
                url: uploadResult.url,
                alt: 'Image collée',
                caption: '',
                width: 100
              });

              setBlocks(prevBlocks => {
                const newBlocks = [...prevBlocks];
                newBlocks[focusedBlockIndex] = {
                  ...newImageBlock,
                  order: focusedBlockIndex,
                };
                return newBlocks;
              });
            } else {
              // Create new image block after current block
              const newImageBlock = blockFactory.createBlock('image', {
                url: uploadResult.url,
                alt: 'Image collée',
                caption: '',
                width: 100
              });

              const insertIndex = focusedBlockIndex + 1;

              setBlocks(prevBlocks => {
                const newBlocks = [...prevBlocks];
                newBlocks.splice(insertIndex, 0, newImageBlock);
                return newBlocks.map((block, i) => ({ ...block, order: i }));
              });

              // Focus the new image block
              setTimeout(() => {
                setFocusedBlockIndex(insertIndex);
              }, 0);
            }
          } catch (error) {
            console.error('Error uploading image:', error);
            // Fall back to temporary URL if upload fails
            const imageUrl = URL.createObjectURL(file);

            const currentBlock = blocks[focusedBlockIndex];
            const isEmptyTextBlock = currentBlock?.type === 'text' &&
              ('content' in currentBlock) &&
              (!currentBlock.content || currentBlock.content.trim() === '');

            const newImageBlock = blockFactory.createBlock('image', {
              url: imageUrl,
              alt: 'Image collée (temporaire)',
              caption: '',
              width: 100
            });

            if (isEmptyTextBlock) {
              setBlocks(prevBlocks => {
                const newBlocks = [...prevBlocks];
                newBlocks[focusedBlockIndex] = {
                  ...newImageBlock,
                  order: focusedBlockIndex,
                };
                return newBlocks;
              });
            } else {
              const insertIndex = focusedBlockIndex + 1;
              setBlocks(prevBlocks => {
                const newBlocks = [...prevBlocks];
                newBlocks.splice(insertIndex, 0, newImageBlock);
                return newBlocks.map((block, i) => ({ ...block, order: i }));
              });
              setTimeout(() => {
                setFocusedBlockIndex(insertIndex);
              }, 0);
            }
          }
        }
        break;
      }
    }
  }, [focusedBlockIndex, blocks, articleId]);

  const renderBlock = (block: Block, index: number) => {
    const isSelected = selectedBlockIndex === index;
    const isFocused = focusedBlockIndex === index;

    const commonProps = {
      block,
      isSelected,
      isFocused,
      onUpdate: (updatedBlock: Block) => handleBlockUpdate(index, updatedBlock),
      onDelete: () => handleBlockDelete(index),
      onEnterPressed: () => handleEnterPressed(index),
      readonly,
    };

    let blockComponent;
    switch (block.type) {
      case 'text':
        blockComponent = <TextBlock {...commonProps} block={block as any} />;
        break;
      case 'h1':
      case 'h2':
      case 'h3':
        blockComponent = <HeadingBlock {...commonProps} block={block as any} />;
        break;
      case 'list':
        blockComponent = <ListBlock {...commonProps} block={block as any} />;
        break;
      case 'quote':
        blockComponent = <QuoteBlock {...commonProps} block={block as any} />;
        break;
      case 'code':
        blockComponent = <CodeBlock {...commonProps} block={block as any} />;
        break;
      case 'image':
        blockComponent = <ImageBlock {...commonProps} block={block as any} articleId={articleId} />;
        break;
      case 'table':
        blockComponent = <TableBlock {...commonProps} block={block as any} />;
        break;
      case 'todo':
        blockComponent = <TodoBlock {...commonProps} block={block as any} />;
        break;
      default:
        blockComponent = <TextBlock {...commonProps} block={block as any} />;
    }

    return (
      <div
        key={block.id}
        ref={(el) => (blockRefs.current[index] = el)}
      >
        <BaseBlock
          block={block}
          index={index}
          isSelected={isSelected}
          isFocused={isFocused}
          onUpdate={handleBlockUpdate}
          onDelete={handleBlockDelete}
          onDuplicate={handleBlockDuplicate}
          onFocus={handleBlockFocus}
          onEnterPressed={handleEnterPressed}
          onDragStart={handleBlockDragStart}
          onDragEnd={handleBlockDragEnd}
          onDragOver={handleBlockDragOver}
          onDrop={handleBlockDrop}
          isDragging={draggedBlockIndex === index}
          isDropTarget={dropTargetIndex === index}
          className="mb-2"
        >
          {blockComponent}
        </BaseBlock>
      </div>
    );
  };

  return (
    <div
      ref={editorRef}
      className="w-full max-w-4xl mx-auto p-4 min-h-screen"
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      tabIndex={-1}
    >
      {/* Blocks */}
      <div className="space-y-1">
        {blocks.map((block, index) => renderBlock(block, index))}
      </div>

      {/* Slash Command Suggestions */}
      {showSlashCommands && slashSuggestions.length > 0 && focusedBlockIndex !== null && slashMenuPosition && (
        <div
          className="absolute bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-w-xs"
          style={{
            top: `${slashMenuPosition.y}px`,
            left: `${slashMenuPosition.x}px`
          }}
        >
          <div className="p-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 font-medium">BLOCS</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {slashSuggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => handleSlashCommandSelect(suggestion)}
                className={`
                  w-full text-left p-3 hover:bg-gray-50 flex items-center space-x-3
                  ${index === selectedSuggestionIndex ? 'bg-blue-50 border-r-2 border-blue-500' : ''}
                `}
              >
                <span className="text-lg">{suggestion.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{suggestion.label}</p>
                  <p className="text-xs text-gray-500 truncate">{suggestion.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs text-gray-600">
          <p>Blocs: {blocks.length}</p>
          <p>Focus: {focusedBlockIndex}</p>
          <p>Slash: {showSlashCommands ? slashQuery : 'none'}</p>
        </div>
      )}
    </div>
  );
};

export default BlockEditor;