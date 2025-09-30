import React, { useState, useRef, useEffect } from 'react';

interface TripleSplitViewProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftPercentage?: number;
  defaultRightPercentage?: number;
  onSplitChange?: (leftPercentage: number, rightPercentage: number) => void;
  minPanelWidth?: number;
}

const TripleSplitView: React.FC<TripleSplitViewProps> = ({
  leftPanel,
  centerPanel,
  rightPanel,
  defaultLeftPercentage = 30,
  defaultRightPercentage = 30,
  onSplitChange,
  minPanelWidth = 250,
}) => {
  const [leftPercentage, setLeftPercentage] = useState(defaultLeftPercentage);
  const [rightPercentage, setRightPercentage] = useState(defaultRightPercentage);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const centerPercentage = 100 - leftPercentage - rightPercentage;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      const mousePercentage = (mouseX / containerWidth) * 100;

      if (isDraggingLeft) {
        const minLeft = (minPanelWidth / containerWidth) * 100;
        const maxLeft = 100 - rightPercentage - (minPanelWidth / containerWidth) * 100;
        const newLeftPercentage = Math.max(minLeft, Math.min(maxLeft, mousePercentage));
        setLeftPercentage(newLeftPercentage);
        onSplitChange?.(newLeftPercentage, rightPercentage);
      } else if (isDraggingRight) {
        const minRight = (minPanelWidth / containerWidth) * 100;
        const maxRight = 100 - leftPercentage - (minPanelWidth / containerWidth) * 100;
        const newRightPercentage = Math.max(minRight, Math.min(maxRight, 100 - mousePercentage));
        setRightPercentage(newRightPercentage);
        onSplitChange?.(leftPercentage, newRightPercentage);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
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
  }, [isDraggingLeft, isDraggingRight, leftPercentage, rightPercentage, minPanelWidth, onSplitChange]);

  return (
    <div ref={containerRef} className="flex h-full w-full relative">
      {/* Left Panel */}
      <div
        style={{ width: `${leftPercentage}%` }}
        className="h-full overflow-hidden"
      >
        {leftPanel}
      </div>

      {/* Left Divider */}
      <div
        className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize flex-shrink-0 relative group transition-colors"
        onMouseDown={() => setIsDraggingLeft(true)}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            ⇔
          </div>
        </div>
      </div>

      {/* Center Panel */}
      <div
        style={{ width: `${centerPercentage}%` }}
        className="h-full overflow-hidden"
      >
        {centerPanel}
      </div>

      {/* Right Divider */}
      <div
        className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize flex-shrink-0 relative group transition-colors"
        onMouseDown={() => setIsDraggingRight(true)}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            ⇔
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div
        style={{ width: `${rightPercentage}%` }}
        className="h-full overflow-hidden"
      >
        {rightPanel}
      </div>
    </div>
  );
};

export default TripleSplitView;