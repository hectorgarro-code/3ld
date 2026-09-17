export interface CostInput {
  gramos: number
  tiempoMin: number
  costoPorGramo: number
  consumoWatts: number
  precioKwh: number
  valorHoraOperario: number
  valorImpresora: number
  vidaUtilHoras: number
  margenPct: number
  multiplicador: number
}

export interface CostResult {
  costoMaterial: number
  costoEnergia: number
  costoAmortizacion: number
  costoManoObra: number
  costoTotal: number
  precioSugerido: number
}

export function calcularCosto(input: CostInput): CostResult {
  const {
    gramos,
    tiempoMin,
    costoPorGramo,
    consumoWatts,
    precioKwh,
    valorHoraOperario,
    valorImpresora,
    vidaUtilHoras,
    margenPct,
    multiplicador,
  } = input

  const tiempoHoras = tiempoMin / 60

  // Material cost
  const costoMaterial = gramos * costoPorGramo

  // Energy cost: (watts / 1000) * hours * price per kWh
  const costoEnergia = (consumoWatts / 1000) * tiempoHoras * precioKwh

  // Amortization: printer value / lifetime hours * printing hours
  const costoAmortizacion =
    vidaUtilHoras > 0 ? (valorImpresora / vidaUtilHoras) * tiempoHoras : 0

  // Labor cost
  const costoManoObra = valorHoraOperario * tiempoHoras

  // Sum all direct costs
  const costoTotal =
    costoMaterial + costoEnergia + costoAmortizacion + costoManoObra

  // Apply margin and multiplier
  const precioSugerido = costoTotal * (1 + margenPct / 100) * multiplicador

  return {
    costoMaterial,
    costoEnergia,
    costoAmortizacion,
    costoManoObra,
    costoTotal,
    precioSugerido,
  }
}

export function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
