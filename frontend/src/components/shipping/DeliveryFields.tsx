import { PROVINCIAS_CORREO_ARG } from '@/lib/correoArgentino'

export interface DeliveryData {
  name: string
  email: string
  phone: string
  street: string
  number: string
  floor: string
  apartment: string
  city: string
  province: string
  postal_code: string
  reference: string
  agency: string
  delivery: 'D' | 'S'
  product_type: 'CP' | 'EP'
  weight: string | number
  height: string | number
  width: string | number
  length: string | number
  declared_value: string | number
}

export const emptyDelivery: DeliveryData = {
  name: '', email: '', phone: '', street: '', number: '', floor: '', apartment: '',
  city: '', province: '', postal_code: '', reference: '', agency: '', delivery: 'D',
  product_type: 'CP', weight: '', height: '', width: '', length: '', declared_value: '',
}

const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
const provinces = [...PROVINCIAS_CORREO_ARG].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

interface Props {
  value: DeliveryData
  onChange: (value: DeliveryData) => void
  required?: boolean
  packageFields?: boolean
  lockPostalCode?: boolean
}

export function DeliveryFields({ value, onChange, required = false, packageFields = false, lockPostalCode = false }: Props) {
  function field(name: keyof DeliveryData, label: string, options: React.InputHTMLAttributes<HTMLInputElement> = {}) {
    return (
      <label className="block text-sm font-medium text-slate-700">
        {label}
        <input {...options} className={inputClass} value={value[name]} onChange={event => onChange({ ...value, [name]: event.target.value })} />
      </label>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {packageFields && <label className="text-sm font-medium text-slate-700">
        Modalidad
        <select className={inputClass} value={value.delivery} onChange={event => onChange({ ...value, delivery: event.target.value as DeliveryData['delivery'] })}>
          <option value="D">A domicilio</option>
          <option value="S">Retiro en sucursal</option>
        </select>
      </label>}
      {field('name', 'Nombre y apellido del destinatario', { autoComplete: 'shipping name', required, maxLength: 120 })}
      {field('email', 'Correo electrónico', { type: 'email', autoComplete: 'shipping email', required, maxLength: 180 })}
      {field('phone', 'Celular con código de área', { type: 'tel', autoComplete: 'shipping tel', required, pattern: '[+0-9\\(\\) .\\-]{7,35}', maxLength: 35 })}
      {value.delivery === 'D' && <>
        {field('street', 'Calle', { autoComplete: 'shipping address-line1', required, maxLength: 120 })}
        {field('number', 'Número', { required, maxLength: 16 })}
        {field('floor', 'Piso (opcional)', { maxLength: 3 })}
        {field('apartment', 'Departamento (opcional)', { maxLength: 3 })}
        {field('city', 'Localidad', { autoComplete: 'shipping address-level2', required, maxLength: 100 })}
        {field('postal_code', 'Código postal', { autoComplete: 'shipping postal-code', required, maxLength: 8, readOnly: lockPostalCode, pattern: '(?:[0-9]{4}|[A-Za-z][0-9]{4}[A-Za-z]{3})' })}
      </>}
      <label className="text-sm font-medium text-slate-700">
        Provincia
        <select autoComplete="shipping address-level1" className={inputClass} required={required} value={value.province} onChange={event => onChange({ ...value, province: event.target.value })}>
          <option value="">Elegí una provincia</option>
          {provinces.map(province => <option key={province.codigo} value={province.codigo}>{province.nombre}</option>)}
        </select>
      </label>
      {value.delivery === 'S' && field('agency', 'Código de sucursal PAQ.AR', { maxLength: 24 })}
      {!packageFields && <div className="sm:col-span-2">{field('reference', 'Referencia de entrega (opcional)', { maxLength: 160 })}</div>}
      {packageFields && <>
        {field('reference', 'Referencia interna de entrega (opcional)', { maxLength: 160 })}
        <label className="text-sm font-medium text-slate-700">
          Servicio
          <select className={inputClass} value={value.product_type} onChange={event => onChange({ ...value, product_type: event.target.value as DeliveryData['product_type'] })}>
            <option value="CP">Clásico</option>
            <option value="EP">Expreso</option>
          </select>
        </label>
        {field('weight', 'Peso embalado (g)', { type: 'number', min: 1, max: 25000 })}
        {field('length', 'Largo (cm)', { type: 'number', min: 1, max: 150 })}
        {field('width', 'Ancho (cm)', { type: 'number', min: 1, max: 150 })}
        {field('height', 'Alto (cm)', { type: 'number', min: 1, max: 150 })}
        {field('declared_value', 'Valor declarado ($)', { type: 'number', min: 0.01, step: '0.01', max: 999999999 })}
      </>}
    </div>
  )
}