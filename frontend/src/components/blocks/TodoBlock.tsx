import React, { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { TodoBlockData } from '../../types/BlockTypes';
import { blockFactory } from '../../utils/blockFactory';

interface TodoBlockProps {
  block: TodoBlockData;
  isSelected: boolean;
  isFocused: boolean;
  onUpdate: (block: TodoBlockData) => void;
  onDelete: () => void;
  onEnterPressed: () => void;
  readonly?: boolean;
}

const TodoBlock: React.FC<TodoBlockProps> = ({
  block,
  isSelected,
  isFocused,
  onUpdate,
  onDelete,
  onEnterPressed,
  readonly = false,
}) => {
  const [items, setItems] = useState(block.items || []);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setItems(block.items || []);
  }, [block.items]);

  useEffect(() => {
    if (isFocused && focusedIndex === null && itemRefs.current[0]) {
      itemRefs.current[0].focus();
      setFocusedIndex(0);
    }
  }, [isFocused]);

  // Initialize with one empty item if no items exist
  useEffect(() => {
    if (items.length === 0) {
      const initialItems = [{ text: '', completed: false }];
      setItems(initialItems);
      updateBlock(initialItems);
    }
  }, []);

  const updateBlock = (newItems: { text: string; completed: boolean }[]) => {
    const updatedBlock = blockFactory.updateBlock(block, { items: newItems });
    onUpdate(updatedBlock);
  };

  const handleItemTextChange = (index: number, text: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], text };
    setItems(newItems);
    updateBlock(newItems);
  };

  const handleItemToggle = (index: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], completed: !newItems[index].completed };
    setItems(newItems);
    updateBlock(newItems);
  };

  const handleItemKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem(index + 1);
    }

    if (e.key === 'Backspace' && items[index].text === '') {
      e.preventDefault();
      if (items.length === 1) {
        onDelete();
      } else {
        removeItem(index);
      }
    }

    if (e.key === 'ArrowDown' && index < items.length - 1) {
      e.preventDefault();
      itemRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }

    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      itemRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Tab - toggle completion
        handleItemToggle(index);
      } else {
        // Tab - move to next item or create new one
        if (index < items.length - 1) {
          itemRefs.current[index + 1]?.focus();
          setFocusedIndex(index + 1);
        } else {
          addItem(index + 1);
        }
      }
    }
  };

  const addItem = (index?: number) => {
    const insertIndex = index ?? items.length;
    const newItems = [...items];
    newItems.splice(insertIndex, 0, { text: '', completed: false });
    setItems(newItems);

    setTimeout(() => {
      itemRefs.current[insertIndex]?.focus();
      setFocusedIndex(insertIndex);
    }, 0);

    updateBlock(newItems);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;

    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);

    const focusIndex = Math.max(0, index - 1);
    setTimeout(() => {
      itemRefs.current[focusIndex]?.focus();
      setFocusedIndex(focusIndex);
    }, 0);

    updateBlock(newItems);
  };

  const getProgress = () => {
    if (items.length === 0) return 0;
    const completedItems = items.filter(item => item.completed).length;
    return Math.round((completedItems / items.length) * 100);
  };

  const handleCheckboxClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    handleItemToggle(index);
  };

  const progress = getProgress();

  return (
    <div className="w-full">

      {/* Todo items */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center group">
            <div className="flex items-center flex-1">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => handleItemToggle(index)}
                onClick={(e) => handleCheckboxClick(index, e)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                disabled={readonly}
              />
              <input
                ref={(el) => (itemRefs.current[index] = el)}
                type="text"
                value={item.text}
                onChange={(e) => handleItemTextChange(index, e.target.value)}
                onKeyDown={(e) => handleItemKeyDown(index, e)}
                onFocus={() => setFocusedIndex(index)}
                placeholder="Nouvelle tâche..."
                className={`
                  flex-1 border-none outline-none bg-transparent text-gray-900
                  placeholder-gray-400
                  ${item.completed ? 'line-through text-gray-500' : ''}
                  ${readonly ? 'cursor-default' : 'cursor-text'}
                `}
                disabled={readonly}
              />
            </div>

            {!readonly && items.length > 1 && (
              <button
                onClick={() => removeItem(index)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 ml-2"
                title="Supprimer la tâche"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add item button */}
      {!readonly && (
        <button
          onClick={() => addItem()}
          className="flex items-center mt-3 text-sm text-gray-500 hover:text-gray-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Ajouter une tâche
        </button>
      )}
    </div>
  );
};

export default TodoBlock;