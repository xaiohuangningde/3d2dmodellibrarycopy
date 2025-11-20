import { useState, useEffect } from 'react'
import { Wrench, FileImage, Trash2, Eye, Calendar, HardDrive } from 'lucide-react'
import { projectId, publicAnonKey } from '../utils/supabase/info'

interface Model {
  id: string
  name: string
  type: '3d' | '2d'
  filePath: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedAt: string
}

interface ModelLibraryProps {
  onSelectModel: (model: Model, url: string) => void
  refreshTrigger: number
}

export function ModelLibrary({ onSelectModel, refreshTrigger }: ModelLibraryProps) {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchModels = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05abd8f9/models`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch models')
      }

      setModels(data.models)
    } catch (err) {
      console.error('Fetch models error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load models')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchModels()
  }, [refreshTrigger])

  const handleDelete = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('确定要删除此工具模型吗？')) {
      return
    }

    setDeletingId(modelId)

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05abd8f9/models/${modelId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete model')
      }

      // Remove from local state
      setModels(prev => prev.filter(m => m.id !== modelId))
    } catch (err) {
      console.error('Delete error:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete model')
    } finally {
      setDeletingId(null)
    }
  }

  const handleView = async (model: Model) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05abd8f9/model/${model.id}/url`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get model URL')
      }

      onSelectModel(model, data.url)
    } catch (err) {
      console.error('Get model URL error:', err)
      alert(err instanceof Error ? err.message : 'Failed to load model')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">加载工具库中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchModels}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
        >
          重试
        </button>
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-2 ring-orange-700/30">
          <Wrench className="w-10 h-10 text-orange-600/60" />
        </div>
        <p className="text-slate-400">暂无压裂工具</p>
        <p className="text-sm text-slate-500 mt-2">上传您的第一个 3D 工具模型或技术图纸</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {models.map((model) => (
        <div
          key={model.id}
          className="bg-slate-800/50 border border-orange-900/20 rounded-xl overflow-hidden hover:border-orange-700/40 transition-all duration-200 group"
        >
          <div className="aspect-video bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative overflow-hidden">
            {model.type === '3d' ? (
              <Wrench className="w-16 h-16 text-orange-400/50" />
            ) : (
              <FileImage className="w-16 h-16 text-amber-400/50" />
            )}
            
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => handleView(model)}
                className="p-3 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors shadow-lg"
                title="查看工具"
              >
                <Eye className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={(e) => handleDelete(model.id, e)}
                disabled={deletingId === model.id}
                className="p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                title="删除工具"
              >
                {deletingId === model.id ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5 text-white" />
                )}
              </button>
            </div>

            <div className="absolute top-2 right-2">
              <span
                className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${model.type === '3d' 
                    ? 'bg-orange-600/90 text-orange-50' 
                    : 'bg-amber-600/90 text-amber-50'
                  }
                `}
              >
                {model.type === '3d' ? '3D' : '2D'}
              </span>
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-slate-200 mb-2 truncate" title={model.name}>
              {model.name}
            </h3>
            
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <HardDrive className="w-3 h-3" />
                <span>{formatFileSize(model.fileSize)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(model.uploadedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
