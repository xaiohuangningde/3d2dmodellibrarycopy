import { useState, useRef } from 'react'
import { Upload, FileImage, Wrench, CheckCircle, XCircle } from 'lucide-react'
import { projectId, publicAnonKey } from '../utils/supabase/info'

interface ModelUploadProps {
  onUploadSuccess: () => void
  selectedGroupId?: string
}

export function ModelUpload({ onUploadSuccess, selectedGroupId = 'default' }: ModelUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const SUPPORTED_3D_FORMATS = ['.glb', '.gltf']
  const SUPPORTED_2D_FORMATS = ['.jpg', '.jpeg', '.png', '.bmp']
  const ALL_FORMATS = [...SUPPORTED_3D_FORMATS, ...SUPPORTED_2D_FORMATS]

  const getFileType = (fileName: string): '3d' | '2d' | null => {
    const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0]
    if (!ext) return null
    
    if (SUPPORTED_3D_FORMATS.includes(ext)) return '3d'
    if (SUPPORTED_2D_FORMATS.includes(ext)) return '2d'
    return null
  }

  const handleUpload = async (file: File) => {
    const fileType = getFileType(file.name)
    
    if (!fileType) {
      setUploadStatus({
        type: 'error',
        message: `不支持的格式。支持格式：${ALL_FORMATS.join(', ')}`
      })
      return
    }

    setUploading(true)
    setUploadStatus(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name.replace(/\.[^.]+$/, ''))
      formData.append('type', fileType)
      formData.append('groupId', selectedGroupId)

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05abd8f9/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: formData,
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed')
      }

      setUploadStatus({
        type: 'success',
        message: `${fileType === '3d' ? '3D 工具模型' : '工具图纸'}上传成功！`
      })
      
      onUploadSuccess()
      
      // Clear success message after 3 seconds
      setTimeout(() => setUploadStatus(null), 3000)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Upload failed'
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleUpload(files[0])
    }
  }

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragging 
            ? 'border-orange-500 bg-orange-50' 
            : 'border-gray-300 bg-gray-50 hover:border-orange-400 hover:bg-orange-50/50'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALL_FORMATS.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600">上传中...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center ring-2 ring-orange-600/30">
                <Wrench className="w-8 h-8 text-orange-400" />
              </div>
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center ring-2 ring-amber-600/30">
                <FileImage className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            
            <div>
              <p className="text-gray-900 mb-2">
                拖放压裂工具模型或技术图纸至此
              </p>
              <p className="text-sm text-gray-500">
                或点击选择文件
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center mt-2">
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs border border-orange-200">
                3D 模型: {SUPPORTED_3D_FORMATS.join(', ')}
              </span>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs border border-amber-200">
                2D 图纸: {SUPPORTED_2D_FORMATS.join(', ')}
              </span>
            </div>
          </div>
        )}
      </div>

      {uploadStatus && (
        <div
          className={`
            mt-4 p-4 rounded-lg flex items-center gap-3
            ${uploadStatus.type === 'success' 
              ? 'bg-green-500/10 border border-green-500/50' 
              : 'bg-red-500/10 border border-red-500/50'
            }
          `}
        >
          {uploadStatus.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400" />
          )}
          <p className={uploadStatus.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {uploadStatus.message}
          </p>
        </div>
      )}
    </div>
  )
}
