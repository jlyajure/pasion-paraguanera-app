// Importar las funciones de Firebase directamente desde la nube de Google
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuración de tu proyecto Firebase (Pendiente por llenar con tus datos)
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "tudominio.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Inicializar la base de datos
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Lógica inicial de la interfaz
document.addEventListener("DOMContentLoaded", () => {
    const btnLogin = document.getElementById("btn-login");
    
    btnLogin.addEventListener("click", () => {
        alert("¡Estructura web funcionando perfecto! El siguiente paso será conectar Firebase Auth para el Administrador.");
    });
});