(function () {
  'use strict';
  const { $, $$ } = U;

  const form = $('#formIngreso');
  const pasoMetodo = $('#pasoMetodo');
  const pasoClave = $('#pasoClave');
  const clave = $('#clave');
  const btn = $('#btnIngresar');
  const msg = $('#mensaje');

  // Cada vez que se abre esta pantalla se borra al votante anterior
  sessionStorage.removeItem('cv_votante');
  U.marcarDemo();
  U.activarOjos();

  const nivelElegido = () => (form.querySelector('input[name="nivel"]:checked') || {}).value;
  const metodoElegido = () => (form.querySelector('input[name="metodo"]:checked') || {}).value;

  function claveValida() {
    const tipo = metodoElegido();
    const v = API.limpiarCredencial(tipo, clave.value);
    if (tipo === 'dni') return v.length === 8;
    if (tipo === 'codigo') return v.replace(/^0+/, '').length >= 4;
    return false;
  }

  function actualizarBoton() { btn.disabled = !(nivelElegido() && metodoElegido() && claveValida()); }

  $$('input[name="nivel"]').forEach((r) => r.addEventListener('change', () => {
    pasoMetodo.disabled = false;
    U.mensaje(msg, '');
    actualizarBoton();
  }));

  $$('input[name="metodo"]').forEach((r) => r.addEventListener('change', () => {
    const esDni = metodoElegido() === 'dni';
    pasoClave.disabled = false;
    $('#tituloClave').textContent = esDni ? 'Escribe tu DNI' : 'Escribe tu código de estudiante';
    $('#etiquetaClave').textContent = esDni ? 'DNI' : 'Código de estudiante';
    $('#ayudaClave').textContent = esDni
      ? 'Tu contraseña es tu número de DNI (8 dígitos).'
      : 'Tu contraseña es tu código de estudiante. Puedes escribirlo sin los ceros del inicio.';
    clave.placeholder = esDni ? 'Ejemplo: 71234567' : 'Ejemplo: 12345678901234';
    clave.inputMode = esDni ? 'numeric' : 'text';
    clave.maxLength = esDni ? 8 : 20;
    clave.value = '';
    U.mensaje(msg, '');
    actualizarBoton();
    clave.focus();
  }));

  clave.addEventListener('input', actualizarBoton);

  const MENSAJES = {
    cerrada: 'La votación está cerrada en este momento. Espera la indicación de tu profesor.',
    no_encontrado: null, // depende del método
    otro_nivel: 'Estás registrado en otro nivel. Revisa si elegiste Primaria o Secundaria.',
    ya_voto: 'Este estudiante ya votó. Cada estudiante puede votar una sola vez.'
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    const nivel = nivelElegido();
    const tipo = metodoElegido();
    U.mensaje(msg, '');
    U.cargando(btn, true, 'Verificando…');
    try {
      const r = await API.verificarEstudiante(nivel, tipo, clave.value);
      if (!r || !r.ok) {
        const texto = r && r.motivo === 'no_encontrado'
          ? (tipo === 'dni'
            ? 'No encontramos ese DNI en el registro. Revisa que esté bien escrito o ingresa con tu código de estudiante.'
            : 'No encontramos ese código en el registro. Revisa que esté bien escrito o ingresa con tu DNI.')
          : (MENSAJES[r && r.motivo] || 'No se pudo verificar tus datos. Inténtalo otra vez.');
        U.mensaje(msg, texto, 'error');
        U.cargando(btn, false);
        clave.select();
        return;
      }
      sessionStorage.setItem('cv_votante', JSON.stringify({
        nivel, tipo,
        credencial: API.limpiarCredencial(tipo, clave.value),
        nombres: r.nombres,
        apellidos: [r.apellido_paterno, r.apellido_materno].filter(Boolean).join(' '),
        grado: r.grado || ''
      }));
      U.irA('vault.html');
    } catch (err) {
      U.mensaje(msg, err.message || 'Ocurrió un error. Inténtalo otra vez.', 'error');
      U.cargando(btn, false);
    }
  });

  // Si la votación está cerrada se avisa desde el inicio
  API.estadoVotacion().then((estado) => {
    if (estado.abierta) return;
    let texto = 'La votación está cerrada en este momento.';
    if (estado.inicio && Date.parse(estado.inicio) > Date.now()) {
      const cuando = new Date(estado.inicio).toLocaleString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
      texto = 'La votación todavía no empieza. Empieza el ' + cuando + (cuando.endsWith('.') ? '' : '.');
    }
    U.mensaje(msg, texto + ' Espera la indicación de tu profesor.', 'info');
    // Se ocultan los pasos para que no parezca que se puede votar
    ['#pasoNivel', '#pasoMetodo', '#pasoClave', '#btnIngresar'].forEach((s) => { $(s).hidden = true; });
    $('#btnVolver').classList.add('btn-amarillo', 'btn-grande');
    $('#btnVolver').classList.remove('btn-borde');
  }).catch((err) => U.mensaje(msg, err.message, 'error'));
})();
