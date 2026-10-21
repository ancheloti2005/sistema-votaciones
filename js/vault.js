(function () {
  'use strict';
  const { $, esc } = U;
  const CFG = window.APP_CONFIG || {};

  const votante = JSON.parse(sessionStorage.getItem('cv_votante') || 'null');
  if (!votante) { U.irA('ingreso.html'); return; }

  U.marcarDemo();

  const cedula = $('#cedula');
  const btnEnviar = $('#btnEnviar');
  const modal = $('#modalConfirmar');
  const msg = $('#mensaje');
  let candidatos = [];
  let elegido = null;

  const nombreCorto = U.capitalizar(votante.nombres.split(' ')[0]);
  $('#nombreVotante').textContent = U.capitalizar(votante.nombres + ' ' + votante.apellidos);
  $('#datosVotante').innerHTML = 'Nivel <strong>' + esc(U.nivelTexto(votante.nivel).toLowerCase()) + '</strong>'
    + (votante.grado ? ', <strong>' + esc(votante.grado) + '</strong>' : '');
  $('#evento').textContent = CFG.TITULO_ELECCION || 'Elecciones del Municipio Escolar';
  API.portada().then((p) => { if (p && p.titulo) $('#evento').textContent = p.titulo; }).catch(() => {});

  const ASPA = '<svg class="aspa" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'
    + '<line x1="12" y1="12" x2="88" y2="88"/><line x1="88" y1="12" x2="12" y2="88"/></svg>';

  function render() {
    if (!candidatos.length) {
      cedula.innerHTML = '<p class="vacio" style="margin:0">No hay candidatos registrados para este nivel. Avisa a tu profesor.</p>';
      return;
    }
    cedula.innerHTML = candidatos.map((c) => `
      <label class="fila-cand" data-id="${esc(c.id)}">
        <input type="radio" name="candidato" value="${esc(c.id)}" aria-label="${esc(c.nombre + ', ' + (c.lista ? 'lista ' + c.lista : c.cargo))}">
        <img class="cand-foto" src="${esc(c.foto_url || '')}" alt="" onerror="this.style.visibility='hidden'">
        <span class="cand-datos">
          <span class="cand-nombre">${esc(c.nombre)}</span>
          <span class="cand-cargo">${esc(c.cargo || '')}</span>
          ${c.lista ? `<span class="cand-lista">Lista ${esc(c.lista)}</span>` : ''}
        </span>
        <span class="cand-marca">
          <img class="cand-logo" src="${esc(c.logo_url || '')}" alt="" onerror="this.style.visibility='hidden'">
          ${ASPA}
        </span>
      </label>`).join('');

    cedula.querySelectorAll('input[name="candidato"]').forEach((r) => {
      r.addEventListener('change', () => elegir(Number(r.value)));
    });
  }

  function elegir(id) {
    elegido = candidatos.find((c) => Number(c.id) === id) || null;
    cedula.querySelectorAll('.fila-cand').forEach((fila) => {
      fila.classList.toggle('elegido', Number(fila.dataset.id) === id);
    });
    $('#eleccionActual').innerHTML = elegido
      ? 'Tu elección: <strong>' + esc(elegido.nombre) + '</strong>'
      : 'Aún no marcas ningún candidato.';
    btnEnviar.disabled = !elegido;
  }

  btnEnviar.addEventListener('click', () => {
    if (!elegido) return;
    $('#confirmarCand').innerHTML = `
      <img src="${esc(elegido.foto_url || '')}" alt="">
      <div>
        <div class="cand-nombre">${esc(elegido.nombre)}</div>
        <div class="cand-lista">${esc(elegido.cargo || '')}${elegido.lista ? ' — Lista ' + esc(elegido.lista) : ''}</div>
      </div>`;
    U.abrirModal(modal);
    $('#btnConfirmar').focus();
  });

  $('#btnCambiar').addEventListener('click', () => U.cerrarModal(modal));

  const MOTIVOS = {
    cerrada: 'La votación se cerró antes de enviar tu voto. Avisa a tu profesor.',
    ya_voto: 'Este estudiante ya tiene un voto registrado. Cada estudiante vota una sola vez.',
    no_encontrado: 'No encontramos tus datos. Vuelve a ingresar.',
    otro_nivel: 'Tus datos no corresponden a este nivel. Vuelve a ingresar.',
    candidato_invalido: 'Ese candidato no corresponde a tu nivel. Elige otro.'
  };

  $('#btnConfirmar').addEventListener('click', async () => {
    const btn = $('#btnConfirmar');
    U.cargando(btn, true, 'Enviando…');
    try {
      const r = await API.emitirVoto(votante.nivel, votante.tipo, votante.credencial, elegido.id);
      U.cerrarModal(modal);
      U.cargando(btn, false);
      if (!r || !r.ok) {
        U.mensaje(msg, MOTIVOS[r && r.motivo] || 'No se pudo registrar el voto. Inténtalo otra vez.', 'error');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      terminar();
    } catch (err) {
      U.cerrarModal(modal);
      U.cargando(btn, false);
      U.mensaje(msg, err.message || 'No se pudo registrar el voto. Inténtalo otra vez.', 'error');
    }
  });

  function terminar() {
    sessionStorage.removeItem('cv_votante');
    $('#hojaVoto').hidden = true;
    $('#hojaListo').hidden = false;
    let s = Number(CFG.SEGUNDOS_REGRESO) || 10;
    const texto = $('#textoListo');
    const pintar = () => {
      texto.textContent = 'Gracias por participar, ' + nombreCorto + '. Esta pantalla volverá al inicio en ' + s + ' s para el siguiente estudiante.';
    };
    pintar();
    const t = setInterval(() => {
      s -= 1;
      if (s <= 0) { clearInterval(t); U.irA('index.html'); return; }
      pintar();
    }, 1000);
    $('#btnTerminar').onclick = () => { clearInterval(t); U.irA('index.html'); };
    $('#btnTerminar').focus();
  }

  $('#btnSalir').addEventListener('click', () => {
    sessionStorage.removeItem('cv_votante');
    U.irA('index.html');
  });

  API.candidatos(votante.nivel)
    .then((lista) => { candidatos = lista || []; render(); })
    .catch((err) => {
      cedula.innerHTML = '';
      U.mensaje(msg, err.message || 'No se pudieron cargar los candidatos.', 'error');
    });
})();
