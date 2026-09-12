import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, deleteDoc, updateDoc, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

const linkTema = document.createElement('link');
linkTema.rel = 'stylesheet';
linkTema.href = 'https://cdn.jsdelivr.net/npm/@sweetalert2/theme-dark@5/dark.css';
document.head.appendChild(linkTema);

const fixSwal = document.createElement('style');
fixSwal.innerHTML = `
    .swal2-popup .swal2-input {
        width: 80% !important;
        margin: 1.5em auto !important;
        box-sizing: border-box !important;
        text-align: center !important;
    }
    .modern-toast {
        background-color: #222 !important;
        color: #fff !important;
        border-left: 5px solid #e91e63 !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
    }
`;
document.head.appendChild(fixSwal);

const Toast = Swal.mixin({
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    customClass: {
        popup: 'modern-toast'
    }
});

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
let gastosActuales = []; 
let carrito = []; 
let tasaBCV = 1;

let unsubClientes = null;
let unsubPedidos = null;
let unsubGastos = null; 

function formatearTelefono(tlf) {
    let limpio = tlf.replace(/\D/g, '');
    if (limpio.startsWith('0')) { return '58' + limpio.substring(1); }
    if (limpio.length === 10 && !limpio.startsWith('58')) { return '58' + limpio; }
    return limpio;
}

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

    let btnGastos = document.getElementById("btn-gastos");
    if (!btnGastos && btnPedidos) {
        btnGastos = document.createElement("button");
        btnGastos.id = "btn-gastos";
        btnGastos.className = btnPedidos.className; 
        btnGastos.style.cssText = "background-color: #e91e63; color: white; padding: 15px; margin-top: 10px; margin-bottom: 10px; width: 100%; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;";
        btnGastos.innerHTML = "📉 Gastos e Inventario Interno";
        btnPedidos.parentNode.insertBefore(btnGastos, btnPedidos.nextSibling);
    }

    let moduloGastos = document.getElementById("modulo-gastos");
    if (!moduloGastos) {
        moduloGastos = document.createElement("div");
        moduloGastos.id = "modulo-gastos";
        moduloGastos.classList.add("oculto");
        moduloGastos.innerHTML = `
            <div style="text-align: left; margin-bottom: 20px;">
                <button id="btn-volver-admin-gas" style="background-color: #555; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px;">⬅ Volver al Panel</button>
            </div>
            <h2 style="text-align: center; color: #e91e63; margin-bottom: 10px;">📉 Gastos y Retiros Internos</h2>
            <p style="text-align: center; font-size: 13px; color: #aaa; margin-bottom: 20px;">Registra salidas de dinero o resta mercancía por consumo/daños del negocio.</p>
            
            <div style="background-color: #1a1a1a; padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #333;">
                <form id="form-gasto" style="display: flex; flex-direction: column; gap: 10px;">
                    <input type="text" id="gas-concepto" placeholder="Motivo (Ej: Limpieza, Uso Local, Dañado...)" required style="padding: 10px; border-radius: 4px; border: 1px solid #444; background: #222; color: white;">
                    <select id="gas-producto" required style="padding: 10px; border-radius: 4px; border: 1px solid #444; background: #222; color: white;">
                        <option value="ninguno">🔴 Gasto Externo (Solo Dinero, No afecta inventario)</option>
                    </select>
                    <input type="number" id="gas-monto-cantidad" placeholder="Monto del gasto en $" required min="0.01" step="0.01" style="padding: 10px; border-radius: 4px; border: 1px solid #444; background: #222; color: white;">
                    <button type="submit" id="btn-guardar-gas" style="background-color: #e91e63; color: white; padding: 12px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 10px;">Registrar Gasto</button>
                </form>
            </div>
            <div id="resumen-total-gastos" style="background-color: #33151d; padding: 15px; border-radius: 6px; margin-bottom: 20px; text-align: center; border: 1px solid #e91e63;">
                <h3 style="margin: 0 0 5px 0; color: #ff80ab; font-size: 16px;">💰 Total Gastos Generales</h3>
                <span style="font-size: 22px; color: #fff; font-weight: bold;" id="total-gas-usd">$0.00</span> 
                <span style="color: #bbb; font-size: 14px;">| Bs. <span id="total-gas-bs">0.00</span></span>
            </div>
            <div id="lista-gastos" style="display: flex; flex-direction: column; gap: 10px;"></div>
        `;
        
        if (moduloPedidos) {
            moduloPedidos.parentNode.insertBefore(moduloGastos, moduloPedidos.nextSibling);
        } else {
            vistaAdmin.parentNode.appendChild(moduloGastos);
        }
    }

    const btnVolverAdminGas = document.getElementById("btn-volver-admin-gas");
    const formGasto = document.getElementById("form-gasto");
    const gasProducto = document.getElementById("gas-producto");
    const gasMontoCantidad = document.getElementById("gas-monto-cantidad");
    const btnGuardarGas = document.getElementById("btn-guardar-gas");
    const listaGastosDiv = document.getElementById("lista-gastos");

    if (btnGastos) {
        btnGastos.addEventListener("click", () => { 
            vistaAdmin.classList.add("oculto"); 
            moduloGastos.classList.remove("oculto"); 
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    if (btnVolverAdminGas) {
        btnVolverAdminGas.addEventListener("click", () => { 
            moduloGastos.classList.add("oculto"); 
            vistaAdmin.classList.remove("oculto"); 
        });
    }

    gasProducto.addEventListener("change", () => {
        if(gasProducto.value === "ninguno") {
            gasMontoCantidad.placeholder = "Monto del gasto en $";
            gasMontoCantidad.step = "0.01";
            gasMontoCantidad.min = "0.01";
        } else {
            gasMontoCantidad.placeholder = "Cantidad a restar del inventario (Unidades)";
            gasMontoCantidad.step = "1";
            gasMontoCantidad.min = "1";
        }
        gasMontoCantidad.value = "";
    });

    formGasto.addEventListener("submit", async (e) => {
        e.preventDefault();
        btnGuardarGas.disabled = true;
        btnGuardarGas.textContent = "Procesando...";

        const concepto = document.getElementById("gas-concepto").value.trim();
        const productoId = gasProducto.value;
        const valorInput = parseFloat(gasMontoCantidad.value);

        try {
            let totalUSD = 0;

            if (productoId === "ninguno") {
                totalUSD = valorInput;
                await addDoc(collection(db, "gastos"), {
                    concepto: concepto,
                    tipo: "Externo",
                    totalUSD: totalUSD,
                    fecha: serverTimestamp()
                });
            } else {
                const prod = productosActuales.find(p => p.id === productoId);
                const cantidad = Math.floor(valorInput);
                const stockDisponible = parseInt(prod.stock) || 0;

                if (cantidad > stockDisponible) {
                    Swal.fire({ title: "Stock insuficiente", text: `Solo quedan ${stockDisponible} unidades de ${prod.nombre}.`, icon: "warning" });
                    btnGuardarGas.disabled = false;
                    btnGuardarGas.textContent = "Registrar Gasto";
                    return;
                }

                totalUSD = cantidad * parseFloat(prod.precio || 0);

                await addDoc(collection(db, "gastos"), {
                    concepto: concepto,
                    tipo: "Retiro de Inventario",
                    productoId: prod.id,
                    productoNombre: prod.nombre,
                    cantidad: cantidad,
                    totalUSD: totalUSD,
                    fecha: serverTimestamp()
                });

                await updateDoc(doc(db, "productos", prod.id), {
                    stock: increment(-cantidad)
                });
            }

            Toast.fire({
                icon: 'success',
                title: 'Gasto Registrado',
                text: `Contabilizado: $${totalUSD.toFixed(2)}`
            });
            
            formGasto.reset();
            gasMontoCantidad.placeholder = "Monto del gasto en $";
            gasMontoCantidad.step = "0.01";
            gasMontoCantidad.min = "0.01";
        } catch (error) {
            console.error(error);
            Swal.fire({ title: "Error de Conexión", text: "Motivo: " + error.message, icon: "error" });
        } finally {
            btnGuardarGas.disabled = false;
            btnGuardarGas.textContent = "Registrar Gasto";
        }
    });

    listaGastosDiv.addEventListener("click", (e) => {
        if (e.target.closest(".btn-eliminar-gas")) {
            const btn = e.target.closest(".btn-eliminar-gas");
            const id = btn.getAttribute("data-id");
            const tipo = btn.getAttribute("data-tipo");
            const prodId = btn.getAttribute("data-prodid");
            const cant = parseInt(btn.getAttribute("data-cant")) || 0;

            Swal.fire({
                title: '¿Anular este registro?',
                text: tipo === "Retiro de Inventario" ? "Se devolverán los productos al inventario físico." : "Desaparecerá del historial de gastos.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#e91e63',
                cancelButtonColor: '#555',
                confirmButtonText: 'Sí, anular',
                cancelButtonText: 'Volver'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        await deleteDoc(doc(db, "gastos", id));
                        if (tipo === "Retiro de Inventario" && prodId) {
                            await updateDoc(doc(db, "productos", prodId), { stock: increment(cant) });
                            Toast.fire({ icon: 'success', title: 'Anulado', text: 'Stock devuelto al inventario.' });
                        } else {
                            Toast.fire({ icon: 'success', title: 'Anulado', text: 'Gasto borrado del historial.' });
                        }
                    } catch (err) {
                        Swal.fire('Error', 'No se pudo anular: ' + err.message, 'error');
                    }
                }
            });
        }
    });

    function renderizarGastos() {
        if(!listaGastosDiv) return;
        listaGastosDiv.innerHTML = "";
        let totalUSDGastos = 0;

        if (gastosActuales.length === 0) {
            listaGastosDiv.innerHTML = "<p style='text-align:center; color:#aaa; font-size:14px;'>No hay gastos registrados aún.</p>";
            document.getElementById("total-gas-usd").textContent = "$0.00";
            document.getElementById("total-gas-bs").textContent = "0.00";
            return;
        }

        gastosActuales.forEach(gasto => {
            const totalUSD = parseFloat(gasto.totalUSD || 0);
            totalUSDGastos += totalUSD;
            const fechaStr = gasto.fecha ? new Date(gasto.fecha.toMillis()).toLocaleString() : "Fecha desconocida";
            
            const div = document.createElement("div");
            div.style.cssText = "background-color: #222; padding: 12px; border-radius: 6px; border-left: 4px solid #e91e63; margin-bottom: 8px;";
            
            let badgeTipo = gasto.tipo === "Externo" 
                ? `<span style="background: #555; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Gasto Externo/Efectivo</span>`
                : `<span style="background: #e91e63; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Uso Inventario: ${gasto.cantidad}x ${gasto.productoNombre}</span>`;

            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong style="color: white; font-size: 15px;">${gasto.concepto}</strong>
                    <button class="btn-eliminar-gas" data-id="${gasto.id}" data-tipo="${gasto.tipo}" data-prodid="${gasto.productoId}" data-cant="${gasto.cantidad}" style="background: none; border: none; cursor: pointer; font-size: 18px;">🗑️</button>
                </div>
                <div style="margin-bottom: 8px;">${badgeTipo}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; color: #bbb; font-size: 12px;">
                    <span>${fechaStr}</span>
                    <strong style="color: #ff80ab; font-size: 15px;">-$${totalUSD.toFixed(2)}</strong>
                </div>
            `;
            listaGastosDiv.appendChild(div);
        });

        document.getElementById("total-gas-usd").textContent = "$" + totalUSDGastos.toFixed(2);
        document.getElementById("total-gas-bs").textContent = (totalUSDGastos * tasaBCV).toFixed(2);
    }

    const cartNombreInput = document.getElementById("cart-nombre");
    const cartTelefonoInput = document.getElementById("cart-telefono");
    const cartDireccionInput = document.getElementById("cart-direccion");

    cartNombreInput.value = localStorage.getItem("pp_nombre") || "";
    cartTelefonoInput.value = localStorage.getItem("pp_telefono") || "";
    cartDireccionInput.value = localStorage.getItem("pp_direccion") || "";

    let cartTipoPago = document.getElementById("cart-tipo-pago");
    if (!cartTipoPago && cartDireccionInput) {
        cartTipoPago = document.createElement("select");
        cartTipoPago.id = "cart-tipo-pago";
        cartTipoPago.style.cssText = "width: 100%; padding: 10px; margin-top: 10px; border-radius: 4px; background-color: #222; color: #fff; border: 1px solid #444; font-size: 14px; cursor: pointer;";
        cartTipoPago.innerHTML = `
            <option value="contado">Pago al Contado (Completo)</option>
            <option value="credito" id="opcion-credito">Pago a Crédito (Acordar cuotas con el negocio)</option>
        `;
        cartDireccionInput.parentNode.insertBefore(cartTipoPago, cartDireccionInput.nextSibling);
    }

    onSnapshot(doc(db, "configuracion", "bcv"), (docSnap) => {
        if (docSnap.exists()) {
            tasaBCV = parseFloat(docSnap.data().valor) || 1;
            document.getElementById("tasa-actual-admin").textContent = tasaBCV.toFixed(2);
            document.getElementById("tasa-bcv-cliente").textContent = tasaBCV.toFixed(2);
            document.getElementById("banner-bcv").classList.remove("oculto");
        }
        renderizarTodo(); 
    });

    document.getElementById("btn-guardar-tasa").addEventListener("click", async () => {
        const inputTasa = document.getElementById("input-tasa-bcv");
        let valorTasa = inputTasa.value.replace(',', '.');
        const nuevaTasa = parseFloat(valorTasa);
        
        if(nuevaTasa > 0) {
            const btn = document.getElementById("btn-guardar-tasa");
            btn.textContent = "Guardando...";
            try {
                await setDoc(doc(db, "configuracion", "bcv"), { valor: nuevaTasa }, { merge: true });
                inputTasa.value = "";
                btn.textContent = "¡Actualizado!";
                setTimeout(() => btn.textContent = "Fijar Tasa", 2000);
            } catch (error) {
                Swal.fire({ title: "Error", text: "Ocurrió un error al fijar la tasa.", icon: "error" });
                btn.textContent = "Fijar Tasa";
            }
        }
    });

    chkMostrarPass.addEventListener("change", () => { passAdmin.type = chkMostrarPass.checked ? "text" : "password"; });

    let contadorClics = 0; let tiempoClic;
    tituloSecreto.addEventListener("click", () => {
        contadorClics++;
        if (contadorClics === 1) { tiempoClic = setTimeout(() => { contadorClics = 0; }, 1000); }
        if (contadorClics === 3) {
            clearTimeout(tiempoClic); contadorClics = 0; modalLogin.classList.remove("oculto"); 
        }
    });

    btnCerrarModal.addEventListener("click", () => {
        modalLogin.classList.add("oculto"); mensajeError.classList.add("oculto");
        emailAdmin.value = ""; passAdmin.value = ""; chkMostrarPass.checked = false; passAdmin.type = "password";
    });

    btnEntrar.addEventListener("click", () => {
        signInWithEmailAndPassword(auth, emailAdmin.value, passAdmin.value)
            .then(() => {
                modalLogin.classList.add("oculto"); emailAdmin.value = ""; passAdmin.value = "";
                chkMostrarPass.checked = false; passAdmin.type = "password";
            }).catch(() => mensajeError.classList.remove("oculto"));
    });

    btnSalir.addEventListener("click", () => signOut(auth));

    onAuthStateChanged(auth, (user) => {
        if (user) {
            vistaCliente.classList.add("oculto");
            vistaAdmin.classList.remove("oculto");
            btnCarritoFlotante.classList.add("oculto"); 

            unsubClientes = onSnapshot(collection(db, "clientes"), (snapshot) => {
                clientesActuales = [];
                if (!snapshot.empty) { 
                    snapshot.forEach((doc) => { clientesActuales.push({ id: doc.id, ...doc.data() }); });
                    clientesActuales.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
                }
                renderizarClientes();
            });

            unsubPedidos = onSnapshot(collection(db, "pedidos"), (snapshot) => {
                listaPedidosDiv.innerHTML = ""; pedidosActuales = [];
                if (snapshot.empty) { listaPedidosDiv.innerHTML = "<p>Aún no hay pedidos registrados.</p>"; return; }
                snapshot.forEach((doc) => { pedidosActuales.push({ id: doc.id, ...doc.data() }); });
                pedidosActuales.sort((a, b) => {
                    const timeA = a.fecha ? a.fecha.toMillis() : 0; const timeB = b.fecha ? b.fecha.toMillis() : 0;
                    return timeB - timeA;
                });
                renderizarPedidos();
            });

            unsubGastos = onSnapshot(collection(db, "gastos"), (snapshot) => {
                gastosActuales = [];
                snapshot.forEach((doc) => { gastosActuales.push({ id: doc.id, ...doc.data() }); });
                gastosActuales.sort((a, b) => {
                    const timeA = a.fecha ? a.fecha.toMillis() : 0; const timeB = b.fecha ? b.fecha.toMillis() : 0;
                    return timeB - timeA;
                });
                renderizarGastos();
            });

        } else {
            vistaAdmin.classList.add("oculto");
            moduloInventario.classList.add("oculto"); moduloClientes.classList.add("oculto"); moduloPedidos.classList.add("oculto");
            if (moduloGastos) moduloGastos.classList.add("oculto");
            vistaCliente.classList.remove("oculto");
            actualizarInterfazCarrito(); 
            
            if(unsubClientes) unsubClientes();
            if(unsubPedidos) unsubPedidos();
            if(unsubGastos) unsubGastos();
        }
    });

    btnInventario.addEventListener("click", () => { vistaAdmin.classList.add("oculto"); moduloInventario.classList.remove("oculto"); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    btnVolverAdminInv.addEventListener("click", () => {
        moduloInventario.classList.add("oculto"); vistaAdmin.classList.remove("oculto");
        if(productoEnEdicionId) { formProducto.reset(); document.getElementById("prod-stock").value = "0"; productoEnEdicionId = null; btnGuardarProd.textContent = "Guardar Producto"; btnGuardarProd.style.backgroundColor = "#e63946"; }
    });

    btnClientes.addEventListener("click", () => { vistaAdmin.classList.add("oculto"); moduloClientes.classList.remove("oculto"); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    btnVolverAdminCli.addEventListener("click", () => {
        moduloClientes.classList.add("oculto"); vistaAdmin.classList.remove("oculto");
        if(clienteEnEdicionId) { formCliente.reset(); document.getElementById("cli-deuda").value = "0"; clienteEnEdicionId = null; btnGuardarCli.textContent = "Registrar Cliente"; btnGuardarCli.style.backgroundColor = "#4caf50"; }
    });

    btnPedidos.addEventListener("click", () => { vistaAdmin.classList.add("oculto"); moduloPedidos.classList.remove("oculto"); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    btnVolverAdminPed.addEventListener("click", () => { moduloPedidos.classList.add("oculto"); vistaAdmin.classList.remove("oculto"); });

    formProducto.addEventListener("submit", async (e) => {
        e.preventDefault(); btnGuardarProd.disabled = true; const textoOriginal = btnGuardarProd.textContent; btnGuardarProd.textContent = "Procesando...";
        try {
            const datosProducto = {
                nombre: document.getElementById("prod-nombre").value, descripcion: document.getElementById("prod-desc").value,
                precio: parseFloat(document.getElementById("prod-precio").value), stock: parseInt(document.getElementById("prod-stock").value),
                foto: document.getElementById("prod-foto").value,
            };
            if (productoEnEdicionId) { await updateDoc(doc(db, "productos", productoEnEdicionId), datosProducto); productoEnEdicionId = null; btnGuardarProd.textContent = "¡Actualizado!"; } 
            else { datosProducto.fechaCreacion = serverTimestamp(); await addDoc(collection(db, "productos"), datosProducto); btnGuardarProd.textContent = "¡Guardado!"; }
            formProducto.reset(); document.getElementById("prod-stock").value = "0"; btnGuardarProd.disabled = false; btnGuardarProd.style.backgroundColor = "#4caf50"; 
            setTimeout(() => { btnGuardarProd.style.backgroundColor = "#e63946"; btnGuardarProd.textContent = "Guardar Producto"; }, 2500);
        } catch (error) { 
            btnGuardarProd.disabled = false; btnGuardarProd.textContent = "Error"; setTimeout(() => { btnGuardarProd.textContent = textoOriginal; }, 3000); 
            Swal.fire({ title: "Error", text: "Motivo: " + error.message, icon: "error" });
        }
    });

    listaProductosDiv.addEventListener("click", (e) => {
        if (e.target.closest(".btn-eliminar")) {
            Swal.fire({
                title: '¿Eliminar producto?',
                text: "Esta acción borrará el producto del catálogo.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#f44336',
                cancelButtonColor: '#555',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        await deleteDoc(doc(db, "productos", e.target.closest(".btn-eliminar").getAttribute("data-id")));
                    } catch (error) {
                        Swal.fire({ title: "Error", text: error.message, icon: "error" });
                    }
                }
            });
        }
        if (e.target.closest(".btn-editar")) {
            const id = e.target.closest(".btn-editar").getAttribute("data-id"); const prod = productosActuales.find(p => p.id === id);
            if (prod) {
                document.getElementById("prod-nombre").value = prod.nombre; document.getElementById("prod-desc").value = prod.descripcion;
                document.getElementById("prod-precio").value = prod.precio; document.getElementById("prod-stock").value = prod.stock;
                document.getElementById("prod-foto").value = prod.foto || ""; productoEnEdicionId = id;
                btnGuardarProd.textContent = "Actualizar Producto"; btnGuardarProd.style.backgroundColor = "#ffc107"; window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    });

    onSnapshot(collection(db, "productos"), (snapshot) => {
        productosActuales = []; snapshot.forEach((doc) => { productosActuales.push({ id: doc.id, ...doc.data() }); });
        productosActuales.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
        renderizarTodo(); 
    });

    function renderizarTodo() {
        listaProductosDiv.innerHTML = ""; if (catalogoPublico) catalogoPublico.innerHTML = ""; 
        
        let divResumen = document.getElementById("resumen-total-inventario");
        if (!divResumen) {
            divResumen = document.createElement("div");
            divResumen.id = "resumen-total-inventario";
            divResumen.style.cssText = "background-color: #1b3a20; padding: 15px; border-radius: 6px; margin-bottom: 20px; text-align: center; border: 1px solid #4caf50;";
            listaProductosDiv.parentNode.insertBefore(divResumen, listaProductosDiv);
        }

        if (productosActuales.length === 0) {
            listaProductosDiv.innerHTML = "<p>No hay productos registrados aún.</p>";
            divResumen.style.display = "none";
            if (catalogoPublico) catalogoPublico.innerHTML = "<p style='text-align:center; width:100%; color:#aaa;'>El catálogo está vacío por ahora.</p>"; 
        } else {
            divResumen.style.display = "block";
        }

        const iconoWhatsApp = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 6px; vertical-align: text-bottom;"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>`;

        let valorTotalInversion = 0;

        productosActuales.forEach((prod) => {
            const nombre = prod.nombre || "Sin nombre"; const desc = prod.descripcion || "";
            const stock = parseInt(prod.stock) || 0; const precioNum = typeof prod.precio === 'number' ? prod.precio : parseFloat(prod.precio || 0);
            const precioUSD = precioNum.toFixed(2); const precioVES = (precioNum * tasaBCV).toFixed(2);
            
            valorTotalInversion += (stock * precioNum);

            const divAdmin = document.createElement("div"); divAdmin.classList.add("item-producto");
            const imagenHTMLAdmin = prod.foto ? `<img src="${prod.foto}" class="foto-producto-lista" alt="${nombre}">` : `<div class="foto-producto-lista" style="background-color: #333; display: flex; justify-content: center; align-items: center; font-size: 24px;">📦</div>`;

            divAdmin.innerHTML = `
                <div style="display: flex; flex-direction: column; height: 100%; width: 100%; justify-content: space-between;">
                    <div>${imagenHTMLAdmin}<div style="text-align: center; padding: 0 5px;"><h4 title="${nombre}" class="clamp-titulo" style="color: #f1faee;">${nombre}</h4><p title="${desc}" class="clamp-desc">${desc}</p></div></div>
                    <div style="width: 100%;"><div class="item-precio-stock" style="display: flex; justify-content: center; align-items: center; gap: 10px; background-color: #1a1a1a; padding: 6px; border-radius: 6px; border: 1px solid #333; white-space: nowrap;"><span>$${precioUSD}</span><span style="color: #666;">|</span><span style="color: #fff; font-size: 13px;">📦 ${stock}</span></div>
                    <div class="botones-accion"><button class="btn-editar" data-id="${prod.id}" style="background: #ffc107; color: #000;">✏️ Editar</button><button class="btn-eliminar" data-id="${prod.id}" style="background: #f44336; color: #fff;">🗑️ Eliminar</button></div></div>
                </div>`;
            listaProductosDiv.appendChild(divAdmin);

            if (catalogoPublico) {
                const divCliente = document.createElement("div"); divCliente.classList.add("tarjeta-producto");
                const imagenHTMLCliente = prod.foto ? `<img src="${prod.foto}" alt="${nombre}">` : `<div style="width: 100%; height: 110px; background-color: #333; border-radius: 6px 6px 0 0; display: flex; justify-content: center; align-items: center; font-size: 40px; margin-bottom: 10px;">📦</div>`;

                let botonHTMLCliente = stock > 0 ? `<button class="btn-whatsapp btn-agregar-carrito" data-id="${prod.id}" style="width: 100%; background-color: #25D366; color: white; border: none; padding: 10px; border-radius: 5px; font-weight: bold; font-size: 14px; cursor: pointer; display: flex; justify-content: center; align-items: center; margin: 0;">${iconoWhatsApp} Agregar al Carrito</button>` 
                : `<button disabled style="width: 100%; background-color: #444; color: #888; border: none; padding: 10px; border-radius: 5px; font-weight: bold; font-size: 14px; cursor: not-allowed; display: flex; justify-content: center; align-items: center; margin: 0;">🚫 Agotado</button>`;

                divCliente.innerHTML = `
                    <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                        <div>${imagenHTMLCliente}<div style="padding: 0 10px;"><h4 class="clamp-titulo" style="color: #f1faee;">${nombre}</h4><p class="clamp-desc">${desc}</p></div></div>
                        <div style="padding: 10px; border-top: 1px solid #333; text-align: center;"><p class="precio" style="margin-bottom: 3px;">$${precioUSD}</p><p style="margin: 0 0 10px 0; color: #bbb; font-size: 13px;">Bs. ${precioVES}</p>${botonHTMLCliente}</div>
                    </div>`;
                catalogoPublico.appendChild(divCliente);
            }
        });

        const totalBs = (valorTotalInversion * tasaBCV).toFixed(2);
        divResumen.innerHTML = `<h3 style="margin: 0 0 5px 0; color: #81c784; font-size: 16px;">💰 Capital Total en Inventario</h3><span style="font-size: 22px; color: #fff; font-weight: bold;">$${valorTotalInversion.toFixed(2)}</span> <span style="color: #bbb; font-size: 14px;">| Bs. ${totalBs}</span>`;

        if (gasProducto) {
            const valorAnterior = gasProducto.value;
            gasProducto.innerHTML = `<option value="ninguno">🔴 Gasto Externo (Solo Dinero, No afecta inventario)</option>`;
            productosActuales.forEach(p => {
                if(parseInt(p.stock) > 0) {
                    gasProducto.innerHTML += `<option value="${p.id}">${p.nombre} (Stock: ${p.stock})</option>`;
                }
            });
            if(Array.from(gasProducto.options).some(opt => opt.value === valorAnterior)) {
                gasProducto.value = valorAnterior;
            }
        }

        actualizarInterfazCarrito(); renderizarListaCarrito();
    }

    formCliente.addEventListener("submit", async (e) => {
        e.preventDefault(); btnGuardarCli.disabled = true; const textoOriginal = btnGuardarCli.textContent; btnGuardarCli.textContent = "Guardando...";
        try {
            const tlf = formatearTelefono(document.getElementById("cli-telefono").value);
            const datosCliente = {
                nombre: document.getElementById("cli-nombre").value, telefono: tlf, direccion: document.getElementById("cli-direccion").value,
                estado: document.getElementById("cli-estado").value, deuda: parseFloat(document.getElementById("cli-deuda").value) || 0,
            };
            if (clienteEnEdicionId) { await updateDoc(doc(db, "clientes", clienteEnEdicionId), datosCliente); clienteEnEdicionId = null; btnGuardarCli.textContent = "¡Actualizado!"; } 
            else { datosCliente.fechaRegistro = serverTimestamp(); await setDoc(doc(db, "clientes", tlf), datosCliente, { merge: true }); btnGuardarCli.textContent = "¡Registrado!"; }
            formCliente.reset(); document.getElementById("cli-deuda").value = "0"; btnGuardarCli.disabled = false; btnGuardarCli.style.backgroundColor = "#4caf50"; 
            setTimeout(() => { btnGuardarCli.textContent = "Registrar Cliente"; }, 2500);
        } catch (error) { 
            btnGuardarCli.disabled = false; btnGuardarCli.textContent = "Error"; setTimeout(() => { btnGuardarCli.textContent = textoOriginal; }, 3000); 
            Swal.fire({ title: "Error", text: "Motivo: " + error.message, icon: "error" });
        }
    });

    listaClientesDiv.addEventListener("click", (e) => {
        if (e.target.closest(".btn-eliminar-cli")) { 
            Swal.fire({
                title: '¿Eliminar cliente?',
                text: "Esta acción borrará el registro del cliente definitivamente.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#f44336',
                cancelButtonColor: '#555',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        await deleteDoc(doc(db, "clientes", e.target.closest(".btn-eliminar-cli").getAttribute("data-id")));
                    } catch (error) {
                        Swal.fire({ title: "Error", text: error.message, icon: "error" });
                    }
                }
            });
        }
        if (e.target.closest(".btn-editar-cli")) {
            const id = e.target.closest(".btn-editar-cli").getAttribute("data-id"); const cli = clientesActuales.find(c => c.id === id);
            if (cli) {
                document.getElementById("cli-nombre").value = cli.nombre; document.getElementById("cli-telefono").value = cli.telefono;
                document.getElementById("cli-direccion").value = cli.direccion || ""; document.getElementById("cli-estado").value = cli.estado;
                document.getElementById("cli-deuda").value = cli.deuda; clienteEnEdicionId = id;
                btnGuardarCli.textContent = "Actualizar Cliente"; btnGuardarCli.style.backgroundColor = "#ffc107"; window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
        if (e.target.closest(".btn-cobrar-cli")) {
            const cli = clientesActuales.find(c => c.id === e.target.closest(".btn-cobrar-cli").getAttribute("data-id"));
            if (cli && cli.telefono) {
                const tlfLink = formatearTelefono(cli.telefono);
                const montoUSD = parseFloat(cli.deuda || 0).toFixed(2); const montoVES = (parseFloat(cli.deuda || 0) * tasaBCV).toFixed(2);
                const mensaje = `Hola ${cli.nombre}, te saludamos de Pasión Paraguanera. Te escribimos para recordarte amablemente que tienes un saldo pendiente por cancelar de *$${montoUSD}* (Equivalente a *Bs. ${montoVES}* a la tasa de hoy). ¡Agradecemos tu pronta atención!`;
                window.open(`https://wa.me/${tlfLink}?text=${mensaje}`, "_blank");
            }
        }
        if (e.target.closest(".btn-promo-cli")) {
            const cli = clientesActuales.find(c => c.id === e.target.closest(".btn-promo-cli").getAttribute("data-id"));
            if (cli && cli.telefono) {
                const tlfLink = formatearTelefono(cli.telefono);
                const mensaje = `¡Hola ${cli.nombre}! Te saludamos de Pasión Paraguanera. Acabamos de actualizar nuestro catálogo con mercancía nueva y queríamos que fueras de los primeros en verla. Échale un ojo aquí: https://pasion-paraguanera-app.vercel.app/`;
                window.open(`https://wa.me/${tlfLink}?text=${mensaje}`, "_blank");
            }
        }
        if (e.target.closest(".btn-abonar-cli")) {
            const id = e.target.closest(".btn-abonar-cli").getAttribute("data-id");
            const cli = clientesActuales.find(c => c.id === id);
            if (cli) {
                const montoActual = parseFloat(cli.deuda || 0);
                Swal.fire({
                    title: `Abono de ${cli.nombre}`,
                    text: `Deuda actual: $${montoActual.toFixed(2)}`,
                    input: 'text',
                    inputPlaceholder: 'Ej: 5',
                    showCancelButton: true,
                    confirmButtonText: 'Registrar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#4caf50'
                }).then(async (result) => {
                    if (result.isConfirmed && result.value) {
                        const abono = parseFloat(result.value.replace(',', '.'));
                        if (!isNaN(abono) && abono > 0) {
                            let nuevaDeuda = montoActual - abono;
                            let nuevoEstado = cli.estado;
                            
                            if (nuevaDeuda <= 0) {
                                nuevaDeuda = 0;
                                nuevoEstado = "Al día";
                                Toast.fire({ icon: 'success', title: '¡Deuda saldada!', text: `${cli.nombre} está solvente.` });
                            } else {
                                Toast.fire({ icon: 'success', title: 'Abono registrado', text: `Nueva deuda: $${nuevaDeuda.toFixed(2)}` });
                            }
                            
                            try {
                                const btn = e.target.closest(".btn-abonar-cli");
                                btn.textContent = "Procesando...";
                                await updateDoc(doc(db, "clientes", id), { deuda: nuevaDeuda, estado: nuevoEstado });
                            } catch (error) {
                                Swal.fire({ title: "Error", text: "Motivo: " + error.message, icon: "error" });
                            }
                        } else {
                            Swal.fire({ title: "Monto inválido", text: "Por favor ingresa un monto mayor a 0.", icon: "warning" });
                        }
                    }
                });
            }
        }
    });

    // SISTEMA DE RENDERIZADO Y BUSCADOR INTELIGENTE DE CLIENTES
    function renderizarClientes() {
        listaClientesDiv.innerHTML = "";

        let divBuscador = document.getElementById("contenedor-buscador-cli");
        if (!divBuscador) {
            divBuscador = document.createElement("div");
            divBuscador.id = "contenedor-buscador-cli";
            divBuscador.style.cssText = "margin-bottom: 15px; width: 100%;";
            divBuscador.innerHTML = `<input type="text" id="input-buscador-cli" placeholder="🔍 Buscar cliente por nombre o teléfono..." style="width: 100%; padding: 12px; border-radius: 6px; border: 1px solid #444; background: #222; color: white; font-size: 15px; box-sizing: border-box;">`;
            listaClientesDiv.parentNode.insertBefore(divBuscador, listaClientesDiv);
            
            document.getElementById("input-buscador-cli").addEventListener("input", renderizarClientes);
        }

        let divResumenDeudas = document.getElementById("resumen-total-deudas");
        if (!divResumenDeudas) {
            divResumenDeudas = document.createElement("div");
            divResumenDeudas.id = "resumen-total-deudas";
            divResumenDeudas.style.cssText = "background-color: #421818; padding: 15px; border-radius: 6px; margin-bottom: 20px; text-align: center; border: 1px solid #f44336;";
            listaClientesDiv.parentNode.insertBefore(divResumenDeudas, listaClientesDiv);
        }

        if (clientesActuales.length === 0) {
            divResumenDeudas.style.display = "none";
            divBuscador.style.display = "none";
            listaClientesDiv.innerHTML = "<p style='text-align:center; color:#aaa; width:100%;'>No hay clientes registrados aún.</p>";
            return;
        } else {
            divResumenDeudas.style.display = "block";
            divBuscador.style.display = "block";
        }

        let totalDeudaPendiente = 0;
        clientesActuales.forEach(cli => {
            totalDeudaPendiente += parseFloat(cli.deuda || 0);
        });

        const textoBusqueda = document.getElementById("input-buscador-cli") ? document.getElementById("input-buscador-cli").value.toLowerCase() : "";

        const clientesMostrados = clientesActuales.filter(cli => {
            const nombre = (cli.nombre || "").toLowerCase();
            const tlf = (cli.telefono || "").toLowerCase();
            return nombre.includes(textoBusqueda) || tlf.includes(textoBusqueda);
        });

        if (clientesMostrados.length === 0) {
            listaClientesDiv.innerHTML = "<p style='text-align:center; color:#aaa; width:100%;'>No se encontraron resultados para tu búsqueda.</p>";
        }

        clientesMostrados.forEach((cli) => {
            const nombre = cli.nombre || "Sin nombre"; const telefono = cli.telefono || "Sin número"; const direccion = cli.direccion || "Sin dirección registrada";
            const estado = cli.estado || "Al día"; const deudaNum = parseFloat(cli.deuda || 0);
            
            const divCli = document.createElement("div"); divCli.classList.add("item-producto"); divCli.style.borderTopColor = estado === "Con Deuda" ? "#f44336" : "#4caf50";
            let seccionDeuda = estado === "Con Deuda" && deudaNum > 0 ? `<div style="background-color: #421818; padding: 6px; border-radius: 4px; margin-bottom: 10px;"><span style="color: #ff6b6b; font-weight: bold; font-size: 14px;">Deuda: $${deudaNum.toFixed(2)}</span></div>` : `<div style="background-color: #1b3a20; padding: 6px; border-radius: 4px; margin-bottom: 10px;"><span style="color: #81c784; font-weight: bold; font-size: 14px;">Cliente Solvente</span></div>`;
            
            let btnAbonar = estado === "Con Deuda" && deudaNum > 0 ? `<button class="btn-abonar-cli" data-id="${cli.id}" style="width: 100%; margin-bottom: 10px; background-color: #4caf50; color: white; font-size: 13px; padding: 8px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">💵 Registrar Abono</button>` : "";
            
            let btnCobrar = estado === "Con Deuda" && deudaNum > 0 ? `<button class="btn-cobrar-cli btn-whatsapp" data-id="${cli.id}" style="width: 100%; margin-bottom: 10px; font-size: 13px; padding: 8px;">📲 Enviar Recordatorio</button>` : "";
            let btnPromo = `<button class="btn-promo-cli" data-id="${cli.id}" style="width: 100%; margin-bottom: 10px; background-color: #0288d1; color: white; font-size: 13px; padding: 8px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">📢 Enviar Promo</button>`;

            divCli.innerHTML = `<div style="display: flex; flex-direction: column; height: 100%; width: 100%; justify-content: space-between;"><div style="text-align: center; margin-bottom: 15px;"><h4 style="margin: 0 0 5px 0; color: #f1faee; font-size: 16px;">👤 ${nombre}</h4><p style="margin: 0 0 5px 0; font-size: 13px; color: #bbb;">📞 ${telefono}</p><p style="margin: 0 0 10px 0; font-size: 12px; color: #aaa;">📍 ${direccion}</p>${seccionDeuda}</div><div style="width: 100%;">${btnAbonar}${btnCobrar}${btnPromo}<div style="display: flex; gap: 8px; justify-content: space-between; width: 100%;"><button class="btn-editar-cli" data-id="${cli.id}" style="background: #ffc107; color: #000; width: 48%; padding: 8px; font-size: 13px; margin: 0; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">✏️ Editar</button><button class="btn-eliminar-cli" data-id="${cli.id}" style="background: #f44336; color: #fff; width: 48%; padding: 8px; font-size: 13px; margin: 0; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">🗑️ Eliminar</button></div></div></div>`;
            listaClientesDiv.appendChild(divCli);
        });

        const totalDeudaBs = (totalDeudaPendiente * tasaBCV).toFixed(2);
        divResumenDeudas.innerHTML = `<h3 style="margin: 0 0 5px 0; color: #ff6b6b; font-size: 16px;">📕 Total Cuentas por Cobrar (Deudas)</h3><span style="font-size: 22px; color: #fff; font-weight: bold;">$${totalDeudaPendiente.toFixed(2)}</span> <span style="color: #bbb; font-size: 14px;">| Bs. ${totalDeudaBs}</span>`;
    }

    listaPedidosDiv.addEventListener("click", (e) => {
        if (e.target.closest(".btn-estado-ped")) { 
            updateDoc(doc(db, "pedidos", e.target.closest(".btn-estado-ped").getAttribute("data-id")), { estado: e.target.closest(".btn-estado-ped").getAttribute("data-estado") }); 
        }
        if (e.target.closest(".btn-eliminar-ped")) { 
            Swal.fire({
                title: '¿Borrar factura?',
                text: "Esta factura desaparecerá del historial.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#333',
                cancelButtonColor: '#555',
                confirmButtonText: 'Sí, borrar',
                cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        await deleteDoc(doc(db, "pedidos", e.target.closest(".btn-eliminar-ped").getAttribute("data-id")));
                    } catch (error) {
                        Swal.fire({ title: "Error", text: error.message, icon: "error" });
                    }
                }
            });
        }
    });

    function renderizarPedidos() {
        let divFiltros = document.getElementById("contenedor-filtros-pedidos");
        if (!divFiltros) {
            divFiltros = document.createElement("div");
            divFiltros.id = "contenedor-filtros-pedidos";
            divFiltros.style.cssText = "background-color: #1a1a1a; padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #333; display: flex; flex-direction: column; gap: 10px;";
            divFiltros.innerHTML = `
                <div style="display: flex; gap: 10px; justify-content: space-between;">
                    <select id="filtro-mes" style="width: 48%; padding: 8px; background: #333; color: white; border: 1px solid #555; border-radius: 4px; font-size: 14px;">
                        <option value="todos">Todos los meses</option>
                        <option value="1">Enero</option>
                        <option value="2">Febrero</option>
                        <option value="3">Marzo</option>
                        <option value="4">Abril</option>
                        <option value="5">Mayo</option>
                        <option value="6">Junio</option>
                        <option value="7">Julio</option>
                        <option value="8">Agosto</option>
                        <option value="9">Septiembre</option>
                        <option value="10">Octubre</option>
                        <option value="11">Noviembre</option>
                        <option value="12">Diciembre</option>
                    </select>
                    <select id="filtro-anio" style="width: 48%; padding: 8px; background: #333; color: white; border: 1px solid #555; border-radius: 4px; font-size: 14px;">
                        <option value="todos">Todos los años</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                        <option value="2028">2028</option>
                    </select>
                </div>
                <div style="text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #444;">
                    <span style="color: #bbb; font-size: 13px;">Ventas del periodo (sin Cancelados):</span><br>
                    <span style="font-size: 22px; color: #81c784; font-weight: bold;" id="total-filtro-usd">$0.00</span> 
                    <span style="color: #bbb; font-size: 14px;">| Bs. <span id="total-filtro-bs">0.00</span></span>
                </div>
            `;
            listaPedidosDiv.parentNode.insertBefore(divFiltros, listaPedidosDiv);
            
            document.getElementById("filtro-mes").addEventListener("change", renderizarPedidos);
            document.getElementById("filtro-anio").addEventListener("change", renderizarPedidos);
        }

        const mesSel = document.getElementById("filtro-mes").value;
        const anioSel = document.getElementById("filtro-anio").value;

        let totalUSDPeriodo = 0;
        listaPedidosDiv.innerHTML = "";

        const pedidosFiltrados = pedidosActuales.filter(pedido => {
            if (!pedido.fecha) return mesSel === "todos" && anioSel === "todos";
            const fechaObj = new Date(pedido.fecha.toMillis());
            const mesPedido = (fechaObj.getMonth() + 1).toString();
            const anioPedido = fechaObj.getFullYear().toString();
            
            const pasaMes = (mesSel === "todos" || mesSel === mesPedido);
            const pasaAnio = (anioSel === "todos" || anioSel === anioPedido);
            
            return pasaMes && pasaAnio;
        });

        if (pedidosFiltrados.length === 0) {
            listaPedidosDiv.innerHTML = "<p style='text-align:center; color:#aaa; font-size:14px;'>No hay pedidos registrados para esta fecha.</p>";
        } else {
            pedidosFiltrados.forEach((pedido) => {
                const estado = pedido.estado || "Pendiente"; 
                const fechaStr = pedido.fecha ? new Date(pedido.fecha.toMillis()).toLocaleString() : "Fecha desconocida"; 
                const dirPed = pedido.direccion || "Sin dirección";
                
                let colorClase = estado === "Pendiente" ? "" : estado === "Completado" ? "completado" : "cancelado";
                let etiqueta = estado === "Pendiente" ? "🟡 Pendiente" : estado === "Completado" ? "🟢 Completado" : "🔴 Cancelado";
                
                let etiquetaModalidad = pedido.modalidadPago === "A Crédito" ? `<span style="background-color: #ff9800; color: #000; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-left: 5px;">A CRÉDITO</span>` : `<span style="background-color: #4caf50; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-left: 5px;">CONTADO</span>`;

                let listaItems = ""; 
                if (pedido.productos && Array.isArray(pedido.productos)) { 
                    pedido.productos.forEach(p => { listaItems += `<li>${p.cantidad}x ${p.nombre} ($${p.precio})</li>`; }); 
                }

                if (estado !== "Cancelado") {
                    totalUSDPeriodo += parseFloat(pedido.totalUSD || 0);
                }

                const divPed = document.createElement("div"); divPed.className = `tarjeta-pedido ${colorClase}`;
                divPed.innerHTML = `<div class="pedido-header"><h4>👤 ${pedido.cliente}</h4><span class="estado-badge">${etiqueta}</span></div><div class="pedido-cuerpo"><p>📞 WhatsApp: ${pedido.telefono}</p><p>📍 Dirección: ${dirPed}</p><p>🕒 Fecha: ${fechaStr}</p><p>💳 Modalidad: ${etiquetaModalidad}</p><ul>${listaItems}</ul><div class="totales">Total: $${parseFloat(pedido.totalUSD).toFixed(2)} | Bs. ${parseFloat(pedido.totalVES).toFixed(2)}</div></div><div class="pedido-acciones"><button class="btn-estado-ped" data-id="${pedido.id}" data-estado="Completado" style="background-color: #4caf50;">✔️ Listo</button><button class="btn-estado-ped" data-id="${pedido.id}" data-estado="Pendiente" style="background-color: #ff9800; color: #000;">🟡 Pdte</button><button class="btn-estado-ped" data-id="${pedido.id}" data-estado="Cancelado" style="background-color: #f44336;">❌ Canc</button><button class="btn-eliminar-ped" data-id="${pedido.id}" style="background-color: #333;">🗑️ Borrar</button></div>`;
                listaPedidosDiv.appendChild(divPed);
            });
        }

        document.getElementById("total-filtro-usd").textContent = "$" + totalUSDPeriodo.toFixed(2);
        document.getElementById("total-filtro-bs").textContent = (totalUSDPeriodo * tasaBCV).toFixed(2);
    }

    catalogoPublico.addEventListener("click", (e) => {
        if (e.target.closest(".btn-agregar-carrito")) {
            const btn = e.target.closest(".btn-agregar-carrito"); const id = btn.getAttribute("data-id"); const prod = productosActuales.find(p => p.id === id);
            if (prod) {
                const stockDisponible = parseInt(prod.stock) || 0; const index = carrito.findIndex(item => item.id === id); let cantidadActual = index > -1 ? carrito[index].cantidad : 0;
                if (cantidadActual >= stockDisponible) { 
                    Swal.fire({ title: "Límite alcanzado", text: `¡Lo sentimos! Solo quedan ${stockDisponible} unidades disponibles.`, icon: "warning" }); 
                    return; 
                }
                if (index > -1) { carrito[index].cantidad++; } else { carrito.push({ ...prod, cantidad: 1 }); }
                const textoOriginal = btn.innerHTML; btn.innerHTML = "¡Agregado! ✔️"; btn.style.backgroundColor = "#4caf50"; setTimeout(() => { btn.innerHTML = textoOriginal; btn.style.backgroundColor = "#25D366"; }, 1000); actualizarInterfazCarrito();
            }
        }
    });

    btnCarritoFlotante.addEventListener("click", () => { renderizarListaCarrito(); modalCarrito.classList.remove("oculto"); });
    btnCerrarCarrito.addEventListener("click", () => { modalCarrito.classList.add("oculto"); });
    btnVaciarCarrito.addEventListener("click", () => { 
        Swal.fire({
            title: '¿Vaciar el carrito?',
            text: "Se cancelará el pedido actual.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f44336',
            cancelButtonColor: '#555',
            confirmButtonText: 'Sí, vaciar',
            cancelButtonText: 'Volver'
        }).then((result) => {
            if (result.isConfirmed) {
                carrito = []; actualizarInterfazCarrito(); modalCarrito.classList.add("oculto");
            }
        });
    });

    listaCarritoDiv.addEventListener("click", (e) => {
        if (e.target.closest(".btn-cantidad")) {
            const btn = e.target.closest(".btn-cantidad"); const id = btn.getAttribute("data-id"); const accion = btn.getAttribute("data-accion"); const index = carrito.findIndex(item => item.id === id);
            if (index > -1) {
                const prod = productosActuales.find(p => p.id === id); const stockDisponible = prod ? parseInt(prod.stock) || 0 : 0;
                if (accion === "sumar") { 
                    if (carrito[index].cantidad >= stockDisponible) { 
                        Swal.fire({ title: "Límite alcanzado", text: "No hay más stock disponible de este producto.", icon: "info" }); 
                    } else { carrito[index].cantidad++; } 
                } 
                else if (accion === "restar") { carrito[index].cantidad--; if (carrito[index].cantidad === 0) { carrito.splice(index, 1); } }
                actualizarInterfazCarrito(); renderizarListaCarrito(); if (carrito.length === 0) { modalCarrito.classList.add("oculto"); }
            }
        }
    });

    btnEnviarWhatsapp.addEventListener("click", async () => {
        if (carrito.length === 0) return;
        const nombreCliente = cartNombreInput.value.trim();
        const tlfCliente = cartTelefonoInput.value.trim();
        const dirCliente = cartDireccionInput.value.trim();

        if (nombreCliente === "" || tlfCliente === "" || dirCliente === "") { 
            Swal.fire({ title: "Faltan datos", text: "Por favor, completa todos tus datos para procesar el pedido.", icon: "warning" }); 
            return; 
        }

        const btn = document.getElementById("btn-enviar-whatsapp"); const textoOriginal = btn.innerHTML; btn.innerHTML = "Procesando pedido..."; btn.disabled = true;

        let total = 0; let mensaje = `¡Hola Pasión Paraguanera! Soy *${nombreCliente}*. Quisiera hacer el siguiente pedido:%0A%0A`;
        const arrayProductosFactura = [];

        carrito.forEach(item => {
            const precioNum = typeof item.precio === 'number' ? item.precio : parseFloat(item.precio || 0);
            const subtotal = item.cantidad * precioNum; total += subtotal;
            mensaje += `🔹 ${item.cantidad}x *${item.nombre}* ($${precioNum.toFixed(2)} c/u) = $${subtotal.toFixed(2)}%0A`;
            arrayProductosFactura.push({ id: item.id, nombre: item.nombre, cantidad: item.cantidad, precio: precioNum.toFixed(2) });
        });

        const totalBs = (total * tasaBCV).toFixed(2);
        
        const tipoPagoSelect = document.getElementById("cart-tipo-pago");
        const tipoPago = tipoPagoSelect ? tipoPagoSelect.value : "contado";
        const modalidadTexto = tipoPago === "credito" ? "A CRÉDITO (Por cuotas) 🗓️" : "CONTADO (Completo) 💵";

        mensaje += `%0A*TOTAL A PAGAR:*%0A💵 *$${total.toFixed(2)}*%0A🇻🇪 *Bs. ${totalBs}* (A tasa de Bs. ${tasaBCV.toFixed(2)})%0A%0A*MODALIDAD DE PAGO:* ${modalidadTexto}%0A📍 *Dirección de entrega:* ${dirCliente}%0A%0A¿Tienen disponibilidad?`;

        try {
            const tlfLimpio = formatearTelefono(tlfCliente);

            localStorage.setItem("pp_nombre", nombreCliente);
            localStorage.setItem("pp_telefono", tlfLimpio);
            localStorage.setItem("pp_direccion", dirCliente);

            await addDoc(collection(db, "pedidos"), {
                cliente: nombreCliente, telefono: tlfLimpio, direccion: dirCliente, productos: arrayProductosFactura,
                totalUSD: total.toFixed(2), totalVES: totalBs, modalidadPago: tipoPago === "credito" ? "A Crédito" : "Contado", estado: "Pendiente", fecha: serverTimestamp()
            });

            const datosActualizacionCliente = {
                nombre: nombreCliente, 
                telefono: tlfLimpio, 
                direccion: dirCliente, 
                fechaUltimoPedido: serverTimestamp()
            };

            if (tipoPago === "credito") {
                datosActualizacionCliente.deuda = increment(total);
                datosActualizacionCliente.estado = "Con Deuda";
            }

            await setDoc(doc(db, "clientes", tlfLimpio), datosActualizacionCliente, { merge: true });

            for (const item of carrito) {
                const productoRef = doc(db, "productos", item.id);
                await updateDoc(productoRef, { stock: increment(-item.cantidad) });
            }

            carrito = []; actualizarInterfazCarrito(); modalCarrito.classList.add("oculto");
            
            window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${mensaje}`, "_blank"); 

        } catch (error) { 
            Swal.fire({ title: "Error", text: "Motivo: " + error.message, icon: "error" }); 
        } 
        finally { btn.innerHTML = textoOriginal; btn.disabled = false; }
    });

    function actualizarInterfazCarrito() {
        const totalArticulos = carrito.reduce((sum, item) => sum + item.cantidad, 0); contadorCarrito.textContent = totalArticulos;
        if (totalArticulos > 0) { btnCarritoFlotante.classList.remove("oculto"); } else { btnCarritoFlotante.classList.add("oculto"); }
    }

    function renderizarListaCarrito() {
        listaCarritoDiv.innerHTML = ""; let total = 0;
        carrito.forEach(item => {
            const precioNum = typeof item.precio === 'number' ? item.precio : parseFloat(item.precio || 0); const subtotal = item.cantidad * precioNum; total += subtotal;
            const div = document.createElement("div"); div.classList.add("item-carrito");
            div.innerHTML = `<div class="info-item-carrito"><h4>${item.nombre}</h4><p style="font-size: 13px; color: #bbb;">$${precioNum.toFixed(2)} (Bs. ${(precioNum * tasaBCV).toFixed(2)}) c/u</p></div><div class="controles-cantidad"><button class="btn-cantidad" data-id="${item.id}" data-accion="restar">-</button><span style="color: white; font-weight: bold; width: 20px; text-align: center;">${item.cantidad}</span><button class="btn-cantidad" data-id="${item.id}" data-accion="sumar">+</button></div>`;
            listaCarritoDiv.appendChild(div);
        });
        totalPrecioSpan.textContent = total.toFixed(2); totalPrecioBsSpan.textContent = (total * tasaBCV).toFixed(2);
    }
});
