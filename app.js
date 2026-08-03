import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Aquí ya integré tus códigos reales exactamente como me los pasaste
const firebaseConfig = {
  apiKey: "AIzaSyAk9ReIO8iVHADCVEa75mREhj1T8vt6Kvc",
  authDomain: "pasion-paraguanera.firebaseapp.com",
  projectId: "pasion-paraguanera",
  storageBucket: "pasion-paraguanera.firebasestorage.app",
  messagingSenderId: "704685201960",
  appId: "1:704685201960:web:2caff60f1b9efdc2a0731d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
    const vistaCliente = document.getElementById("vista-cliente");
    const vistaAdmin = document.getElementById("vista-admin");
    const modalLogin = document.getElementById("modal-login");
    
    const tituloSecreto = document.getElementById("titulo-secreto");
    const btnCerrarModal = document.getElementById("btn-cerrar-modal");
    const btnEntrar = document.getElementById("btn-entrar");
    const btnSalir = document.getElementById("btn-salir");
    const emailAdmin = document.getElementById("email-admin");
    const passAdmin = document.getElementById("pass-admin");
    const chkMostrarPass = document.getElementById("chk-mostrar-pass");
    const mensajeError = document.getElementById("mensaje-error");

    // Lógica para mostrar/ocultar contraseña
    chkMostrarPass.addEventListener("change", () => {
        if (chkMostrarPass.checked) {
            passAdmin.type = "text";
        } else {
            passAdmin.type = "password";
        }
    });

    // Lógica de los 3 clics rápidos
    let contadorClics = 0;
    let tiempoClic;

    tituloSecreto.addEventListener("click", () => {
        contadorClics++;
        if (contadorClics === 1) {
            tiempoClic = setTimeout(() => { contadorClics = 0; }, 1000); 
        }
        if (contadorClics === 3) {
            clearTimeout(tiempoClic);
            contadorClics = 0;
            modalLogin.classList.remove("oculto"); 
        }
    });

    // Cerrar modal y limpiar campos
    btnCerrarModal.addEventListener("click", () => {
        modalLogin.classList.add("oculto");
        mensajeError.classList.add("oculto");
        emailAdmin.value = "";
        passAdmin.value = "";
        chkMostrarPass.checked = false;
        passAdmin.type = "password";
    });

    // Iniciar Sesión
    btnEntrar.addEventListener("click", () => {
        const email = emailAdmin.value;
        const pass = passAdmin.value;
        
        signInWithEmailAndPassword(auth, email, pass)
            .then((userCredential) => {
                modalLogin.classList.add("oculto");
                emailAdmin.value = "";
                passAdmin.value = "";
                chkMostrarPass.checked = false;
                passAdmin.type = "password";
            })
            .catch((error) => {
                mensajeError.classList.remove("oculto");
            });
    });

    // Cerrar Sesión
    btnSalir.addEventListener("click", () => {
        signOut(auth);
    });

    // Escuchador de estado
    onAuthStateChanged(auth, (user) => {
        if (user) {
            vistaCliente.classList.add("oculto");
            vistaAdmin.classList.remove("oculto");
        } else {
            vistaAdmin.classList.add("oculto");
            vistaCliente.classList.remove("oculto");
        }
    });
});
