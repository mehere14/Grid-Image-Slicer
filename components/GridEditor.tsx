
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GridLines, Boundary } from '../types';

interface GridEditorProps {
  image: HTMLImageElement;
  gridLines: GridLines;
  setGridLines: (lines: GridLines) => void;
}

const GridEditor: React.FC<GridEditorProps> = ({ image, gridLines, setGridLines }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ 
    type: 'h' | 'v', 
    boundaryIdx: number, 
    side: 'start' | 'end' 
  } | null>(null);

  const handleMouseDown = (type: 'h' | 'v', boundaryIdx: number, side: 'start' | 'end') => {
    setDragging({ type, boundaryIdx, side });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    setGridLines({
      ...gridLines,
      horizontal: dragging.type === 'h' 
        ? gridLines.horizontal.map((b, idx) => {
            if (idx !== dragging.boundaryIdx) return b;
            return { ...b, [dragging.side]: clampedY };
          })
        : gridLines.horizontal,
      vertical: dragging.type === 'v' 
        ? gridLines.vertical.map((b, idx) => {
            if (idx !== dragging.boundaryIdx) return b;
            return { ...b, [dragging.side]: clampedX };
          })
        : gridLines.vertical,
    });
  }, [dragging, gridLines, setGridLines]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={containerRef}
      className="relative select-none cursor-crosshair group bg-slate-950 overflow-hidden"
      style={{ lineHeight: 0 }}
    >
      <img 
        src={image.src} 
        alt="Preview" 
        className="w-full h-auto opacity-90"
        draggable={false}
      />
      
      {/* Horizontal Boundaries */}
      {gridLines.horizontal.map((boundary, i) => (
        <React.Fragment key={`h-boundary-${i}`}>
          <div 
            className="absolute left-0 right-0 bg-red-500/30 backdrop-blur-[1px] pointer-events-none z-0"
            style={{ 
              top: `${Math.min(boundary.start, boundary.end)}%`, 
              height: `${Math.abs(boundary.end - boundary.start)}%` 
            }}
          />
          <div 
            className={`absolute left-0 right-0 h-0.5 z-20 cursor-ns-resize transition-shadow ${dragging?.type === 'h' && dragging.boundaryIdx === i && dragging.side === 'start' ? 'bg-indigo-300 shadow-[0_0_8px_rgba(165,180,252,0.8)]' : 'bg-indigo-500/80 hover:bg-indigo-400'}`}
            style={{ top: `${boundary.start}%`, transform: 'translateY(-50%)' }}
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('h', i, 'start'); }}
          />
          <div 
            className={`absolute left-0 right-0 h-0.5 z-20 cursor-ns-resize transition-shadow ${dragging?.type === 'h' && dragging.boundaryIdx === i && dragging.side === 'end' ? 'bg-indigo-300 shadow-[0_0_8px_rgba(165,180,252,0.8)]' : 'bg-indigo-500/80 hover:bg-indigo-400'}`}
            style={{ top: `${boundary.end}%`, transform: 'translateY(-50%)' }}
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('h', i, 'end'); }}
          />
        </React.Fragment>
      ))}

      {/* Vertical Boundaries */}
      {gridLines.vertical.map((boundary, i) => (
        <React.Fragment key={`v-boundary-${i}`}>
          <div 
            className="absolute top-0 bottom-0 bg-red-500/30 backdrop-blur-[1px] pointer-events-none z-0"
            style={{ 
              left: `${Math.min(boundary.start, boundary.end)}%`, 
              width: `${Math.abs(boundary.end - boundary.start)}%` 
            }}
          />
          <div 
            className={`absolute top-0 bottom-0 w-0.5 z-20 cursor-ew-resize transition-shadow ${dragging?.type === 'v' && dragging.boundaryIdx === i && dragging.side === 'start' ? 'bg-indigo-300 shadow-[0_0_8px_rgba(165,180,252,0.8)]' : 'bg-indigo-500/80 hover:bg-indigo-400'}`}
            style={{ left: `${boundary.start}%`, transform: 'translateX(-50%)' }}
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('v', i, 'start'); }}
          />
          <div 
            className={`absolute top-0 bottom-0 w-0.5 z-20 cursor-ew-resize transition-shadow ${dragging?.type === 'v' && dragging.boundaryIdx === i && dragging.side === 'end' ? 'bg-indigo-300 shadow-[0_0_8px_rgba(165,180,252,0.8)]' : 'bg-indigo-500/80 hover:bg-indigo-400'}`}
            style={{ left: `${boundary.end}%`, transform: 'translateX(-50%)' }}
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('v', i, 'end'); }}
          />
        </React.Fragment>
      ))}

      <div className="absolute bottom-2 right-2 px-3 py-1 bg-black/80 text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-md border border-indigo-500/30 shadow-lg pointer-events-none">
        {gridLines.horizontal.length - 1}x{gridLines.horizontal.length - 1} Master Mode
      </div>
    </div>
  );
};

export default GridEditor;
