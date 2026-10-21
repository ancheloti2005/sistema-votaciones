/* ---------- Lectura del Excel (función pura, sin interfaz) ---------- */
(function (raiz) {
  'use strict';

  function norm(t) {
    return String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Reconoce el encabezado aunque venga con tildes, abreviado o en otro orden
  function campoDe(encabezado) {
    const h = norm(encabezado);
    if (!h) return null;
    if (h.includes('PATERNO')) return 'apellido_paterno';
    if (h.includes('MATERNO')) return 'apellido_materno';
    if (h.includes('TIPO') && h.includes('DOC')) return 'tipo_documento';
    if (h.includes('CODIGO') || h === 'COD ESTUDIANTE' || h === 'COD MODULAR ESTUDIANTE') return 'codigo_estudiante';
    if (h.includes('DOC') || h === 'DNI' || h === 'NRO DNI' || h === 'N DNI') return 'numero_documento';
    if (h.startsWith('NOMBRE')) return 'nombres';
    if (h.startsWith('GRADO')) return 'grado';
    if (h.startsWith('SECCION')) return 'seccion';
    return null;
  }

  // "PRIMERO" → "1.°", "QUINTO" → "5.°"; si ya viene "3" → "3.°"
  const ORDINALES = { PRIMERO: 1, SEGUNDO: 2, TERCERO: 3, CUARTO: 4, QUINTO: 5, SEXTO: 6, '1ERO': 1, '2DO': 2, '3ERO': 3, '4TO': 4, '5TO': 5, '6TO': 6 };
  function grado(g) {
    const n = norm(g).replace(/ GRADO$| ANO$/, '');
    if (ORDINALES[n]) return ORDINALES[n] + '.°';
    if (/^[1-6]$/.test(n)) return n + '.°';
    return String(g || '').trim();
  }

  function texto(v) {
    if (v == null) return '';
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
    return String(v).replace(/\s+/g, ' ').trim();
  }

  function buscarEncabezado(matriz) {
    const limite = Math.min(matriz.length, 30);
    for (let i = 0; i < limite; i++) {
      const mapa = {};
      (matriz[i] || []).forEach((celda, col) => {
        const campo = campoDe(celda);
        if (campo && mapa[campo] === undefined) mapa[campo] = col;
      });
      const ok = mapa.nombres !== undefined && mapa.apellido_paterno !== undefined &&
        (mapa.numero_documento !== undefined || mapa.codigo_estudiante !== undefined);
      if (ok) {
        // Encabezado en dos filas (como el reporte del colegio): GRADO y
        // SECCIÓN están en la fila de arriba. Se completan desde ahí.
        for (let k = i - 1; k >= Math.max(0, i - 2); k--) {
          (matriz[k] || []).forEach((celda, col) => {
            const campo = campoDe(celda);
            if (campo && mapa[campo] === undefined && !Object.values(mapa).includes(col)) mapa[campo] = col;
          });
        }
        return { fila: i, mapa };
      }
    }
    return null;
  }

  function procesarMatriz(matriz) {
    const enc = buscarEncabezado(matriz);
    if (!enc) {
      return {
        ok: false,
        error: 'No se encontraron las columnas necesarias. El Excel debe tener al menos NOMBRES, APELLIDO PATERNO y NÚMERO DE DOCUMENTO o CÓDIGO DE ESTUDIANTE.'
      };
    }
    const m = enc.mapa;
    const faltantes = ['grado', 'tipo_documento', 'numero_documento', 'codigo_estudiante', 'apellido_paterno', 'apellido_materno', 'nombres']
      .filter((c) => m[c] === undefined);

    const filas = [], errores = [];
    const vistosDoc = new Map(), vistosCod = new Map();

    for (let i = enc.fila + 1; i < matriz.length; i++) {
      const r = matriz[i] || [];
      const val = (campo) => (m[campo] === undefined ? '' : texto(r[m[campo]]));
      if (!r.some((c) => texto(c) !== '')) continue; // fila vacía
      const numFila = i + 1;

      let tipo = val('tipo_documento').toUpperCase();
      let doc = val('numero_documento').replace(/\s+/g, '');
      const cod = val('codigo_estudiante').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!tipo && /^\d{8}$/.test(doc)) tipo = 'DNI';
      // Excel borra los ceros a la izquierda del DNI: se recuperan
      if ((tipo.includes('DNI') || !tipo) && /^\d{1,7}$/.test(doc)) doc = doc.padStart(8, '0');

      let grad = grado(val('grado'));
      const seccion = val('seccion');
      const sinSeccion = !seccion || /^UNICA$/.test(norm(seccion)) || grad.toUpperCase().endsWith(' ' + seccion.toUpperCase());
      if (!sinSeccion) grad = (grad + ' ' + seccion).trim();

      const fila = {
        grado: grad,
        tipo_documento: tipo,
        numero_documento: doc,
        codigo_estudiante: cod,
        apellido_paterno: val('apellido_paterno').toUpperCase(),
        apellido_materno: val('apellido_materno').toUpperCase(),
        nombres: val('nombres').toUpperCase()
      };

      const problemas = [];
      if (!fila.nombres) problemas.push('sin NOMBRES');
      if (!fila.apellido_paterno) problemas.push('sin APELLIDO PATERNO');
      if (!doc && !cod) problemas.push('sin DNI ni código de estudiante');
      if (doc && tipo.includes('DNI') && !/^\d{8}$/.test(doc)) problemas.push('el DNI "' + doc + '" no tiene 8 dígitos');
      if (doc && vistosDoc.has(doc)) problemas.push('documento repetido (también en la fila ' + vistosDoc.get(doc) + ')');
      if (cod && vistosCod.has(cod)) problemas.push('código repetido (también en la fila ' + vistosCod.get(cod) + ')');

      if (problemas.length) { errores.push({ fila: numFila, motivo: problemas.join(', ') }); continue; }
      if (doc) vistosDoc.set(doc, numFila);
      if (cod) vistosCod.set(cod, numFila);
      filas.push(Object.assign(fila, {
        numero_documento: doc || null,
        codigo_estudiante: cod || null
      }));
    }
    return { ok: true, filas, errores, faltantes, filaEncabezado: enc.fila + 1 };
  }

  raiz.Padron = { procesarMatriz, campoDe };
})(typeof window !== 'undefined' ? window : globalThis);

