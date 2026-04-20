import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search, Download, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ErrorMessage from '@/components/shared/ErrorMessage'
import Pagination from '@/components/shared/Pagination'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import api from '@/api/axios'

const EMPTY_FORM = { name: '', description: '', price: '', discount_percentage: '0', stock: '', category: '', status: 'active' }

const STATUS_COLORS = {
  active: 'bg-success/10 text-success',
  inactive: 'bg-muted text-muted-foreground',
}

function ProductForm({ initial, categories, onSave, onClose }) {
  const [form, setForm] = useState(initial ? {
    name: initial.name || '',
    description: initial.description || '',
    price: initial.price || '',
    discount_percentage: initial.discount_percentage || '0',
    stock: initial.stock ?? '',
    category: initial.category ? String(initial.category) : '',
    status: initial.status || 'active',
  } : EMPTY_FORM)
  const [images, setImages] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = { ...form, category: form.category || null }
      const { data } = initial?.id
        ? await api.patch(`/products/${initial.id}/`, payload)
        : await api.post('/products/', payload)

      // Upload images if any selected
      if (images.length > 0) {
        await Promise.allSettled(images.slice(0, 5).map((file, i) => {
          const fd = new FormData()
          fd.append('image', file)
          if (i === 0 && !initial?.id) fd.append('is_primary', 'true')
          return api.post(`/products/${data.id}/images/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        }))
      }

      toast.success(initial?.id ? 'Product updated.' : 'Product created.')
      onSave()
    } catch (err) {
      setError(err.response?.data || { error: 'Failed to save product.' })
    } finally {
      setSaving(false)
    }
  }

  function handleFiles(e) {
    const files = Array.from(e.target.files || []).slice(0, 5)
    setImages(files)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorMessage error={error} />
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
        </div>
        <div className="space-y-1">
          <Label>Price (৳) *</Label>
          <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} required />
        </div>
        <div className="space-y-1">
          <Label>Discount (%)</Label>
          <Input type="number" step="0.01" min="0" max="100" value={form.discount_percentage} onChange={(e) => setForm(f => ({ ...f, discount_percentage: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Stock *</Label>
          <Input type="number" min="0" value={form.stock} onChange={(e) => setForm(f => ({ ...f, stock: e.target.value }))} required />
        </div>
        <div className="space-y-1">
          <Label>Category</Label>
          <Select value={form.category || 'none'} onValueChange={(v) => setForm(f => ({ ...f, category: v === 'none' ? '' : v }))}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Images (max 5)</Label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Choose files
            </Button>
            {images.length > 0 && <span className="text-xs text-muted-foreground">{images.length} file(s) selected</span>}
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFiles} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {initial?.id ? 'Update' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function StockAdjustDialog({ product, onClose, onSaved }) {
  const [change, setChange] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.post(`/admin/products/${product.id}/adjust-stock/`, { quantity_change: parseInt(change), reason })
      toast.success('Stock adjusted.')
      onSaved()
    } catch (err) {
      setError(err.response?.data || { error: 'Failed to adjust stock.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">Current stock: <span className="font-medium text-foreground">{product.stock}</span></p>
      <ErrorMessage error={error} />
      <div className="space-y-1.5">
        <Label>Quantity change (negative to remove)</Label>
        <Input type="number" value={change} onChange={(e) => setChange(e.target.value)} required placeholder="e.g. 10 or -5" />
      </div>
      <div className="space-y-1.5">
        <Label>Reason</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Restock, damaged goods" required />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Adjust
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [count, setCount] = useState(0)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [editProduct, setEditProduct] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [stockProduct, setStockProduct] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')

  function setParam(key, value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      value ? next.set(key, value) : next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    })
  }

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams({ all: 'true' })
      if (searchParams.get('search')) q.set('search', searchParams.get('search'))
      if (searchParams.get('category')) q.set('category', searchParams.get('category'))
      if (page > 1) q.set('page', page)
      const { data } = await api.get(`/products/?${q}`)
      setProducts(data.results)
      setCount(data.count)
    } catch { setProducts([]) }
    finally { setLoading(false) }
  }, [searchParams])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => {
    api.get('/categories/?all=true').then(({ data }) => setCategories(data.results ?? data)).catch(() => {})
  }, [])

  function handleSearchSubmit(e) {
    e.preventDefault()
    setParam('search', search)
  }

  async function handleDelete() {
    try {
      await api.delete(`/products/${deleteId}/`)
      toast.success('Product deleted.')
      setDeleteId(null)
      fetchProducts()
    } catch { toast.error('Failed to delete.') }
  }

  async function handleExport() {
    try {
      const res = await api.get('/admin/products/export/', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = 'products.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Export failed.') }
  }

  async function handleBulkUpdate(updates) {
    if (!selected.size) return
    setBulkLoading(true)
    try {
      await api.post('/admin/products/bulk-update/', { product_ids: [...selected], ...updates })
      toast.success('Bulk update applied.')
      setSelected(new Set())
      fetchProducts()
    } catch { toast.error('Bulk update failed.') }
    finally { setBulkLoading(false) }
  }

  const allSelected = products.length > 0 && products.every(p => selected.has(p.id))

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(products.map(p => p.id)))
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1.5" />Export CSV</Button>
          <Button size="sm" onClick={() => { setEditProduct(null); setShowForm(true) }}><Plus className="h-4 w-4 mr-1.5" />Add Product</Button>
        </div>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-wrap gap-2">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Button type="submit" size="sm" variant="outline">Search</Button>
        </form>
        <Select value={searchParams.get('category') || 'all'} onValueChange={v => setParam('category', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
          <span className="text-muted-foreground">{selected.size} selected</span>
          <Button size="sm" variant="outline" disabled={bulkLoading} onClick={() => handleBulkUpdate({ stock: 0 })}>Set stock 0</Button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="hidden sm:table-cell">Stock</TableHead>
                  <TableHead className="hidden sm:table-cell w-24">Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No products found.</TableCell></TableRow>
                ) : products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell><Checkbox checked={selected.has(p.id)} onCheckedChange={(v) => setSelected(s => { const n = new Set(s); v ? n.add(p.id) : n.delete(p.id); return n })} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {p.images?.[0]?.image && <img src={p.images[0].image} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                        <span className="text-sm font-medium line-clamp-1">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.category_name || '—'}</TableCell>
                    <TableCell className="text-sm">৳{parseFloat(p.price).toFixed(2)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{p.stock}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || ''}`}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setStockProduct(p)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Adjust stock">
                          <span className="text-xs font-bold">±</span>
                        </button>
                        <button onClick={() => { setEditProduct(p); setShowForm(true) }} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteId(p.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination count={count} page={page} onPageChange={p => setParam('page', String(p))} />
        </>
      )}

      {/* Product form dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditProduct(null) } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editProduct ? 'Edit Product' : 'Add Product'}</DialogTitle></DialogHeader>
          <ProductForm initial={editProduct} categories={categories} onSave={() => { setShowForm(false); setEditProduct(null); fetchProducts() }} onClose={() => { setShowForm(false); setEditProduct(null) }} />
        </DialogContent>
      </Dialog>

      {/* Stock adjust dialog */}
      <Dialog open={!!stockProduct} onOpenChange={(o) => { if (!o) setStockProduct(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Stock — {stockProduct?.name}</DialogTitle></DialogHeader>
          {stockProduct && <StockAdjustDialog product={stockProduct} onClose={() => setStockProduct(null)} onSaved={() => { setStockProduct(null); fetchProducts() }} />}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The product will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
