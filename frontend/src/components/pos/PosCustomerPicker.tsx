import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, Star } from 'lucide-react'
import { useClientes, useUpdateCliente } from '@/hooks/useClientes'
import { toast } from '@/store/toastStore'
import type { Cliente } from '@/types'

export function PosCustomerPicker({ selected, onSelect }: { selected?: Cliente; onSelect: (customer: Cliente) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const update = useUpdateCliente()
  const { data, isPending, isError, refetch } = useClientes(
    { search: query, page, per_page: 20, orden: 'destacados' }, { enabled: open },
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, 230)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!open) return
    searchInput.current?.focus()
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  function close() {
    setOpen(false)
    trigger.current?.focus()
  }

  async function toggleFavorite(customer: Cliente) {
    try {
      await update.mutateAsync({
        id: customer.id,
        payload: { destacado_pos: !customer.destacado_pos },
      })
      toast(customer.destacado_pos ? 'Cliente quitado de destacados' : 'Cliente destacado', 'success')
    } catch {
      toast('No se pudo actualizar el destacado', 'error')
    }
  }

  const rows = data?.data ?? []
  const pages = Math.max(1, data?.meta.last_page ?? 1)
  const searching = search.trim() !== query || isPending

  return (
    <div ref={root} className="relative min-w-0 flex-1" onKeyDown={event => {
      if (open && event.key === 'Escape') {
        event.stopPropagation()
        close()
      }
    }}>
      <button type="button" ref={trigger} aria-expanded={open} aria-controls="pos-customer-options"
        aria-label={selected ? 'Cambiar cliente: ' + selected.nombre : 'Buscar cliente'}
        onClick={() => {
          if (open) {
            close()
            return
          }
          setSearch('')
          setQuery('')
          setPage(1)
          setOpen(true)
        }}
        className="flex min-h-10 w-full items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-left text-xs font-bold text-white focus-visible:outline-2 focus-visible:outline-teal-400">
        <Search className="h-4 w-4 shrink-0 text-teal-300" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{selected?.nombre || 'Buscar cliente'}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      </button>

      {open && (
        <div id="pos-customer-options" className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <label className="sr-only" htmlFor="pos-customer-search">Buscar cliente por nombre, teléfono o email</label>
            <input id="pos-customer-search" ref={searchInput} type="search" value={search} onChange={event => setSearch(event.target.value)}
              maxLength={150} autoComplete="off" placeholder="Nombre, teléfono o email"
              className="w-full rounded-lg border border-slate-300 px-2 py-2 text-base text-slate-900 focus:border-teal-600 focus:outline-none sm:text-sm" />
          </div>
          <div className="max-h-48 overflow-y-auto overscroll-contain">
            {searching ? <p role="status" className="px-3 py-2 text-sm text-slate-600">Buscando…</p> : isError ? (
              <div className="space-y-1 p-3 text-sm"><p role="alert">No se pudo cargar la lista.</p><button type="button" onClick={() => void refetch()} className="font-semibold text-teal-800">Reintentar</button></div>
            ) : rows.length ? (
              <ul aria-label="Clientes">
                {rows.map(customer => (
                  <li key={customer.id} className="flex min-h-11 items-stretch border-b border-slate-100 last:border-b-0">
                    <button type="button" onClick={() => { onSelect(customer); close() }}
                      aria-current={selected?.id === customer.id ? true : undefined}
                      className="min-w-0 flex-1 px-3 py-2 text-left text-sm text-slate-900 hover:bg-teal-50 focus-visible:bg-teal-50">
                      <span className="block truncate font-semibold">{customer.nombre}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {[customer.tipo_cliente === 'mayorista' ? 'Mayorista' : '', customer.telefono || customer.email].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                    <button type="button" aria-label={'Destacado: ' + customer.nombre} title={customer.destacado_pos ? 'Quitar de destacados' : 'Marcar como destacado'}
                      aria-pressed={!!customer.destacado_pos} disabled={update.isPending}
                      onClick={() => void toggleFavorite(customer)}
                      className="flex w-11 shrink-0 items-center justify-center text-slate-500 hover:bg-amber-50 focus-visible:bg-amber-50 disabled:opacity-50">
                      <Star className={customer.destacado_pos ? 'h-4 w-4 fill-amber-400 text-amber-700' : 'h-4 w-4'} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p role="status" className="px-3 py-2 text-sm text-slate-600">No encontramos clientes.</p>}
          </div>
          {!searching && !isError && pages > 1 && (
            <nav aria-label="Páginas de clientes" className="flex items-center justify-between border-t border-slate-100 px-2 py-1 text-xs text-slate-600">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-2 font-semibold disabled:opacity-40">Anterior</button>
              <span>{page} de {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="p-2 font-semibold disabled:opacity-40">Siguiente</button>
            </nav>
          )}
        </div>
      )}
    </div>
  )
}