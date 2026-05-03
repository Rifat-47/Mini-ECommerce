import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import EmptyState from '@/components/shared/EmptyState'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'

function CartItem({ item }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)

  const discountPct = parseFloat(item.discount_percentage || 0)
  const originalPrice = parseFloat(item.price)
  const effectivePrice = discountPct > 0 ? originalPrice * (1 - discountPct / 100) : originalPrice
  const lineTotal = effectivePrice * item.quantity

  return (
    <div className="flex gap-4 py-4">
      {/* Image */}
      <Link to={`/products/${item.product_id}`} className="shrink-0">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-secondary overflow-hidden">
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No img</div>
          )}
        </div>
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <Link to={`/products/${item.product_id}`} className="font-medium text-sm hover:underline line-clamp-2">
          {item.name}
        </Link>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">৳{effectivePrice.toFixed(2)}</span>
          {discountPct > 0 && (
            <span className="text-xs text-muted-foreground line-through">৳{originalPrice.toFixed(2)}</span>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto">
          {/* Quantity controls */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
              className="px-2 py-1 hover:bg-accent transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
              className="px-2 py-1 hover:bg-accent transition-colors"
              disabled={item.quantity >= item.stock}
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold hidden sm:block">৳{lineTotal.toFixed(2)}</span>
            <button
              onClick={() => removeItem(item.product_id)}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const isSyncing = useCartStore((s) => s.isSyncing)
  const clearCart = useCartStore((s) => s.clearCart)
  const getTotal = useCartStore((s) => s.getTotal)
  const getItemCount = useCartStore((s) => s.getItemCount)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const total = getTotal()
  const itemCount = getItemCount()

  if (isSyncing) {
    return (
      <div className="py-16 px-4 flex items-center justify-center">
        <p className="text-muted-foreground text-sm animate-pulse">Loading your cart...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          message="Browse our products and add something you love."
          action={{ label: 'Start shopping', onClick: () => window.location.href = '/' }}
        />
      </div>
    )
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          <button
            onClick={clearCart}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear cart
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items list */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl divide-y divide-border px-4">
              {items.map((item) => (
                <CartItem key={item.product_id} item={item} />
              ))}
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 lg:sticky lg:top-24">
              <h2 className="font-semibold text-lg">Order Summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Items ({itemCount})</span>
                  <span>৳{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between font-semibold text-base">
                <span>Subtotal</span>
                <span>৳{total.toFixed(2)}</span>
              </div>

              {isAuthenticated ? (
                <Link to="/checkout">
                  <Button className="w-full mt-2">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Proceed to Checkout
                  </Button>
                </Link>
              ) : (
                <div className="space-y-2">
                  <Link to="/login" state={{ from: '/checkout' }}>
                    <Button className="w-full">Login to Checkout</Button>
                  </Link>
                  <p className="text-xs text-center text-muted-foreground">
                    Your cart is saved — login to complete your order.
                  </p>
                </div>
              )}

              <Link to="/" className="block text-center text-sm text-primary hover:underline">
                Continue shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
