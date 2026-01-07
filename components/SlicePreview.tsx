
import React, { useState, useMemo } from 'react';
import { Download, ExternalLink, Archive, Loader2, Info } from 'lucide-react';
import { SliceResult } from '../types';
import JSZip from 'jszip';

interface SlicePreviewProps {
  slices: SliceResult[];
  gridCols: number;
}

const SlicePreview: React.FC<SlicePreviewProps> = ({ slices, gridCols }) => {
  const [isZipping, setIsZipping] = useState(false);

  // Helper to format byte sizes
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Calculate estimated sizes
  const sliceSizes = useMemo(() => {
    return slices.map(slice => {
      // Base64 string length to bytes approximation
      const base64Length = slice.dataUrl.split(',')[1].length;
      return Math.floor(base64Length * (3/4));
    });
  }, [slices]);

  const totalSize = useMemo(() => {
    return sliceSizes.reduce((a, b) => a + b, 0);
  }, [sliceSizes]);

  const downloadAll = async () => {
    if (isZipping) return;
    setIsZipping(true);
    
    try {
      const zip = new JSZip();
      slices.forEach((slice, idx) => {
        const base64Data = slice.dataUrl.split(',')[1];
        zip.file(`slice_${idx + 1}.webp`, base64Data, { base64: true });
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `grid_slices_${slices.length}_tiles.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Failed to generate ZIP:', error);
      alert('Failed to generate ZIP file.');
    } finally {
      setIsZipping(false);
    }
  };

  const downloadOne = (dataUrl: string, idx: number) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `slice_${idx + 1}.webp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dynamic grid column class
  const getGridColsClass = () => {
    if (gridCols === 3) return 'grid-cols-2 sm:grid-cols-3';
    if (gridCols === 5) return 'grid-cols-2 sm:grid-cols-5';
    if (gridCols === 6) return 'grid-cols-3 sm:grid-cols-6';
    return 'grid-cols-2 sm:grid-cols-4';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-800 gap-6">
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-indigo-400" />
                <span className="text-slate-200 font-bold">{slices.length} Optimized Assets</span>
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">
                Total Archive Size: <span className="text-emerald-400 font-mono">{formatSize(totalSize)}</span>
            </p>
        </div>
        <button 
          onClick={downloadAll}
          disabled={isZipping}
          className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-70 text-white rounded-xl font-bold transition-all shadow-xl shadow-emerald-500/20 w-full sm:w-auto justify-center"
        >
          {isZipping ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Compressing ZIP...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" /> 
              Download All (.ZIP)
            </>
          )}
        </button>
      </div>

      <div className={`grid ${getGridColsClass()} gap-4`}>
        {slices.map((slice, i) => (
          <div 
            key={slice.index} 
            className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all shadow-xl"
          >
            <div className="aspect-square w-full bg-slate-800 relative overflow-hidden">
                <img 
                    src={slice.dataUrl} 
                    alt={`Slice ${slice.index + 1}`} 
                    className="w-full h-full object-cover"
                />
                
                {/* Size badge overlay */}
                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[9px] font-mono text-emerald-300 border border-emerald-500/30">
                  {formatSize(sliceSizes[i])}
                </div>

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                    <button 
                        onClick={() => downloadOne(slice.dataUrl, slice.index)}
                        className="p-3 bg-white text-slate-900 rounded-full hover:bg-indigo-50 transition-transform scale-90 group-hover:scale-100 duration-300"
                        title="Download WebP"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                    <span className="text-[10px] text-white font-black bg-indigo-600 px-2 py-0.5 rounded-full shadow-lg">
                        TILE {slice.index + 1}
                    </span>
                </div>
            </div>
            <div className="p-2.5 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-tighter bg-slate-900/50">
                <span>Row {slice.row + 1}</span>
                <span>Col {slice.col + 1}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center gap-6">
        <div className="bg-indigo-600/10 p-4 rounded-2xl border border-indigo-500/10">
            <ExternalLink className="w-8 h-8 text-indigo-400/80" />
        </div>
        <div>
            <h4 className="text-lg font-semibold text-white mb-1">Compression Verification</h4>
            <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
                Check the <b>KB size badge</b> on each preview tile above. Lowering the <b>Max Quality</b> slider and clicking <b>Apply & Update</b> will instantly reduce these numbers.
            </p>
        </div>
      </div>
    </div>
  );
};

export default SlicePreview;
