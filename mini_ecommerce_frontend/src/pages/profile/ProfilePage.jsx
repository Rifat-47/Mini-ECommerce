import { useState, useEffect } from 'react'
import { User, MapPin, Shield, Lock, Loader2, Plus, Trash2, Edit2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorMessage from '@/components/shared/ErrorMessage'
import DateOfBirthPicker from '@/components/shared/DateOfBirthPicker'
import useUnsavedChanges from '@/hooks/useUnsavedChanges.jsx'
import api from '@/api/axios'
import useAuthStore from '@/store/authStore'

/* ─── Profile Tab ─── */
function ProfileTab() {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const [form, setForm] = useState({ first_name: '', last_name: '', date_of_birth: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const { markDirty, isDirty, DiscardDialog } = useUnsavedChanges()

  useEffect(() => {
    api.get('/auth/profile/').then(({ data }) => {
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        date_of_birth: data.date_of_birth || '',
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.date_of_birth) payload.date_of_birth = null
      const { data } = await api.patch('/auth/profile/', payload)
      updateUser({ first_name: data.first_name, last_name: data.last_name })
      toast.success('Profile updated.')
    } catch (err) {
      setError(err.response?.data || { error: 'Failed to update profile.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="max-w-md space-y-4 py-4">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-28" />
    </div>
  )

  return (
    <>
      <DiscardDialog />
      <form onSubmit={handleSave} className="max-w-md space-y-4">
        <ErrorMessage error={error} />

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">First name</Label>
            <Input id="first_name" value={form.first_name} onChange={(e) => { setForm((f) => ({ ...f, first_name: e.target.value })); markDirty() }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" value={form.last_name} onChange={(e) => { setForm((f) => ({ ...f, last_name: e.target.value })); markDirty() }} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Date of birth</Label>
          <DateOfBirthPicker
            initialValue={form.date_of_birth}
            onChange={val => { setForm(f => ({ ...f, date_of_birth: val })); markDirty() }}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
          {isDirty && (
            <span className="text-xs text-muted-foreground">You have unsaved changes</span>
          )}
        </div>
      </form>
    </>
  )
}

/* ─── Address Form (reusable inline) ─── */
function AddressFormInline({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    label: initial.label || '',
    full_name: initial.full_name || '',
    phone: initial.phone || '',
    address_line_1: initial.address_line_1 || '',
    address_line_2: initial.address_line_2 || '',
    city: initial.city || '',
    state: initial.state || '',
    postal_code: initial.postal_code || '',
    country: initial.country || 'BD',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { markDirty, confirmClose, DiscardDialog } = useUnsavedChanges()

  function field(key) {
    return (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); markDirty() }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = initial.id
        ? await api.patch(`/addresses/${initial.id}/`, form)
        : await api.post('/addresses/', form)
      onSave(data)
    } catch (err) {
      setError(err.response?.data || { error: 'Failed to save address.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DiscardDialog />
      <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
        <ErrorMessage error={error} />
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1 space-y-1">
            <Label className="text-xs">Full name <span className="text-destructive">*</span></Label>
            <Input name="full_name" value={form.full_name} onChange={field('full_name')} required className="h-8 text-sm" />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1">
            <Label className="text-xs">Phone <span className="text-destructive">*</span></Label>
            <Input name="phone" value={form.phone} onChange={field('phone')} required className="h-8 text-sm" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Address <span className="text-destructive">*</span></Label>
            <Input value={form.address_line_1} onChange={field('address_line_1')} required className="h-8 text-sm" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Apt, suite, etc.</Label>
            <Input value={form.address_line_2} onChange={field('address_line_2')} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">City <span className="text-destructive">*</span></Label>
            <Input value={form.city} onChange={field('city')} required className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">State <span className="text-destructive">*</span></Label>
            <Input value={form.state} onChange={field('state')} required className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Postal code <span className="text-destructive">*</span></Label>
            <Input value={form.postal_code} onChange={field('postal_code')} required className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Label (e.g. Home)</Label>
            <Input value={form.label} onChange={field('label')} placeholder="Optional" className="h-8 text-sm" />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="submit" size="sm" disabled={loading}>
            {loading && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
            {initial.id ? 'Update' : 'Save'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => confirmClose(onCancel)}>Cancel</Button>
        </div>
      </form>
    </>
  )
}

/* ─── Addresses Tab ─── */
function AddressesTab() {
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    api.get('/addresses/').then(({ data }) => setAddresses(data.results ?? data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function handleSaved(addr) {
    setAddresses((prev) => {
      const idx = prev.findIndex((a) => a.id === addr.id)
      return idx >= 0 ? prev.map((a) => (a.id === addr.id ? addr : a)) : [addr, ...prev]
    })
    setShowForm(false)
    setEditingId(null)
    toast.success('Address saved.')
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/addresses/${id}/`)
      setAddresses((prev) => prev.filter((a) => a.id !== id))
      toast.success('Address deleted.')
    } catch {
      toast.error('Failed to delete address.')
    }
  }

  async function handleSetDefault(id, type) {
    try {
      await api.patch(`/addresses/${id}/set-default/`, { type })
      const { data } = await api.get('/addresses/')
      setAddresses(data.results ?? data)
      toast.success(`Default ${type} address updated.`)
    } catch {
      toast.error('Failed to update default.')
    }
  }

  if (loading) return (
    <div className="max-w-xl space-y-4 py-4">
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  )

  return (
    <div className="max-w-xl space-y-4">
      <div className="space-y-3">
        {addresses.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">No addresses saved yet.</p>
        )}

        {addresses.map((addr) => (
          <div key={addr.id} className="border border-border rounded-lg p-4">
            {editingId === addr.id ? (
              <AddressFormInline
                initial={addr}
                onSave={handleSaved}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm space-y-0.5">
                    <p className="font-medium">{addr.full_name} {addr.label && <span className="text-xs text-muted-foreground ml-1">({addr.label})</span>}</p>
                    <p className="text-muted-foreground">{addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}</p>
                    <p className="text-muted-foreground">{addr.city}, {addr.state} {addr.postal_code}</p>
                    <p className="text-muted-foreground">{addr.phone}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditingId(addr.id)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(addr.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {addr.is_default_shipping ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      <Check className="h-3 w-3" /> Default shipping
                    </span>
                  ) : (
                    <button onClick={() => handleSetDefault(addr.id, 'shipping')} className="text-xs text-muted-foreground hover:text-primary underline">
                      Set as default shipping
                    </button>
                  )}
                  {addr.is_default_billing ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      <Check className="h-3 w-3" /> Default billing
                    </span>
                  ) : (
                    <button onClick={() => handleSetDefault(addr.id, 'billing')} className="text-xs text-muted-foreground hover:text-primary underline">
                      Set as default billing
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {showForm ? (
        <AddressFormInline onSave={handleSaved} onCancel={() => setShowForm(false)} />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Address
        </Button>
      )}
    </div>
  )
}

/* ─── Security Tab ─── */
function SecurityTab() {
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) {
      setError({ error: 'New passwords do not match.' })
      return
    }
    setError(null)
    setLoading(true)
    try {
      await api.post('/auth/update-password/', {
        old_password: form.old_password,
        new_password: form.new_password,
      })
      toast.success('Password updated successfully.')
      setForm({ old_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      setError(err.response?.data || { error: 'Failed to update password.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <ErrorMessage error={error} />

      <div className="space-y-1.5">
        <Label htmlFor="old_password">Current password <span className="text-destructive">*</span></Label>
        <Input id="old_password" type="password" value={form.old_password} onChange={(e) => setForm((f) => ({ ...f, old_password: e.target.value }))} required autoComplete="current-password" />
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Label htmlFor="new_password">New password <span className="text-destructive">*</span></Label>
        <Input id="new_password" type="password" placeholder="Min. 8 characters" value={form.new_password} onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))} required autoComplete="new-password" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm_password">Confirm new password <span className="text-destructive">*</span></Label>
        <Input id="confirm_password" type="password" value={form.confirm_password} onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))} required autoComplete="new-password" />
      </div>

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Update Password
      </Button>
    </form>
  )
}

/* ─── Privacy Tab ─── */
function PrivacyTab() {
  const logout = useAuthStore((s) => s.logout)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const { data } = await api.get('/profile/export/')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'my-data-export.json'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported.')
    } catch {
      toast.error('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault()
    setDeleteError(null)
    setDeleting(true)
    try {
      await api.delete('/profile/delete/', { data: { password: deletePassword } })
      toast.success('Account deleted.')
      await logout()
    } catch (err) {
      setDeleteError(err.response?.data || { error: 'Failed to delete account.' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-md space-y-8">
      {/* Data export */}
      <div>
        <h3 className="font-semibold mb-1">Export Your Data</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Download a JSON file containing your profile, addresses, and order history.
        </p>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Download My Data
        </Button>
      </div>

      <Separator />

      {/* Account deletion */}
      <div>
        <h3 className="font-semibold text-destructive mb-1">Delete Account</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Permanently delete your account. Orders will be anonymised, not deleted. This action cannot be undone.
        </p>

        {!confirmDelete ? (
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            Delete My Account
          </Button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-3 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
            <p className="text-sm font-medium text-destructive">Confirm account deletion</p>
            <ErrorMessage error={deleteError} />
            <div className="space-y-1.5">
              <Label htmlFor="delete_password" className="text-sm">Enter your password to confirm <span className="text-destructive">*</span></Label>
              <Input
                id="delete_password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" size="sm" disabled={deleting}>
                {deleting && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                Delete Account
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { setConfirmDelete(false); setDeletePassword(''); setDeleteError(null) }}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-primary">
            {user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </span>
        </div>
        <div>
          <h1 className="text-xl font-bold">
            {user?.first_name ? `${user.first_name}` : 'My Account'}
          </h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <User className="h-3.5 w-3.5 hidden sm:block" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="addresses" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <MapPin className="h-3.5 w-3.5 hidden sm:block" />
            Addresses
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Lock className="h-3.5 w-3.5 hidden sm:block" />
            Security
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Shield className="h-3.5 w-3.5 hidden sm:block" />
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="addresses"><AddressesTab /></TabsContent>
        <TabsContent value="security"><SecurityTab /></TabsContent>
        <TabsContent value="privacy"><PrivacyTab /></TabsContent>
      </Tabs>
    </div>
  )
}
