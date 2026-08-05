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

let carrito = []; 

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

    const btnCarritoFlotante = document.getElementById("btn-carrito-flotante");
    const modalCarrito = document.getElementById("modal-carrito");
    const btnCerrarCarrito = document.getElementById("btn-cerrar-carrito");
    const btnVaciarCarrito = document.getElementById("btn-vaciar-carrito");
    const listaCarritoDiv = document.getElementById("lista-carrito");
    const contadorCarrito = document.getElementById("contador-carrito");
    const totalPrecioSpan = document.getElementById("total-precio");
    const btnEnviarWhatsapp = document.getElementById("btn-enviar-whatsapp");

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
            btnCarritoFlotante.classList.add("oculto"); 
        } else {
            vistaAdmin.classList.add("oculto");
            moduloInventario.classList.add("oculto"); 
            vistaCliente.classList.remove("oculto");
            actualizarInterfazCarrito(); 
        }
    });

    btnInventario.addEventListener("click", () => {
        vistaAdmin.classList.add("oculto");
        moduloInventario.classList.remove("oculto");
    });

    btnVolverAdmin.addEventListener("click", () => {
        moduloInventario.classList.add("oculto");
        vistaAdmin.classList.remove("oculto");
        
        if(productoEnEdicionId) {
            formProducto.reset();
            document.getElementById("prod-stock").value = "0";
            productoEnEdicionId = null;
            btnGuardarProd.textContent = "Guardar Producto";
            btnGuardarProd.style.backgroundColor = "#e63946";
            btnGuardarProd.style.color = "#fff";
        }
    });

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

    catalogoPublico.addEventListener("click", (e) => {
        if (e.target.closest(".btn-agregar-carrito")) {
            const btn = e.target.closest(".btn-agregar-carrito");
            const id = btn.getAttribute("data-id");
            const prod = productosActuales.find(p => p.id === id);
            
            if (prod) {
                const index = carrito.findIndex(item => item.id === id);
                if (index > -1) {
                    carrito[index].cantidad++; 
                } else {
                    carrito.push({ ...prod, cantidad: 1 }); 
                }
                
                const textoOriginal = btn.innerHTML;
                btn.innerHTML = "¡Agregado! ✔️";
                btn.style.backgroundColor = "#4caf50";
                setTimeout(() => {
                    btn.innerHTML = textoOriginal;
                    btn.style.backgroundColor = "#25D366";
                }, 1000);

                actualizarInterfazCarrito();
            }
        }
    });

    btnCarritoFlotante.addEventListener("click", () => {
        renderizarListaCarrito();
        modalCarrito.classList.remove("oculto");
    });

    btnCerrarCarrito.addEventListener("click", () => {
        modalCarrito.classList.add("oculto");
    });

    btnVaciarCarrito.addEventListener("click", () => {
        if (confirm("¿Estás seguro de que deseas cancelar tu pedido y vaciar el carrito?")) {
            carrito = [];
            actualizarInterfazCarrito();
            modalCarrito.classList.add("oculto");
        }
    });

    listaCarritoDiv.addEventListener("click", (e) => {
        if (e.target.closest(".btn-cantidad")) {
            const btn = e.target.closest(".btn-cantidad");
            const id = btn.getAttribute("data-id");
            const accion = btn.getAttribute("data-accion");
            const index = carrito.findIndex(item => item.id === id);
            
            if (index > -1) {
                if (accion === "sumar") {
                    carrito[index].cantidad++;
                } else if (accion === "restar") {
                    carrito[index].cantidad--;
                    if (carrito[index].cantidad === 0) {
                        carrito.splice(index, 1); 
                    }
                }
                actualizarInterfazCarrito();
                renderizarListaCarrito();
                
                if (carrito.length === 0) {
                    modalCarrito.classList.add("oculto");
                }
            }
        }
    });

    btnEnviarWhatsapp.addEventListener("click", () => {
        if (carrito.length === 0) return;

        let mensaje = "¡Hola Pasión Paraguanera! Quisiera hacer el siguiente pedido:%0A%0A";
        let total = 0;

        carrito.forEach(item => {
            const precioNum = typeof item.precio === 'number' ? item.precio : parseFloat(item.precio || 0);
            const subtotal = item.cantidad * precioNum;
            total += subtotal;
            mensaje += `🔹 ${item.cantidad}x *${item.nombre}* ($${precioNum.toFixed(2)} c/u) = $${subtotal.toFixed(2)}%0A`;
        });

        mensaje += `%0A*TOTAL A PAGAR: $${total.toFixed(2)}*%0A%0A¿Tienen disponibilidad?`;
        
        const enlace = `https://wa.me/${NUMERO_WHATSAPP}?text=${mensaje}`;
        window.open(enlace, "_blank"); 
    });

    function actualizarInterfazCarrito() {
        const totalArticulos = carrito.reduce((sum, item) => sum + item.cantidad, 0);
        contadorCarrito.textContent = totalArticulos;

        if (totalArticulos > 0) {
            btnCarritoFlotante.classList.remove("oculto");
        } else {
            btnCarritoFlotante.classList.add("oculto");
        }
    }

    function renderizarListaCarrito() {
        listaCarritoDiv.innerHTML = "";
        let total = 0;

        carrito.forEach(item => {
            const precioNum = typeof item.precio === 'number' ? item.precio : parseFloat(item.precio || 0);
            const subtotal = item.cantidad * precioNum;
            total += subtotal;

            const div = document.createElement("div");
            div.classList.add("item-carrito");
            div.innerHTML = `
                <div class="info-item-carrito">
                    <h4>${item.nombre}</h4>
                    <p>$${precioNum.toFixed(2)} c/u</p>
                </div>
                <div class="controles-cantidad">
                    <button class="btn-cantidad" data-id="${item.id}" data-accion="restar">-</button>
                    <span style="color: white; font-weight: bold; width: 20px; text-align: center;">${item.cantidad}</span>
                    <button class="btn-cantidad" data-id="${item.id}" data-accion="sumar">+</button>
                </div>
            `;
            listaCarritoDiv.appendChild(div);
        });

        totalPrecioSpan.textContent = total.toFixed(2);
    }

    // ==========================================
    // RENDERIZADO DE LOS PRODUCTOS
    // ==========================================

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
                    ? `<img src="${prod.foto}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 6px; margin-bottom: 10px;" alt="${nombre}">`
                    : `<div style="width: 100%; height: 110px; background-color: #333; display: flex; justify-content: center; align-items: center; font-size: 24px; border-radius: 6px; margin-bottom: 10px;">📦</div>`;

                divAdmin.innerHTML = `
                    <div style="display: flex; flex-direction: column; height: 100%; width: 100%; justify-content: space-between;">
                        <div>
                            ${imagenHTMLAdmin}
                            <div style="text-align: center;">
                                <h4 title="${nombre}" style="margin: 0 0 5px 0; color: #f1faee; font-size: 13px; line-height: 1.2;">${nombre}</h4>
                                <p title="${desc}" style="margin: 0 0 10px 0; font-size: 11.5px; color: #bbb; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${desc}</p>
                            </div>
                        </div>
                        
                        <div style="width: 100%;">
                            <div style="display: flex; justify-content: center; align-items: center; gap: 10px; background-color: #1a1a1a; padding: 6px; border-radius: 6px; border: 1px solid #333; margin-bottom: 10px; white-space: nowrap;">
                                <span style="color: #00E676; font-weight: 900; font-size: 16px;">$${precioFormateado}</span>
                                <span style="color: #666;">|</span>
                                <span style="color: #fff; font-size: 13px; font-weight: bold;">📦 ${stock}</span>
                            </div>
                            
                            <div style="display: flex; gap: 8px; justify-content: space-between; width: 100%;">
                                <button class="btn-editar" data-id="${prod.id}" style="background: #ffc107; color: #000; width: 48%; padding: 8px; font-size: 13px; margin: 0; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">✏️ Editar</button>
                                <button class="btn-eliminar" data-id="${prod.id}" style="background: #f44336; color: #fff; width: 48%; padding: 8px; font-size: 13px; margin: 0; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">🗑️ Eliminar</button>
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
                        ? `<img src="${prod.foto}" alt="${nombre}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 6px 6px 0 0; margin-bottom: 10px;">`
                        : `<div style="width: 100%; height: 110px; background-color: #333; border-radius: 6px 6px 0 0; display: flex; justify-content: center; align-items: center; font-size: 40px; margin-bottom: 10px;">📦</div>`;

                    const iconoWhatsApp = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 6px; vertical-align: text-bottom;"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>`;

                    // INYECCIÓN DIRECTA PARA LA VITRINA DEL CLIENTE
                    divCliente.innerHTML = `
                        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                            <div>
                                ${imagenHTMLCliente}
                                <div style="padding: 0 10px;">
                                    <h4 style="margin: 0 0 5px 0; font-size: 13px; color: #f1faee; line-height: 1.2;">${nombre}</h4>
                                    <p class="desc" style="margin: 0 0 10px 0; font-size: 11.5px; color: #ccc; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${desc}</p>
                                </div>
                            </div>
                            <div style="padding: 10px; border-top: 1px solid #333; text-align: center;">
                                <p class="precio" style="margin: 0 0 10px 0; font-weight: 900; font-size: 18px; color: #00E676;">$${precioFormateado}</p>
                                <button class="btn-whatsapp btn-agregar-carrito" data-id="${prod.id}" style="width: 100%; background-color: #25D366; color: white; border: none; padding: 10px; border-radius: 5px; font-weight: bold; font-size: 14px; cursor: pointer; display: flex; justify-content: center; align-items: center; margin: 0;">
                                    ${iconoWhatsApp} Agregar al Carrito
                                </button>
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
