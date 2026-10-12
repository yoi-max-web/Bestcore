/* =====================================================
   firebase-config.js — conexión con Firebase (proyecto bestscore-4f66b)
   Usa el SDK por CDN, así que no necesitas npm ni instalar nada.
   ===================================================== */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyD-ijk3KacWjCiq6aJ0MeaLhh7IweFx7mk",
  authDomain: "bestscore-4f66b.firebaseapp.com",
  projectId: "bestscore-4f66b",
  storageBucket: "bestscore-4f66b.firebasestorage.app",
  messagingSenderId: "606075858317",
  appId: "1:606075858317:web:24caa24aa8b26aa44da1c4",
  measurementId: "G-WBCJK1TG96"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);