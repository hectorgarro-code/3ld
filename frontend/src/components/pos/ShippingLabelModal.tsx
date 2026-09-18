import React from 'react'
import { X, Printer, Package, Truck } from 'lucide-react'
import { type ShippingConfig, PROVINCIAS_CORREO_ARG } from '@/lib/correoArgentino'


interface ShippingLabelModalProps {
  isOpen: boolean
  onClose: () => void
  trackingNumber: string
  shippingConfig: ShippingConfig
  orderNumber?: string
  totalOrder?: number
}

export function ShippingLabelModal({
  isOpen,
  onClose,
  trackingNumber,
  shippingConfig,
  orderNumber = 'NUEVO',
  totalOrder = 0,
}: ShippingLabelModalProps) {
  if (!isOpen) return null

  const provinciaNombre =
    PROVINCIAS_CORREO_ARG.find((p) => p.codigo === shippingConfig.provinciaCodigo)?.nombre ||
    shippingConfig.provinciaCodigo

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header Controls (Hidden during print) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-amber-500" />
            <h3 className="font-extrabold text-base text-slate-900">Rótulo de Envío Correo Argentino</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Printable Label Area */}
        <div className="overflow-y-auto my-4 p-1">
          <div
            id="shipping-label-print"
            className="border-2 border-dashed border-slate-400 p-4 rounded-xl bg-white text-slate-900 font-mono text-xs space-y-3 print:border-solid print:m-0 print:p-2"
            style={{ minHeight: '140mm' }}
          >
            {/* Header Correo Argentino / Paq.ar */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
              <div className="flex items-center gap-2">
                <div className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-sm tracking-wider">
                  CORREO ARGENTINO
                </div>
                <span className="font-extrabold text-[11px]">Paq.ar</span>
              </div>
              <div className="text-right">
                <span className="font-black text-sm block">SERVICIO CP</span>
                <span className="text-[10px] text-slate-600 uppercase">
                  {shippingConfig.deliveryType === 'homeDelivery' ? 'Entrega Domicilio' : 'Retiro Sucursal'}
                </span>
              </div>
            </div>

            {/* Tracking & Barcode Simulation */}
            <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Número de Envío / Tracking
              </p>
              <p className="text-base font-black tracking-widest text-slate-950 my-1">{trackingNumber}</p>
              {/* Simulated 1D Barcode */}
              <div className="flex justify-center items-center gap-[2px] h-8 my-1 px-4">
                {[
                  3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3,
                  1, 4, 2, 1, 3, 1, 2, 4,
                ].map((w, i) => (
                  <div key={i} className="bg-slate-950 h-full" style={{ width: `${w * 1.5}px` }} />
                ))}
              </div>
              <p className="text-[9px] text-slate-400">PEDIDO #{orderNumber}</p>
            </div>

            {/* Destinatario (Main) */}
            <div className="border-2 border-slate-900 rounded-lg p-3 space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded">
                  DESTINATARIO
                </span>
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 block">CÓDIGO POSTAL</span>
                  <span className="text-xl font-black text-slate-950 tracking-wider">
                    {shippingConfig.codigoPostal}
                  </span>
                </div>
              </div>
              <p className="font-black text-sm uppercase text-slate-900 mt-1">
                {shippingConfig.destinatarioNombre}
              </p>
              <p className="text-xs font-semibold text-slate-800">
                {shippingConfig.calle} {shippingConfig.altura}
                {shippingConfig.pisoDpto ? ` (Piso/Dpto: ${shippingConfig.pisoDpto})` : ''}
              </p>
              <p className="text-xs font-semibold text-slate-700">
                {shippingConfig.localidad} - {provinciaNombre} ({shippingConfig.provinciaCodigo})
              </p>
              <p className="text-[11px] text-slate-600 font-bold mt-1">
                Tel: {shippingConfig.telefono || 'Sin especificar'}
              </p>
            </div>

            {/* Remitente */}
            <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-[11px] space-y-0.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase">REMITENTE</span>
              <p className="font-bold text-slate-900">3LD - Sistema 3D & Soluciones</p>
              <p className="text-slate-600">Av. Libertador 1240, CABA (CP 1425)</p>
              <p className="text-slate-600">contacto@3ld.com.ar | Tel: +54 9 11 5555-3333</p>
            </div>

            {/* Dimensions & Weight */}
            <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-2 text-[10px]">
              <div>
                <span className="text-slate-500 block">PESO:</span>
                <strong className="text-slate-900">{shippingConfig.pesoGramos} g</strong>
              </div>
              <div>
                <span className="text-slate-500 block">MEDIDAS (AxAnxL):</span>
                <strong className="text-slate-900">
                  {shippingConfig.altoCm}x{shippingConfig.anchoCm}x{shippingConfig.largoCm} cm
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">V. DECLARADO:</span>
                <strong className="text-slate-900">
                  ${(shippingConfig.valorDeclarado || totalOrder).toLocaleString('es-AR')}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions (Hidden during print) */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs shadow-md transition"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir Rótulo</span>
          </button>
        </div>
      </div>
    </div>
  )
}
