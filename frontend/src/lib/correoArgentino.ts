// Correo Argentino API 2.0 Definitions & Parametric Shipping Calculator

export interface CorreoProvincia {
  codigo: string
  nombre: string
}

export const PROVINCIAS_CORREO_ARG: CorreoProvincia[] = [
  { codigo: 'C', nombre: 'Ciudad Autónoma de Buenos Aires' },
  { codigo: 'B', nombre: 'Provincia de Buenos Aires' },
  { codigo: 'X', nombre: 'Córdoba' },
  { codigo: 'S', nombre: 'Santa Fe' },
  { codigo: 'M', nombre: 'Mendoza' },
  { codigo: 'E', nombre: 'Entre Ríos' },
  { codigo: 'T', nombre: 'Tucumán' },
  { codigo: 'A', nombre: 'Salta' },
  { codigo: 'J', nombre: 'San Juan' },
  { codigo: 'D', nombre: 'San Luis' },
  { codigo: 'R', nombre: 'Río Negro' },
  { codigo: 'Q', nombre: 'Neuquén' },
  { codigo: 'N', nombre: 'Misiones' },
  { codigo: 'H', nombre: 'Chaco' },
  { codigo: 'W', nombre: 'Corrientes' },
  { codigo: 'G', nombre: 'Santiago del Estero' },
  { codigo: 'Y', nombre: 'Jujuy' },
  { codigo: 'K', nombre: 'Catamarca' },
  { codigo: 'F', nombre: 'La Rioja' },
  { codigo: 'L', nombre: 'La Pampa' },
  { codigo: 'P', nombre: 'Formosa' },
  { codigo: 'U', nombre: 'Chubut' },
  { codigo: 'Z', nombre: 'Santa Cruz' },
  { codigo: 'V', nombre: 'Tierra del Fuego' },
]

export const REMITENTE_3LD = {
  nombre: '3LD Didácticos',
  calle: 'Salta',
  altura: '3169',
  localidad: 'San Bernardo del Tuyú',
  provinciaCodigo: 'B',
  provinciaNombre: 'Buenos Aires',
  codigoPostal: '7111',
  telefono: '2257512597',
  email: '3lddidacticos@gmail.com',
}

export interface ShippingConfig {
  destinatarioNombre: string
  telefono: string
  email?: string
  calle: string
  altura: string
  pisoDpto?: string
  localidad: string
  provinciaCodigo: string
  codigoPostal: string
  deliveryType: 'homeDelivery' | 'agency'
  pesoGramos: number
  altoCm: number
  anchoCm: number
  largoCm: number
  valorDeclarado?: number
}

// Parametric rate estimation from origin San Bernardo del Tuyú (CP 7111, Prov. Bs. As.)
export function calcularTarifaCorreoArgentino(config: {
  provinciaCodigo: string
  codigoPostal: string
  pesoGramos: number
  altoCm: number
  anchoCm: number
  largoCm: number
  deliveryType: 'homeDelivery' | 'agency'
}): {
  zona: 'Local / Costa' | 'Regional (Bs As / CABA)' | 'Nacional'
  pesoFacturableKg: number
  precioFinal: number
} {
  const pesoRealKg = Math.max(config.pesoGramos, 100) / 1000
  // Peso volumétrico según estándar Correo Arg: (Alto * Ancho * Largo) / 4000
  const pesoVolumetricoKg = (config.altoCm * config.anchoCm * config.largoCm) / 4000
  const pesoFacturableKg = Math.max(pesoRealKg, pesoVolumetricoKg)

  // Determinar zona desde origen San Bernardo (CP 7111)
  let zona: 'Local / Costa' | 'Regional (Bs As / CABA)' | 'Nacional' = 'Nacional'
  const cpNum = parseInt(config.codigoPostal) || 0

  if (cpNum >= 7100 && cpNum <= 7119) {
    zona = 'Local / Costa'
  } else if (
    config.provinciaCodigo === 'B' ||
    config.provinciaCodigo === 'C' ||
    (cpNum >= 1000 && cpNum <= 2999) ||
    (cpNum >= 6000 && cpNum <= 8999)
  ) {
    zona = 'Regional (Bs As / CABA)'
  } else {
    zona = 'Nacional'
  }

  // Tarifas base estimadas Correo Clásico Paq.ar
  let basePrice = 4800
  if (zona === 'Local / Costa') {
    basePrice = 3900
  } else if (zona === 'Regional (Bs As / CABA)') {
    basePrice = 5200
  } else {
    basePrice = 6900
  }


  // Incremento por peso facturable
  if (pesoFacturableKg > 1 && pesoFacturableKg <= 2) {
    basePrice += 1200
  } else if (pesoFacturableKg > 2 && pesoFacturableKg <= 5) {
    basePrice += 2800
  } else if (pesoFacturableKg > 5) {
    basePrice += 2800 + Math.ceil(pesoFacturableKg - 5) * 900
  }

  // Descuento si es retiro en Sucursal (agency)
  if (config.deliveryType === 'agency') {
    basePrice = Math.round(basePrice * 0.88)
  }

  return {
    zona,
    pesoFacturableKg: Math.round(pesoFacturableKg * 100) / 100,
    precioFinal: Math.round(basePrice),
  }
}
