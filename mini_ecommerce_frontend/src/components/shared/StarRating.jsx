import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StarRating({ value = 0, max = 5, interactive = false, onChange, size = 'sm' }) {
  const sizeClass = size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4'

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(value)
        return (
          <Star
            key={i}
            className={cn(
              sizeClass,
              filled ? 'fill-yellow-400 text-yellow-400' : 'fill-muted text-muted-foreground',
              interactive && 'cursor-pointer hover:text-yellow-400 hover:fill-yellow-400 transition-colors',
            )}
            onClick={interactive ? () => onChange?.(i + 1) : undefined}
          />
        )
      })}
    </div>
  )
}
