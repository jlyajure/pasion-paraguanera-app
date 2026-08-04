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

// === ¡TU LLAVE DE IMGBB GUARDADA! ===
const IMGBB_API_KEY = "07dd4f0a1180673510c5047ae8b5eec8";

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
    
    // NUEVO: Referencia a la vitrina del cliente
    const catalogoPublico = document.getElementById("catalogo-publico");

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

    btnInventario.addEventListener("click", () => {
        vistaAdmin.classList.add("oculto");
        moduloInventario.classList.remove("oculto");
    });

    btnVolverAdmin.addEventListener("click", () => {
        moduloInventario.classList.add("oculto");
        vistaAdmin.classList.remove("oculto");
    });

    formProducto.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        btnGuardarProd.disabled = true;
        btnGuardarProd.textContent = "Subiendo imagen...";

        try {
            let urlFoto = "";
            const archivo = inputFoto.files[0];

            if (archivo) {
                const formData = new FormData();
                formData.append("image", archivo);

                const respuesta = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: "POST",
                    body: formData
                });
                
                const datosImg = await respuesta.json();
                
                if(datosImg.success) {
                    urlFoto = datosImg.data.url; 
                } else {
                    throw new Error("Error de ImgBB");
                }
            }

            btnGuardarProd.textContent = "Guardando datos...";

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
            btnGuardarProd.disabled = false;
            btnGuardarProd.textContent = "Guardar Producto";
            
        } catch (error) {
            console.error("Error al guardar: ", error);
            btnGuardarProd.disabled = false;
            btnGuardarProd.textContent = "Error. Intenta de nuevo";
            setTimeout(() => {
                btnGuardarProd.textContent = "Guardar Producto";
            }, 3000);
        }
    });

    // LEER PRODUCTOS Y LLENAR AMBAS VISTAS
    onSnapshot(collection(db, "productos"), (snapshot) => {
        listaProductosDiv.innerHTML = ""; 
        catalogoPublico.innerHTML = ""; 
        
        if (snapshot.empty) {
            listaProductosDiv.innerHTML = "<p>No hay productos registrados aún.</p>";
            catalogoPublico.innerHTML = "<p>El catálogo está vacío por ahora.</p>";
            return;
        }

        snapshot.forEach((doc) => {
            const prod = doc.data();
            
            // 1. Crear tarjeta para la lista del ADMINISTRADOR
            const divAdmin = document.createElement("div");
            divAdmin.classList.add("item-producto");
            const imagenHTMLAdmin = prod.foto 
                ? `<img src="${prod.foto}" class="foto-producto-lista" alt="${prod.nombre}">`
                : `<div class="foto-producto-lista" style="background-color: #333; display: flex; justify-content: center; align-items: center; font-size: 24px;">📦</div>`;

            divAdmin.innerHTML = `
                ${imagenHTMLAdmin}
                <div class="info-producto-lista">
                    <h4>${prod.nombre}</h4>
                    <p>${prod.descripcion}</p>
                    <p class="item-precio-stock">Precio: $${prod.precio.toFixed(2)} | Stock: ${prod.stock}</p>
                </div>
            `;
            listaProductosDiv.appendChild(divAdmin);

            // 2. Crear tarjeta bonita para el CLIENTE PÚBLICO
            const divCliente = document.createElement("div");
            divCliente.classList.add("tarjeta-producto");
            const imagenHTMLCliente = prod.foto 
                ? `<img src="${prod.foto}" alt="${prod.nombre}">`
                : `<div style="height: 120px; background-color: #333; border-radius: 6px; display: flex; justify-content: center; align-items: center; font-size: 30px; margin-bottom: 10px;">📦</div>`;

            divCliente.innerHTML = `
                ${imagenHTMLCliente}
                <h4>${prod.nombre}</h4>
                <p class="desc">${prod.descripcion}</p>
                <p class="precio">$${prod.precio.toFixed(2)}</p>
            `;
            catalogoPublico.appendChild(divCliente);
        });
    });
});
