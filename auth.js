/* =====================================================
   auth.js — login.html y registro.html (Firebase Auth + Firestore)
   Requiere firebase-config.js y cargarse con type="module"
   ===================================================== */
import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo, deleteUser, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const RUTAS = {
  despuesDeLogin: 'perfil.html',
  despuesDeRegistro: 'perfil.html'
};

let enProceso = false; // evita redirigir antes de terminar de guardar el perfil
auth.languageCode = 'es';  // el correo de recuperación llega en español

const DEPARTAMENTOS = ['Amazonas','Antioquia','Arauca','Atlántico','Bogotá D.C.','Bolívar','Boyacá','Caldas','Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca','Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño','Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés y Providencia','Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada'];

// Debe devolver { ok: true } o lanzar un error (los de Firebase traen .code)
async function iniciarSesion({ email, password }) {
  await signInWithEmailAndPassword(auth, email, password);
  return { ok: true };
}

async function crearCuenta(datos) {
  // La contraseña va solo a Firebase Auth; nunca se guarda en Firestore.
  const { password, confirmar, terminos, ...perfil } = datos;
  const cred = await createUserWithEmailAndPassword(auth, perfil.email, password);
  await updateProfile(cred.user, { displayName: perfil.nombre });
  await setDoc(doc(db, 'usuarios', cred.user.uid), {
    ...perfil,                       // nombre, edad, departamento, ciudad, email, calendario
    edad: Number(perfil.edad),
    creadoEn: serverTimestamp()
  });
  return { ok: true };
}

async function iniciarConGoogle() {
  const proveedor = new GoogleAuthProvider();
  proveedor.setCustomParameters({ prompt: 'select_account' });   // siempre deja elegir la cuenta
  const cred = await signInWithPopup(auth, proveedor);
  const user = cred.user;
  // Firebase crea la cuenta sola si el correo es nuevo. Aquí no lo permitimos:
  // si es nueva, la borramos y avisamos que debe registrarse primero.
  if (getAdditionalUserInfo(cred)?.isNewUser) {
    try { await deleteUser(user); } catch { await signOut(auth); }
    const e = new Error('no-registrado');
    e.code = 'app/no-registrado';
    throw e;
  }
  const ref = doc(db, 'usuarios', user.uid);
  if (!(await getDoc(ref)).exists()) {   // cuenta existente sin perfil → crea el perfil básico
    await setDoc(ref, { nombre: user.displayName || '', email: user.email, perfilCompleto: false, creadoEn: serverTimestamp() });
  }
  return { ok: true };
}

async function recuperarContrasena(email) {
  await sendPasswordResetEmail(auth, email);
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
    'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
    'auth/popup-blocked': 'El navegador bloqueó la ventana. Permite las ventanas emergentes.',
    'auth/account-exists-with-different-credential': 'Ese correo ya está registrado con otro método.',
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase.',
    'app/no-registrado': 'Ese correo no está registrado. Crea tu cuenta primero.',
    'permission-denied': 'Sin permiso para guardar tus datos. Revisa las reglas de Firestore.'
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
    enProceso = true;
    boton.textContent = 'Procesando…';
    mensaje('');

    try {
      const r = tipo === 'login' ? await iniciarSesion(datos) : await crearCuenta(datos);
      if (!r.ok) throw new Error(r.error);
      mensaje(tipo === 'login' ? '¡Bienvenido de nuevo!' : '¡Cuenta creada! Entrando a tu perfil…', 'ok');
      setTimeout(() => { location.href = tipo === 'login' ? RUTAS.despuesDeLogin : RUTAS.despuesDeRegistro; }, 900);
    } catch (err) {
      mensaje(err.code ? traducirErrorFirebase(err.code) : (err.message || 'Ocurrió un error. Inténtalo de nuevo.'), 'bad');
      enProceso = false;
      boton.disabled = false;
      boton.textContent = textoBoton;
    }
  });

  // "Continuar con Google" (solo existe en login.html)
  document.getElementById('google')?.addEventListener('click', async () => {
    enProceso = true;
    try {
      await iniciarConGoogle();
      mensaje('¡Bienvenido!', 'ok');
      setTimeout(() => { location.href = RUTAS.despuesDeLogin; }, 600);
    } catch (err) {
      enProceso = false;
      if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(err.code)) mensaje(traducirErrorFirebase(err.code), 'bad');
    }
  });

  // "¿Olvidaste tu contraseña?" → modal (solo existe en login.html)
  const modal = document.getElementById('modal-recuperar');
  if (modal) {
    const formRec = document.getElementById('form-recuperar');
    const inRec = document.getElementById('rec-email');
    const errRec = document.getElementById('err-rec');
    const msgRec = document.getElementById('rec-msg');
    const btnRec = document.getElementById('rec-enviar');
    const msgR = (t, c = '') => { msgRec.textContent = t; msgRec.className = 'msg ' + c; };

    const abrir = () => {
      inRec.value = form.email.value.trim();   // reutiliza el correo ya escrito
      errRec.textContent = ''; msgR('');
      modal.hidden = false;
      inRec.focus();
    };
    const cerrar = () => { modal.hidden = true; document.getElementById('olvide').focus(); };

    document.getElementById('olvide').addEventListener('click', abrir);
    document.getElementById('rec-cerrar').addEventListener('click', cerrar);
    modal.addEventListener('click', e => { if (e.target === modal) cerrar(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) cerrar(); });

    formRec.addEventListener('submit', async ev => {
      ev.preventDefault();
      const email = inRec.value.trim().toLowerCase();
      errRec.textContent = ''; msgR('');
      if (!reEmail.test(email)) { errRec.textContent = 'Escribe un correo válido.'; inRec.focus(); return; }
      btnRec.disabled = true; btnRec.textContent = 'Enviando…';
      try {
        await recuperarContrasena(email);
        msgR('Si el correo está registrado, te enviamos un enlace. Revisa también tu carpeta de spam.', 'ok');
      } catch (err) {
        msgR(traducirErrorFirebase(err.code), 'bad');
      } finally {
        btnRec.disabled = false; btnRec.textContent = 'Enviar enlace';
      }
    });
  }
}

// Si ya hay una sesión abierta, manda al usuario directo a su perfil
onAuthStateChanged(auth, user => {
  if (user && form && !enProceso) location.replace(RUTAS.despuesDeLogin);
});

// Ojo para mostrar / ocultar contraseña
document.querySelectorAll('.eye').forEach(b => b.addEventListener('click', () => {
  const input = b.previousElementSibling;
  const ver = input.type === 'password';
  input.type = ver ? 'text' : 'password';
  b.setAttribute('aria-pressed', ver);
  b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
}));