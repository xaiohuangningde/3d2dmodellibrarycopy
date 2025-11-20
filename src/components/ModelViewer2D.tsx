import { useState, useRef, useEffect } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Move, RotateCcw } from 'lucide-react'

interface ModelViewer2DProps {
  url: string
  name: string
}

export function ModelViewer2D({ url, name }: ModelViewer2DProps) {
  const [zoom, setZoom] = useState(100)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25))
  const handleResetView = () => {
    setZoom(100)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -10 : 10
    setZoom(prev => Math.max(25, Math.min(300, prev + delta)))
  }

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false)
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-300">加载图像中...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 max-w-md">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      <div className="w-full h-full flex items-center justify-center">
        <img
          src={url}
          alt={name}
          className="max-w-none select-none transition-transform duration-100"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
            imageRendering: zoom > 150 ? 'crisp-edges' : 'auto'
          }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setError('加载图像失败')
            setLoading(false)
          }}
          draggable={false}
        />
      </div>

      {/* Zoom and pan controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md rounded-xl px-4 py-2 flex items-center gap-3 border border-white/10">
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 25}
          className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors group"
          title="缩小 (Scroll Down)"
        >
          <ZoomOut className="w-4 h-4 text-slate-300 group-hover:text-orange-400" />
        </button>
        
        <div className="flex items-center gap-2 px-2">
          <span className="text-sm text-slate-300 font-medium min-w-[3rem] text-center">{zoom}%</span>
        </div>
        
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 300}
          className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors group"
          title="放大 (Scroll Up)"
        >
          <ZoomIn className="w-4 h-4 text-slate-300 group-hover:text-orange-400" />
        </button>
        
        <div className="w-px h-6 bg-slate-600" />
        
        <button
          onClick={handleResetView}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
          title="重置视图"
        >
          <RotateCcw className="w-4 h-4 text-slate-300 group-hover:text-orange-400" />
        </button>
      </div>

      {/* Controls info */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Move className="w-4 h-4 text-orange-400" />
            <span>拖拽图像：平移</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-4 h-4 bg-orange-500/20 rounded flex items-center justify-center text-[10px]">🔍</span>
            <span>滚轮：缩放</span>
          </div>
        </div>
      </div>

      {/* Image info */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-xs text-slate-300">2D 图像</span>
        </div>
      </div>

      {/* Pan indicator */}
      {isDragging && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-orange-500/20 border-2 border-orange-500 rounded-full p-3 animate-pulse">
            <Move className="w-6 h-6 text-orange-400" />
          </div>
        </div>
      )}

      {/* Zoom level indicator */}
      {zoom !== 100 && (
        <div className="absolute top-4 left-4 bg-orange-500/10 border border-orange-500/30 backdrop-blur-md rounded-lg px-3 py-1.5">
          <span className="text-xs text-orange-400 font-medium">{zoom > 100 ? '放大' : '缩小'} {Math.abs(zoom - 100)}%</span>
        </div>
      )}
    </div>
  )
}
