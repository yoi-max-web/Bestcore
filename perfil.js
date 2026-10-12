/* perfil.js — protege la página y carga el perfil desde Firestore */
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const poner = (campo, valor) =>
  document.querySelectorAll(`[data-campo="${campo}"]`).forEach(el => { el.textContent = valor || '—'; });

onAuthStateChanged(auth, async user => {
  if (!user) { location.replace('login.html'); return; }   // sin sesión → al login

  let p = {};
  try {
    const snap = await getDoc(doc(db, 'usuarios', user.uid));
    if (snap.exists()) p = snap.data();
  } catch (err) { console.error('No se pudo leer el perfil:', err); }

  const nombre = p.nombre || user.displayName || 'estudiante';
  poner('nombre', nombre);
  poner('primerNombre', nombre.split(' ')[0]);
  poner('email', p.email || user.email);
  poner('edad', p.edad ? `${p.edad} años` : '');
  poner('ubicacion', p.ciudad && p.departamento ? `${p.ciudad}, ${p.departamento}` : '');
  poner('calendario', p.calendario);
  document.getElementById('avatar').textContent = nombre.trim()[0].toUpperCase();

  document.getElementById('cargando').hidden = true;
  document.getElementById('pf').hidden = false;
});

document.getElementById('salir').addEventListener('click', async () => {
  await signOut(auth);
  location.replace('login.html');
});
