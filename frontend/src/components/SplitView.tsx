import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface SplitViewProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultSplitPercentage?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
  onSplitChange?: (splitPercentage: number) => void;
  className?: string;
}

const SplitView: React.FC<SplitViewProps> = ({
  leftPanel,
  rightPanel,
  defaultSplitPercentage = 50,
  minLeftWidth = 300,
  minRightWidth = 300,
  onSplitChange,
  className = ''
}) => {
  const [splitPercentage, setSplitPercentage] = useState(defaultSplitPercentage);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startSplitRef = useRef<number>(0);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    setIsDragging(true);
    startXRef.current = event.clientX;
    startSplitRef.current = splitPercentage;

    // Prevent text selection during drag
    event.preventDefault();
  }, [splitPercentage]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const deltaX = event.clientX - startXRef.current;
    const deltaPercentage = (deltaX / containerWidth) * 100;

    let newSplit = startSplitRef.current + deltaPercentage;

    // Calculate minimum percentages based on pixel values
    const minLeftPercentage = (minLeftWidth / containerWidth) * 100;
    const minRightPercentage = (minRightWidth / containerWidth) * 100;

    // Constrain the split percentage
    newSplit = Math.max(minLeftPercentage, Math.min(100 - minRightPercentage, newSplit));

    setSplitPercentage(newSplit);
    onSplitChange?.(newSplit);
  }, [isDragging, minLeftWidth, minRightWidth, onSplitChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className={`flex h-full ${className}`}
    >
      {/* Left Panel */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{ width: `${splitPercentage}%` }}
      >
        {leftPanel}
      </div>

      {/* Resizer */}
      <div
        className="flex-shrink-0 w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize relative group transition-colors duration-150"
        onMouseDown={handleMouseDown}
      >
        {/* Visual indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-gray-500 rounded-full p-1">
            <GripVertical className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Expanded hit area */}
        <div className="absolute inset-y-0 -left-2 -right-2" />
      </div>

      {/* Right Panel */}
      <div
        className="flex-1 overflow-hidden"
        style={{ width: `${100 - splitPercentage}%` }}
      >
        {rightPanel}
      </div>
    </div>
  );
};

export default SplitView;