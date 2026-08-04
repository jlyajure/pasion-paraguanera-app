import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAk9ReIO8iVHADCVEa75mREhj1T8vt6Kvc",
  authDomain: "pasion-paraguanera.firebaseapp.com",
  databaseURL: "https://pasion-paraguanera-default-rtdb.firebaseio.com",
  projectId: "pasion-paraguanera",
  storageBucket: "pasion-paraguanera.firebasestorage.app",
  messagingSenderId: "704685201960",
  appId: "1:704685201960:web:2caff60f1b9efdc2a0731d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const NUMERO_WHATSAPP = "584246669816";
let productoEnEdicionId = null;
let productosActuales = []; 

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
        
        // Resetear formulario si sale a mitad de una edición
        if(productoEnEdicionId) {
            formProducto.reset();
            document.getElementById("prod-stock").value = "0";
            productoEnEdicionId = null;
            btnGuardarProd.textContent = "Guardar Producto";
            btnGuardarProd.style.backgroundColor = "#e63946";
            btnGuardarProd.style.color = "#fff";
        }
    });

    // Acción para los botones de Editar y Eliminar
    listaProductosDiv.addEventListener("click", async (e) => {
        if (e.target.closest(".btn-eliminar")) {
            const btn = e.target.closest(".btn-eliminar");
            const id = btn.getAttribute("data-id");
            if (confirm("¿Estás seguro de que deseas eliminar este producto definitivamente?")) {
                await deleteDoc(doc(db, "productos", id));
            }
        }
        
        if (e.target.closest(".btn-editar")) {
            const btn = e.target.closest(".btn-editar");
            const id = btn.getAttribute("data-id");
            const prod = productosActuales.find(p => p.id === id);
            if (prod) {
                document.getElementById("prod-nombre").value = prod.nombre;
                document.getElementById("prod-desc").value = prod.descripcion;
                document.getElementById("prod-precio").value = prod.precio;
                document.getElementById("prod-stock").value = prod.stock;
                document.getElementById("prod-foto").value = prod.foto || "";
                
                productoEnEdicionId = id;
                btnGuardarProd.textContent = "Actualizar Producto";
                btnGuardarProd.style.backgroundColor = "#ffc107"; 
                btnGuardarProd.style.color = "#000";
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    });

    formProducto.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        btnGuardarProd.disabled = true;
        const textoOriginal = btnGuardarProd.textContent;
        btnGuardarProd.textContent = "Procesando...";

        try {
            const urlFoto = document.getElementById("prod-foto").value;
            const datosProducto = {
                nombre: document.getElementById("prod-nombre").value,
                descripcion: document.getElementById("prod-desc").value,
                precio: parseFloat(document.getElementById("prod-precio").value),
                stock: parseInt(document.getElementById("prod-stock").value),
                foto: urlFoto,
            };

            if (productoEnEdicionId) {
                await updateDoc(doc(db, "productos", productoEnEdicionId), datosProducto);
                productoEnEdicionId = null;
                btnGuardarProd.textContent = "¡Actualizado!";
            } else {
                datosProducto.fechaCreacion = serverTimestamp();
                await addDoc(collection(db, "productos"), datosProducto);
                btnGuardarProd.textContent = "¡Guardado!";
            }

            formProducto.reset(); 
            document.getElementById("prod-stock").value = "0"; 
            
            btnGuardarProd.disabled = false;
            btnGuardarProd.style.backgroundColor = "#4caf50"; 
            btnGuardarProd.style.color = "#fff";
            
            setTimeout(() => {
                btnGuardarProd.style.backgroundColor = "#e63946"; 
                btnGuardarProd.textContent = "Guardar Producto";
            }, 2500);
            
        } catch (error) {
            console.error("Error al guardar: ", error);
            btnGuardarProd.disabled = false;
            btnGuardarProd.textContent = "Error. Intenta de nuevo";
            setTimeout(() => {
                btnGuardarProd.textContent = textoOriginal;
            }, 3000);
        }
    });

    onSnapshot(collection(db, "productos"), (snapshot) => {
        listaProductosDiv.innerHTML = ""; 
        if (catalogoPublico) catalogoPublico.innerHTML = ""; 
        productosActuales = [];
        
        if (snapshot.empty) {
            listaProductosDiv.innerHTML = "<p>No hay productos registrados aún.</p>";
            if (catalogoPublico) catalogoPublico.innerHTML = "<p style='text-align:center; width:100%; color:#aaa;'>El catálogo está vacío por ahora.</p>";
            return;
        }

        snapshot.forEach((doc) => {
            productosActuales.push({ id: doc.id, ...doc.data() });
        });

        // Ordenar alfabéticamente (de la A a la Z)
        productosActuales.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

        productosActuales.forEach((prod) => {
            try {
                const nombre = prod.nombre || "Sin nombre";
                const desc = prod.descripcion || "";
                const stock = prod.stock || 0;
                
                const precioNum = typeof prod.precio === 'number' ? prod.precio : parseFloat(prod.precio || 0);
                const precioFormateado = isNaN(precioNum) ? "0.00" : precioNum.toFixed(2);
                
                // --- VISTA ADMINISTRADOR (INVENTARIO) ---
                const divAdmin = document.createElement("div");
                divAdmin.classList.add("item-producto");
                const imagenHTMLAdmin = prod.foto 
                    ? `<img src="${prod.foto}" class="foto-producto-lista" alt="${nombre}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;">`
                    : `<div class="foto-producto-lista" style="width: 80px; height: 80px; background-color: #333; display: flex; justify-content: center; align-items: center; font-size: 24px; border-radius: 4px;">📦</div>`;

                divAdmin.innerHTML = `
                    <div style="display: flex; gap: 15px; width: 100%;">
                        ${imagenHTMLAdmin}
                        <div class="info-producto-lista" style="flex: 1;">
                            <h4 style="margin: 0 0 5px 0;">${nombre}</h4>
                            <p style="margin: 0 0 5px 0; font-size: 0.85em; color: #ccc;">${desc}</p>
                            <p class="item-precio-stock" style="margin: 0 0 10px 0; font-weight: bold;">Precio: $${precioFormateado} | Stock: ${stock}</p>
                            
                            <div style="display: flex; gap: 10px;">
                                <button class="btn-editar" data-id="${prod.id}" style="background: #ffc107; color: #000; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em; font-weight: bold;">✏️ Editar</button>
                                <button class="btn-eliminar" data-id="${prod.id}" style="background: #f44336; color: #fff; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em; font-weight: bold;">🗑️ Eliminar</button>
                            </div>
                        </div>
                    </div>
                `;
                listaProductosDiv.appendChild(divAdmin);

                // --- VISTA CLIENTE (CATÁLOGO PÚBLICO) ---
                if (catalogoPublico) {
                    const divCliente = document.createElement("div");
                    divCliente.classList.add("tarjeta-producto");
                    const imagenHTMLCliente = prod.foto 
                        ? `<img src="${prod.foto}" alt="${nombre}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 6px 6px 0 0;">`
                        : `<div style="width: 100%; height: 160px; background-color: #333; border-radius: 6px 6px 0 0; display: flex; justify-content: center; align-items: center; font-size: 40px;">📦</div>`;

                    const mensaje = encodeURIComponent(`Hola Pasión Paraguanera, estoy interesado en comprar el producto: ${nombre} (Precio: $${precioFormateado}). ¿Tienen disponibilidad?`);
                    const enlaceWhatsApp = `https://wa.me/${NUMERO_WHATSAPP}?text=${mensaje}`;

                    // Botón de WhatsApp Premium con SVG integrado
                    const iconoWhatsApp = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 6px; vertical-align: text-bottom;"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>`;

                    divCliente.innerHTML = `
                        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                            <div>
                                ${imagenHTMLCliente}
                                <div style="padding: 10px;">
                                    <h4 style="margin: 0 0 5px 0;">${nombre}</h4>
                                    <p class="desc" style="margin: 0; font-size: 0.85em; color: #ccc;">${desc}</p>
                                </div>
                            </div>
                            <div style="padding: 10px; border-top: 1px solid #333; text-align: center;">
                                <p class="precio" style="margin: 0 0 10px 0; font-weight: bold; font-size: 1.1em; color: #4caf50;">$${precioFormateado}</p>
                                <a href="${enlaceWhatsApp}" target="_blank" style="text-decoration: none; width: 100%; display: block;">
                                    <button class="btn-whatsapp" style="width: 100%; background-color: #25D366; color: white; border: none; padding: 10px; border-radius: 5px; font-weight: bold; font-size: 1em; cursor: pointer; display: flex; justify-content: center; align-items: center;">
                                        ${iconoWhatsApp} Comprar
                                    </button>
                                </a>
                            </div>
                        </div>
                    `;
                    catalogoPublico.appendChild(divCliente);
                }
            } catch (errorInterno) {
                console.error("Error al renderizar un producto específico:", errorInterno);
            }
        });
    }, (error) => {
        console.error("Error de Firebase:", error);
        listaProductosDiv.innerHTML = "<p style='color:#ff6b6b;'>⚠️ Error de conexión a la base de datos.</p>";
    });
});
