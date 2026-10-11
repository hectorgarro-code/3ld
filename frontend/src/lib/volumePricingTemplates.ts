export interface PlantillaPrecioCantidad {
  id: string
  nombre: string
  escalas: { cantidad: number; precio: number }[]
}

const STORAGE_KEY = '3ld_plantillas_precios_cantidad'

const DEFAULT_PLANTILLAS: PlantillaPrecioCantidad[] = [
  {
    id: 'llaveros_default',
    nombre: 'Llaveros (10+ y 50+)',
    escalas: [
      { cantidad: 10, precio: 700 },
      { cantidad: 50, precio: 500 },
    ],
  },
]

export function getPlantillasPrecios(): PlantillaPrecioCantidad[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PLANTILLAS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PLANTILLAS
  } catch {
    return DEFAULT_PLANTILLAS
  }
}

export function savePlantillaPrecios(
  nombre: string,
  escalas: { cantidad: number; precio: number }[]
): PlantillaPrecioCantidad {
  const plantillas = getPlantillasPrecios()
  const cleanEscalas = escalas
    .filter((e) => Number(e.cantidad) > 0 && Number(e.precio) >= 0)
    .sort((a, b) => Number(a.cantidad) - Number(b.cantidad))

  const existingIdx = plantillas.findIndex((p) => p.nombre.toLowerCase().trim() === nombre.toLowerCase().trim())
  const newPlantilla: PlantillaPrecioCantidad = {
    id: existingIdx >= 0 ? plantillas[existingIdx].id : 'plantilla_' + Date.now(),
    nombre: nombre.trim(),
    escalas: cleanEscalas,
  }

  let updated: PlantillaPrecioCantidad[] = []
  if (existingIdx >= 0) {
    updated = [...plantillas]
    updated[existingIdx] = newPlantilla
  } else {
    updated = [...plantillas, newPlantilla]
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return newPlantilla
}

export function deletePlantillaPrecios(id: string): PlantillaPrecioCantidad[] {
  const plantillas = getPlantillasPrecios().filter((p) => p.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plantillas))
  return plantillas
}
