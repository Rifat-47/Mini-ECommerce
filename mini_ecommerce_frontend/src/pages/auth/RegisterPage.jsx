import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import ErrorMessage from '@/components/shared/ErrorMessage'
import DateOfBirthPicker from '@/components/shared/DateOfBirthPicker'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import useSettingsStore from '@/store/settingsStore'
import api from '@/api/axios'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const storeName = useSettingsStore(s => s.settings.store_name)
  const syncCart = useCartStore((s) => s.syncOnLogin)
  const syncWishlist = useWishlistStore((s) => s.syncOnLogin)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    date_of_birth: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const payload = { ...form }
      if (!payload.date_of_birth) delete payload.date_of_birth
      await api.post('/auth/register/', payload)
      // Auto-login after registration
      await login(form.email, form.password)
      await Promise.allSettled([syncCart(), syncWishlist()])
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data || { error: 'Registration failed. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">Create account</CardTitle>
        <CardDescription>Join {storeName} and start shopping</CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <ErrorMessage error={error} className="mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                name="first_name"
                placeholder="John"
                value={form.first_name}
                onChange={handleChange}
                autoFocus
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                name="last_name"
                placeholder="Doe"
                value={form.last_name}
                onChange={handleChange}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Date of birth</Label>
            <DateOfBirthPicker
              onChange={val => setForm(prev => ({ ...prev, date_of_birth: val }))}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center text-sm text-muted-foreground">
        Already have an account?&nbsp;
        <Link to="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </CardFooter>
    </Card>
  )
}
