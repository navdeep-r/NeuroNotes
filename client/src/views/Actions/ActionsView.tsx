import { useState } from 'react'
import { useAppState, useAppActions } from '../../context/AppContext'
import {
    Zap,
    CheckCircle2,
    XCircle,
    Calendar,
    Clock,
    Edit3,
    ChevronRight
} from 'lucide-react'
import { AutomationEvent } from '../../types'

export default function ActionsView() {
    const { pendingAutomations } = useAppState()
    const { approveAutomation, rejectAutomation } = useAppActions()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editBuffer, setEditBuffer] = useState<Record<string, any>>({})

    const handleStartEdit = (action: AutomationEvent) => {
        setEditingId(action.id)
        setEditBuffer(action.parameters)
    }

    const handleApprove = async (id: string) => {
        // If not editing, editBuffer is empty, which is fine (AutomationService handles it)
        // BUT if we were editing another item and clicked approve on this one, editBuffer might leak.
        // We should strictly use editBuffer ONLY if editingId === id.
        const params = (editingId === id) ? editBuffer : {};
        await approveAutomation(id, params)
        setEditingId(null)
        setEditBuffer({})
    }

    const handleReject = async (id: string) => {
        await rejectAutomation(id)
        setEditingId(null)
        setEditBuffer({})
    }

    return (
        <div className="p-8 max-w-5xl mx-auto h-full overflow-y-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-accent-primary/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-accent-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">Automation Actions</h1>
                    <p className="text-gray-400">Review and approve actions detected in your meetings.</p>
                </div>
            </div>

            {pendingAutomations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-2xl border border-white/5">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-gray-600" />
                    </div>
                    <h2 className="text-xl font-medium text-white mb-2">No pending actions</h2>
                    <p className="text-gray-500 max-w-sm">
                        Everything is up to date. New actions will appear here when detected in live transcripts.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {pendingAutomations.map((action) => {
                        const isEditing = editingId === action.id;
                        const meetingTitle = (action.meetingId && typeof action.meetingId === 'object') ? (action.meetingId as any).title : 'Active Meeting';

                        return (
                            <div
                                key={action.id}
                                className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-accent-primary/30 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary text-[10px] font-bold uppercase tracking-wider">
                                                {action.intent.replace('_', ' ')}
                                            </span>
                                            <span className="text-gray-500 text-xs flex items-center gap-1">
                                                <ChevronRight className="w-3 h-3" />
                                                {meetingTitle}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-white mb-1">
                                            {action.parameters.title || (action.intent === 'schedule_meeting' ? 'Schedule a new meeting' : 'Create work ticket')}
                                        </h3>
                                        <p className="text-gray-400 text-sm italic">
                                            "&shy;{action.triggerText}&shy;"
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-right mr-4">
                                            <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Confidence</div>
                                            <div className={`text-sm font-mono ${action.confidenceScore > 0.8 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {(action.confidenceScore * 100).toFixed(0)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {action.intent === 'email_summary' ? (
                                        <>
                                            {/* Recipients Card */}
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                                <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                                                    <div className="w-3.5 h-3.5" />
                                                    RECIPIENTS ({action.parameters.recipients?.length || 0})
                                                </div>
                                                <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                                                    {action.parameters.recipients?.map((r: any, idx: number) => (
                                                        <div key={idx} className="text-sm text-white flex justify-between">
                                                            <span>{r.name}</span>
                                                            <span className="text-gray-500 text-xs">{r.email}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Summary Preview Card */}
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                                <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                    SUMMARY PREVIEW
                                                </div>
                                                <div className="max-h-32 overflow-y-auto custom-scrollbar text-sm text-gray-300 space-y-2">
                                                    <div>
                                                        <span className="text-accent-primary font-bold text-xs block mb-1">KEY POINTS</span>
                                                        <ul className="list-disc pl-4 text-xs space-y-1">
                                                            {action.parameters.summary?.keyPoints?.slice(0, 3).map((kp: string, i: number) => (
                                                                <li key={i}>{kp}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    {action.parameters.summary?.actionItems?.length > 0 && (
                                                        <div className="pt-2">
                                                            <span className="text-accent-primary font-bold text-xs block mb-1">ACTION ITEMS</span>
                                                            <ul className="list-disc pl-4 text-xs space-y-1">
                                                                {action.parameters.summary?.actionItems?.slice(0, 2).map((ai: any, i: number) => (
                                                                    <li key={i}>{ai.content} ({ai.assignee})</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* Parameter: Raw Context (Editable) */}
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                                <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    DATE & TIME CONTEXT
                                                </div>
                                                {isEditing ? (
                                                    <div className="space-y-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Date (YYYY-MM-DD)"
                                                            value={editBuffer.date || ''}
                                                            onChange={(e) => setEditBuffer({ ...editBuffer, date: e.target.value })}
                                                            className="bg-dark-900 border border-white/10 rounded px-3 py-1.5 text-sm text-white w-full focus:outline-none focus:border-accent-primary"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Time (HH:MM AM/PM)"
                                                            value={editBuffer.time || ''}
                                                            onChange={(e) => setEditBuffer({ ...editBuffer, time: e.target.value })}
                                                            className="bg-dark-900 border border-white/10 rounded px-3 py-1.5 text-sm text-white w-full focus:outline-none focus:border-accent-primary"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="text-white text-sm font-medium">
                                                        {action.parameters.date && action.parameters.time
                                                            ? `${action.parameters.date} at ${action.parameters.time}`
                                                            : (action.parameters.raw_time_context || 'No specific time detected')}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                                <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    DETECTION WINDOW
                                                </div>
                                                <div className="text-white text-sm font-medium">
                                                    {new Date(action.createdAt).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-3">
                                        {isEditing ? (
                                            <button
                                                onClick={() => {
                                                    setEditingId(null);
                                                    setEditBuffer({});
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-all text-xs font-bold"
                                            >
                                                Cancel
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleStartEdit(action)}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-accent-primary/10 hover:text-accent-primary text-sm transition-all text-xs font-bold"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                                Edit Details
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 font-bold text-xs uppercase">
                                        <button
                                            onClick={() => handleReject(action.id)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-all font-bold"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleApprove(action.id)}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-primary text-white hover:brightness-110 shadow-lg shadow-accent-primary/20 transition-all font-bold"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Approve & Execute
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
