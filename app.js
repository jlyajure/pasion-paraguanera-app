// Importamos Firebase Auth y Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// === ¡PEGA AQUÍ TU CONFIGURACIÓN REAL DE FIREBASE! ===
const firebaseConfig = {
  apiKey: "TU_VERDADERA_API_KEY",
  authDomain: "pasion-paraguanera.firebaseapp.com",
  projectId: "pasion-paraguanera",
  storageBucket: "pasion-paraguanera.appspot.com",
  messagingSenderId: "704685201960",
  appId: "TU_VERDADERO_APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
    // Referencias a las pantallas
    const vistaCliente = document.getElementById("vista-cliente");
    const vistaAdmin = document.getElementById("vista-admin");
    const modalLogin = document.getElementById("modal-login");
    
    // Referencias a botones y textos
    const tituloSecreto = document.getElementById("titulo-secreto");
    const btnCerrarModal = document.getElementById("btn-cerrar-modal");
    const btnEntrar = document.getElementById("btn-entrar");
    const btnSalir = document.getElementById("btn-salir");
    const emailAdmin = document.getElementById("email-admin");
    const passAdmin = document.getElementById("pass-admin");
    const mensajeError = document.getElementById("mensaje-error");

    // LÓGICA DEL CLIC SECRETO (3 clics rápidos)
    let contadorClics = 0;
    let tiempoClic;

    tituloSecreto.addEventListener("click", () => {
        contadorClics++;
        if (contadorClics === 1) {
            tiempoClic = setTimeout(() => { contadorClics = 0; }, 1000); // 1 segundo para hacer los 3 clics
        }
        if (contadorClics === 3) {
            clearTimeout(tiempoClic);
            contadorClics = 0;
            modalLogin.classList.remove("oculto"); // Aparece la bóveda
        }
    });

    // Cerrar la ventana de Login
    btnCerrarModal.addEventListener("click", () => {
        modalLogin.classList.add("oculto");
        mensajeError.classList.add("oculto");
        emailAdmin.value = "";
        passAdmin.value = "";
    });

    // Proceso para Iniciar Sesión (Con Firebase Auth)
    btnEntrar.addEventListener("click", () => {
        const email = emailAdmin.value;
        const pass = passAdmin.value;
        
        signInWithEmailAndPassword(auth, email, pass)
            .then((userCredential) => {
                // Si entra exitosamente
                modalLogin.classList.add("oculto");
                emailAdmin.value = "";
                passAdmin.value = "";
            })
            .catch((error) => {
                // Si la clave o el correo están mal
                mensajeError.classList.remove("oculto");
            });
    });

    // Proceso para Cerrar Sesión
    btnSalir.addEventListener("click", () => {
        signOut(auth);
    });

    // ESCUCHADOR DE ESTADO EN TIEMPO REAL
    // Firebase nos avisa automáticamente si hay alguien logueado o no
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Modo Administrador Activo
            vistaCliente.classList.add("oculto");
            vistaAdmin.classList.remove("oculto");
        } else {
            // Modo Cliente (Público)
            vistaAdmin.classList.add("oculto");
            vistaCliente.classList.remove("oculto");
        }
    });
});
