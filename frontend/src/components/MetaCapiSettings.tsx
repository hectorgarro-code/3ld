import { useEffect, useState } from 'react';
import api from '@/lib/api';
export function MetaCapiSettings() {
  const [testCode,setTestCode]=useState('');
  const [shared,setShared]=useState(false);
  const [token,setToken]=useState(''),[enabled,setEnabled]=useState(false),[consent,setConsent]=useState(false),[hasToken,setHasToken]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[ready,setReady]=useState(false);
  useEffect(()=>{api.get('/config/meta-capi').then(r=>{setShared(!!r.data.data?.shared_installation);setHasToken(!!r.data.data?.has_token);setEnabled(!!r.data.data?.enabled);setReady(true);}).catch(()=>setMessage('No se pudo consultar CAPI o no tenés permisos de administrador.'));},[]);
  return <section className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4" aria-labelledby="meta-capi-title">
    <h2 id="meta-capi-title" className="font-bold text-lg">Conversiones de Meta — 3LD</h2>
    <p className="text-sm text-slate-600">Píxel 612576675192830. Estado: {hasToken ? enabled ? 'Configurado y activo' : 'Configurado e inactivo' : 'Sin token guardado'}.</p>
    <p className="text-sm text-slate-600">{shared?'Configuración compartida: tienda pública y sistema 3LD.':'Configuración de esta instalación.'}</p>
    <p className="text-xs text-slate-500">CAPI informa compras web con pago aprobado. El envío incluye importe, productos y email, teléfono y nombre del comprador con hash. No convierte los clics de WhatsApp en compras. El token se guarda únicamente en el servidor y no se vuelve a mostrar.</p>
    <form className="space-y-3" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try {const r=await api.post('/config/meta-capi',{access_token:token,enabled,consent,test_event_code:testCode});setToken('');setShared(!!r.data.data?.shared_installation);setHasToken(!!r.data.data?.has_token);setEnabled(!!r.data.data?.enabled);setConsent(false);setMessage(r.data.data?.enabled ? 'CAPI guardado y activo. Meta recibió la prueba de conexión; no se enviaron compras ni datos de clientes para probar.' : 'CAPI desactivado.');}catch(err:unknown){const error=err as {response?:{data?:{message?:string}}};setMessage(error.response?.data?.message||'No se pudo guardar CAPI.');}finally{setBusy(false);}}}>
      <label className="block text-sm font-medium">Token de acceso de Meta CAPI<input aria-label="Token de acceso de Meta CAPI" type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder={hasToken?'Dejar vacío para conservar el token':'Pegar token del píxel de 3LD'} className="block w-full mt-1 border rounded-xl p-3"/></label>
      <label className="block text-sm font-medium">Código de prueba de Meta<input aria-label="Código de prueba de Meta" value={testCode} onChange={e=>setTestCode(e.target.value.trim())} placeholder="TEST... (Administrador de eventos → Probar eventos)" className="block w-full mt-1 border rounded-xl p-3"/></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>Activar compras web por CAPI</label>
      <label className="flex gap-2 text-xs"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Autorizo el envío a Meta de los datos de compra y del comprador descritos arriba.</label>
      <button disabled={!ready||busy||(!token&&!hasToken)||(enabled&&(!consent||!/^TEST[A-Z0-9]{3,40}$/.test(testCode)))} className="bg-blue-700 text-white rounded-xl px-4 py-2 disabled:opacity-50">{busy?'Verificando y guardando...':'Verificar y guardar CAPI'}</button>
    </form><p role="status" className="text-sm">{message}</p>
  </section>;
}
