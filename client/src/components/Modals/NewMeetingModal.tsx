import { useState, useEffect } from 'react'
import { X, Play, Plus, ChevronDown } from 'lucide-react'
import { Workspace } from '../../types'

interface NewMeetingModalProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (
        title: string,
        participants: string[],
        workspaceId?: string,
        selectedRecipients?: { name: string; email: string }[]
    ) => void
}

export default function NewMeetingModal({ isOpen, onClose, onCreate }: NewMeetingModalProps) {
    const [title, setTitle] = useState('')



    // Email Recipients
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('')
    const [manualEmail, setManualEmail] = useState('')
    const [manualName, setManualName] = useState('')
    const [manualRecipients, setManualRecipients] = useState<{ name: string, email: string }[]>([])



    useEffect(() => {
        if (isOpen) {
            fetch('http://localhost:5000/api/workspaces')
                .then(res => res.json())
                .then(data => setWorkspaces(data))
                .catch(err => console.error('Failed to fetch workspaces', err))
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Combine workspace members + manual recipients
        let finalRecipients: { name: string, email: string }[] = [...manualRecipients]

        if (selectedWorkspaceId) {
            const ws = workspaces.find(w => w._id === selectedWorkspaceId)
            if (ws) {
                // Deduplicate by email
                const existingEmails = new Set(finalRecipients.map(r => r.email))
                ws.members.forEach(m => {
                    if (!existingEmails.has(m.email)) {
                        finalRecipients.push(m)
                    }
                })
            }
        }

        // Derive participants from recipients (Single source of truth)
        const mappedParticipants = finalRecipients.map(r => r.name)

        onCreate(title, mappedParticipants, selectedWorkspaceId || undefined, finalRecipients)

        // Reset form
        setTitle('')
        setSelectedWorkspaceId('')
        setManualRecipients([])
        setManualEmail('')
        setManualName('')
    }



    const addManualRecipient = () => {
        if (manualEmail.trim()) {
            setManualRecipients([...manualRecipients, {
                name: manualName.trim() || manualEmail.split('@')[0],
                email: manualEmail.trim()
            }])
            setManualEmail('')
            setManualName('')
        }
    }



    const removeManualRecipient = (index: number) => {
        setManualRecipients(manualRecipients.filter((_, i) => i !== index))
    }



    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="w-full max-w-lg bg-dark-800 border border-white/10 rounded-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="relative h-28 bg-gradient-to-br from-accent-primary via-accent-secondary to-purple-900 p-6 flex flex-col justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all backdrop-blur-md"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <h2 className="text-2xl font-bold text-white mb-1">
                        New Analysis
                    </h2>
                    <p className="text-white/70 text-sm">
                        Configure meeting & automation
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Title Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Meeting Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Q4 Strategy Review"
                            className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all text-sm"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Main Content - Workspace & Email Selection */}
                    <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-200 min-h-[200px]">
                        {/* Workspace Selector */}
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 font-medium">Use Workspace</label>
                            <div className="relative">
                                <select
                                    value={selectedWorkspaceId}
                                    onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-accent-primary/50 text-sm"
                                >
                                    <option value="">Select a workspace...</option>
                                    {workspaces.map(ws => (
                                        <option key={ws._id} value={ws._id}>
                                            {ws.name} ({ws.members.length} members)
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            </div>
                            {selectedWorkspaceId && (
                                <p className="text-xs text-green-400 px-1">
                                    ✓ Will invite {workspaces.find(w => w._id === selectedWorkspaceId)?.members.length} workspace members
                                </p>
                            )}
                        </div>

                        {/* Manual Add */}
                        <div className="space-y-2 pt-2 border-t border-white/5">
                            <label className="text-xs text-gray-500 font-medium">Add Participants by Email</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Name (Optional)"
                                    value={manualName}
                                    onChange={(e) => setManualName(e.target.value)}
                                    className="w-1/3 bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-primary/50"
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={manualEmail}
                                    onChange={(e) => setManualEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addManualRecipient())}
                                    className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-primary/50"
                                />
                                <button
                                    type="button"
                                    onClick={addManualRecipient}
                                    disabled={!manualEmail.trim()}
                                    className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-3"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* List of Manual Recipients */}
                        {manualRecipients.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {manualRecipients.map((r, i) => (
                                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-white font-medium">{r.name}</span>
                                            <span className="text-[10px] text-gray-400">{r.email}</span>
                                        </div>
                                        <button type="button" onClick={() => removeManualRecipient(i)} className="text-gray-500 hover:text-red-400">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-2 flex justify-end gap-3 border-t border-white/5 mt-6 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-gradient-to-r from-accent-primary to-accent-secondary hover:brightness-110 text-white text-sm font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            Start Analysis
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
