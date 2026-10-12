/* =====================================================
   auth.js — login.html y registro.html
   Validación del formulario + funciones listas para Firebase
   ===================================================== */

const RUTAS = {
  despuesDeLogin: 'index.html',   // TODO: cambia por tu panel (ej. 'dashboard.html')
  despuesDeRegistro: 'login.html'
};

const DEPARTAMENTOS = ['Amazonas','Antioquia','Arauca','Atlántico','Bogotá D.C.','Bolívar','Boyacá','Caldas','Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca','Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño','Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés y Providencia','Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada'];

/* =====================================================
   FIREBASE — AQUÍ CONECTAS TU LÓGICA
   Descomenta e importa el SDK cuando lo tengas listo:
   import { initializeApp } from 'firebase/app';
   import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
            sendPasswordResetEmail, updateProfile } from 'firebase/auth';
   import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
   ===================================================== */

// Debe devolver { ok: true } o { ok: false, error: 'mensaje' }
async function iniciarSesion({ email, password }) {
  // TODO Firebase:
  // await signInWithEmailAndPassword(auth, email, password);
  console.log('[DEMO] Iniciar sesión con:', email);
  return { ok: true };
}

async function crearCuenta(datos) {
  // La contraseña va solo a Firebase Auth; nunca la guardes en Firestore.
  const { password, confirmar, terminos, ...perfil } = datos;
  // perfil = { nombre, edad, departamento, ciudad, email, calendario }
  // TODO Firebase:
  // const cred = await createUserWithEmailAndPassword(auth, perfil.email, password);
  // await updateProfile(cred.user, { displayName: perfil.nombre });
  // await setDoc(doc(db, 'usuarios', cred.user.uid), { ...perfil, edad: Number(perfil.edad), creadoEn: serverTimestamp() });
  console.log('[DEMO] Crear cuenta con perfil:', perfil);
  return { ok: true };
}

async function recuperarContrasena(email) {
  // TODO Firebase: await sendPasswordResetEmail(auth, email);
  console.log('[DEMO] Recuperar contraseña para:', email);
  return { ok: true };
}

// Traduce los códigos de error de Firebase (úsalo dentro de tu catch)
function traducirErrorFirebase(code) {
  const m = {
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Correo o contraseña incorrectos.',
    'auth/email-already-in-use': 'Ese correo ya está registrado.',
    'auth/weak-password': 'La contraseña es muy débil.',
    'auth/too-many-requests': 'Demasiados intentos. Inténtalo más tarde.',
    'auth/network-request-failed': 'Sin conexión. Revisa tu internet.'
  };
  return m[code] || 'Ocurrió un error. Inténtalo de nuevo.';
}

/* =====================================================
   VALIDACIÓN Y MANEJO DEL FORMULARIO
   ===================================================== */
const form = document.querySelector('form[data-form]');

if (form) {
  const tipo = form.dataset.form;               // 'login' | 'registro'
  const msg = document.getElementById('msg');
  const boton = form.querySelector('[type="submit"]');
  const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const campos = ['nombre','edad','departamento','ciudad','email','calendario','password','confirmar','terminos'];

  const select = document.getElementById('departamento');
  if (select) DEPARTAMENTOS.forEach(d => select.add(new Option(d, d)));

  const leerDatos = () => {
    const d = Object.fromEntries(new FormData(form));
    Object.keys(d).forEach(k => { if (typeof d[k] === 'string' && !k.match(/password|confirmar/)) d[k] = d[k].trim(); });
    if (d.email) d.email = d.email.toLowerCase();
    return d;
  };

  const validar = d => {
    const e = {};
    if (!reEmail.test(d.email || '')) e.email = 'Escribe un correo válido.';
    if (tipo === 'login') {
      if (!d.password) e.password = 'Ingresa tu contraseña.';
      return e;
    }
    if ((d.nombre || '').length < 3) e.nombre = 'Escribe tu nombre completo.';
    const edad = Number(d.edad);
    if (!Number.isInteger(edad) || edad < 10 || edad > 99) e.edad = 'Edad entre 10 y 99.';
    if (!d.departamento) e.departamento = 'Selecciona tu departamento.';
    if ((d.ciudad || '').length < 2) e.ciudad = 'Escribe tu ciudad o municipio.';
    if (!d.calendario) e.calendario = 'Elige tu calendario.';
    if ((d.password || '').length < 8) e.password = 'Mínimo 8 caracteres.';
    if (d.confirmar !== d.password) e.confirmar = 'Las contraseñas no coinciden.';
    if (!d.terminos) e.terminos = 'Debes aceptar los términos.';
    return e;
  };

  const marcar = (nombre, texto = '') => {
    const el = document.getElementById('err-' + nombre);
    if (!el) return;
    el.textContent = texto;
    el.closest('.field')?.classList.toggle('invalid', !!texto);
  };

  const mensaje = (texto, clase = '') => { msg.textContent = texto; msg.className = 'msg ' + clase; };

  // Limpia el error del campo mientras el usuario escribe
  form.addEventListener('input', e => { if (e.target.name) marcar(e.target.name); });

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const datos = leerDatos();
    const errores = validar(datos);
    campos.forEach(c => marcar(c, errores[c]));
    if (Object.keys(errores).length) {
      mensaje('Revisa los campos marcados.', 'bad');
      form.querySelector('.invalid input, .invalid select')?.focus();
      return;
    }

    const textoBoton = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Procesando…';
    mensaje('');

    try {
      const r = tipo === 'login' ? await iniciarSesion(datos) : await crearCuenta(datos);
      if (!r.ok) throw new Error(r.error);
      mensaje(tipo === 'login' ? '¡Bienvenido de nuevo!' : '¡Cuenta creada! Ahora inicia sesión.', 'ok');
      setTimeout(() => { location.href = tipo === 'login' ? RUTAS.despuesDeLogin : RUTAS.despuesDeRegistro; }, 900);
    } catch (err) {
      mensaje(err.code ? traducirErrorFirebase(err.code) : (err.message || 'Ocurrió un error. Inténtalo de nuevo.'), 'bad');
      boton.disabled = false;
      boton.textContent = textoBoton;
    }
  });

  // "¿Olvidaste tu contraseña?" (solo existe en login.html)
  document.getElementById('olvide')?.addEventListener('click', async () => {
    const email = form.email.value.trim().toLowerCase();
    if (!reEmail.test(email)) { marcar('email', 'Escribe tu correo para enviarte el enlace.'); form.email.focus(); return; }
    try {
      await recuperarContrasena(email);
      mensaje('Si el correo está registrado, te enviaremos un enlace para restablecerla.', 'ok');
    } catch (err) {
      mensaje(traducirErrorFirebase(err.code), 'bad');
    }
  });
}
