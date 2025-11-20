import { useState, useEffect } from 'react'
import { Wrench, FileImage, Eye, Trash2, MoreVertical, FolderInput } from 'lucide-react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { ThumbnailGenerator } from './ThumbnailGenerator'
import { ThumbnailCache } from '../utils/thumbnailCache'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './ui/dropdown-menu'

interface Model {
  id: string
  name: string
  type: '3d' | '2d'
  filePath: string
  fileName: string
  fileSize: number
  mimeType: string
  groupId: string
  uploadedAt: string
}

interface Group {
  id: string
  name: string
  createdAt: string
}

interface ToolGridProps {
  models: Model[]
  groups: Group[]
  onView: (model: Model, url: string) => void
  onDelete: (modelId: string) => void
  onModelsChange: () => void
}

export function ToolGrid({ models, groups, onView, onDelete, onModelsChange }: ToolGridProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const [loadingUrls, setLoadingUrls] = useState<Record<string, string>>({})

  // Load cached thumbnails on mount
  useEffect(() => {
    const cachedThumbnails: Record<string, string> = {}
    models.forEach(model => {
      const cached = ThumbnailCache.get(model.id)
      if (cached) {
        cachedThumbnails[model.id] = cached
      }
    })
    if (Object.keys(cachedThumbnails).length > 0) {
      setThumbnails(prev => ({ ...prev, ...cachedThumbnails }))
    }
  }, [models])

  // Fetch URLs for models that need thumbnails
  useEffect(() => {
    const fetchModelUrl = async (model: Model) => {
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
        if (response.ok && data.success) {
          setLoadingUrls(prev => {
            // Check if already loading to prevent duplicate requests
            if (prev[model.id]) return prev
            return { ...prev, [model.id]: data.url }
          })
        }
      } catch (error) {
        console.error('Fetch model URL error:', error)
      }
    }

    models.forEach(model => {
      if (!thumbnails[model.id] && !loadingUrls[model.id]) {
        fetchModelUrl(model)
      }
    })
  }, [models, thumbnails, loadingUrls])

  const handleThumbnailGenerated = (modelId: string, dataUrl: string) => {
    setThumbnails(prev => ({ ...prev, [modelId]: dataUrl }))
    // Cache the thumbnail
    ThumbnailCache.set(modelId, dataUrl)
    // Remove from loading URLs
    setLoadingUrls(prev => {
      const next = { ...prev }
      delete next[modelId]
      return next
    })
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

      onView(model, data.url)
    } catch (error) {
      console.error('Get model URL error:', error)
      alert(error instanceof Error ? error.message : '加载工具失败')
    }
  }

  const handleDelete = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('确定要删除此工具吗？')) {
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

      // Clear thumbnail cache for this model
      ThumbnailCache.remove(modelId)
      
      // Remove from local state
      onDelete(modelId)
      
      // Also remove from thumbnails state
      setThumbnails(prev => {
        const next = { ...prev }
        delete next[modelId]
        return next
      })
    } catch (error) {
      console.error('Delete error:', error)
      alert(error instanceof Error ? error.message : '删除工具失败')
    } finally {
      setDeletingId(null)
    }
  }

  const handleMoveToGroup = async (modelId: string, groupId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05abd8f9/models/${modelId}/group`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ groupId }),
        }
      )

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to move model')
      }

      onModelsChange()
    } catch (error) {
      console.error('Move to group error:', error)
      alert(error instanceof Error ? error.message : '移动工具失败')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (models.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Wrench className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">暂无工具</p>
          <p className="text-sm text-gray-400 mt-1">上传您的第一个工具模型</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {models.map((model) => {
        return (
          <div
            key={model.id}
            className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-orange-300 transition-all duration-200"
          >
            {/* Thumbnail Generators */}
            {loadingUrls[model.id] && !thumbnails[model.id] && (
              <ThumbnailGenerator
                url={loadingUrls[model.id]}
                type={model.type}
                onThumbnailGenerated={(dataUrl) => handleThumbnailGenerated(model.id, dataUrl)}
              />
            )}

            {/* Preview Area */}
            <div
              onClick={() => handleView(model)}
              className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative overflow-hidden cursor-pointer"
            >
              {thumbnails[model.id] ? (
                <img
                  src={thumbnails[model.id]}
                  alt={model.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  {model.type === '3d' ? (
                    <Wrench className="w-12 h-12 text-orange-300" />
                  ) : (
                    <FileImage className="w-12 h-12 text-amber-300" />
                  )}
                  {/* Loading indicator */}
                  {loadingUrls[model.id] && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </>
              )}
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button className="p-2.5 bg-white/90 hover:bg-white rounded-full transition-colors">
                  <Eye className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {/* Type Badge */}
              <div className="absolute top-2 left-2">
                <span
                  className={`
                    px-2 py-0.5 rounded text-xs font-medium
                    ${model.type === '3d' 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-amber-500 text-white'
                    }
                  `}
                >
                  {model.type === '3d' ? '3D' : '2D'}
                </span>
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-white/90 hover:bg-white rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-700" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <FolderInput className="w-4 h-4 mr-2" />
                        移动到
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          onClick={() => handleMoveToGroup(model.id, 'default')}
                        >
                          未分组
                        </DropdownMenuItem>
                        {groups.map((group) => (
                          <DropdownMenuItem
                            key={group.id}
                            onClick={() => handleMoveToGroup(model.id, group.id)}
                          >
                            {group.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(model.id, e as any)
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Info Area */}
            <div className="p-3 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-900 truncate mb-1" title={model.name}>
                {model.name}
              </h3>
              <p className="text-xs text-gray-500">
                {formatFileSize(model.fileSize)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}