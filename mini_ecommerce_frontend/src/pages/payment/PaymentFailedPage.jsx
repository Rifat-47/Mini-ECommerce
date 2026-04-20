import { useSearchParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import api from '@/api/axios'

export default function PaymentFailedPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')
  const [retrying, setRetrying] = useState(false)

  async function handleRetry() {
    if (!orderId) return
    setRetrying(true)
    try {
      const { data } = await api.post('/payments/initiate/', { order_id: orderId })
      window.location.href = data.checkout_url
    } catch {
      toast.error('Failed to initiate payment. Please try again.')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
          <p className="text-muted-foreground">
            Something went wrong with your payment. Your order is saved — you can retry without losing your cart.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {orderId && (
            <Button onClick={handleRetry} disabled={retrying}>
              {retrying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Retry Payment
            </Button>
          )}
          <Link to="/orders">
            <Button variant="outline">View My Orders</Button>
          </Link>
        </div>

        <Link to="/" className="block text-sm text-primary hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  )
}
