import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, deleteDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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
let clienteEnEdicionId = null;
let productosActuales = []; 
let clientesActuales = [];
let pedidosActuales = [];
let carrito = []; 

let tasaBCV = 1;

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

    const btnCarritoFlotante = document.getElementById("btn-carrito-flotante");
    const modalCarrito = document.getElementById("modal-carrito");
    const btnCerrarCarrito = document.getElementById("btn-cerrar-carrito");
    const btnVaciarCarrito = document.getElementById("btn-vaciar-carrito");
    const listaCarritoDiv = document.getElementById("lista-carrito");
    const contadorCarrito = document.getElementById("contador-carrito");
    const totalPrecioSpan = document.getElementById("total-precio");
    const totalPrecioBsSpan = document.getElementById("total-precio-bs");
    const btnEnviarWhatsapp = document.getElementById("btn-enviar-whatsapp");
    const catalogoPublico = document.getElementById("catalogo-publico");

    const moduloInventario = document.getElementById("modulo-inventario");
    const btnInventario = document.getElementById("btn-inventario");
    const btnVolverAdminInv = document.getElementById("btn-volver-admin-inv");
    const formProducto = document.getElementById("form-producto");
    const listaProductosDiv = document.getElementById("lista-productos");
    const btnGuardarProd = document.getElementById("btn-guardar-prod");

    const moduloClientes = document.getElementById("modulo-clientes");
    const btnClientes = document.getElementById("btn-clientes");
    const btnVolverAdminCli = document.getElementById("btn-volver-admin-cli");
    const formCliente = document.getElementById("form-cliente");
    const listaClientesDiv = document.getElementById("lista-clientes");
    const btnGuardarCli = document.getElementById("btn-guardar-cli");

    const moduloPedidos = document.getElementById("modulo-pedidos");
    const btnPedidos = document.getElementById("btn-pedidos");
    const btnVolverAdminPed = document.getElementById("btn-volver-admin-ped");
    const listaPedidosDiv = document.getElementById("lista-pedidos");

    // ==========================================
    // ESCUCHADOR DE LA TASA BCV
    // ==========================================
    onSnapshot(doc(db, "configuracion", "bcv"), (docSnap) => {
        if (docSnap.exists()) {
            tasaBCV = parseFloat(docSnap.data().valor) || 1;
            document.getElementById("tasa-actual-admin").textContent = tasaBCV.toFixed(2);
            document.getElementById("tasa-bcv-cliente").textContent = tasaBCV.toFixed(2);
            document.getElementById("banner-bcv").classList.remove("oculto");
        }
        renderizarTodo(); 
    });

    // SISTEMA ANTI-CUELGUES PARA FIJAR LA TASA
    document.getElementById("btn-guardar-tasa").addEventListener("click", async () => {
        const inputTasa = document.getElementById("input-tasa-bcv");
        let valorTasa = inputTasa.value;
        
        // Convierte coma a punto automáticamente por si el usuario se equivoca
        valorTasa = valorTasa.replace(',', '.');
        const nuevaTasa = parseFloat(valorTasa);
        
        if(nuevaTasa > 0) {
            const btn = document.getElementById("btn-guardar-tasa");
            btn.textContent = "Guardando...";
            
            try {
                // Promesa principal de Firebase
                const promesaGuardar = setDoc(doc(db, "configuracion", "bcv"), { valor: nuevaTasa }, { merge: true });
                // Mata-procesos: Si pasan 5 segundos y Firebase no responde, lanza un error forzado
                const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase no responde")), 5000));
                
                await Promise.race([promesaGuardar, timeout]);
                
                inputTasa.value = "";
                btn.textContent = "¡Actualizado!";
                setTimeout(() => btn.textContent = "Fijar Tasa", 2000);
            } catch (error) {
                console.error("Error al guardar la tasa:", error);
                alert("⚠️ Error: Firebase bloqueó el guardado o el internet está fallando. Asegúrate de haber creado la colección 'configuracion' en la base de datos.");
                btn.textContent = "Error";
                btn.style.backgroundColor = "#f44336"; // Se pone rojo para avisar del fallo
                setTimeout(() => {
                    btn.textContent = "Fijar Tasa";
                    btn.style.backgroundColor = "#25D366"; // Vuelve a su verde normal
                }, 3000);
            }
        } else {
            alert("Por favor, ingresa una tasa válida (ejemplo: 41.50)");
        }
    });

    // LOGIN SECRETO
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
            moduloClientes.classList.add("oculto"); 
            moduloPedidos.classList.add("oculto");
            vistaCliente.classList.remove("oculto");
            actualizarInterfazCarrito(); 
        }
    });

    // NAVEGACIÓN PANEL ADMINISTRADOR
    btnInventario.addEventListener("click", () => {
        vistaAdmin.classList.add("oculto");
        moduloInventario.classList.remove("oculto");
    });
    btnVolverAdminInv.addEventListener("click", () => {
        moduloInventario.classList.add("oculto");
        vistaAdmin.classList.remove("oculto");
        if(productoEnEdicionId) {
            formProducto.reset();
            document.getElementById("prod-stock").value = "0";
            productoEnEdicionId = null;
            btnGuardarProd.textContent = "Guardar Producto";
            btnGuardarProd.style.backgroundColor = "#e63946";
        }
    });

    btnClientes.addEventListener("click", () => {
        vistaAdmin.classList.add("oculto");
        moduloClientes.classList.remove("oculto");
    });
    btnVolverAdminCli.addEventListener("click", () => {
        moduloClientes.classList.add("oculto");
        vistaAdmin.classList.remove("oculto");
        if(clienteEnEdicionId) {
            formCliente.reset();
            document.getElementById("cli-deuda").value = "0";
            clienteEnEdicionId = null;
            btnGuardarCli.textContent = "Registrar Cliente";
            btnGuardarCli.style.backgroundColor = "#4caf50";
        }
    });

    btnPedidos.addEventListener("click", () => {
        vistaAdmin.classList.add("oculto");
        moduloPedidos.classList.remove("oculto");
    });
    btnVolverAdminPed.addEventListener("click", () => {
        moduloPedidos.classList.add("oculto");
        vistaAdmin.classList.remove("oculto");
    });


    // ==========================================
    // LÓGICA DE INVENTARIO
    // ==========================================
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
            
            setTimeout(() => {
                btnGuardarProd.style.backgroundColor = "#e63946"; 
                btnGuardarProd.textContent = "Guardar Producto";
            }, 2500);
            
        } catch (error) {
            console.error("Error al guardar: ", error);
            btnGuardarProd.disabled = false;
            btnGuardarProd.textContent = "Error";
            setTimeout(() => { btnGuardarProd.textContent = textoOriginal; }, 3000);
        }
    });

    listaProductosDiv.addEventListener("click", async (e) => {
        if (e.target.closest(".btn-eliminar")) {
            const id = e.target.closest(".btn-eliminar").getAttribute("data-id");
            if (confirm("¿Eliminar producto definitivamente?")) {
                await deleteDoc(doc(db, "productos", id));
            }
        }
        if (e.target.closest(".btn-editar")) {
            const id = e.target.closest(".btn-editar").getAttribute("data-id");
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
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    });

    onSnapshot(collection(db, "productos"), (snapshot) => {
        productosActuales = [];
        snapshot.forEach((doc) => { productosActuales.push({ id: doc.id, ...doc.data() }); });
        productosActuales.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
        renderizarTodo(); 
    });

    function renderizarTodo() {
        listaProductosDiv.innerHTML = ""; 
        if (catalogoPublico) catalogoPublico.innerHTML = ""; 
        
        if (productosActuales.length === 0) {
            listaProductosDiv.innerHTML = "<p>No hay productos registrados aún.</p>";
            if (catalogoPublico) catalogoPublico.innerHTML = "<p style='text-align:center; width:100%; color:#aaa;'>El catálogo está vacío por ahora.</p>";
            return;
        }

        const iconoWhatsApp = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 6px; vertical-align: text-bottom;"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>`;

        productosActuales.forEach((prod) => {
            const nombre = prod.nombre || "Sin nombre";
            const desc = prod.descripcion || "";
            const stock = parseInt(prod.stock) || 0;
            const precioNum = typeof prod.precio === 'number' ? prod.precio : parseFloat(prod.precio || 0);
            
            const precioUSD = precioNum.toFixed(2);
            const precioVES = (precioNum * tasaBCV).toFixed(2);
            
            // ADMIN VIEW
            const divAdmin = document.createElement("div");
            divAdmin.classList.add("item-producto");
            const imagenHTMLAdmin = prod.foto 
                ? `<img src="${prod.foto}" class="foto-producto-lista" alt="${nombre}">`
                : `<div class="foto-producto-lista" style="background-color: #333; display: flex; justify-content: center; align-items: center; font-size: 24px;">📦</div>`;

            divAdmin.innerHTML = `
                <div style="display: flex; flex-direction: column; height: 100%; width: 100%; justify-content: space-between;">
                    <div>
                        ${imagenHTMLAdmin}
                        <div style="text-align: center; padding: 0 5px;">
                            <h4 title="${nombre}" class="clamp-titulo" style="color: #f1faee;">${nombre}</h4>
                            <p title="${desc}" class="clamp-desc">${desc}</p>
                        </div>
                    </div>
                    <div style="width: 100%;">
                        <div class="item-precio-stock" style="display: flex; justify-content: center; align-items: center; gap: 10px; background-color: #1a1a1a; padding: 6px; border-radius: 6px; border: 1px solid #333; white-space: nowrap;">
                            <span>$${precioUSD}</span>
                            <span style="color: #666;">|</span>
                            <span style="color: #fff; font-size: 13px;">📦 ${stock}</span>
                        </div>
                        <div class="botones-accion">
                            <button class="btn-editar" data-id="${prod.id}" style="background: #ffc107; color: #000;">✏️ Editar</button>
                            <button class="btn-eliminar" data-id="${prod.id}" style="background: #f44336; color: #fff;">🗑️ Eliminar</button>
                        </div>
                    </div>
                </div>
            `;
            listaProductosDiv.appendChild(divAdmin);

            // CLIENT VIEW
            if (catalogoPublico) {
                const divCliente = document.createElement("div");
                divCliente.classList.add("tarjeta-producto");
                const imagenHTMLCliente = prod.foto 
                    ? `<img src="${prod.foto}" alt="${nombre}">`
                    : `<div style="width: 100%; height: 110px; background-color: #333; border-radius: 6px 6px 0 0; display: flex; justify-content: center; align-items: center; font-size: 40px; margin-bottom: 10px;">📦</div>`;

                let botonHTMLCliente = "";
                if (stock > 0) {
                    botonHTMLCliente = `<button class="btn-whatsapp btn-agregar-carrito" data-id="${prod.id}" style="width: 100%; background-color: #25D366; color: white; border: none; padding: 10px; border-radius: 5px; font-weight: bold; font-size: 14px; cursor: pointer; display: flex; justify-content: center; align-items: center; margin: 0;">
                        ${iconoWhatsApp} Agregar al Carrito
                    </button>`;
                } else {
                    botonHTMLCliente = `<button disabled style="width: 100%; background-color: #444; color: #888; border: none; padding: 10px; border-radius: 5px; font-weight: bold; font-size: 14px; cursor: not-allowed; display: flex; justify-content: center; align-items: center; margin: 0;">
                        🚫 Agotado
                    </button>`;
                }

                divCliente.innerHTML = `
                    <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                        <div>
                            ${imagenHTMLCliente}
                            <div style="padding: 0 10px;">
                                <h4 class="clamp-titulo" style="color: #f1faee;">${nombre}</h4>
                                <p class="clamp-desc">${desc}</p>
                            </div>
                        </div>
                        <div style="padding: 10px; border-top: 1px solid #333; text-align: center;">
                            <p class="precio" style="margin-bottom: 3px;">$${precioUSD}</p>
                            <p style="margin: 0 0 10px 0; color: #bbb; font-size: 13px;">Bs. ${precioVES}</p>
                            ${botonHTMLCliente}
                        </div>
                    </div>
                `;
                catalogoPublico.appendChild(divCliente);
            }
        });

        actualizarInterfazCarrito();
        renderizarListaCarrito();
    }


    // ==========================================
    // LÓGICA DE CLIENTES (DIRECTORIO Y COBROS)
    // ==========================================
    formCliente.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        btnGuardarCli.disabled = true;
        const textoOriginal = btnGuardarCli.textContent;
        btnGuardarCli.textContent = "Guardando...";

        try {
            const datosCliente = {
                nombre: document.getElementById("cli-nombre").value,
                telefono: document.getElementById("cli-telefono").value.replace(/\D/g, ''), 
                direccion: document.getElementById("cli-direccion").value,
                estado: document.getElementById("cli-estado").value,
                deuda: parseFloat(document.getElementById("cli-deuda").value) || 0,
            };

            if (clienteEnEdicionId) {
                await updateDoc(doc(db, "clientes", clienteEnEdicionId), datosCliente);
                clienteEnEdicionId = null;
                btnGuardarCli.textContent = "¡Actualizado!";
            } else {
                datosCliente.fechaRegistro = serverTimestamp();
                await addDoc(collection(db, "clientes"), datosCliente);
                btnGuardarCli.textContent = "¡Registrado!";
            }

            formCliente.reset(); 
            document.getElementById("cli-deuda").value = "0"; 
            
            btnGuardarCli.disabled = false;
            btnGuardarCli.style.backgroundColor = "#4caf50"; 
            
            setTimeout(() => {
                btnGuardarCli.textContent = "Registrar Cliente";
            }, 2500);
            
        } catch (error) {
            console.error("Error al guardar cliente: ", error);
            btnGuardarCli.disabled = false;
            btnGuardarCli.textContent = "Error";
            setTimeout(() => { btnGuardarCli.textContent = textoOriginal; }, 3000);
        }
    });

    listaClientesDiv.addEventListener("click", async (e) => {
        if (e.target.closest(".btn-eliminar-cli")) {
            const id = e.target.closest(".btn-eliminar-cli").getAttribute("data-id");
            if (confirm("¿Eliminar este cliente definitivamente del sistema?")) {
                await deleteDoc(doc(db, "clientes", id));
            }
        }
        
        if (e.target.closest(".btn-editar-cli")) {
            const id = e.target.closest(".btn-editar-cli").getAttribute("data-id");
            const cli = clientesActuales.find(c => c.id === id);
            if (cli) {
                document.getElementById("cli-nombre").value = cli.nombre;
                document.getElementById("cli-telefono").value = cli.telefono;
                document.getElementById("cli-direccion").value = cli.direccion || "";
                document.getElementById("cli-estado").value = cli.estado;
                document.getElementById("cli-deuda").value = cli.deuda;
                
                clienteEnEdicionId = id;
                btnGuardarCli.textContent = "Actualizar Cliente";
                btnGuardarCli.style.backgroundColor = "#ffc107"; 
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }

        if (e.target.closest(".btn-cobrar-cli")) {
            const id = e.target.closest(".btn-cobrar-cli").getAttribute("data-id");
            const cli = clientesActuales.find(c => c.id === id);
            if (cli && cli.telefono) {
                const montoUSD = parseFloat(cli.deuda || 0).toFixed(2);
                const montoVES = (parseFloat(cli.deuda || 0) * tasaBCV).toFixed(2);
                
                const mensaje = `Hola ${cli.nombre}, te saludamos de Pasión Paraguanera. Te escribimos para recordarte amablemente que tienes un saldo pendiente por cancelar de *$${montoUSD}* (Equivalente a *Bs. ${montoVES}* a la tasa de hoy). ¡Agradecemos tu pronta atención!`;
                const enlace = `https://wa.me/${cli.telefono}?text=${mensaje}`;
                window.open(enlace, "_blank");
            }
        }
    });

    onSnapshot(collection(db, "clientes"), (snapshot) => {
        listaClientesDiv.innerHTML = ""; 
        clientesActuales = [];
        
        if (snapshot.empty) {
            listaClientesDiv.innerHTML = "<p>No hay clientes registrados aún.</p>";
            return;
        }

        snapshot.forEach((doc) => { clientesActuales.push({ id: doc.id, ...doc.data() }); });
        clientesActuales.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

        clientesActuales.forEach((cli) => {
            const nombre = cli.nombre || "Sin nombre";
            const telefono = cli.telefono || "Sin número";
            const direccion = cli.direccion || "Sin dirección registrada";
            const estado = cli.estado || "Al día";
            const deudaNum = parseFloat(cli.deuda || 0);
            
            const divCli = document.createElement("div");
            divCli.classList.add("item-producto");
            divCli.style.borderTopColor = estado === "Con Deuda" ? "#f44336" : "#4caf50";

            let seccionDeuda = "";
            let btnCobrar = "";

            if (estado === "Con Deuda" && deudaNum > 0) {
                seccionDeuda = `
                    <div style="background-color: #421818; padding: 6px; border-radius: 4px; margin-bottom: 10px;">
                        <span style="color: #ff6b6b; font-weight: bold; font-size: 14px;">Deuda: $${deudaNum.toFixed(2)}</span>
                    </div>`;
                btnCobrar = `
                    <button class="btn-cobrar-cli btn-whatsapp" data-id="${cli.id}" style="width: 100%; margin-bottom: 10px; font-size: 13px; padding: 8px;">
                        📲 Enviar Recordatorio
                    </button>`;
            } else {
                seccionDeuda = `
                    <div style="background-color: #1b3a20; padding: 6px; border-radius: 4px; margin-bottom: 10px;">
                        <span style="color: #81c784; font-weight: bold; font-size: 14px;">Cliente Solvente</span>
                    </div>`;
            }

            divCli.innerHTML = `
                <div style="display: flex; flex-direction: column; height: 100%; width: 100%; justify-content: space-between;">
                    <div style="text-align: center; margin-bottom: 15px;">
                        <h4 style="margin: 0 0 5px 0; color: #f1faee; font-size: 16px;">👤 ${nombre}</h4>
                        <p style="margin: 0 0 5px 0; font-size: 13px; color: #bbb;">📞 ${telefono}</p>
                        <p style="margin: 0 0 10px 0; font-size: 12px; color: #aaa;">📍 ${direccion}</p>
                        ${seccionDeuda}
                    </div>
                    
                    <div style="width: 100%;">
                        ${btnCobrar}
                        <div style="display: flex; gap: 8px; justify-content: space-between; width: 100%;">
                            <button class="btn-editar-cli" data-id="${cli.id}" style="background: #ffc107; color: #000; width: 48%; padding: 8px; font-size: 13px; margin: 0; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">✏️ Editar</button>
                            <button class="btn-eliminar-cli" data-id="${cli.id}" style="background: #f44336; color: #fff; width: 48%; padding: 8px; font-size: 13px; margin: 0; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">🗑️ Eliminar</button>
                        </div>
                    </div>
                </div>
            `;
            listaClientesDiv.appendChild(divCli);
        });
    });

    // ==========================================
    // LÓGICA DE FACTURACIÓN Y PEDIDOS (ADMIN)
    // ==========================================
    onSnapshot(collection(db, "pedidos"), (snapshot) => {
        listaPedidosDiv.innerHTML = "";
        pedidosActuales = [];

        if (snapshot.empty) {
            listaPedidosDiv.innerHTML = "<p>Aún no hay pedidos registrados.</p>";
            return;
        }

        snapshot.forEach((doc) => { pedidosActuales.push({ id: doc.id, ...doc.data() }); });
        
        pedidosActuales.sort((a, b) => {
            const timeA = a.fecha ? a.fecha.toMillis() : 0;
            const timeB = b.fecha ? b.fecha.toMillis() : 0;
            return timeB - timeA;
        });

        pedidosActuales.forEach((pedido) => {
            const estado = pedido.estado || "Pendiente";
            const fechaStr = pedido.fecha ? new Date(pedido.fecha.toMillis()).toLocaleString() : "Fecha desconocida";
            const dirPed = pedido.direccion || "Sin dirección";
            
            let colorClase = "";
            let etiqueta = "";
            if (estado === "Pendiente") { colorClase = ""; etiqueta = "🟡 Pendiente"; }
            else if (estado === "Completado") { colorClase = "completado"; etiqueta = "🟢 Completado"; }
            else if (estado === "Cancelado") { colorClase = "cancelado"; etiqueta = "🔴 Cancelado"; }

            let listaItems = "";
            if (pedido.productos && Array.isArray(pedido.productos)) {
                pedido.productos.forEach(p => {
                    listaItems += `<li>${p.cantidad}x ${p.nombre} ($${p.precio})</li>`;
                });
            }

            const divPed = document.createElement("div");
            divPed.className = `tarjeta-pedido ${colorClase}`;
            divPed.innerHTML = `
                <div class="pedido-header">
                    <h4>👤 ${pedido.cliente}</h4>
                    <span class="estado-badge">${etiqueta}</span>
                </div>
                <div class="pedido-cuerpo">
                    <p>📞 WhatsApp: ${pedido.telefono}</p>
                    <p>📍 Dirección: ${dirPed}</p>
                    <p>🕒 Fecha: ${fechaStr}</p>
                    <ul>${listaItems}</ul>
                    <div class="totales">Total: $${parseFloat(pedido.totalUSD).toFixed(2)} | Bs. ${parseFloat(pedido.totalVES).toFixed(2)}</div>
                </div>
                <div class="pedido-acciones">
                    <button class="btn-estado-ped" data-id="${pedido.id}" data-estado="Completado" style="background-color: #4caf50;">✔️ Listo</button>
                    <button class="btn-estado-ped" data-id="${pedido.id}" data-estado="Pendiente" style="background-color: #ff9800; color: #000;">🟡 Pdte</button>
                    <button class="btn-estado-ped" data-id="${pedido.id}" data-estado="Cancelado" style="background-color: #f44336;">❌ Canc</button>
                    <button class="btn-eliminar-ped" data-id="${pedido.id}" style="background-color: #333;">🗑️ Borrar</button>
                </div>
            `;
            listaPedidosDiv.appendChild(divPed);
        });
    });

    listaPedidosDiv.addEventListener("click", async (e) => {
        if (e.target.closest(".btn-estado-ped")) {
            const btn = e.target.closest(".btn-estado-ped");
            const id = btn.getAttribute("data-id");
            const nuevoEstado = btn.getAttribute("data-estado");
            await updateDoc(doc(db, "pedidos", id), { estado: nuevoEstado });
        }
        if (e.target.closest(".btn-eliminar-ped")) {
            const btn = e.target.closest(".btn-eliminar-ped");
            const id = btn.getAttribute("data-id");
            if (confirm("¿Borrar esta factura del historial?")) {
                await deleteDoc(doc(db, "pedidos", id));
            }
        }
    });

    // ==========================================
    // LÓGICA DEL CARRITO PÚBLICO
    // ==========================================
    catalogoPublico.addEventListener("click", (e) => {
        if (e.target.closest(".btn-agregar-carrito")) {
            const btn = e.target.closest(".btn-agregar-carrito");
            const id = btn.getAttribute("data-id");
            const prod = productosActuales.find(p => p.id === id);
            
            if (prod) {
                const stockDisponible = parseInt(prod.stock) || 0;
                const index = carrito.findIndex(item => item.id === id);
                let cantidadActualEnCarrito = index > -1 ? carrito[index].cantidad : 0;

                if (cantidadActualEnCarrito >= stockDisponible) {
                    alert(`¡Lo sentimos! Solo quedan ${stockDisponible} unidades de ${prod.nombre} en inventario.`);
                    return; 
                }

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
                const prod = productosActuales.find(p => p.id === id);
                const stockDisponible = prod ? parseInt(prod.stock) || 0 : 0;

                if (accion === "sumar") {
                    if (carrito[index].cantidad >= stockDisponible) {
                        alert(`Límite alcanzado: Solo hay ${stockDisponible} unidades disponibles.`);
                    } else {
                        carrito[index].cantidad++;
                    }
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

    // === EL GRAN BOTÓN DE ENVÍO Y AUTO-REGISTRO ===
    btnEnviarWhatsapp.addEventListener("click", async () => {
        if (carrito.length === 0) return;

        const nombreCliente = document.getElementById("cart-nombre").value.trim();
        const tlfCliente = document.getElementById("cart-telefono").value.trim();
        const dirCliente = document.getElementById("cart-direccion").value.trim();

        if (nombreCliente === "" || tlfCliente === "" || dirCliente === "") {
            alert("Por favor, completa todos tus datos (Nombre, WhatsApp y Dirección) para procesar el pedido y el delivery.");
            return;
        }

        const btn = document.getElementById("btn-enviar-whatsapp");
        const textoOriginal = btn.innerHTML;
        btn.innerHTML = "Procesando pedido...";
        btn.disabled = true;

        let total = 0;
        let mensaje = `¡Hola Pasión Paraguanera! Soy *${nombreCliente}*. Quisiera hacer el siguiente pedido:%0A%0A`;
        
        const arrayProductosFactura = [];

        carrito.forEach(item => {
            const precioNum = typeof item.precio === 'number' ? item.precio : parseFloat(item.precio || 0);
            const subtotal = item.cantidad * precioNum;
            total += subtotal;
            mensaje += `🔹 ${item.cantidad}x *${item.nombre}* ($${precioNum.toFixed(2)} c/u) = $${subtotal.toFixed(2)}%0A`;
            
            arrayProductosFactura.push({
                id: item.id,
                nombre: item.nombre,
                cantidad: item.cantidad,
                precio: precioNum.toFixed(2)
            });
        });

        const totalBs = (total * tasaBCV).toFixed(2);
        mensaje += `%0A*TOTAL A PAGAR:*%0A💵 *$${total.toFixed(2)}*%0A🇻🇪 *Bs. ${totalBs}* (A tasa de Bs. ${tasaBCV.toFixed(2)})`;
        mensaje += `%0A%0A📍 *Dirección de entrega:* ${dirCliente}%0A%0A¿Tienen disponibilidad?`;

        try {
            const tlfLimpio = tlfCliente.replace(/\D/g, '');

            await addDoc(collection(db, "pedidos"), {
                cliente: nombreCliente,
                telefono: tlfLimpio,
                direccion: dirCliente,
                productos: arrayProductosFactura,
                totalUSD: total.toFixed(2),
                totalVES: totalBs,
                estado: "Pendiente",
                fecha: serverTimestamp()
            });

            const clienteExistente = clientesActuales.find(c => c.telefono === tlfLimpio);
            if (!clienteExistente) {
                await addDoc(collection(db, "clientes"), {
                    nombre: nombreCliente,
                    telefono: tlfLimpio,
                    direccion: dirCliente,
                    estado: "Al día",
                    deuda: 0,
                    fechaRegistro: serverTimestamp()
                });
            } else {
                await updateDoc(doc(db, "clientes", clienteExistente.id), {
                    direccion: dirCliente,
                    nombre: nombreCliente 
                });
            }

            carrito = [];
            actualizarInterfazCarrito();
            modalCarrito.classList.add("oculto");
            document.getElementById("cart-nombre").value = "";
            document.getElementById("cart-telefono").value = "";
            document.getElementById("cart-direccion").value = "";
            
            const enlace = `https://wa.me/${NUMERO_WHATSAPP}?text=${mensaje}`;
            window.open(enlace, "_blank"); 

        } catch (error) {
            console.error("Error al registrar pedido:", error);
            alert("Ocurrió un error al procesar tu pedido. Intenta nuevamente.");
        } finally {
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }
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
                    <p style="font-size: 13px; color: #bbb;">$${precioNum.toFixed(2)} (Bs. ${(precioNum * tasaBCV).toFixed(2)}) c/u</p>
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
        totalPrecioBsSpan.textContent = (total * tasaBCV).toFixed(2);
    }
});
