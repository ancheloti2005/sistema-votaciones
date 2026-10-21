(function () {
  'use strict';
  const { $, esc } = U;
  const modal = $('#modalCand');
  const modalQuitar = $('#modalQuitar');
  const msg = $('#msgCand');
  const COLORES = ['#1d4fb8', '#e08a00', '#0f7a5c', '#b3261e', '#6b3fa0', '#0e7490', '#be185d'];
  let candidatos = [];
  let editando = null;          // candidato que se edita (null = nuevo)
  const imagenes = { foto: null, logo: null }; // url actual o nueva (blob)

  function pintar() {
    $('#listas').innerHTML = ['primaria', 'secundaria'].map((n) => {
      const lista = candidatos.filter((c) => c.nivel === n);
      const filas = lista.length ? lista.map((c) => `
        <div class="fila-admin${c.activo === false ? ' inactivo' : ''}" style="--c:${esc(c.color || '#1d4fb8')}">
          ${c.foto_url ? `<img class="fa-foto" src="${esc(c.foto_url)}" alt="">` : '<span class="fa-foto sin-imagen">Sin foto</span>'}
          ${c.logo_url ? `<img class="fa-logo" src="${esc(c.logo_url)}" alt="">` : '<span class="fa-logo sin-imagen">Sin logo</span>'}
          <div>
            <div class="cand-nombre" style="font-size:21px">${esc(c.nombre)}${c.activo === false ? '<span class="etiqueta-oculto">Oculto</span>' : ''}</div>
            <div class="cand-cargo">${esc(c.cargo || '')}</div>
            ${c.lista ? `<div class="cand-lista">Lista ${esc(c.lista)}</div>` : ''}
          </div>
          <div class="fa-acciones">
            <button type="button" class="btn btn-borde" data-editar="${esc(c.id)}">Editar</button>
            <button type="button" class="btn btn-peligro" data-quitar="${esc(c.id)}">Quitar</button>
          </div>
        </div>`).join('') : '<p class="vacio" style="margin:0">Aún no hay candidatos en este nivel.</p>';
      return `
        <section class="bloque-nivel">
          <div class="titulo-nivel"><h2>${U.nivelTexto(n)}</h2><span>${lista.length} ${lista.length === 1 ? 'candidato' : 'candidatos'}</span></div>
          <div class="${lista.length ? 'lista-cands' : ''}">${filas}</div>
        </section>`;
    }).join('');

    document.querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', () => abrir(Number(b.dataset.editar))));
    document.querySelectorAll('[data-quitar]').forEach((b) => b.addEventListener('click', () => pedirQuitar(Number(b.dataset.quitar))));
  }

  async function cargar() {
    try { candidatos = await API.candidatosAdmin(); pintar(); }
    catch (err) { $('#listas').innerHTML = `<div class="mensaje mensaje-error">${esc(err.message)}</div>`; }
  }

  // ---------- Formulario ----------
  function vistaImagen(tipo, src) {
    const img = $(tipo === 'foto' ? '#cFotoVista' : '#cLogoVista');
    const txt = $(tipo === 'foto' ? '#cFotoTexto' : '#cLogoTexto');
    const quitar = $(tipo === 'foto' ? '#cFotoQuitar' : '#cLogoQuitar');
    img.hidden = !src;
    if (src) img.src = src; else img.removeAttribute('src');
    txt.textContent = src ? 'Cambiar ' + tipo : 'Elegir ' + tipo;
    quitar.hidden = !src;
  }

  function abrir(id) {
    editando = id ? candidatos.find((c) => Number(c.id) === id) : null;
    const c = editando || {};
    $('#tituloCand').textContent = editando ? 'Editar candidato' : 'Agregar candidato';
    const nivel = c.nivel || 'primaria';
    $('#cNivel').value = nivel;
    $('#cOrden').value = c.orden || (candidatos.filter((x) => x.nivel === nivel).length + 1);
    $('#cNombre').value = c.nombre || '';
    $('#cCargo').value = c.cargo || '';
    $('#cLista').value = c.lista || '';
    $('#cColor').value = c.color || COLORES[candidatos.length % COLORES.length];
    $('#cActivo').checked = c.activo !== false;
    $('#cFoto').value = ''; $('#cLogo').value = '';
    imagenes.foto = c.foto_url || null;
    imagenes.logo = c.logo_url || null;
    vistaImagen('foto', imagenes.foto);
    vistaImagen('logo', imagenes.logo);
    U.mensaje(msg, '');
    U.abrirModal(modal);
    $('#cNombre').focus();
  }

  async function elegirImagen(tipo, input) {
    const f = input.files[0];
    if (!f) return;
    try {
      // Fotos en JPG; logos en PNG para conservar la transparencia
      const blob = await U.redimensionarImagen(f, tipo === 'foto' ? 600 : 400, tipo === 'logo' ? 'png' : 'jpg');
      imagenes[tipo] = blob;
      vistaImagen(tipo, URL.createObjectURL(blob));
      U.mensaje(msg, '');
    } catch (err) { U.mensaje(msg, err.message); input.value = ''; }
  }
  $('#cFoto').addEventListener('change', (e) => elegirImagen('foto', e.target));
  $('#cLogo').addEventListener('change', (e) => elegirImagen('logo', e.target));
  $('#cFotoQuitar').addEventListener('click', () => { imagenes.foto = null; $('#cFoto').value = ''; vistaImagen('foto', null); });
  $('#cLogoQuitar').addEventListener('click', () => { imagenes.logo = null; $('#cLogo').value = ''; vistaImagen('logo', null); });

  $('#btnAgregar').addEventListener('click', () => abrir(null));
  $('#btnCancelarCand').addEventListener('click', () => U.cerrarModal(modal));

  $('#formCand').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = $('#cNombre').value.trim();
    const cargo = $('#cCargo').value.trim();
    if (!nombre) return U.mensaje(msg, 'Escribe el nombre del candidato.');
    if (!cargo) return U.mensaje(msg, 'Escribe el cargo o rol (por ejemplo, Alcalde escolar).');
    const btn = $('#btnGuardarCand');
    U.cargando(btn, true, 'Guardando…');
    try {
      const url = async (tipo) => (imagenes[tipo] instanceof Blob)
        ? API.subirImagen(imagenes[tipo], 'candidatos') : imagenes[tipo];
      const datos = {
        id: editando ? editando.id : undefined,
        nivel: $('#cNivel').value,
        orden: Number($('#cOrden').value) || 1,
        nombre, cargo,
        lista: $('#cLista').value.trim(),
        color: $('#cColor').value,
        activo: $('#cActivo').checked,
        foto_url: await url('foto'),
        logo_url: await url('logo')
      };
      const r = await API.guardarCandidato(datos);
      if (!r.ok) { U.mensaje(msg, r.error); U.cargando(btn, false); return; }
      U.cargando(btn, false);
      U.cerrarModal(modal);
      U.aviso(editando ? 'Candidato actualizado.' : 'Candidato agregado.');
      cargar();
    } catch (err) {
      U.mensaje(msg, err.message);
      U.cargando(btn, false);
    }
  });

  // ---------- Quitar ----------
  let quitarId = null;
  function pedirQuitar(id) {
    const c = candidatos.find((x) => Number(x.id) === id);
    if (!c) return;
    quitarId = id;
    $('#tituloQuitar').textContent = '¿Quitar a ' + c.nombre + '?';
    $('#textoQuitar').textContent = 'Desaparecerá de la cédula de ' + c.nivel + '. Si ya tiene votos no se podrá quitar; en ese caso edítalo y desmarca "Visible en la cédula".';
    U.abrirModal(modalQuitar);
  }
  $('#btnCancelarQuitar').addEventListener('click', () => U.cerrarModal(modalQuitar));
  $('#btnConfirmarQuitar').addEventListener('click', async () => {
    const btn = $('#btnConfirmarQuitar');
    U.cargando(btn, true, 'Quitando…');
    const r = await API.eliminarCandidato(quitarId);
    U.cargando(btn, false);
    U.cerrarModal(modalQuitar);
    if (r.ok) { U.aviso('Candidato quitado.'); cargar(); } else U.aviso(r.error, 'error');
  });

  (async function iniciar() {
    U.marcarDemo();
    if (!(await U.exigirAdmin())) return;
    cargar();
  })();
})();
