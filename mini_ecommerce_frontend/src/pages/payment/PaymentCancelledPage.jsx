import { Link } from 'react-router-dom'
import { Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PaymentCancelledPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Ban className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
          <p className="text-muted-foreground">
            You cancelled the payment. Your cart items are still saved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/cart">
            <Button>Back to Cart</Button>
          </Link>
          <Link to="/">
            <Button variant="outline">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
