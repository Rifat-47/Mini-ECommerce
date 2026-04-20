import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Pagination({ count, page, pageSize = 20, onPageChange }) {
  const totalPages = Math.ceil(count / pageSize)
  if (totalPages <= 1) return null

  const pages = buildPageRange(page, totalPages)

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <Button
        variant="ghost"
        size="icon"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm select-none">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'default' : 'ghost'}
            size="icon"
            className="h-9 w-9 text-sm"
            onClick={() => onPageChange(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </Button>
        ),
      )}

      <Button
        variant="ghost"
        size="icon"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}
