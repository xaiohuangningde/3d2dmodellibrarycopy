import { useState, useEffect, useMemo } from 'react'
import { Search, Upload, X, Wrench, FileImage, Calendar, HardDrive, Info } from 'lucide-react'
import { GroupSidebar } from './components/GroupSidebar'
import { ToolGrid } from './components/ToolGrid'
import { ModelViewer3D } from './components/ModelViewer3D'
import { ModelViewer2D } from './components/ModelViewer2D'
import { ModelUpload } from './components/ModelUpload'
import { Input } from './components/ui/input'
import { Button } from './components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog'
import { projectId, publicAnonKey } from './utils/supabase/info'

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

interface SelectedModel {
  model: Model
  url: string
}

export default function App() {
  const [models, setModels] = useState<Model[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Fetch models
  const fetchModels = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05abd8f9/models`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      )

      const data = await response.json()
      if (response.ok && data.success) {
        // Ensure all models have groupId
        const modelsWithGroup = data.models.map((m: Model) => ({
          ...m,
          groupId: m.groupId || 'default'
        }))
        setModels(modelsWithGroup)
      }
    } catch (error) {
      console.error('Fetch models error:', error)
    }
  }

  // Fetch groups
  const fetchGroups = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05abd8f9/groups`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      )

      const data = await response.json()
      if (response.ok && data.success) {
        setGroups(data.groups)
      }
    } catch (error) {
      console.error('Fetch groups error:', error)
    }
  }

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchModels(), fetchGroups()])
      setLoading(false)
    }
    loadData()
  }, [refreshTrigger])

  // Filter models
  const filteredModels = useMemo(() => {
    let filtered = models

    // Filter by group
    if (selectedGroupId !== 'all') {
      filtered = filtered.filter(m => m.groupId === selectedGroupId)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(query) ||
        m.fileName.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [models, selectedGroupId, searchQuery])

  // Calculate model counts per group
  const modelCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: models.length,
      default: 0,
    }

    groups.forEach(g => {
      counts[g.id] = 0
    })

    models.forEach(m => {
      const groupId = m.groupId || 'default'
      counts[groupId] = (counts[groupId] || 0) + 1
    })

    return counts
  }, [models, groups])

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
    setIsUploadDialogOpen(false)
  }

  const handleSelectModel = (model: Model, url: string) => {
    setSelectedModel({ model, url })
  }

  const handleDeleteModel = (modelId: string) => {
    setModels(prev => prev.filter(m => m.id !== modelId))
  }

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">压裂工具展示系统</h1>
                <p className="text-xs text-gray-500">Hydraulic Fracturing Equipment Display</p>
              </div>
            </div>

            <Button
              onClick={() => setIsUploadDialogOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              上传工具
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <GroupSidebar
          selectedGroupId={selectedGroupId}
          onSelectGroup={setSelectedGroupId}
          groups={groups}
          onGroupsChange={handleRefresh}
          modelCounts={modelCounts}
        />

        {/* Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索工具名称或文件名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500">加载中...</p>
                </div>
              </div>
            ) : (
              <ToolGrid
                models={filteredModels}
                groups={groups}
                onView={handleSelectModel}
                onDelete={handleDeleteModel}
                onModelsChange={handleRefresh}
              />
            )}
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>上传压裂工具</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <ModelUpload 
              onUploadSuccess={handleUploadSuccess}
              selectedGroupId={selectedGroupId !== 'all' ? selectedGroupId : 'default'}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Model Viewer */}
      {selectedModel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full h-full max-w-7xl max-h-[90vh] bg-white rounded-2xl overflow-hidden flex shadow-2xl">
            {/* Main Viewer Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Viewer Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                  <div className={`
                    p-2 rounded-lg
                    ${selectedModel.model.type === '3d' ? 'bg-orange-100' : 'bg-amber-100'}
                  `}>
                    {selectedModel.model.type === '3d' ? (
                      <Wrench className="w-5 h-5 text-orange-600" />
                    ) : (
                      <FileImage className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedModel.model.name}</h3>
                    <p className="text-xs text-gray-500">
                      {selectedModel.model.type === '3d' ? '3D 工具模型' : '工具图纸'} • {selectedModel.model.fileName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedModel(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Viewer Content */}
              <div className="flex-1 overflow-hidden bg-gray-50">
                {selectedModel.model.type === '3d' ? (
                  <ModelViewer3D url={selectedModel.url} />
                ) : (
                  <ModelViewer2D
                    url={selectedModel.url}
                    name={selectedModel.model.name}
                  />
                )}
              </div>
            </div>

            {/* Info Sidebar */}
            <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden">
              {/* Info Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-gray-900">工具信息</h3>
                </div>
              </div>

              {/* Info Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">基本信息</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Wrench className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">工具名称</p>
                          <p className="text-sm font-medium text-gray-900 break-words">
                            {selectedModel.model.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileImage className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">文件名称</p>
                          <p className="text-sm font-medium text-gray-900 break-all">
                            {selectedModel.model.fileName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          selectedModel.model.type === '3d' ? 'bg-orange-100' : 'bg-amber-100'
                        }`}>
                          <span className="text-xs font-bold">
                            {selectedModel.model.type.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">文件类型</p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedModel.model.type === '3d' ? '3D 模型' : '2D 图像'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* File Details */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">文件详情</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <HardDrive className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">文件大小</p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatFileSize(selectedModel.model.fileSize)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Calendar className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">上传时间</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(selectedModel.model.uploadedAt).toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-200 rounded-lg">
                          <FileImage className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">MIME 类型</p>
                          <p className="text-xs font-mono text-gray-700 break-all">
                            {selectedModel.model.mimeType}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Group Info */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">分组信息</h4>
                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                      <p className="text-sm font-medium text-gray-900">
                        {groups.find(g => g.id === selectedModel.model.groupId)?.name || '未分组'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        当前所在分组
                      </p>
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-orange-900 mb-1">使用提示</p>
                        <p className="text-xs text-orange-700">
                          {selectedModel.model.type === '3d' 
                            ? '使用鼠标拖拽旋转模型，滚轮缩放，右键平移视角。点击模型可自动聚焦。'
                            : '使用鼠标拖拽移动图像，滚轮缩放。支持最大300%的放大倍数。'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}