/* Utilidades compartidas por todas las páginas */
(function () {
  'use strict';

  const U = {};

  U.$ = (sel, raiz) => (raiz || document).querySelector(sel);
  U.$$ = (sel, raiz) => Array.from((raiz || document).querySelectorAll(sel));

  // Escapa texto antes de insertarlo como HTML (evita inyección de código)
  U.esc = (txt) => String(txt == null ? '' : txt)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // Quita tildes, pasa a mayúsculas y deja un solo espacio
  U.normalizar = (txt) => String(txt == null ? '' : txt)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  // "LUCIANA SOFÍA" → "Luciana Sofía"
  U.capitalizar = (txt) => String(txt || '').toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (m, sep, l) => sep + l.toUpperCase());

  U.nivelTexto = (nivel) => nivel === 'primaria' ? 'Primaria' : nivel === 'secundaria' ? 'Secundaria' : '';

  U.porcentaje = (parte, total) => total > 0 ? (parte * 100) / total : 0;
  U.fmtPct = (n) => n.toLocaleString('es-PE', { maximumFractionDigits: 1 }) + ' %';

  // Navegación entre páginas (también funciona dentro de la vista previa)
  U.irA = (url) => {
    if (window.__PREVIEW__ && window.parent !== window) {
      window.parent.postMessage({ tipo: 'ir', url: url }, '*');
    } else {
      window.location.href = url;
    }
  };

  // Aviso flotante breve
  U.aviso = (mensaje, tipo) => {
    let caja = U.$('#avisos');
    if (!caja) {
      caja = document.createElement('div');
      caja.id = 'avisos';
      caja.setAttribute('aria-live', 'polite');
      document.body.appendChild(caja);
    }
    const el = document.createElement('div');
    el.className = 'aviso aviso-' + (tipo || 'ok');
    el.textContent = mensaje;
    caja.appendChild(el);
    setTimeout(() => { el.classList.add('saliendo'); }, 3800);
    setTimeout(() => { el.remove(); }, 4300);
  };

  // Mensaje dentro de un formulario
  U.mensaje = (el, texto, tipo) => {
    if (!el) return;
    if (!texto) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.className = 'mensaje mensaje-' + (tipo || 'error');
    el.textContent = texto;
  };

  // Botón en estado "cargando"
  U.cargando = (btn, activo, textoCarga) => {
    if (!btn) return;
    if (activo) {
      btn.dataset.textoOriginal = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="giro" aria-hidden="true"></span> ' + U.esc(textoCarga || 'Procesando…');
    } else {
      btn.disabled = false;
      if (btn.dataset.textoOriginal) btn.innerHTML = btn.dataset.textoOriginal;
    }
  };

  // Modal simple basado en <dialog>
  U.abrirModal = (dialogo) => {
    if (typeof dialogo.showModal === 'function') dialogo.showModal();
    else dialogo.setAttribute('open', '');
  };
  U.cerrarModal = (dialogo) => {
    if (typeof dialogo.close === 'function') dialogo.close();
    else dialogo.removeAttribute('open');
  };

  // Mostrar / ocultar contraseña
  U.activarOjos = () => {
    U.$$('[data-ojo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.ojo);
        const ver = input.type === 'password';
        input.type = ver ? 'text' : 'password';
        btn.setAttribute('aria-pressed', ver ? 'true' : 'false');
        btn.textContent = ver ? 'Ocultar' : 'Ver';
      });
    });
  };

  // Protege las páginas del panel: si no hay sesión, vuelve al login
  U.exigirAdmin = async () => {
    const sesion = await window.API.adminSesion();
    if (!sesion) { U.irA('admin.html'); return null; }
    U.$$('[data-admin-nombre]').forEach((el) => { el.textContent = sesion.usuario; });
    const salir = U.$('[data-salir]');
    if (salir) {
      salir.addEventListener('click', async (e) => {
        e.preventDefault();
        await window.API.adminSalir();
        U.irA('index.html');
      });
    }
    return sesion;
  };

  // Indicador de modo demostración
  U.marcarDemo = () => {
    if (!window.API || !window.API.modoDemo) return;
    if (U.$('.cinta-demo')) return;
    const cinta = document.createElement('div');
    cinta.className = 'cinta-demo';
    cinta.textContent = 'Modo demostración: los datos se guardan solo en este navegador.';
    document.body.appendChild(cinta);
  };

  // Reduce una imagen antes de subirla (más rápida y liviana).
  // Devuelve un Blob JPG (o PNG si se pide para logos con transparencia).
  U.redimensionarImagen = (archivo, ladoMax, tipo) => new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(archivo.type)) {
      reject(new Error('El archivo debe ser una imagen JPG, PNG o WEBP.')); return;
    }
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, ladoMax / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.naturalWidth * escala);
      cv.height = Math.round(img.naturalHeight * escala);
      const ctx = cv.getContext('2d');
      const mime = tipo === 'png' ? 'image/png' : 'image/jpeg';
      if (mime === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); }
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      cv.toBlob((b) => b ? resolve(b) : reject(new Error('No se pudo procesar la imagen.')), mime, 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo abrir la imagen.')); };
    img.src = url;
  });

  window.U = U;
})();
