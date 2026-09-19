import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, Lock, Mail, Printer } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'admin@3ld.com', password: 'Admin3LD#2026!' },
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password)
      navigate('/', { replace: true })
    } catch {
      // error displayed from hook
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-surface via-surface-secondary to-surface-card px-4">
      {/* Logo section */}
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary-dark shadow-2xl shadow-primary/30">
          <Printer className="h-10 w-10 text-slate-800" />
        </div>
        <h1 className="text-4xl font-black tracking-tight">
          <span className="text-primary">3</span>
          <span className="text-secondary">L</span>
          <span className="text-accent">D</span>
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Sistema de Gestión ERP
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-slate-50/50-secondary p-8 shadow-2xl">
        <h2 className="mb-6 text-xl font-black text-slate-800">Iniciar sesión</h2>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                {...register('email')}
                className="w-full rounded-xl border border-slate-100 bg-slate-50/50 pl-10 pr-4 py-3 text-sm font-semibold text-slate-800 placeholder-gray-500 outline-none transition-colors focus:border-primary"
                placeholder="admin@3ld.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                {...register('password')}
                className="w-full rounded-xl border border-slate-100 bg-slate-50/50 pl-10 pr-4 py-3 text-sm font-semibold text-slate-800 placeholder-gray-500 outline-none transition-colors focus:border-primary"
                placeholder="••••••••"
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark py-3.5 text-sm font-black text-white shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 active:scale-95 disabled:opacity-60"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {/* Dev hint */}
        <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs text-slate-400">
          <p className="font-bold text-slate-500 mb-1">🛠 Credenciales de prueba</p>
          <p className="text-slate-400">
            Email: <span className="text-emerald-500">admin@3ld.com</span><br />
            Password: <span className="text-emerald-500">Admin3LD#2026!</span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-600">
        © 2025 3LD – Impresión 3D y Retail
      </p>
    </div>
  )
}