/* ---------- Interfaz ---------- */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const { $, $$, esc } = U;
  const pendientes = {}; // filas leídas por nivel, aún sin guardar

  async function pintarConteos() {
    try {
      const r = await API.resumenEstudiantes();
      $('#conteos').innerHTML = ['primaria', 'secundaria'].map((n) => {
        const x = r[n] || { total: 0 };
        return `<span class="conteo"><strong>${x.total}</strong> ${x.total === 1 ? 'estudiante' : 'estudiantes'} en ${n}</span>`;
      }).join('');
    } catch (err) {
      $('#conteos').innerHTML = `<span class="conteo">${esc(err.message)}</span>`;
    }
  }

  function esExcel(archivo) { return /\.(xlsx|xls)$/i.test(archivo.name || ''); }

  async function leerArchivo(seccion, archivo) {
    const nivel = seccion.dataset.nivel;
    const rev = $('[data-revision]', seccion);
    rev.hidden = false;
    delete pendientes[nivel];

    if (!esExcel(archivo)) {
      rev.innerHTML = `<div class="mensaje mensaje-error">“${esc(archivo.name)}” no es un archivo de Excel. Sube un archivo .xlsx o .xls.</div>`;
      return;
    }
    if (!window.XLSX) {
      rev.innerHTML = '<div class="mensaje mensaje-error">No se pudo cargar el lector de Excel. Revisa la conexión a internet y recarga la página.</div>';
      return;
    }
    rev.innerHTML = '<p class="nota-tabla"><span class="giro"></span> Leyendo el archivo…</p>';

    try {
      const libro = XLSX.read(await archivo.arrayBuffer(), { type: 'array' });
      let res = null;
      for (const nombreHoja of libro.SheetNames) {
        const matriz = XLSX.utils.sheet_to_json(libro.Sheets[nombreHoja], { header: 1, raw: true, defval: '' });
        res = Padron.procesarMatriz(matriz);
        if (res.ok) { res.hoja = nombreHoja; break; }
      }
      if (!res || !res.ok) {
        rev.innerHTML = `<div class="mensaje mensaje-error">${esc(res ? res.error : 'El archivo está vacío.')}</div>`;
        return;
      }
      if (!res.filas.length) {
        rev.innerHTML = '<div class="mensaje mensaje-error">El archivo no tiene filas válidas de estudiantes.</div>' + listaErrores(res.errores);
        return;
      }
      pendientes[nivel] = res.filas;
      pintarRevision(seccion, archivo.name, res);
    } catch (err) {
      rev.innerHTML = `<div class="mensaje mensaje-error">No se pudo leer el archivo: ${esc(err.message)}</div>`;
    }
  }

  function listaErrores(errores) {
    if (!errores.length) return '';
    return `<ul class="errores">${errores.slice(0, 50).map((e) => `<li>Fila ${e.fila}: ${esc(e.motivo)}</li>`).join('')}
      ${errores.length > 50 ? `<li>…y ${errores.length - 50} filas más con problemas.</li>` : ''}</ul>`;
  }

  function pintarRevision(seccion, nombreArchivo, res) {
    const nivel = seccion.dataset.nivel;
    const muestra = res.filas.slice(0, 8);
    const col = (v) => `<td>${esc(v || '—')}</td>`;
    $('[data-revision]', seccion).innerHTML = `
      <div class="mensaje mensaje-info">
        ${esc(nombreArchivo)}: <strong>${res.filas.length}</strong> estudiantes listos para guardar${res.errores.length ? ` y <strong>${res.errores.length}</strong> filas con problemas que no se guardarán` : ''}.
        ${res.faltantes.length ? `<br>Columnas no encontradas (se dejarán vacías): ${esc(res.faltantes.join(', ').replace(/_/g, ' '))}.` : ''}
      </div>
      ${listaErrores(res.errores)}
      <div class="tabla-envoltura">
        <table class="tabla">
          <thead><tr><th>Grado</th><th>Tipo doc.</th><th>N.° documento</th><th>Código estudiante</th><th>Apellido paterno</th><th>Apellido materno</th><th>Nombres</th></tr></thead>
          <tbody>${muestra.map((f) => `<tr>${col(f.grado)}${col(f.tipo_documento)}${col(f.numero_documento)}${col(f.codigo_estudiante)}${col(f.apellido_paterno)}${col(f.apellido_materno)}${col(f.nombres)}</tr>`).join('')}</tbody>
        </table>
      </div>
      <p class="nota-tabla">Vista previa de las primeras ${muestra.length} de ${res.filas.length} filas. Revisa que los datos correspondan a ${nivel}.</p>
      <div class="opciones-guardar">
        <label class="check"><input type="checkbox" data-reemplazar> <span>Reemplazar la lista actual de ${nivel}<br><small style="color:var(--gris)">Si no lo marcas, se agregan los nuevos y se actualizan los que ya existen.</small></span></label>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button type="button" class="btn btn-borde" data-cancelar>Cancelar</button>
          <button type="button" class="btn btn-azul" data-guardar>Guardar ${res.filas.length} estudiantes de ${nivel}</button>
        </div>
      </div>`;

    $('[data-cancelar]', seccion).addEventListener('click', () => limpiarSeccion(seccion));
    $('[data-guardar]', seccion).addEventListener('click', (e) => guardar(seccion, e.currentTarget));
  }

  function limpiarSeccion(seccion) {
    delete pendientes[seccion.dataset.nivel];
    const rev = $('[data-revision]', seccion);
    rev.hidden = true; rev.innerHTML = '';
    $('[data-archivo]', seccion).value = '';
  }

  async function guardar(seccion, btn) {
    const nivel = seccion.dataset.nivel;
    const filas = pendientes[nivel];
    if (!filas) return;
    const reemplazar = $('[data-reemplazar]', seccion).checked;
    U.cargando(btn, true, 'Guardando…');
    try {
      const r = await API.cargarEstudiantes(nivel, filas, reemplazar);
      if (!r.ok) { U.cargando(btn, false); U.aviso(r.error, 'error'); return; }
      limpiarSeccion(seccion);
      const rev = $('[data-revision]', seccion);
      rev.hidden = false;
      rev.innerHTML = `<div class="mensaje mensaje-ok">Listo: se guardaron ${r.insertados + r.actualizados} estudiantes de ${nivel} (${r.insertados} nuevos, ${r.actualizados} actualizados).</div>`;
      pintarConteos();
    } catch (err) {
      U.cargando(btn, false);
      U.aviso(err.message, 'error');
    }
  }

  // Zonas de carga: clic o arrastrar
  $$('.carga').forEach((seccion) => {
    const zona = $('[data-zona]', seccion);
    const input = $('[data-archivo]', seccion);
    input.addEventListener('change', () => { if (input.files[0]) leerArchivo(seccion, input.files[0]); });
    ['dragenter', 'dragover'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('encima'); }));
    ['dragleave', 'drop'].forEach((ev) => zona.addEventListener(ev, () => zona.classList.remove('encima')));
    zona.addEventListener('drop', (e) => {
      e.preventDefault();
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) leerArchivo(seccion, f);
    });
  });

  // Borrar lista de un nivel
  const modal = $('#modalBorrar');
  let nivelBorrar = null;
  $$('[data-borrar]').forEach((b) => b.addEventListener('click', () => {
    nivelBorrar = b.dataset.borrar;
    $('#tituloBorrar').textContent = `¿Borrar la lista de ${nivelBorrar}?`;
    $('#textoBorrar').textContent = `Se eliminarán todos los estudiantes de ${nivelBorrar} y ya no podrán ingresar a votar hasta que vuelvas a subir el Excel. Solo se puede hacer si nadie de ese nivel ha votado.`;
    U.abrirModal(modal);
  }));
  $('#btnCancelarBorrar').addEventListener('click', () => U.cerrarModal(modal));
  $('#btnConfirmarBorrar').addEventListener('click', async () => {
    const btn = $('#btnConfirmarBorrar');
    U.cargando(btn, true, 'Borrando…');
    const r = await API.borrarEstudiantes(nivelBorrar);
    U.cargando(btn, false);
    U.cerrarModal(modal);
    if (r.ok) { U.aviso(`Lista de ${nivelBorrar} borrada.`); pintarConteos(); }
    else U.aviso(r.error, 'error');
  });

  (async function iniciar() {
    U.marcarDemo();
    if (!(await U.exigirAdmin())) return;
    pintarConteos();
  })();
})();
