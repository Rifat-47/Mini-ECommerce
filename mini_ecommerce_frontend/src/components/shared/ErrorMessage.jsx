import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ErrorMessage({ error, className }) {
  if (!error) return null

  const messages = Array.isArray(error)
    ? error
    : typeof error === 'object'
      ? Object.entries(error).flatMap(([field, msgs]) => {
          const list = Array.isArray(msgs) ? msgs : [msgs]
          return field === 'non_field_errors' || field === 'detail' || field === 'error'
            ? list
            : list.map((m) => `${field}: ${m}`)
        })
      : [String(error)]

  return (
    <div className={cn('rounded-lg border border-destructive/30 bg-destructive/10 p-3', className)}>
      {messages.map((msg, i) => (
        <div key={i} className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{msg}</span>
        </div>
      ))}
    </div>
  )
}
