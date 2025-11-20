import { useState } from 'react'
import { FolderOpen, Plus, MoreVertical, Edit2, Trash2, Folder } from 'lucide-react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'

interface Group {
  id: string
  name: string
  createdAt: string
}

interface GroupSidebarProps {
  selectedGroupId: string
  onSelectGroup: (groupId: string) => void
  groups: Group[]
  onGroupsChange: () => void
  modelCounts: Record<string, number>
}

export function GroupSidebar({ 
  selectedGroupId, 
  onSelectGroup, 
  groups,
  onGroupsChange,
  modelCounts 
}: GroupSidebarProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [renamingGroup, setRenamingGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return
    
    setLoading(true)
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05abd8f9/groups`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ name: newGroupName }),
        }
      )

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create group')
      }

      setNewGroupName('')
      setIsCreateDialogOpen(false)
      onGroupsChange()
    } catch (error) {
      console.error('Create group error:', error)
      alert(error instanceof Error ? error.message : '创建分组失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRenameGroup = async () => {
    if (!renamingGroup || !newGroupName.trim()) return
    
    setLoading(true)
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05abd8f9/groups/${renamingGroup.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ name: newGroupName }),
        }
      )

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to rename group')
      }

      setNewGroupName('')
      setRenamingGroup(null)
      setIsRenameDialogOpen(false)
      onGroupsChange()
    } catch (error) {
      console.error('Rename group error:', error)
      alert(error instanceof Error ? error.message : '重命名分组失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async (group: Group) => {
    if (group.id === 'default') {
      alert('无法删除默认分组')
      return
    }

    if (!confirm(`确定要删除分组"${group.name}"吗？其中的工具将移至默认分组。`)) {
      return
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-05abd8f9/groups/${group.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      )

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete group')
      }

      if (selectedGroupId === group.id) {
        onSelectGroup('all')
      }
      onGroupsChange()
    } catch (error) {
      console.error('Delete group error:', error)
      alert(error instanceof Error ? error.message : '删除分组失败')
    }
  }

  const allGroups = [
    { id: 'all', name: '全部工具', createdAt: '' },
    { id: 'default', name: '未分组', createdAt: '' },
    ...groups.filter(g => g.id !== 'default')
  ]

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">工具分组</h2>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {allGroups.map((group) => {
          const count = modelCounts[group.id] || 0
          const isSelected = selectedGroupId === group.id

          return (
            <div
              key={group.id}
              className={`
                mx-2 mb-1 rounded-lg transition-colors cursor-pointer
                ${isSelected 
                  ? 'bg-orange-50 border border-orange-200' 
                  : 'hover:bg-gray-50 border border-transparent'
                }
              `}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <div
                  onClick={() => onSelectGroup(group.id)}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  {group.id === 'all' ? (
                    <FolderOpen className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-orange-600' : 'text-gray-500'}`} />
                  ) : (
                    <Folder className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-orange-600' : 'text-gray-500'}`} />
                  )}
                  <span className={`text-sm truncate ${isSelected ? 'text-orange-900 font-medium' : 'text-gray-700'}`}>
                    {group.name}
                  </span>
                  <span className={`text-xs ml-auto ${isSelected ? 'text-orange-600' : 'text-gray-400'}`}>
                    {count}
                  </span>
                </div>

                {group.id !== 'all' && group.id !== 'default' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setRenamingGroup(group)
                          setNewGroupName(group.name)
                          setIsRenameDialogOpen(true)
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        重命名
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteGroup(group)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新分组</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input
              placeholder="输入分组名称"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  setNewGroupName('')
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={loading || !newGroupName.trim()}
              >
                {loading ? '创建中...' : '创建'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Group Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名分组</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input
              placeholder="输入新名称"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameGroup()}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRenameDialogOpen(false)
                  setNewGroupName('')
                  setRenamingGroup(null)
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleRenameGroup}
                disabled={loading || !newGroupName.trim()}
              >
                {loading ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
