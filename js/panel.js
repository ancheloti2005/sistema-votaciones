(function () {
  'use strict';
  const { $, esc } = U;
  const CFG = window.APP_CONFIG || {};
  const NIVELES = ['primaria', 'secundaria'];

  let datos = null;
  let firma = '';
  let primeraVez = true;

  // ---------------- Cálculos ----------------
  function porNivel(nivel) {
    const lista = (datos.candidatos || [])
      .filter((c) => c.nivel === nivel)
      .map((c) => Object.assign({}, c, { votos: Number(c.votos) || 0 }))
      .sort((a, b) => b.votos - a.votos || a.orden - b.orden);
    const total = lista.reduce((s, c) => s + c.votos, 0);
    const max = lista.length ? lista[0].votos : 0;
    const lideres = max > 0 ? lista.filter((c) => c.votos === max) : [];
    return { lista, total, max, lideres };
  }

  function insigniaTexto(info) {
    if (!info.lideres.length) return '';
    if (info.lideres.length > 1) return 'Empate';
    return datos.abierta ? 'Va ganando' : 'Ganador(a)';
  }

  // ---------------- Pintar ----------------
  function pintarCifras() {
    const p = datos.participacion || {};
    const totalVotos = NIVELES.reduce((s, n) => s + porNivel(n).total, 0);
    const cifra = (valor, texto, pct) => `
      <div class="cifra">
        <div class="cifra-valor">${esc(valor)}</div>
        <div class="cifra-texto">${texto}</div>
        ${pct == null ? '' : `<div class="medidor"><span style="width:${Math.min(100, pct).toFixed(1)}%"></span></div>`}
      </div>`;
    const part = (n) => {
      const x = p[n] || { total: 0, votaron: 0 };
      const pct = U.porcentaje(x.votaron, x.total);
      return cifra(
        x.total ? U.fmtPct(pct) : '—',
        x.total
          ? `${U.nivelTexto(n)}: votaron <strong>${x.votaron}</strong> de ${x.total} estudiantes`
          : `${U.nivelTexto(n)}: aún no hay estudiantes registrados`,
        x.total ? pct : null);
    };
    $('#cifras').innerHTML = cifra(totalVotos, 'Votos emitidos en total', null) + part('primaria') + part('secundaria');
  }

  function pintarGraficos() {
    $('#graficos').innerHTML = NIVELES.map((n) => {
      const info = porNivel(n);
      const insignia = insigniaTexto(info);
      const filas = info.lista.length ? info.lista.map((c) => {
        const pct = U.porcentaje(c.votos, info.total);
        const esLider = info.lideres.some((l) => l.id === c.id);
        return `
          <div class="barra-cand${esLider ? ' lider' : ''}" style="--c:${esc(c.color || '#1d4fb8')}">
            <div class="barra-foto">
              <img class="f" src="${esc(c.foto_url || '')}" alt="">
              ${c.logo_url ? `<img class="l" src="${esc(c.logo_url)}" alt="">` : ''}
            </div>
            <div class="barra-info">
              <div class="barra-linea1">
                <span><span class="barra-nombre">${esc(c.nombre)}</span>${c.lista ? `<span class="barra-lista">Lista ${esc(c.lista)}</span>` : ''}${esLider && insignia ? `<span class="insignia">${insignia}</span>` : ''}</span>
                <span class="barra-votos">${c.votos} ${c.votos === 1 ? 'voto' : 'votos'}<small>${U.fmtPct(pct)}</small></span>
              </div>
              <div class="pista" role="img" aria-label="${esc(c.nombre)}: ${c.votos} votos, ${U.fmtPct(pct)}">
                <div class="relleno" data-ancho="${pct.toFixed(2)}" style="width:${primeraVez ? 0 : pct.toFixed(2)}%"></div>
              </div>
            </div>
          </div>`;
      }).join('') : '<p class="vacio">No hay candidatos registrados en este nivel.</p>';

      return `
        <section class="bloque-nivel">
          <div class="titulo-nivel"><h2>${U.nivelTexto(n)}</h2><span>${info.total} ${info.total === 1 ? 'voto' : 'votos'}</span></div>
          <div class="grafico">${filas}</div>
        </section>`;
    }).join('');

    if (primeraVez) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        document.querySelectorAll('.relleno').forEach((el) => { el.style.width = el.dataset.ancho + '%'; });
      }));
      primeraVez = false;
    }
  }

  const fmtFecha = (iso) => new Date(iso).toLocaleString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
  const fmtHora = (iso) => new Date(iso).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });

  function pintarEstado() {
    const est = $('#estado');
    const ahora = Date.now();
    let texto, clase;
    if (datos.abierta) {
      texto = datos.fin ? 'Votación abierta hasta las ' + fmtHora(datos.fin) : 'Votación abierta';
      clase = 'abierta';
    } else if (datos.inicio && Date.parse(datos.inicio) > ahora) {
      texto = 'Programada: ' + fmtFecha(datos.inicio);
      clase = 'programada';
    } else {
      texto = 'Votación cerrada';
      clase = 'cerrada';
    }
    est.textContent = texto;
    est.className = 'estado ' + clase;
    // El botón rojo solo aparece si hay una votación abierta o programada
    $('#btnCerrarVotacion').hidden = !(clase === 'abierta' || clase === 'programada');
    $('#btnEstado').disabled = false;
    $('#btnPdf').disabled = false;
  }

  async function cargar() {
    try {
      datos = await API.resultados();
      const nueva = JSON.stringify(datos);
      if (nueva !== firma) {
        firma = nueva;
        pintarEstado();
        pintarCifras();
        pintarGraficos();
        if ($('#faltantes').open) cargarFaltantes();
      }
      const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      $('#actualizado').textContent = `Última actualización: ${hora} (se actualiza sola cada ${CFG.SEGUNDOS_ACTUALIZAR_PANEL || 15} segundos)`;
    } catch (err) {
      $('#actualizado').textContent = err.message || 'No se pudieron cargar los resultados.';
    }
  }

  // ---------------- Programar votación ----------------
  const modalEstado = $('#modalEstado');
  const msgEstado = $('#msgEstado');
  // ISO → valor para <input type="datetime-local"> en hora local
  const aLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const deLocal = (v) => (v ? new Date(v).toISOString() : null);

  $('#btnEstado').addEventListener('click', () => {
    $('#eInicio').value = aLocal(datos.inicio);
    $('#eFin').value = aLocal(datos.fin);
    U.mensaje(msgEstado, '');
    U.abrirModal(modalEstado);
  });
  $('#btnCancelarEstado').addEventListener('click', () => U.cerrarModal(modalEstado));

  async function guardarProgramacion(inicio, fin, textoOk) {
    const btn = $('#btnConfirmarEstado');
    U.cargando(btn, true, 'Guardando…');
    try {
      const r = await API.programarVotacion(inicio, fin);
      if (!r.ok) { U.mensaje(msgEstado, r.error); U.cargando(btn, false); return; }
      U.cerrarModal(modalEstado);
      U.aviso(textoOk);
      firma = '';
      await cargar();
    } catch (err) { U.mensaje(msgEstado, err.message); }
    U.cargando(btn, false);
  }

  $('#formEstado').addEventListener('submit', (e) => {
    e.preventDefault();
    const inicio = deLocal($('#eInicio').value);
    const fin = deLocal($('#eFin').value);
    if (!inicio) return U.mensaje(msgEstado, 'Elige el día y la hora de inicio.');
    if (fin && Date.parse(fin) <= Date.parse(inicio)) return U.mensaje(msgEstado, 'La hora de cierre debe ser posterior a la de inicio.');
    guardarProgramacion(inicio, fin, 'Votación programada: ' + fmtFecha(inicio));
  });
  $('#btnAbrirAhora').addEventListener('click', () => {
    const fin = deLocal($('#eFin').value);
    const vigente = fin && Date.parse(fin) > Date.now() ? fin : null;
    guardarProgramacion(new Date().toISOString(), vigente, 'Votación abierta.');
  });
  const modalCerrar = $('#modalCerrar');
  $('#btnCerrarVotacion').addEventListener('click', () => {
    $('#textoCerrar').textContent = datos.abierta
      ? 'La votación se cerrará ahora mismo, antes de la hora programada. Los estudiantes ya no podrán votar y los resultados quedarán como finales.'
      : 'Se cancelará la votación programada y desaparecerá la cuenta regresiva de la portada. Puedes volver a programarla cuando quieras.';
    U.abrirModal(modalCerrar);
  });
  $('#btnCancelarCerrar').addEventListener('click', () => U.cerrarModal(modalCerrar));
  $('#btnConfirmarCerrar').addEventListener('click', async () => {
    const btn = $('#btnConfirmarCerrar');
    U.cargando(btn, true, 'Cerrando…');
    try {
      const r = datos.abierta
        ? await API.programarVotacion(datos.inicio, new Date().toISOString())
        : await API.programarVotacion(null, null);
      if (!r.ok) U.aviso(r.error, 'error');
      else { U.aviso(datos.abierta ? 'Votación cerrada.' : 'Programación cancelada.'); firma = ''; await cargar(); }
    } catch (err) { U.aviso(err.message, 'error'); }
    U.cargando(btn, false);
    U.cerrarModal(modalCerrar);
  });

  // ---------------- Estudiantes que no votaron ----------------
  let faltantes = [];
  async function cargarFaltantes() {
    try {
      faltantes = await API.estudiantesSinVotar();
      const grados = [...new Set(faltantes.map((e) => e.grado).filter(Boolean))].sort();
      const sel = $('#fGrado'), previo = sel.value;
      sel.innerHTML = '<option value="">Todos los grados</option>' + grados.map((g) => `<option>${esc(g)}</option>`).join('');
      sel.value = grados.includes(previo) ? previo : '';
      pintarFaltantes();
    } catch (err) {
      $('#faltantesLista').innerHTML = `<div class="mensaje mensaje-error">${esc(err.message)}</div>`;
    }
  }
  function pintarFaltantes() {
    const nivel = $('#fNivel').value, grado = $('#fGrado').value;
    const q = U.normalizar($('#fBuscar').value);
    const lista = faltantes.filter((e) => (!nivel || e.nivel === nivel) && (!grado || e.grado === grado) &&
      (!q || U.normalizar([e.apellido_paterno, e.apellido_materno, e.nombres].join(' ')).includes(q)));
    $('#faltantesCuenta').textContent = faltantes.length + (faltantes.length === 1 ? ' estudiante' : ' estudiantes');
    if (!lista.length) {
      $('#faltantesLista').innerHTML = `<p class="vacio">${faltantes.length ? 'Nadie coincide con el filtro.' : 'Todos los estudiantes registrados ya votaron.'}</p>`;
      return;
    }
    $('#faltantesLista').innerHTML = `
      <p class="nota-tabla">Mostrando ${lista.length} de ${faltantes.length}.</p>
      <div class="tabla-envoltura" style="max-height:420px; overflow:auto;">
        <table class="tabla">
          <thead><tr><th>N.°</th><th>Nivel</th><th>Grado</th><th>Apellidos y nombres</th></tr></thead>
          <tbody>${lista.map((e, i) => `<tr><td>${i + 1}</td><td>${U.nivelTexto(e.nivel)}</td><td>${esc(e.grado || '—')}</td><td>${esc([e.apellido_paterno, e.apellido_materno].filter(Boolean).join(' ') + ', ' + e.nombres)}</td></tr>`).join('')}</tbody>
        </table>
      </div>`;
  }
  $('#faltantes').addEventListener('toggle', () => { if ($('#faltantes').open) cargarFaltantes(); });
  ['#fNivel', '#fGrado'].forEach((s) => $(s).addEventListener('change', pintarFaltantes));
  $('#fBuscar').addEventListener('input', pintarFaltantes);

  // ---------------- Limpiar votos ----------------
  const modalLimpiar = $('#modalLimpiar');
  const confirmaTexto = $('#confirmaTexto');
  $('#btnLimpiar').addEventListener('click', () => {
    const total = datos ? NIVELES.reduce((s, n) => s + porNivel(n).total, 0) : 0;
    $('#totalBorrar').textContent = total;
    confirmaTexto.value = '';
    $('#btnConfirmarLimpiar').disabled = true;
    U.abrirModal(modalLimpiar);
    confirmaTexto.focus();
  });
  confirmaTexto.addEventListener('input', () => {
    $('#btnConfirmarLimpiar').disabled = confirmaTexto.value.trim().toUpperCase() !== 'LIMPIAR';
  });
  $('#btnCancelarLimpiar').addEventListener('click', () => U.cerrarModal(modalLimpiar));
  $('#formLimpiar').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (confirmaTexto.value.trim().toUpperCase() !== 'LIMPIAR') return;
    const btn = $('#btnConfirmarLimpiar');
    U.cargando(btn, true, 'Limpiando…');
    try {
      await API.limpiarVotos();
      U.cerrarModal(modalLimpiar);
      U.aviso('Votos eliminados. Todos los estudiantes pueden votar de nuevo.');
      primeraVez = true;
      firma = '';
      await cargar();
    } catch (err) { U.aviso(err.message, 'error'); }
    U.cargando(btn, false);
  });

  // ---------------- PDF ----------------
  function hexARgb(hex) {
    const h = String(hex || '#1d4fb8').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Convierte cualquier imagen (jpg, png o svg) a PNG para el PDF
  function imagenPng(src, lado, circular) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => {
        try {
          const ratio = (img.naturalHeight || 1) / (img.naturalWidth || 1);
          const w = lado, h = circular ? lado : Math.round(lado * ratio);
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          const ctx = cv.getContext('2d');
          if (circular) {
            ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); ctx.clip();
            const s = Math.max(w / img.naturalWidth, h / img.naturalHeight) || 1;
            const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
            ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
          } else {
            ctx.drawImage(img, 0, 0, w, h);
          }
          resolve({ data: cv.toDataURL('image/png'), ratio: h / w });
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // jsPDF con fuentes estándar no admite algunos símbolos tipográficos
  const pdfTxt = (t) => String(t == null ? '' : t)
    .replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u2026/g, '...');

  function resumenNivel(n) {
    const info = porNivel(n);
    const nombre = U.nivelTexto(n);
    if (!info.lista.length) return `${nombre}: no hay candidatos registrados.`;
    if (!info.total) return `${nombre}: todavía no hay votos.`;
    const pct = U.fmtPct(U.porcentaje(info.max, info.total));
    if (info.lideres.length > 1) {
      return `${nombre}: empate entre ${info.lideres.map((c) => c.nombre).join(' y ')} con ${info.max} votos cada uno (${pct}).`;
    }
    const g = info.lideres[0];
    const verbo = datos.abierta ? 'va ganando' : 'ganó';
    return `${nombre}: ${verbo} ${g.nombre}${g.lista ? ' (Lista ' + g.lista + ')' : ''} con ${g.votos} ${g.votos === 1 ? 'voto' : 'votos'}, el ${pct} de los votos del nivel.`;
  }

  async function generarPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      U.aviso('No se pudo cargar el generador de PDF. Revisa la conexión a internet.', 'error');
      return;
    }
    const btn = $('#btnPdf');
    U.cargando(btn, true, 'Generando PDF…');
    try {
      await cargar();
      let tituloEleccion = CFG.TITULO_ELECCION || 'Elecciones del Municipio Escolar';
      try { const pt = await API.portada(); if (pt && pt.titulo) tituloEleccion = pt.titulo; } catch (e) { /* se usa el de config.js */ }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = 210, H = 297, M = 16;
      const ahora = new Date();
      const fecha = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
      const hora = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      const NAVY = [13, 35, 58], ORO = [242, 183, 5], GRIS = [85, 101, 120];

      // Encabezado
      doc.setFillColor(...NAVY); doc.rect(0, 0, W, 36, 'F');
      doc.setFillColor(...ORO); doc.rect(0, 36, W, 1.8, 'F');
      const escudo = await imagenPng('images/logocolegio.png', 220, false);
      if (escudo) doc.addImage(escudo.data, 'PNG', M, 6, 24, 24 * escudo.ratio);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
      doc.text(pdfTxt(CFG.NOMBRE_COLEGIO || 'I.E. César Vallejo'), M + 30, 15);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11.5);
      doc.text(pdfTxt(tituloEleccion), M + 30, 22);
      doc.setTextColor(...ORO); doc.setFont('helvetica', 'bold');
      doc.text(pdfTxt(datos.abierta ? 'Resultados parciales (votación abierta)' : 'Acta de resultados finales'), M + 30, 29);

      let y = 48;
      doc.setTextColor(...NAVY); doc.setFontSize(14); doc.text('Resumen', M, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...GRIS);
      doc.text(pdfTxt(`Emitido el ${fecha} a las ${hora}.`), W - M, y, { align: 'right' });
      y += 7;
      doc.setTextColor(20, 32, 46); doc.setFontSize(11.5);
      NIVELES.forEach((n) => {
        const p = (datos.participacion || {})[n] || { total: 0, votaron: 0 };
        const linea1 = doc.splitTextToSize(pdfTxt(resumenNivel(n)), W - 2 * M);
        doc.setFont('helvetica', 'bold'); doc.text(linea1, M, y); y += linea1.length * 5.4;
        doc.setFont('helvetica', 'normal');
        if (p.total) {
          doc.text(pdfTxt(`Participación: votaron ${p.votaron} de ${p.total} estudiantes registrados (${U.fmtPct(U.porcentaje(p.votaron, p.total))}).`), M, y);
          y += 8;
        } else { y += 3; }
      });

      // Gráfico por nivel
      for (const n of NIVELES) {
        const info = porNivel(n);
        if (y > H - 60) { doc.addPage(); y = 20; }
        y += 4;
        doc.setDrawColor(...NAVY); doc.setLineWidth(0.8); doc.line(M, y + 2, W - M, y + 2);
        doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
        doc.text(pdfTxt(`Nivel ${U.nivelTexto(n).toLowerCase()}`), M, y);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...GRIS);
        doc.text(`${info.total} ${info.total === 1 ? 'voto' : 'votos'}`, W - M, y, { align: 'right' });
        y += 9;

        for (const c of info.lista) {
          if (y > H - 30) { doc.addPage(); y = 20; }
          const pct = U.porcentaje(c.votos, info.total);
          const foto = await imagenPng(c.foto_url, 200, true);
          const color = hexARgb(c.color);
          if (foto) doc.addImage(foto.data, 'PNG', M, y, 15, 15);
          doc.setDrawColor(...color); doc.setLineWidth(0.9); doc.circle(M + 7.5, y + 7.5, 7.5, 'S');

          const x0 = M + 20, ancho = W - M - x0 - 34;
          doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5);
          const lider = info.lideres.some((l) => l.id === c.id);
          doc.text(pdfTxt(c.nombre + (lider ? `  [${insigniaTexto(info)}]` : '')), x0, y + 4);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
          if (c.lista) doc.text(pdfTxt('Lista ' + c.lista), x0, y + 8.5);
          doc.setFillColor(238, 242, 247); doc.roundedRect(x0, y + 10, ancho, 5, 1.2, 1.2, 'F');
          if (pct > 0) { doc.setFillColor(...color); doc.roundedRect(x0, y + 10, Math.max(2, ancho * pct / 100), 5, 1.2, 1.2, 'F'); }
          doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
          doc.text(`${c.votos}`, W - M, y + 9, { align: 'right' });
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
          doc.text(pdfTxt(U.fmtPct(pct)), W - M, y + 14.5, { align: 'right' });
          y += 21;
        }
      }

      // Tabla de detalle
      if (typeof doc.autoTable === 'function') {
        if (y > H - 70) { doc.addPage(); y = 20; }
        y += 4;
        doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
        doc.text('Detalle de votos', M, y);
        const filas = [];
        NIVELES.forEach((n) => {
          const info = porNivel(n);
          info.lista.forEach((c) => filas.push([U.nivelTexto(n), pdfTxt(c.nombre), pdfTxt(c.lista || '-'), pdfTxt(c.cargo || ''), c.votos, pdfTxt(U.fmtPct(U.porcentaje(c.votos, info.total)))]));
          filas.push([{ content: `Total ${U.nivelTexto(n).toLowerCase()}`, colSpan: 4, styles: { fontStyle: 'bold' } }, { content: info.total, styles: { fontStyle: 'bold' } }, '']);
        });
        doc.autoTable({
          startY: y + 4, margin: { left: M, right: M },
          head: [['Nivel', 'Candidato', 'Lista', 'Cargo', 'Votos', '%']],
          body: filas,
          styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 2.2 },
          headStyles: { fillColor: NAVY, textColor: 255 },
          alternateRowStyles: { fillColor: [248, 250, 253] },
          columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' } }
        });
        y = doc.lastAutoTable.finalY + 6;
      }

      // Firmas
      if (y > H - 50) { doc.addPage(); y = 30; }
      y = Math.max(y + 22, H - 48);
      doc.setDrawColor(...GRIS); doc.setLineWidth(0.3);
      const ancho = 70;
      doc.line(M + 6, y, M + 6 + ancho, y);
      doc.line(W - M - 6 - ancho, y, W - M - 6, y);
      doc.setFontSize(9.5); doc.setTextColor(...GRIS); doc.setFont('helvetica', 'normal');
      doc.text(pdfTxt('Presidente(a) del Comité Electoral'), M + 6 + ancho / 2, y + 5, { align: 'center' });
      doc.text(pdfTxt('Director(a) de la I.E.'), W - M - 6 - ancho / 2, y + 5, { align: 'center' });

      // Pie de página
      const paginas = doc.getNumberOfPages();
      for (let i = 1; i <= paginas; i++) {
        doc.setPage(i);
        doc.setFontSize(8.5); doc.setTextColor(140, 150, 162);
        doc.text(pdfTxt(`Sistema de votación - ${CFG.NOMBRE_COLEGIO || ''}`), M, H - 8);
        doc.text(`Página ${i} de ${paginas}`, W - M, H - 8, { align: 'right' });
      }

      const sello = ahora.toISOString().slice(0, 16).replace(/[-:T]/g, '');
      const nombreArchivo = `resultados-elecciones-${sello}.pdf`;
      if (window.__PREVIEW__) {
        U.aviso('PDF generado. En la vista previa no se pueden descargar archivos; en tu sitio publicado sí se descarga.');
      } else {
        doc.save(nombreArchivo);
        U.aviso('PDF descargado.');
      }
    } catch (err) {
      U.aviso('No se pudo generar el PDF: ' + (err.message || err), 'error');
    }
    U.cargando(btn, false);
  }

  $('#btnPdf').addEventListener('click', generarPdf);

  // ---------------- Inicio ----------------
  (async function iniciar() {
    U.marcarDemo();
    if (!(await U.exigirAdmin())) return;
    await cargar();
    cargarFaltantes();
    const cada = (Number(CFG.SEGUNDOS_ACTUALIZAR_PANEL) || 15) * 1000;
    setInterval(() => { if (!document.hidden) cargar(); }, cada);
  })();
})();
