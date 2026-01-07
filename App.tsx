
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Scissors, Download, RefreshCw, Layers, Grid3X3, LayoutGrid, Zap, SlidersHorizontal, AlertCircle, X, AlignJustify, Image as ImageIcon, FileImage } from 'lucide-react';
import { GridLines, SliceResult, Boundary } from './types';
import GridEditor from './components/GridEditor';
import SlicePreview from './components/SlicePreview';

const App: React.FC = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [gridConfig, setGridConfig] = useState({ rows: 3, cols: 3 });
  const [quality, setQuality] = useState(0.6); 
  const [outputFormat, setOutputFormat] = useState<'webp' | 'jpeg' | 'png'>('webp');
  const [optimizeResolution, setOptimizeResolution] = useState(true);
  const [gridLines, setGridLines] = useState<GridLines>({
    horizontal: [],
    vertical: []
  });
  const [slices, setSlices] = useState<SliceResult[]>([]);
  const [isSlicing, setIsSlicing] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [showSafariWarning, setShowSafariWarning] = useState(false);

  // Detect Safari
  useEffect(() => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      setShowSafariWarning(true);
    }
  }, []);

  const initializeGridLines = useCallback((rows: number, cols: number) => {
    const generateBoundaries = (count: number) => {
      const boundaries: Boundary[] = [];
      const numBoundaries = count + 1;
      const step = 100 / count;
      const gutterHalfWidth = 1;

      for (let i = 0; i < numBoundaries; i++) {
        const pos = i * step;
        if (i === 0) {
          boundaries.push({ start: 0, end: 1.5 });
        } else if (i === numBoundaries - 1) {
          boundaries.push({ start: 98.5, end: 100 });
        } else {
          boundaries.push({ start: pos - gutterHalfWidth, end: pos + gutterHalfWidth });
        }
      }
      return boundaries;
    };

    setGridLines({
      horizontal: generateBoundaries(rows),
      vertical: generateBoundaries(cols)
    });
  }, []);

  useEffect(() => {
    if (slices.length > 0) {
      setSettingsDirty(true);
    }
  }, [quality, optimizeResolution, gridConfig, outputFormat]);

  useEffect(() => {
    if (image) {
      initializeGridLines(gridConfig.rows, gridConfig.cols);
      setSlices([]);
      setSettingsDirty(false);
    }
  }, [image, gridConfig, initializeGridLines]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          initializeGridLines(gridConfig.rows, gridConfig.cols);
          setSlices([]);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSlice = useCallback(async () => {
    if (!image) return;
    setIsSlicing(true);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { naturalWidth, naturalHeight } = image;
    
    const numRows = gridLines.horizontal.length - 1;
    const numCols = gridLines.vertical.length - 1;

    const hRanges: [number, number][] = [];
    for (let i = 0; i < numRows; i++) {
      hRanges.push([gridLines.horizontal[i].end, gridLines.horizontal[i+1].start]);
    }
    
    const vRanges: [number, number][] = [];
    for (let i = 0; i < numCols; i++) {
      vRanges.push([gridLines.vertical[i].end, gridLines.vertical[i+1].start]);
    }

    const newSlices: SliceResult[] = [];
    let index = 0;

    const mimeType = `image/${outputFormat}`;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const xStartOrig = (vRanges[c][0] / 100) * naturalWidth;
        const xEndOrig = (vRanges[c][1] / 100) * naturalWidth;
        const yStartOrig = (hRanges[r][0] / 100) * naturalHeight;
        const yEndOrig = (hRanges[r][1] / 100) * naturalHeight;

        let sliceW = Math.max(0, xEndOrig - xStartOrig);
        let sliceH = Math.max(0, yEndOrig - yStartOrig);

        if (sliceW <= 0 || sliceH <= 0) continue;

        const maxDim = optimizeResolution ? 1080 : 4096;
        let targetW = sliceW;
        let targetH = sliceH;
        
        if (targetW > maxDim || targetH > maxDim) {
          const ratio = Math.min(maxDim / targetW, maxDim / targetH);
          targetW *= ratio;
          targetH *= ratio;
        }

        canvas.width = targetW;
        canvas.height = targetH;
        ctx.clearRect(0, 0, targetW, targetH);
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(
            image, 
            xStartOrig, yStartOrig, sliceW, sliceH,
            0, 0, targetW, targetH
        );

        // Quality is only applicable for WebP and JPEG
        const qVal = outputFormat === 'png' ? undefined : quality;
        const blob = await new Promise<Blob | null>(resolve => 
          canvas.toBlob(resolve, mimeType, qVal)
        );

        if (blob) {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          newSlices.push({
            dataUrl,
            index,
            row: r,
            col: c
          });
        }
        index++;
      }
    }

    setSlices(newSlices);
    setIsSlicing(false);
    setSettingsDirty(false);
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [image, gridLines, quality, optimizeResolution, outputFormat]);

  return (
    <div className="min-h-screen flex flex-col items-center bg-slate-950 text-slate-100">
      {showSafariWarning && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 p-3 flex items-center justify-center gap-4 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
            <AlertCircle className="w-4 h-4 animate-pulse" />
            <span>Safari detected: WebP compression quality controls work best on Chrome. Use JPEG or PNG for wider compatibility.</span>
          </div>
          <button 
            onClick={() => setShowSafariWarning(false)}
            className="p-1 hover:bg-amber-500/20 rounded-full text-amber-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <header className="w-full max-w-6xl flex justify-between items-center p-4 md:p-8">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <Layers className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            GridSlice Pro
          </h1>
        </div>
        {image && (
          <button 
            onClick={() => { setImage(null); setSlices([]); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-medium border border-slate-700"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
        )}
      </header>

      <main className="w-full max-w-6xl flex flex-col gap-12 p-4 md:px-8 pb-8">
        {!image ? (
          <div className="w-full flex flex-col items-center justify-center py-24 px-6 border-2 border-dashed border-slate-700 rounded-3xl bg-slate-900/50">
            <div className="bg-slate-800 p-6 rounded-full mb-6">
              <Upload className="w-12 h-12 text-indigo-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Upload Mosaic Image</h2>
            <p className="text-slate-400 text-center max-w-md mb-8">
              Adjust lines to remove borders and gutters. Supports WebP, JPEG, and PNG.
            </p>
            <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-500/20">
              Browse Image
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-wrap gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
                <button 
                  onClick={() => setGridConfig({ rows: 3, cols: 3 })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${gridConfig.rows === 3 && gridConfig.cols === 3 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
                >
                  <Grid3X3 className="w-4 h-4" /> 3 x 3
                </button>
                <button 
                  onClick={() => setGridConfig({ rows: 6, cols: 6 })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${gridConfig.rows === 6 && gridConfig.cols === 6 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
                >
                  <LayoutGrid className="w-4 h-4" /> 6 x 6
                </button>
                <button 
                  onClick={() => setGridConfig({ rows: 1, cols: 5 })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${gridConfig.rows === 1 && gridConfig.cols === 5 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
                >
                  <AlignJustify className="w-4 h-4 rotate-90" /> 5 Verticals
                </button>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 overflow-hidden shadow-2xl relative">
                <GridEditor 
                  image={image} 
                  gridLines={gridLines} 
                  setGridLines={setGridLines} 
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center p-6 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                <div className="text-sm text-slate-400">
                  <p className="font-medium text-slate-200 uppercase text-[10px] tracking-widest mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${settingsDirty ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                    <span>{settingsDirty ? 'Settings pending refresh' : 'Ready to download'}</span>
                  </div>
                </div>
                <button 
                  onClick={handleSlice}
                  disabled={isSlicing}
                  className={`w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 rounded-xl font-bold transition-all shadow-xl ${settingsDirty ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20 animate-bounce' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-500/20'} disabled:opacity-50 text-white`}
                >
                  {isSlicing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Scissors className="w-5 h-5" />}
                  {isSlicing ? "Processing..." : settingsDirty ? "Apply & Update" : "Generate Slices"}
                </button>
              </div>
            </div>

            <div className="space-y-6">
               <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                 <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                   <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                   <h3 className="text-lg font-semibold">Asset Configuration</h3>
                 </div>
                 
                 <div className="space-y-6">
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Output Format</p>
                      <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        {(['webp', 'jpeg', 'png'] as const).map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => setOutputFormat(fmt)}
                            className={`py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${outputFormat === fmt ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                    </div>

                   <div className={`space-y-3 transition-opacity ${outputFormat === 'png' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                     <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                       <span>Smaller File</span>
                       <span>Max Quality</span>
                     </div>
                     <input 
                       type="range" 
                       min="0.05" 
                       max="0.9" 
                       step="0.05" 
                       value={quality} 
                       onChange={(e) => setQuality(parseFloat(e.target.value))}
                       className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                     />
                     <div className="flex justify-between items-center text-[10px] text-slate-400">
                       <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Level: {Math.round((1 - quality) * 100)}%</span>
                       <span className="font-mono">Quality: {quality.toFixed(2)}</span>
                     </div>
                   </div>

                   <div className="pt-4 border-t border-slate-800/50">
                     <label className="flex items-center gap-3 cursor-pointer group">
                       <div className="relative">
                         <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={optimizeResolution} 
                            onChange={() => setOptimizeResolution(!optimizeResolution)}
                         />
                         <div className={`w-10 h-5 rounded-full transition-colors ${optimizeResolution ? 'bg-indigo-600' : 'bg-slate-700'}`}></div>
                         <div className={`absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform ${optimizeResolution ? 'translate-x-5' : ''}`}></div>
                       </div>
                       <div className="flex flex-col">
                         <span className="text-sm font-semibold text-slate-200">Web Optimization</span>
                         <span className="text-[10px] text-slate-400">Limit dimensions to 1080p</span>
                       </div>
                     </label>
                   </div>
                 </div>
                 {settingsDirty && (
                   <div className="mt-6 flex items-start gap-2 p-3 rounded-lg bg-amber-900/20 border border-amber-500/20 text-amber-200 text-xs">
                     <AlertCircle className="w-4 h-4 flex-shrink-0" />
                     <span>Settings changed. Click <b>Apply & Update</b> to refresh slices with new format/compression.</span>
                   </div>
                 )}
               </div>
               
               <div className="p-6 rounded-2xl bg-indigo-900/20 border border-indigo-500/20">
                 <div className="flex items-center gap-2 mb-2">
                   <Zap className="w-4 h-4 text-indigo-400" />
                   <h4 className="text-indigo-300 font-semibold text-sm">Format Information</h4>
                 </div>
                 <div className="text-[10px] text-indigo-200/70 space-y-2">
                    <p><b className="text-indigo-300">WEBP:</b> Best for web. Exceptional compression.</p>
                    <p><b className="text-indigo-300">JPEG:</b> Universal standard. Good for photos.</p>
                    <p><b className="text-indigo-300">PNG:</b> Lossless. Best for graphics with transparency.</p>
                 </div>
               </div>
            </div>
          </div>
        )}

        {slices.length > 0 && (
          <div id="results-section" className="w-full py-12 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-emerald-600/20 p-2 rounded-lg">
                <Download className="text-emerald-400 w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold">Generated Assets</h2>
            </div>
            <SlicePreview slices={slices} gridCols={gridLines.vertical.length - 1} format={outputFormat} />
          </div>
        )}
      </main>

      <footer className="mt-auto py-8 text-slate-500 text-sm">
        &copy; 2024 GridSlice Pro. Professional Image Slicing.
      </footer>
    </div>
  );
};

export default App;
