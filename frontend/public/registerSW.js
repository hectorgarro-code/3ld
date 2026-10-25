/* Actualización explícita: conserva el carrito y no interrumpe formularios ni pagos. */
(() => {
  if (!('serviceWorker' in navigator)) return;
  let hasController = Boolean(navigator.serviceWorker.controller);
  const notify = () => {
    if (!hasController) { hasController = true; return; }
    if (document.getElementById('3ld-update-notice')) return;
    const notice = document.createElement('div');
    notice.id = '3ld-update-notice';
    notice.setAttribute('role', 'status');
    Object.assign(notice.style, { position: 'fixed', bottom: '18px', left: '50%', transform: 'translateX(-50%)', zIndex: '10000', maxWidth: 'calc(100vw - 32px)', width: '380px', boxSizing: 'border-box', padding: '14px 16px', borderRadius: '14px', background: '#0f172a', color: '#fff', font: '14px/1.5 system-ui', boxShadow: '0 8px 32px #0003' });
    const text = document.createElement('span');
    text.textContent = 'Hay una nueva versión disponible. ';
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = 'Actualizar';
    Object.assign(button.style, { border: '0', borderRadius: '8px', padding: '8px 12px', marginLeft: '8px', background: '#fff', color: '#0f172a', cursor: 'pointer', fontWeight: '700' });
    button.addEventListener('click', () => window.location.reload());
    notice.append(text, button); document.body.append(notice);
  };
  navigator.serviceWorker.addEventListener('controllerchange', notify);
  navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(registration => {
    let lastCheck = 0;
    const check = () => { if (Date.now() - lastCheck < 60000) return; lastCheck = Date.now(); registration.update().catch(() => {}); };
    check(); window.addEventListener('focus', check);
  }).catch(() => {});
})();
