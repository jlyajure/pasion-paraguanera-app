import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// === 1. TUS LLAVES DE FIREBASE (Las que ya tenías) ===
const firebaseConfig = {
  apiKey: "AIzaSyAk9ReIO8iVHADCVEa75mREhj1T8vt6Kvc",
  authDomain: "pasion-paraguanera.firebaseapp.com",
  projectId: "pasion-paraguanera",
  storageBucket: "pasion-paraguanera.firebasestorage.app",
  messagingSenderId: "704685201960",
  appId: "1:704685201960:web:2caff60f1b9efdc2a0731d"
};

// === 2. TU NUEVA LLAVE DE IMGBB ===
// Pega aquí el código que te dio la página de ImgBB
const IMGBB_API_KEY = "PEGA_AQUI_TU_LLAVE_DE_IMGBB";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
    const vistaCliente = document.getElementById("vista-cliente");
    const vistaAdmin = document.getElementById("vista-admin");
    const moduloInventario = document.getElementById("modulo-inventario");
    const modalLogin = document.getElementById("modal-login");
    
    const tituloSecreto = document.getElementById("titulo-secreto");
    const btnCerrarModal = document.getElementById("btn-cerrar-modal");
    const btnEntrar = document.getElementById("btn-entrar");
    const btnSalir = document.getElementById("btn-salir");
    const emailAdmin = document.getElementById("email-admin");
    const passAdmin = document.getElementById("pass-admin");
    const chkMostrarPass = document.getElementById("chk-mostrar-pass");
    const mensajeError = document.getElementById("mensaje-error");

    const btnInventario = document.getElementById("btn-inventario");
    const btnVolverAdmin = document.getElementById("btn-volver-admin");
    const formProducto = document.getElementById("form-producto");
    const listaProductosDiv = document.getElementById("lista-productos");
    const btnGuardarProd = document.getElementById("btn-guardar-prod");
    const inputFoto = document.getElementById("prod-foto");

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
            moduloInventario.classList.add("oculto"); 
            vistaCliente.classList.remove("oculto");
        }
    });

    // --- LÓGICA DEL INVENTARIO ---
    btnInventario.addEventListener("click", () => {
        vistaAdmin.classList.add("oculto");
        moduloInventario.classList.remove("oculto");
    });

    btnVolverAdmin.addEventListener("click", () => {
        moduloInventario.classList.add("oculto");
        vistaAdmin.classList.remove("oculto");
    });

    // Guardar Producto usando ImgBB
    formProducto.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        btnGuardarProd.disabled = true;
        btnGuardarProd.textContent = "Subiendo imagen...";

        try {
            let urlFoto = "";
            const archivo = inputFoto.files[0];

            // 1. Subir la imagen a ImgBB
            if (archivo) {
                const formData = new FormData();
                formData.append("image", archivo);

                const respuesta = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: "POST",
                    body: formData
                });
                
                const datosImg = await respuesta.json();
                
                if(datosImg.success) {
                    urlFoto = datosImg.data.url; // Obtenemos el link directo de la foto
                } else {
                    throw new Error("Error de ImgBB");
                }
            }

            btnGuardarProd.textContent = "Guardando datos...";

            // 2. Guardar en Firebase
            await addDoc(collection(db, "productos"), {
                nombre: document.getElementById("prod-nombre").value,
                descripcion: document.getElementById("prod-desc").value,
                precio: parseFloat(document.getElementById("prod-precio").value),
                stock: parseInt(document.getElementById("prod-stock").value),
                foto: urlFoto,
                fechaCreacion: serverTimestamp()
            });

            formProducto.reset(); 
            document.getElementById("prod-stock").value = "0"; 
            alert("¡Producto guardado con éxito!");
            
        } catch (error) {
            console.error("Error al guardar: ", error);
            alert("Ocurrió un error. Revisa tu conexión o tu llave de ImgBB.");
        } finally {
            btnGuardarProd.disabled = false;
            btnGuardarProd.textContent = "Guardar Producto";
        }
    });

    // Leer Productos en Tiempo Real
    onSnapshot(collection(db, "productos"), (snapshot) => {
        listaProductosDiv.innerHTML = ""; 
        
        if (snapshot.empty) {
            listaProductosDiv.innerHTML = "<p>No hay productos registrados aún.</p>";
            return;
        }

        snapshot.forEach((doc) => {
            const prod = doc.data();
            const div = document.createElement("div");
            div.classList.add("item-producto");
            
            const imagenHTML = prod.foto 
                ? `<img src="${prod.foto}" class="foto-producto-lista" alt="${prod.nombre}">`
                : `<div class="foto-producto-lista" style="background-color: #333; display: flex; justify-content: center; align-items: center; font-size: 24px;">📦</div>`;

            div.innerHTML = `
                ${imagenHTML}
                <div class="info-producto-lista">
                    <h4>${prod.nombre}</h4>
                    <p>${prod.descripcion}</p>
                    <p class="item-precio-stock">Precio: $${prod.precio.toFixed(2)} | Stock: ${prod.stock}</p>
                </div>
            `;
            listaProductosDiv.appendChild(div);
        });
    });
});
