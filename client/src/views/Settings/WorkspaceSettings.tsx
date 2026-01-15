import { useState, useEffect } from 'react'
import { Plus, Trash2, Users, Edit2, X, Save } from 'lucide-react'
import { Workspace, WorkspaceMember } from '../../types'

export default function WorkspaceSettings() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [newWorkspaceName, setNewWorkspaceName] = useState('')

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editMembers, setEditMembers] = useState<WorkspaceMember[]>([])
    const [newMemberEmail, setNewMemberEmail] = useState('')
    const [newMemberName, setNewMemberName] = useState('')

    useEffect(() => {
        fetchWorkspaces()
    }, [])

    const fetchWorkspaces = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/workspaces')
            const data = await res.json()
            setWorkspaces(data)
        } catch (err) {
            console.error('Failed to fetch workspaces:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateWorkspace = async () => {
        if (!newWorkspaceName.trim()) return

        try {
            const res = await fetch('http://localhost:5000/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newWorkspaceName, members: [] })
            })
            if (res.ok) {
                setIsCreating(false)
                setNewWorkspaceName('')
                fetchWorkspaces()
            }
        } catch (err) {
            console.error('Failed to create workspace:', err)
        }
    }

    const handleDeleteWorkspace = async (id: string) => {
        if (!confirm('Are you sure you want to delete this workspace?')) return

        try {
            const res = await fetch(`http://localhost:5000/api/workspaces/${id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                setWorkspaces(prev => prev.filter(w => w._id !== id))
            }
        } catch (err) {
            console.error('Failed to delete workspace:', err)
        }
    }

    const startEditing = (ws: Workspace) => {
        setEditingId(ws._id)
        setEditName(ws.name)
        setEditMembers([...ws.members])
    }

    const cancelEditing = () => {
        setEditingId(null)
        setEditName('')
        setEditMembers([])
        setNewMemberEmail('')
        setNewMemberName('')
    }

    const handleAddMember = () => {
        if (!newMemberEmail.trim()) return
        setEditMembers(prev => [...prev, { name: newMemberName || 'Member', email: newMemberEmail }])
        setNewMemberEmail('')
        setNewMemberName('')
    }

    const removeMember = (index: number) => {
        setEditMembers(prev => prev.filter((_, i) => i !== index))
    }

    const saveWorkspace = async () => {
        if (!editingId) return

        try {
            const res = await fetch(`http://localhost:5000/api/workspaces/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName, members: editMembers })
            })
            if (res.ok) {
                fetchWorkspaces()
                cancelEditing()
            }
        } catch (err) {
            console.error('Failed to update workspace:', err)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">Workspaces & Teams</h2>
                    <p className="text-gray-400 text-sm">Manage recipient groups for meeting summaries</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-accent-primary hover:bg-accent-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Workspace
                </button>
            </div>

            {isCreating && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Workspace Name</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newWorkspaceName}
                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                            placeholder="e.g., Engineering Team"
                            className="flex-1 px-3 py-2 bg-dark-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-primary/50"
                            autoFocus
                        />
                        <button
                            onClick={handleCreateWorkspace}
                            disabled={!newWorkspaceName.trim()}
                            className="px-3 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-3 py-2 bg-white/5 text-gray-400 hover:bg-white/10 rounded-lg text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading workspaces...</div>
                ) : workspaces.length === 0 && !isCreating ? (
                    <div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
                        <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500">No workspaces created yet</p>
                    </div>
                ) : (
                    workspaces.map(ws => (
                        <div key={ws._id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                            {editingId === ws._id ? (
                                <div className="space-y-4">
                                    {/* Edit Mode */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-lg text-white text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Members ({editMembers.length})</label>
                                        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar">
                                            {editMembers.map((member, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 rounded bg-dark-800/50">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center text-[10px] font-bold text-accent-primary">
                                                            {member.name.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-white">{member.name}</span>
                                                            <span className="text-[10px] text-gray-400">{member.email}</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeMember(idx)} className="text-red-400 hover:text-red-300 p-1">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Name"
                                                value={newMemberName}
                                                onChange={(e) => setNewMemberName(e.target.value)}
                                                className="w-1/3 px-3 py-2 bg-dark-900 border border-white/10 rounded-lg text-white text-xs"
                                            />
                                            <input
                                                type="email"
                                                placeholder="Email (required)"
                                                value={newMemberEmail}
                                                onChange={(e) => setNewMemberEmail(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                                                className="flex-1 px-3 py-2 bg-dark-900 border border-white/10 rounded-lg text-white text-xs"
                                            />
                                            <button
                                                onClick={handleAddMember}
                                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                                        <button
                                            onClick={cancelEditing}
                                            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={saveWorkspace}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-xs font-medium"
                                        >
                                            <Save className="w-3 h-3" />
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-medium text-white">{ws.name}</h3>
                                            <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] text-gray-400">
                                                {ws.members.length} members
                                            </span>
                                        </div>
                                        <div className="flex -space-x-2 overflow-hidden py-1">
                                            {ws.members.slice(0, 5).map((m, i) => (
                                                <div key={i} title={m.email} className="inline-block h-6 w-6 rounded-full ring-2 ring-dark-800 bg-accent-primary/20 flex items-center justify-center text-[8px] font-bold text-accent-primary">
                                                    {m.name.charAt(0)}
                                                </div>
                                            ))}
                                            {ws.members.length > 5 && (
                                                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-dark-800 bg-dark-700 flex items-center justify-center text-[8px] text-gray-400">
                                                    +{ws.members.length - 5}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => startEditing(ws)}
                                            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteWorkspace(ws._id)}
                                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
