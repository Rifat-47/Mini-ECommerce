import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoadingSpinner({ fullPage = false, className }) {
  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
