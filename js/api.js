
(function () {
  'use strict';

  const CFG = window.APP_CONFIG || {};
  const MODO_DEMO = !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY;
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';

  // Limpia lo que escribe el estudiante: DNI solo dígitos, código alfanumérico
  function limpiarCredencial(tipo, valor) {
    const v = String(valor || '').trim().replace(/\s+/g, '');
    return tipo === 'dni' ? v.replace(/\D/g, '') : v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function usuarioAEmail(usuario) {
    const u = String(usuario || '').trim().toLowerCase();
    return u.includes('@') ? u : u + '@' + CFG.ADMIN_DOMINIO;
  }

  // ===========================================================
  //  MODO DEMOSTRACIÓN
  // ===========================================================
  const CLAVE_DEMO = 'cv_votacion_demo_v2';
  const CLAVE_SESION_DEMO = 'cv_votacion_demo_admin';

  function datosIniciales() {
    const est = (id, nivel, grado, dni, cod, ap, am, nom, voto) => ({
      id, nivel, grado, tipo_documento: 'DNI', numero_documento: dni,
      codigo_estudiante: cod, apellido_paterno: ap, apellido_materno: am,
      nombres: nom, ha_votado: !!voto
    });
    // Estudiantes de prueba con los que se puede ingresar en la demostración
    const estudiantes = [
      est(1, 'primaria', '5.° A', '70000001', '10000000000001', 'QUISPE', 'RAMOS', 'LUCIANA SOFÍA'),
      est(2, 'primaria', '6.° B', '70000002', '10000000000002', 'HUAMÁN', 'TORRES', 'MATEO'),
      est(3, 'primaria', '4.° A', '70000003', '10000000000003', 'CÁCERES', 'LÓPEZ', 'ANA LUCÍA'),
      est(4, 'secundaria', '3.° B', '70000011', '20000000000011', 'FLORES', 'CASTILLO', 'VALERIA'),
      est(5, 'secundaria', '5.° A', '70000012', '20000000000012', 'ROJAS', 'VILLANUEVA', 'DIEGO ALONSO'),
      est(6, 'secundaria', '1.° C', '70000013', '20000000000013', 'GUTIÉRREZ', 'ÑIQUE', 'RENATO')
    ];
    // Relleno ficticio para que el panel muestre participación realista
    const AP = ['ALVA', 'BRICEÑO', 'CHÁVEZ', 'DÍAZ', 'ESPINOZA', 'GARCÍA', 'LEÓN', 'MEDINA', 'PAREDES', 'SALINAS'];
    const NO = ['ANDREA', 'BRUNO', 'CAMILA', 'DANIEL', 'ELENA', 'FABIO', 'GIULIANA', 'HUGO', 'IRIS', 'JORGE'];
    let id = 7;
    [['primaria', 24, 5, '1'], ['secundaria', 34, 7, '2']].forEach(([nivel, cuantos, votaron, pref]) => {
      for (let i = 0; i < cuantos; i++) {
        estudiantes.push(est(id, nivel, ((i % 5) + 1) + '.° ' + 'ABC'[i % 3],
          '7' + pref + String(100000 + i).padStart(6, '0'), pref + '00000000' + String(10000 + i),
          AP[i % 10], AP[(i + 3) % 10], NO[(i * 7) % 10], i < votaron));
        id++;
      }
    });
    return {
      // Abierta desde hace 1 hora y sin hora de cierre, para poder probar
      inicio: new Date(Date.now() - 3600 * 1000).toISOString(),
      fin: null,
      portada: { titulo: 'Elecciones del Municipio Escolar 2027', subtitulo: 'Primaria  •  Secundaria', fondo_url: null },
      adminClave: '1234abcd..',
      siguienteId: 1000,
      estudiantes,
      candidatos: [
        { id: 1, activo: true, nivel: 'primaria', nombre: 'Camila Herrera Ruiz', cargo: 'Alcaldesa escolar', lista: 'Manos Unidas', foto_url: 'images/candidatos/camila-herrera-foto.svg', logo_url: 'images/candidatos/camila-herrera-logo.svg', color: '#1d4fb8', orden: 1 },
        { id: 2, activo: true, nivel: 'primaria', nombre: 'Sebastián Chávez León', cargo: 'Alcalde escolar', lista: 'Nuevo Amanecer', foto_url: 'images/candidatos/sebastian-chavez-foto.svg', logo_url: 'images/candidatos/sebastian-chavez-logo.svg', color: '#e08a00', orden: 2 },
        { id: 3, activo: true, nivel: 'secundaria', nombre: 'Ariana Mendoza Soto', cargo: 'Alcaldesa escolar', lista: 'Vallejianos en Acción', foto_url: 'images/candidatos/ariana-mendoza-foto.svg', logo_url: 'images/candidatos/ariana-mendoza-logo.svg', color: '#0f7a5c', orden: 1 },
        { id: 4, activo: true, nivel: 'secundaria', nombre: 'Joaquín Salazar Ríos', cargo: 'Alcalde escolar', lista: 'Juventud que Avanza', foto_url: 'images/candidatos/joaquin-salazar-foto.svg', logo_url: 'images/candidatos/joaquin-salazar-logo.svg', color: '#b3261e', orden: 2 },
        { id: 5, activo: true, nivel: 'secundaria', nombre: 'Fernanda Paredes Lino', cargo: 'Alcaldesa escolar', lista: 'Fuerza Estudiantil', foto_url: 'images/candidatos/fernanda-paredes-foto.svg', logo_url: 'images/candidatos/fernanda-paredes-logo.svg', color: '#6b3fa0', orden: 3 }
      ],
      // Votos de ejemplo para que el panel no se vea vacío
      votos: [1, 1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 5].map((c, i) => ({ id: i + 1, candidato_id: c }))
    };
  }

  function leerDemo() {
    try {
      const txt = localStorage.getItem(CLAVE_DEMO);
      if (txt) return JSON.parse(txt);
    } catch (e) { /* almacenamiento no disponible */ }
    const d = datosIniciales();
    guardarDemo(d);
    return d;
  }
  function guardarDemo(d) {
    try { localStorage.setItem(CLAVE_DEMO, JSON.stringify(d)); return true; } catch (e) { return false; }
  }
  const pausa = (ms) => new Promise((r) => setTimeout(r, ms || 250));

  function abiertaDemo(d) {
    const ahora = Date.now();
    return !!d.inicio && ahora >= Date.parse(d.inicio) && (!d.fin || ahora < Date.parse(d.fin));
  }

  function buscarDemo(d, tipo, cred) {
    return d.estudiantes.find((e) => tipo === 'dni'
      ? e.numero_documento === cred
      : String(e.codigo_estudiante || '').toUpperCase().replace(/^0+/, '') === cred.replace(/^0+/, ''));
  }

  function participacionDemo(d) {
    const p = {};
    ['primaria', 'secundaria'].forEach((n) => {
      const lista = d.estudiantes.filter((e) => e.nivel === n);
      p[n] = { total: lista.length, votaron: lista.filter((e) => e.ha_votado).length };
    });
    return p;
  }

  const Demo = {
    modoDemo: true,

    async estadoVotacion() {
      await pausa(80); const d = leerDemo();
      return { abierta: abiertaDemo(d), inicio: d.inicio || null, fin: d.fin || null, ahora: new Date().toISOString() };
    },

    async verificarEstudiante(nivel, tipo, credencial) {
      await pausa(); const d = leerDemo();
      const cred = limpiarCredencial(tipo, credencial);
      if (!abiertaDemo(d)) return { ok: false, motivo: 'cerrada' };
      const e = buscarDemo(d, tipo, cred);
      if (!e) return { ok: false, motivo: 'no_encontrado' };
      if (e.nivel !== nivel) return { ok: false, motivo: 'otro_nivel' };
      if (e.ha_votado) return { ok: false, motivo: 'ya_voto' };
      return { ok: true, nombres: e.nombres, apellido_paterno: e.apellido_paterno, apellido_materno: e.apellido_materno, grado: e.grado, nivel: e.nivel };
    },

    async candidatos(nivel) {
      await pausa(120);
      return leerDemo().candidatos.filter((c) => c.nivel === nivel && c.activo !== false).sort((a, b) => a.orden - b.orden);
    },

    async emitirVoto(nivel, tipo, credencial, candidatoId) {
      await pausa(500); const d = leerDemo();
      const cred = limpiarCredencial(tipo, credencial);
      if (!abiertaDemo(d)) return { ok: false, motivo: 'cerrada' };
      const e = buscarDemo(d, tipo, cred);
      if (!e) return { ok: false, motivo: 'no_encontrado' };
      if (e.nivel !== nivel) return { ok: false, motivo: 'otro_nivel' };
      if (e.ha_votado) return { ok: false, motivo: 'ya_voto' };
      const c = d.candidatos.find((x) => x.id === Number(candidatoId));
      if (!c || c.activo === false || c.nivel !== e.nivel) return { ok: false, motivo: 'candidato_invalido' };
      d.votos.push({ id: d.siguienteId++, candidato_id: c.id });
      e.ha_votado = true;
      guardarDemo(d);
      return { ok: true };
    },

    async adminEntrar(usuario, clave) {
      await pausa(400); const d = leerDemo();
      if (String(usuario).trim().toLowerCase() === 'admincv' && clave === d.adminClave) {
        sessionStorage.setItem(CLAVE_SESION_DEMO, 'admincv');
        return { ok: true };
      }
      return { ok: false, error: 'Usuario o contraseña incorrectos.' };
    },
    async adminSalir() { sessionStorage.removeItem(CLAVE_SESION_DEMO); },
    async adminSesion() {
      const u = sessionStorage.getItem(CLAVE_SESION_DEMO);
      return u ? { usuario: u } : null;
    },

    async cambiarClave(actual, nueva) {
      await pausa(400); const d = leerDemo();
      if (actual !== d.adminClave) return { ok: false, error: 'La contraseña actual no es correcta.' };
      d.adminClave = nueva; guardarDemo(d);
      return { ok: true };
    },

    async resultados() {
      await pausa(150); const d = leerDemo();
      const cand = d.candidatos.filter((c) => c.activo !== false).map((c) => Object.assign({}, c, {
        votos: d.votos.filter((v) => v.candidato_id === c.id).length
      }));
      return { abierta: abiertaDemo(d), inicio: d.inicio || null, fin: d.fin || null, candidatos: cand, participacion: participacionDemo(d) };
    },

    async programarVotacion(inicio, fin) {
      await pausa(); const d = leerDemo();
      if (inicio && fin && Date.parse(fin) <= Date.parse(inicio)) return { ok: false, error: 'La hora de cierre debe ser posterior a la hora de inicio.' };
      d.inicio = inicio || null; d.fin = fin || null; guardarDemo(d);
      return { ok: true };
    },
    async estudiantesSinVotar() {
      await pausa(200);
      return leerDemo().estudiantes.filter((e) => !e.ha_votado)
        .map(({ nivel, grado, apellido_paterno, apellido_materno, nombres }) => ({ nivel, grado, apellido_paterno, apellido_materno, nombres }));
    },

    async limpiarVotos() {
      await pausa(500); const d = leerDemo();
      d.votos = []; d.estudiantes.forEach((e) => { e.ha_votado = false; });
      guardarDemo(d);
      return { ok: true };
    },

    async resumenEstudiantes() { await pausa(100); return participacionDemo(leerDemo()); },

    async cargarEstudiantes(nivel, filas, reemplazar) {
      await pausa(600); const d = leerDemo();
      if (reemplazar) {
        if (d.estudiantes.some((e) => e.nivel === nivel && e.ha_votado)) {
          return { ok: false, error: 'Hay estudiantes de ' + nivel + ' que ya votaron. Limpia los votos antes de reemplazar la lista.' };
        }
        d.estudiantes = d.estudiantes.filter((e) => e.nivel !== nivel);
      }
      let insertados = 0, actualizados = 0;
      filas.forEach((f) => {
        const previo = d.estudiantes.find((e) =>
          (f.numero_documento && e.numero_documento === f.numero_documento) ||
          (f.codigo_estudiante && e.codigo_estudiante === f.codigo_estudiante));
        if (previo) {
          Object.assign(previo, f, { nivel: nivel }); actualizados++;
        } else {
          d.estudiantes.push(Object.assign({ id: d.siguienteId++, ha_votado: false }, f, { nivel: nivel })); insertados++;
        }
      });
      guardarDemo(d);
      return { ok: true, insertados, actualizados };
    },

    async borrarEstudiantes(nivel) {
      await pausa(400); const d = leerDemo();
      if (d.estudiantes.some((e) => e.nivel === nivel && e.ha_votado)) {
        return { ok: false, error: 'Hay estudiantes de ' + nivel + ' que ya votaron. Limpia los votos antes de borrar la lista.' };
      }
      d.estudiantes = d.estudiantes.filter((e) => e.nivel !== nivel); guardarDemo(d);
      return { ok: true };
    },

    async portada() {
      await pausa(60);
      const d = leerDemo();
      return Object.assign({ titulo: 'Elecciones del Municipio Escolar 2027', subtitulo: 'Primaria  •  Secundaria', fondo_url: null }, d.portada || {});
    },
    async guardarPortada(p) {
      await pausa(400); const d = leerDemo();
      d.portada = { titulo: p.titulo, subtitulo: p.subtitulo, fondo_url: p.fondo_url || null };
      if (!guardarDemo(d)) return { ok: false, error: 'La imagen es demasiado grande para el modo demostración. Prueba con una más liviana.' };
      return { ok: true };
    },
    async candidatosAdmin() {
      await pausa(120);
      return leerDemo().candidatos.slice().sort((a, b) => a.nivel.localeCompare(b.nivel) || a.orden - b.orden);
    },
    async guardarCandidato(c) {
      await pausa(400); const d = leerDemo();
      if (c.id) {
        const x = d.candidatos.find((y) => y.id === Number(c.id));
        if (!x) return { ok: false, error: 'El candidato ya no existe.' };
        Object.assign(x, c, { id: x.id });
      } else {
        d.candidatos.push(Object.assign({}, c, { id: d.siguienteId++ }));
      }
      if (!guardarDemo(d)) return { ok: false, error: 'Las imágenes son demasiado grandes para el modo demostración.' };
      return { ok: true };
    },
    async eliminarCandidato(id) {
      await pausa(300); const d = leerDemo();
      if (d.votos.some((v) => v.candidato_id === Number(id))) {
        return { ok: false, error: 'Este candidato ya tiene votos. Limpia los votos o desmárcalo como activo para ocultarlo.' };
      }
      d.candidatos = d.candidatos.filter((c) => c.id !== Number(id)); guardarDemo(d);
      return { ok: true };
    },
    // En la demostración la imagen se guarda dentro del navegador
    async subirImagen(blob) {
      return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        fr.readAsDataURL(blob);
      });
    },

    reiniciarDemo() { localStorage.removeItem(CLAVE_DEMO); sessionStorage.removeItem(CLAVE_SESION_DEMO); }
  };

  // ===========================================================
  //  SUPABASE
  // ===========================================================
  let clientePromesa = null;
  function cliente() {
    if (clientePromesa) return clientePromesa;
    clientePromesa = new Promise((resolve, reject) => {
      const crear = () => resolve(window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY));
      if (window.supabase && window.supabase.createClient) return crear();
      const s = document.createElement('script');
      s.src = SUPABASE_CDN;
      s.onload = crear;
      s.onerror = () => reject(new Error('No se pudo cargar Supabase. Revisa la conexión a internet.'));
      document.head.appendChild(s);
    });
    return clientePromesa;
  }

  // Ejecuta una función SQL (RPC) y devuelve sus datos o lanza un error legible
  async function rpc(nombre, params) {
    const sb = await cliente();
    const { data, error } = await sb.rpc(nombre, params || {});
    if (error) throw new Error(traducirError(error));
    return data;
  }

  function traducirError(error) {
    const m = (error && error.message) || String(error);
    if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Sin conexión con el servidor. Revisa el internet e inténtalo otra vez.';
    if (/administrador/i.test(m)) return 'Tu sesión expiró o no tienes permiso. Vuelve a ingresar.';
    return m;
  }

  const Supa = {
    modoDemo: false,

    async estadoVotacion() { return rpc('estado_votacion'); },

    async verificarEstudiante(nivel, tipo, credencial) {
      return rpc('verificar_estudiante', { p_nivel: nivel, p_tipo: tipo, p_credencial: limpiarCredencial(tipo, credencial) });
    },

    async candidatos(nivel) {
      const sb = await cliente();
      const { data, error } = await sb.from('candidatos')
        .select('id, nivel, nombre, cargo, lista, foto_url, logo_url, color, orden')
        .eq('nivel', nivel).eq('activo', true).order('orden');
      if (error) throw new Error(traducirError(error));
      return data;
    },

    async emitirVoto(nivel, tipo, credencial, candidatoId) {
      return rpc('emitir_voto', { p_nivel: nivel, p_tipo: tipo, p_credencial: limpiarCredencial(tipo, credencial), p_candidato: Number(candidatoId) });
    },

    async adminEntrar(usuario, clave) {
      const sb = await cliente();
      const { error } = await sb.auth.signInWithPassword({ email: usuarioAEmail(usuario), password: clave });
      if (error) return { ok: false, error: 'Usuario o contraseña incorrectos.' };
      const esAdmin = await rpc('es_admin');
      if (!esAdmin) { await sb.auth.signOut(); return { ok: false, error: 'Esta cuenta no tiene permiso de administrador.' }; }
      return { ok: true };
    },
    async adminSalir() { const sb = await cliente(); await sb.auth.signOut(); },
    async adminSesion() {
      const sb = await cliente();
      const { data } = await sb.auth.getSession();
      const s = data && data.session;
      if (!s) return null;
      return { usuario: String(s.user.email || '').split('@')[0] };
    },

    async cambiarClave(actual, nueva) {
      const sb = await cliente();
      const { data } = await sb.auth.getSession();
      const email = data && data.session && data.session.user.email;
      if (!email) return { ok: false, error: 'Tu sesión expiró. Vuelve a ingresar.' };
      const prueba = await sb.auth.signInWithPassword({ email, password: actual });
      if (prueba.error) return { ok: false, error: 'La contraseña actual no es correcta.' };
      const { error } = await sb.auth.updateUser({ password: nueva });
      if (error) return { ok: false, error: traducirError(error) };
      return { ok: true };
    },

    async resultados() { return rpc('resultados_eleccion'); },
    async programarVotacion(inicio, fin) {
      try { await rpc('programar_votacion', { p_inicio: inicio || null, p_fin: fin || null }); return { ok: true }; }
      catch (e) { return { ok: false, error: e.message }; }
    },
    async estudiantesSinVotar() { return rpc('estudiantes_sin_votar'); },
    async limpiarVotos() { await rpc('limpiar_votos'); return { ok: true }; },
    async resumenEstudiantes() { return rpc('resumen_estudiantes'); },

    async cargarEstudiantes(nivel, filas, reemplazar) {
      // Se envía por partes para listas grandes
      const PARTE = 400;
      let insertados = 0, actualizados = 0;
      try {
        for (let i = 0; i < filas.length; i += PARTE) {
          const r = await rpc('cargar_estudiantes', {
            p_nivel: nivel, p_filas: filas.slice(i, i + PARTE), p_reemplazar: !!reemplazar && i === 0
          });
          insertados += r.insertados; actualizados += r.actualizados;
        }
      } catch (e) { return { ok: false, error: e.message }; }
      return { ok: true, insertados, actualizados };
    },


    async portada() { return rpc('obtener_portada'); },
    async guardarPortada(p) {
      try { await rpc('guardar_portada', { p_titulo: p.titulo, p_subtitulo: p.subtitulo, p_fondo: p.fondo_url || '' }); return { ok: true }; }
      catch (e) { return { ok: false, error: e.message }; }
    },
    async candidatosAdmin() {
      const sb = await cliente();
      const { data, error } = await sb.from('candidatos').select('*').order('nivel').order('orden');
      if (error) throw new Error(traducirError(error));
      return data;
    },
    async guardarCandidato(c) {
      const sb = await cliente();
      const fila = { nivel: c.nivel, nombre: c.nombre, cargo: c.cargo, lista: c.lista || null,
        foto_url: c.foto_url || null, logo_url: c.logo_url || null, color: c.color, orden: Number(c.orden) || 0, activo: c.activo !== false };
      const q = c.id ? sb.from('candidatos').update(fila).eq('id', c.id) : sb.from('candidatos').insert(fila);
      const { error } = await q;
      return error ? { ok: false, error: traducirError(error) } : { ok: true };
    },
    async eliminarCandidato(id) {
      try { await rpc('eliminar_candidato', { p_id: Number(id) }); return { ok: true }; }
      catch (e) { return { ok: false, error: e.message }; }
    },
    // Sube la imagen al bucket público "imagenes" y devuelve su URL
    async subirImagen(blob, carpeta) {
      const sb = await cliente();
      const ext = blob.type === 'image/png' ? 'png' : 'jpg';
      const ruta = (carpeta || 'otros') + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      const { error } = await sb.storage.from('imagenes').upload(ruta, blob, { contentType: blob.type, upsert: false });
      if (error) throw new Error('No se pudo subir la imagen: ' + traducirError(error));
      return sb.storage.from('imagenes').getPublicUrl(ruta).data.publicUrl;
    },

    async borrarEstudiantes(nivel) {
      try { await rpc('borrar_estudiantes', { p_nivel: nivel }); return { ok: true }; }
      catch (e) { return { ok: false, error: e.message }; }
    }
  };

  window.API = MODO_DEMO ? Demo : Supa;
  window.API.limpiarCredencial = limpiarCredencial;
})();
