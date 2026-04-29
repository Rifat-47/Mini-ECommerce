import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/api/axios'
import useCartStore from '@/store/cartStore'

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')
  const isCod = searchParams.get('method') === 'cod'
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const clearCart = useCartStore((s) => s.clearCart)

  useEffect(() => {
    // For online payments the app does a full-page redirect to ShurjoPay and back,
    // so the in-memory cart store is lost. Clear here to ensure localStorage is wiped.
    // For COD the checkout page already cleared the cart before navigating, but
    // calling clearCart() again is a safe no-op.
    clearCart()

    if (!orderId) { setLoading(false); return }
    api.get(`/orders/${orderId}/`).then(({ data }) => setOrder(data)).catch(() => {}).finally(() => setLoading(false))
  }, [orderId])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
            {loading ? (
              <Loader2 className="h-10 w-10 text-success animate-spin" />
            ) : (
              <CheckCircle2 className="h-10 w-10 text-success" />
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">
            {isCod ? 'Order Placed!' : 'Payment Successful!'}
          </h1>
          <p className="text-muted-foreground">
            {isCod
              ? 'Your order is confirmed. Please have the exact amount ready upon delivery.'
              : "Thank you for your order. We'll start processing it right away."}
          </p>
        </div>

        {order && (
          <div className="bg-card border border-border rounded-xl p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-medium">#{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium capitalize">{order.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">৳{parseFloat(order.total_amount).toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {orderId && (
            <Link to={`/orders/${orderId}`}>
              <Button>View Order Details</Button>
            </Link>
          )}
          <Link to="/">
            <Button variant="outline">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
