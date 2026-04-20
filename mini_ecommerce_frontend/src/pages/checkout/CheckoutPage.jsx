import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Tag, X, Loader2, MapPin, CreditCard, Banknote } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import ErrorMessage from '@/components/shared/ErrorMessage'
import api from '@/api/axios'
import useCartStore from '@/store/cartStore'

function AddressForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    label: '', full_name: '', phone: '', address_line_1: '',
    address_line_2: '', city: '', state: '', postal_code: '', country: 'BD',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await api.post('/addresses/', form)
      onSave(data)
    } catch (err) {
      setError(err.response?.data || { error: 'Failed to save address.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4 p-4 border border-border rounded-lg bg-muted/30">
      <h3 className="font-medium text-sm">New Address</h3>
      <ErrorMessage error={error} />
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="full_name" className="text-xs">Full name *</Label>
          <Input id="full_name" name="full_name" value={form.full_name} onChange={handleChange} required className="mt-1 h-8 text-sm" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="phone" className="text-xs">Phone *</Label>
          <Input id="phone" name="phone" value={form.phone} onChange={handleChange} required className="mt-1 h-8 text-sm" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="address_line_1" className="text-xs">Address *</Label>
          <Input id="address_line_1" name="address_line_1" value={form.address_line_1} onChange={handleChange} required className="mt-1 h-8 text-sm" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="address_line_2" className="text-xs">Apartment, suite, etc.</Label>
          <Input id="address_line_2" name="address_line_2" value={form.address_line_2} onChange={handleChange} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label htmlFor="city" className="text-xs">City *</Label>
          <Input id="city" name="city" value={form.city} onChange={handleChange} required className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label htmlFor="state" className="text-xs">State / Division *</Label>
          <Input id="state" name="state" value={form.state} onChange={handleChange} required className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label htmlFor="postal_code" className="text-xs">Postal code *</Label>
          <Input id="postal_code" name="postal_code" value={form.postal_code} onChange={handleChange} required className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label htmlFor="label" className="text-xs">Label (e.g. Home)</Label>
          <Input id="label" name="label" value={form.label} onChange={handleChange} placeholder="Optional" className="mt-1 h-8 text-sm" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={loading}>
          {loading && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
          Save Address
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const items = useCartStore((s) => s.items)
  const getTotal = useCartStore((s) => s.getTotal)
  const clearCart = useCartStore((s) => s.clearCart)

  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('online')
  const [availableCoupons, setAvailableCoupons] = useState([])
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState(null)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState(null)

  const subtotal = getTotal()
  const discount = couponResult?.discount_amount ? parseFloat(couponResult.discount_amount) : 0
  const finalTotal = couponResult?.final_total ? parseFloat(couponResult.final_total) : subtotal

  useEffect(() => {
    if (items.length === 0) navigate('/cart', { replace: true })
  }, [items, navigate])

  useEffect(() => {
    api.get('/addresses/').then(({ data }) => {
      const list = data.results ?? data
      setAddresses(list)
      const defaultAddr = list.find((a) => a.is_default_shipping) || list[0]
      if (defaultAddr) setSelectedAddressId(defaultAddr.id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    api.get('/coupons/').then(({ data }) => setAvailableCoupons(data)).catch(() => {})
  }, [])

  async function handleCouponApply() {
    if (!couponCode.trim()) return
    setCouponError(null)
    setCouponLoading(true)
    try {
      const categoryIds = [...new Set(items.map((i) => i.category_id).filter(Boolean))]
      const { data } = await api.post('/coupons/validate/', {
        code: couponCode.trim(),
        cart_total: subtotal.toFixed(2),
        category_ids: categoryIds,
      })
      setCouponResult(data)
      toast.success('Coupon applied!')
    } catch (err) {
      setCouponResult(null)
      const d = err.response?.data
      setCouponError(d?.code || d?.error || d?.detail || 'Invalid coupon code.')
    } finally {
      setCouponLoading(false)
    }
  }

  function removeCoupon() {
    setCouponCode('')
    setCouponResult(null)
    setCouponError(null)
  }

  async function handlePlaceOrder() {
    if (!selectedAddressId) { setError({ error: 'Please select a shipping address.' }); return }
    setError(null)
    setPlacing(true)
    try {
      const orderItems = items.map((i) => ({ product: i.product_id, quantity: i.quantity }))
      const body = {
        address_id: selectedAddressId,
        items: orderItems,
        ...(couponResult ? { coupon_code: couponCode } : {}),
      }
      const { data: order } = await api.post('/orders/', body)
      clearCart()

      if (paymentMethod === 'cod') {
        await api.post('/payments/cod/', { order_id: order.id })
        navigate(`/payment/success?order_id=${order.id}&method=cod`, { replace: true })
      } else {
        const { data: payment } = await api.post('/payments/initiate/', { order_id: order.id })
        window.location.href = payment.checkout_url
      }
    } catch (err) {
      setError(err.response?.data || { error: 'Failed to place order. Please try again.' })
    } finally {
      setPlacing(false)
    }
  }

  function handleAddressSaved(addr) {
    setAddresses((prev) => [addr, ...prev])
    setSelectedAddressId(addr.id)
    setShowAddressForm(false)
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Checkout</h1>
        <ErrorMessage error={error} className="mb-4" />

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: address + coupon */}
          <div className="lg:col-span-3 space-y-6">
            {/* Shipping address */}
            <div>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Shipping Address
              </h2>

              <div className="space-y-2">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={cn(
                      'w-full text-left border rounded-lg p-3 transition-colors text-sm',
                      selectedAddressId === addr.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground',
                    )}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium">{addr.full_name}</span>
                      {addr.label && <span className="text-xs text-muted-foreground">{addr.label}</span>}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}, {addr.city}, {addr.state} {addr.postal_code}
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5">{addr.phone}</p>
                  </button>
                ))}

                {!showAddressForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(true)}
                    className="w-full border border-dashed border-border rounded-lg p-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add new address
                  </button>
                )}

                {showAddressForm && (
                  <AddressForm onSave={handleAddressSaved} onCancel={() => setShowAddressForm(false)} />
                )}
              </div>
            </div>

            {/* Coupon */}
            <div>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Coupon Code
              </h2>

              {couponResult ? (
                <div className="flex items-center justify-between bg-success/10 border border-success/30 rounded-lg px-3 py-2 text-sm">
                  <span className="text-success font-medium">"{couponCode}" — ৳{discount.toFixed(2)} off</span>
                  <button onClick={removeCoupon} className="text-muted-foreground hover:text-foreground ml-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableCoupons.length > 0 && (
                    <Select
                      value={couponCode}
                      onValueChange={(val) => { setCouponCode(val); setCouponError(null) }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a coupon…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCoupons.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="font-medium">{c.code}</span>
                            <span className="ml-2 text-muted-foreground text-xs">
                              {c.discount_type === 'percentage'
                                ? `${c.discount_value}% off`
                                : c.discount_type === 'fixed'
                                ? `৳${c.discount_value} off`
                                : 'Free shipping'}
                              {c.min_order_value ? ` · min ৳${c.min_order_value}` : ''}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Or enter coupon code"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value); setCouponError(null) }}
                      onKeyDown={(e) => e.key === 'Enter' && handleCouponApply()}
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={handleCouponApply} disabled={couponLoading || !couponCode.trim()}>
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>
                </div>
              )}
              {couponError && <p className="text-sm text-destructive mt-1.5">{couponError}</p>}
            </div>

            {/* Payment method */}
            <div>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Payment Method
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('online')}
                  className={cn(
                    'flex items-center gap-3 border rounded-lg p-3 text-sm transition-colors',
                    paymentMethod === 'online'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground',
                  )}
                >
                  <CreditCard className="h-5 w-5 shrink-0 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Online Payment</p>
                    <p className="text-xs text-muted-foreground">bKash, Nagad, Rocket</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={cn(
                    'flex items-center gap-3 border rounded-lg p-3 text-sm transition-colors',
                    paymentMethod === 'cod'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground',
                  )}
                >
                  <Banknote className="h-5 w-5 shrink-0 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-xs text-muted-foreground">Pay when you receive</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right: order summary */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 sticky top-24">
              <h2 className="font-semibold">Order Summary</h2>

              <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                {items.map((item) => {
                  const disc = parseFloat(item.discount_percentage || 0)
                  const price = parseFloat(item.price)
                  const eff = disc > 0 ? price * (1 - disc / 100) : price
                  return (
                    <div key={item.product_id} className="flex justify-between gap-2 text-muted-foreground">
                      <span className="truncate">{item.name} × {item.quantity}</span>
                      <span className="shrink-0">৳{(eff * item.quantity).toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>

              <Separator />

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>৳{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount</span>
                    <span>-৳{discount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>৳{finalTotal.toFixed(2)}</span>
              </div>

              <Button className="w-full" onClick={handlePlaceOrder} disabled={placing || !selectedAddressId}>
                {placing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {placing ? 'Processing...' : paymentMethod === 'cod' ? 'Place Order' : 'Place Order & Pay'}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                {paymentMethod === 'cod'
                  ? 'Your order will be confirmed immediately. Pay on delivery.'
                  : "You'll be redirected to ShurjoPay to complete payment."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
