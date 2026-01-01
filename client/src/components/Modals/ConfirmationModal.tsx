import React from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface ConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'default'
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default'
}: ConfirmationModalProps) {
    if (!isOpen) return null

    const isDanger = variant === 'danger'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="w-full max-w-md bg-dark-800 border border-white/10 rounded-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden mx-4">
                {/* Header */}
                <div className={`relative p-6 flex items-start gap-4 ${isDanger ? 'bg-red-500/10' : 'bg-accent-primary/10'}`}>
                    <div className={`p-2 rounded-full ${isDanger ? 'bg-red-500/20 text-red-400' : 'bg-accent-primary/20 text-accent-primary'}`}>
                        {isDanger ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                    </div>

                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-white mb-1">
                            {title}
                        </h2>
                        <p className="text-white/70 text-sm leading-relaxed">
                            {message}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/10 text-white/50 hover:text-white rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Actions */}
                <div className="p-4 bg-dark-900 border-t border-white/5 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onConfirm()
                            onClose()
                        }}
                        className={`px-4 py-2 text-white text-sm font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] ${isDanger
                            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                            : 'bg-gradient-to-r from-accent-primary to-accent-secondary hover:brightness-110 shadow-accent-primary/20'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
