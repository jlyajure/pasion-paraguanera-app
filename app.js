import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
    // Referencias a las vistas
    const vistaCliente = document.getElementById("vista-cliente");
    const vistaAdmin = document.getElementById("vista-admin");
    const moduloInventario = document.getElementById("modulo-inventario");
    const modalLogin = document.getElementById("modal-login");
    
    // Referencias Login
    const tituloSecreto = document.getElementById("titulo-secreto");
    const btnCerrarModal = document.getElementById("btn-cerrar-modal");
    const btnEntrar = document.getElementById("btn-entrar");
    const btnSalir = document.getElementById("btn-salir");
    const emailAdmin = document.getElementById("email-admin");
    const passAdmin = document.getElementById("pass-admin");
    const chkMostrarPass = document.getElementById("chk-mostrar-pass");
    const mensajeError = document.getElementById("mensaje-error");

    // Referencias Inventario
    const btnInventario = document.getElementById("btn-inventario");
    const btnVolverAdmin = document.getElementById("btn-volver-admin");
    const formProducto = document.getElementById("form-producto");
    const listaProductosDiv = document.getElementById("lista-productos");
    const btnGuardarProd = document.getElementById("btn-guardar-prod");

    // --- LÓGICA DE LOGIN ---
    chkMostrarPass.addEventListener("change", () => {
        passAdmin.type = chkMostrarPass.checked ? "text" : "password";
    });

    let contadorClics = 0;
    let tiempoClic;
    tituloSecreto.addEventListener("click", () => {
        contadorClics++;
        if (contadorClics === 1) { tiempoClic = setTimeout(() => { contadorClics = 0; }, 1000); }
        if (contadorClics === 3) {
            clearTimeout(tiempoClic);
            contadorClics = 0;
            modalLogin.classList.remove("oculto"); 
        }
    });

    btnCerrarModal.addEventListener("click", () => {
        modalLogin.classList.add("oculto");
        mensajeError.classList.add("oculto");
        emailAdmin.value = "";
        passAdmin.value = "";
        chkMostrarPass.checked = false;
        passAdmin.type = "password";
    });

    btnEntrar.addEventListener("click", () => {
        signInWithEmailAndPassword(auth, emailAdmin.value, passAdmin.value)
            .then(() => {
                modalLogin.classList.add("oculto");
                emailAdmin.value = "";
                passAdmin.value = "";
                chkMostrarPass.checked = false;
                passAdmin.type = "password";
            })
            .catch(() => mensajeError.classList.remove("oculto"));
    });

    btnSalir.addEventListener("click", () => signOut(auth));

    onAuthStateChanged(auth, (user) => {
        if (user) {
            vistaCliente.classList.add("oculto");
            vistaAdmin.classList.remove("oculto");
        } else {
            vistaAdmin.classList.add("oculto");
            moduloInventario.classList.add("oculto"); // Asegurar que el inventario se cierre al salir
            vistaCliente.classList.remove("oculto");
        }
    });

    // --- LÓGICA DEL INVENTARIO ---

    // Navegar al módulo
    btnInventario.addEventListener("click", () => {
        vistaAdmin.classList.add("oculto");
        moduloInventario.classList.remove("oculto");
    });

    // Volver al panel central
    btnVolverAdmin.addEventListener("click", () => {
        moduloInventario.classList.add("oculto");
        vistaAdmin.classList.remove("oculto");
    });

    // Guardar Producto en Firestore
    formProducto.addEventListener("submit", async (e) => {
        e.preventDefault(); // Evitar que la página recargue
        btnGuardarProd.disabled = true;
        btnGuardarProd.textContent = "Guardando...";

        try {
            await addDoc(collection(db, "productos"), {
                nombre: document.getElementById("prod-nombre").value,
                descripcion: document.getElementById("prod-desc").value,
                precio: parseFloat(document.getElementById("prod-precio").value),
                stock: parseInt(document.getElementById("prod-stock").value),
                fechaCreacion: serverTimestamp()
            });

            formProducto.reset(); // Limpiar el formulario
            document.getElementById("prod-stock").value = "0"; // Dejar stock en 0 por defecto
            alert("¡Producto guardado con éxito!");
        } catch (error) {
            console.error("Error al guardar: ", error);
            alert("Error al guardar el producto. Verifica tu conexión a Firestore.");
        } finally {
            btnGuardarProd.disabled = false;
            btnGuardarProd.textContent = "Guardar Producto";
        }
    });

    // Leer Productos en Tiempo Real
    onSnapshot(collection(db, "productos"), (snapshot) => {
        listaProductosDiv.innerHTML = ""; // Limpiar lista
        
        if (snapshot.empty) {
            listaProductosDiv.innerHTML = "<p>No hay productos registrados aún.</p>";
            return;
        }

        snapshot.forEach((doc) => {
            const prod = doc.data();
            const div = document.createElement("div");
            div.classList.add("item-producto");
            div.innerHTML = `
                <h4>${prod.nombre}</h4>
                <p>${prod.descripcion}</p>
                <p class="item-precio-stock">Precio: $${prod.precio.toFixed(2)} | Stock: ${prod.stock}</p>
            `;
            listaProductosDiv.appendChild(div);
        });
    });
});
