import { useState } from 'react'

export default function useUnsavedChanges() {
  const [isDirty, setIsDirty] = useState(false)
  const [pendingClose, setPendingClose] = useState(null)

  function markDirty() {
    setIsDirty(true)
  }

  function confirmClose(onClose) {
    if (!isDirty) {
      onClose()
    } else {
      setPendingClose(() => onClose)
    }
  }

  function handleDiscard() {
    const fn = pendingClose
    setPendingClose(null)
    setIsDirty(false)
    fn?.()
  }

  function handleKeep() {
    setPendingClose(null)
  }

  function reset() {
    setIsDirty(false)
    setPendingClose(null)
  }

  function DiscardDialog() {
    if (!pendingClose) return null
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={handleKeep} />
        <div className="relative bg-background rounded-lg border border-border shadow-lg p-6 w-full max-w-sm mx-4 space-y-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-base">Discard changes?</h3>
            <p className="text-sm text-muted-foreground">You have unsaved changes. If you leave now, your changes will be lost.</p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleKeep}
              className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors"
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return { isDirty, markDirty, confirmClose, DiscardDialog, reset }
}
