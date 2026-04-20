import { PackageOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function EmptyState({ icon: Icon = PackageOpen, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      {message && <p className="text-sm text-muted-foreground max-w-xs mb-6">{message}</p>}
      {action && (
        <Button onClick={action.onClick} variant={action.variant || 'default'}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
