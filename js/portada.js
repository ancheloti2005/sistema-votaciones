(function () {
  'use strict';
  const { $ } = U;
  const FONDO_ORIGINAL = 'images/ele2025.jpeg';
  const msg = $('#mensaje');
  let guardado = null;            // datos guardados en la base
  let fondo = null;               // url actual, Blob nuevo o null (= original)
  let fondoVista = null;          // url para mostrar el Blob

  function pintarVista() {
    const titulo = $('#pTitulo').value.trim() || guardado.titulo;
    $('#vpTitulo').textContent = titulo;
    const sub = $('#pSubtitulo').value;
    $('#vpSubtitulo').textContent = sub;
    $('#vpSubtitulo').hidden = !sub.trim();
    const src = fondo instanceof Blob ? fondoVista : (fondo || FONDO_ORIGINAL);
    $('#vistaPortada').style.backgroundImage = 'url("' + src + '")';
    const cambios = titulo !== guardado.titulo || sub !== (guardado.subtitulo || '') || fondo !== (guardado.fondo_url || null);
    $('#estadoVista').textContent = cambios
      ? 'Tienes cambios sin guardar. La portada pública no cambia hasta que pulses "Guardar portada".'
      : 'Así se ve la portada ahora mismo.';
  }

  function rellenar() {
    $('#pTitulo').value = guardado.titulo || '';
    $('#pSubtitulo').value = guardado.subtitulo || '';
    fondo = guardado.fondo_url || null;
    $('#pFondo').value = '';
    pintarVista();
  }

  $('#pTitulo').addEventListener('input', pintarVista);
  $('#pSubtitulo').addEventListener('input', pintarVista);

  $('#pFondo').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      fondo = await U.redimensionarImagen(f, 1920, 'jpg');
      if (fondoVista) URL.revokeObjectURL(fondoVista);
      fondoVista = URL.createObjectURL(fondo);
      U.mensaje(msg, '');
      pintarVista();
    } catch (err) { U.mensaje(msg, err.message); e.target.value = ''; }
  });

  $('#pRestaurar').addEventListener('click', () => { fondo = null; $('#pFondo').value = ''; pintarVista(); });
  $('#btnDescartar').addEventListener('click', () => { U.mensaje(msg, ''); rellenar(); });

  $('#formPortada').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = $('#pTitulo').value.trim();
    if (!titulo) return U.mensaje(msg, 'Escribe el título principal.');
    const btn = $('#btnGuardarPortada');
    U.cargando(btn, true, 'Guardando…');
    try {
      const url = fondo instanceof Blob ? await API.subirImagen(fondo, 'portada') : fondo;
      const datos = { titulo, subtitulo: $('#pSubtitulo').value, fondo_url: url };
      const r = await API.guardarPortada(datos);
      if (!r.ok) { U.mensaje(msg, r.error); }
      else {
        guardado = datos;
        fondo = url || null;
        U.mensaje(msg, 'Portada guardada. Ya se ve así en la página de inicio.', 'ok');
        pintarVista();
      }
    } catch (err) { U.mensaje(msg, err.message); }
    U.cargando(btn, false);
  });

  (async function iniciar() {
    U.marcarDemo();
    if (!(await U.exigirAdmin())) return;
    try {
      guardado = await API.portada();
      rellenar();
    } catch (err) { U.mensaje(msg, err.message); }
  })();
})();
