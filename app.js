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
let proveedorEnEdicionId = null; // NUEVO: Para editar proveedores
let productosActuales = []; 
let clientesActuales = [];
let proveedoresActuales = []; // NUEVO: Lista de proveedores
let pedidosActuales = [];
let gastosActuales = []; 
let carrito = []; 
let carritoAdmin = []; 
let tasaBCV = 1;

let unsubClientes = null;
let unsubProveedores = null; // NUEVO: Listener de proveedores
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

    // ==========================================
    // INYECCIÓN DE LA CASILLA DE "COSTO" AL PRODUCTO
    // ==========================================
    const prodPrecioInput = document.getElementById("prod-precio");
    let prodCostoInput = document.getElementById("prod-costo");
    if (!prodCostoInput && prodPrecioInput) {
        prodCostoInput = document.createElement("input");
        prodCostoInput.type = "number";
        prodCostoInput.id = "prod-costo";
        prodCostoInput.placeholder = "Costo de compra unitario ($)";
        prodCostoInput.step = "0.01";
        prodCostoInput.min = "0";
        prodCostoInput.required = true;
        prodCostoInput.style.cssText = "width: 100%; padding: 10px; border-radius: 4px; border: 1px solid #444; background: #222; color: white; margin-bottom: 10px; box-sizing: border-box;";
        prodPrecioInput.parentNode.insertBefore(prodCostoInput, prodPrecioInput);
    }

    // ==========================================
    // NUEVO MÓDULO: PROVEEDORES (CUENTAS POR PAGAR)
    // ==========================================
    let btnProveedores = document.getElementById("btn-proveedores");
    if (!btnProveedores && btnClientes) {
        btnProveedores = document.createElement("button");
        btnProveedores.id = "btn-proveedores";
        btnProveedores.className = btnClientes.className; 
        btnProveedores.style.cssText = "background-color: #ff9800; color: #000; padding: 15px; margin-top: 10px; margin-bottom: 10px; width: 100%; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;";
        btnProveedores.innerHTML = "🚚 Proveedores (Cuentas x Pagar)";
        btnClientes.parentNode.insertBefore(btnProveedores, btnClientes.nextSibling);
    }

    let moduloProveedores = document.getElementById("modulo-proveedores");
    if (!moduloProveedores) {
        moduloProveedores = document.createElement("div");
        moduloProveedores.id = "modulo-proveedores";
        moduloProveedores.classList.add("oculto");
        moduloProveedores.innerHTML = `
            <div style="text-align: left; margin-bottom: 20px;">
                <button id="btn-volver-admin-prov" style="background-color: transparent; color: #ff9800; padding: 8px 16px; border: 1px solid #ff9800; border-radius: 20px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: bold; width: max-content; transition: all 0.2s;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/></svg>
                    Volver al Panel
                </button>
            </div>
            <h2 style="text-align: center; color: #ff9800; margin-bottom: 10px;">🚚 Cuentas por Pagar</h2>
            <p style="text-align: center; font-size: 13px; color: #aaa; margin-bottom: 20px;">Registra a tus proveedores y controla las deudas del negocio.</p>
            
            <div style="background-color: #1a1a1a; padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #333;">
                <form id="form-proveedor" style="display: flex; flex-direction: column; gap: 10px;">
                    <input type="text" id="prov-nombre" placeholder="Nombre del Proveedor o Empresa" required style="padding: 10px; border-radius: 4px; border: 1px solid #444; background: #222; color: white;">
                    <input type="text" id="prov-telefono" placeholder="Teléfono / WhatsApp" required style="padding: 10px; border-radius: 4px; border: 1px solid #444; background: #222; color: white;">
                    <input type="text" id="prov-concepto" placeholder="Concepto (Ej: Mercancía, Empaques, Servicios)" required style="padding: 10px; border-radius: 4px; border: 1px solid #444; background: #222; color: white;">
                    <input type="number" id="prov-deuda" placeholder="Deuda actual en $" required min="0" step="0.01" value="0" style="padding: 10px; border-radius: 4px; border: 1px solid #444; background: #222; color: white;">
                    <button type="submit" id="btn-guardar-prov" style="background-color: #ff9800; color: #000; padding: 12px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 10px;">Registrar Proveedor</button>
                </form>
            </div>
            <div id="lista-proveedores" style="display: flex; flex-direction: column; gap: 10px;"></div>
        `;
        
        if (moduloClientes) {
            moduloClientes.parentNode.insertBefore(moduloProveedores, moduloClientes.nextSibling);
        }
    }

    const btnVolverAdminProv = document.getElementById("btn-volver-admin-prov");
    const formProveedor = document.getElementById("form-proveedor");
    const btnGuardarProv = document.getElementById("btn-guardar-prov");
    const listaProveedoresDiv = document.getElementById("lista-proveedores");

    if (btnProveedores) {
        btnProveedores.addEventListener("click", () => { 
            vistaAdmin.classList.add("oculto"); 
            moduloProveedores.classList.remove("oculto"); 
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    if (btnVolverAdminProv) {
        btnVolverAdminProv.addEventListener("click", () => { 
            moduloProveedores.classList.add("oculto"); 
            vistaAdmin.classList.remove("oculto"); 
            if(proveedorEnEdicionId) {
                formProveedor.reset();
                document.getElementById("prov-deuda").value = "0";
                proveedorEnEdicionId = null;
                btnGuardarProv.textContent = "Registrar Proveedor";
                btnGuardarProv.style.backgroundColor = "#ff9800";
            }
        });
    }

    formProveedor.addEventListener("submit", async (e) => {
        e.preventDefault();
        btnGuardarProv.disabled = true;
        const textoOriginal = btnGuardarProv.textContent;
        btnGuardarProv.textContent = "Guardando...";

        try {
            const datosProv = {
                nombre: document.getElementById("prov-nombre").value,
                telefono: document.getElementById("prov-telefono").value,
                concepto: document.getElementById("prov-concepto").value,
                deuda: parseFloat(document.getElementById("prov-deuda").value) || 0,
            };

            if (proveedorEnEdicionId) { 
                await updateDoc(doc(db, "proveedores", proveedorEnEdicionId), datosProv); 
                proveedorEnEdicionId = null; 
                btnGuardarProv.textContent = "¡Actualizado!"; 
            } else { 
                datosProv.fechaRegistro = serverTimestamp(); 
                await addDoc(collection(db, "proveedores"), datosProv); 
                btnGuardarProv.textContent = "¡Registrado!"; 
            }
            
            formProveedor.reset(); 
            document.getElementById("prov-deuda").value = "0"; 
            btnGuardarProv.disabled = false; 
            btnGuardarProv.style.backgroundColor = "#ff9800"; 
            setTimeout(() => { btnGuardarProv.textContent = "Registrar Proveedor"; }, 2500);
        } catch (error) { 
            btnGuardarProv.disabled = false; 
            btnGuardarProv.textContent = "Error"; 
            setTimeout(() => { btnGuardarProv.textContent = textoOriginal; }, 3000); 
            Swal.fire({ title: "Error", text: "Motivo: " + error.message, icon: "error" });
        }
    });

    listaProveedoresDiv.addEventListener("click", (e) => {
        if (e.target.closest(".btn-eliminar-prov")) { 
            Swal.fire({
                title: '¿Eliminar proveedor?',
                text: "Borrarás el registro de este proveedor.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#f44336',
                cancelButtonColor: '#555',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        await deleteDoc(doc(db, "proveedores", e.target.closest(".btn-eliminar-prov").getAttribute("data-id")));
                    } catch (error) {
                        Swal.fire({ title: "Error", text: error.message, icon: "error" });
                    }
                }
            });
        }
        if (e.target.closest(".btn-editar-prov")) {
            const id = e.target.closest(".btn-editar-prov").getAttribute("data-id"); 
            const prov = proveedoresActuales.find(p => p.id === id);
            if (prov) {
                document.getElementById("prov-nombre").value = prov.nombre; 
                document.getElementById("prov-telefono").value = prov.telefono;
                document.getElementById("prov-concepto").value = prov.concepto || ""; 
                document.getElementById("prov-deuda").value = prov.deuda; 
                proveedorEnEdicionId = id;
                btnGuardarProv.textContent = "Actualizar Proveedor"; 
                btnGuardarProv.style.backgroundColor = "#ffc107"; 
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
        if (e.target.closest(".btn-abonar-prov")) {
            const id = e.target.closest(".btn-abonar-prov").getAttribute("data-id");
            const prov = proveedoresActuales.find(p => p.id === id);
            if (prov) {
                const montoActual = parseFloat(prov.deuda || 0);
                Swal.fire({
                    title: `Pago a ${prov.nombre}`, text: `Deuda actual: $${montoActual.toFixed(2)}`,
                    input: 'text',
                    inputPlaceholder: 'Ej: 50.00',
                    showCancelButton: true,
                    confirmButtonText: 'Registrar Pago',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#ff9800'
                }).then(async (result) => {
                    if (result.isConfirmed && result.value) {
                        const abono = parseFloat(result.value.replace(',', '.'));
                        if (!isNaN(abono) && abono > 0) {
                            let nuevaDeuda = montoActual - abono;
                            if (nuevaDeuda <= 0) {
                                nuevaDeuda = 0;
                                Swal.fire({ icon: 'success', title: '¡Deuda saldada!', text: `No le debes nada a ${prov.nombre}.`, confirmButtonColor: '#ff9800' });
                            } else {
                                Swal.fire({ icon: 'success', title: 'Pago registrado', text: `La nueva deuda es: $${nuevaDeuda.toFixed(2)}`, confirmButtonColor: '#ff9800' }); } try { await updateDoc(doc(db, "proveedores", id), { deuda: nuevaDeuda }); } catch (error) { Swal.fire({ title: "Error", text: "Motivo: " + error.message, icon: "error" }); } } else { Swal.fire({ title: "Monto inválido", text: "Por favor ingresa un monto mayor a 0.", icon: "warning" }); } } }); } } });  function renderizarProveedores() { if(!listaProveedoresDiv) return; listaProveedoresDiv.innerHTML = "";  let divResumenProv = document.getElementById("resumen-total-proveedores"); if (!divResumenProv) { divResumenProv = document.createElement("div"); divResumenProv.id = "resumen-total-proveedores"; divResumenProv.style.cssText = "background-color: #3e270b; padding: 15px; border-radius: 6px; margin-bottom: 20px; text-align: center; border: 1px solid #ff9800;"; listaProveedoresDiv.parentNode.insertBefore(divResumenProv, listaProveedoresDiv); }  if (proveedoresActuales.length === 0) { divResumenProv.style.display = "none"; listaProveedoresDiv.innerHTML = "<p style='text-align:center; color:#aaa; width:100\%;'>No hay proveedores ni deudas registradas.</p>"; return; } else { divResumenProv.style.display = "block"; }  let totalCuentasPorPagar = 0;  proveedoresActuales.forEach((prov) => { const nombre = prov.nombre \vert{}\vert{} "Sin nombre"; const telefono = prov.telefono \vert{}\vert{} "Sin número"; const concepto = prov.concepto \vert{}\vert{} ""; const deudaNum = parseFloat(prov.deuda \vert{}\vert{} 0);  totalCuentasPorPagar += deudaNum;  const divProv = document.createElement("div"); divProv.classList.add("item-producto"); divProv.style.borderTopColor = deudaNum > 0 ? "#f44336" : "#4caf50";  let seccionDeuda = deudaNum > 0 ? `<div style="background-color: #421818; padding: 6px; border-radius: 4px; margin-bottom: 10px;"><span style="color: #ff6b6b; font-weight: bold; font-size: 14px;">Debes: $${deudaNum.toFixed(2)}</span></div>` 
                : `<div style="background-color: #1b3a20; padding: 6px; border-radius: 4px; margin-bottom: 10px;"><span style="color: #81c784; font-weight: bold; font-size: 14px;">Proveedor Solvente</span></div>`;
            
            let btnAbonar = deudaNum > 0 ? `<button class="btn-abonar-prov" data-id="${prov.id}" style="width: 100%; margin-bottom: 10px; background-color: #ff9800; color: #000; font-size: 13px; padding: 8px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">💵 Registrar Pago al Proveedor</button>` : "";
            
            divProv.innerHTML = `
                <div style="display: flex; flex-direction: column; height: 100%; width: 100%; justify-content: space-between;">
                    <div style="text-align: center; margin-bottom: 15px;">
                        <h4 style="margin: 0 0 5px 0; color: #f1faee; font-size: 16px;">🚚 ${nombre}</h4>
                        <p style="margin: 0 0 5px 0; font-size: 13px; color: #bbb;">📞 ${telefono}</p>
                        <p style="margin: 0 0 10px 0; font-size: 12px; color: #aaa;">📦 Concepto: ${concepto}</p>${seccionDeuda}
                    </div>
                    <div style="width: 100%;">
                        ${btnAbonar}
                        <div style="display: flex; gap: 8px; justify-content: space-between; width: 100%;">
                            <button class="btn-editar-prov" data-id="${prov.id}" style="background: #ffc107; color: #000; width: 48%; padding: 8px; font-size: 13px; margin: 0; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">✏️ Editar</button>
                            <button class="btn-eliminar-prov" data-id="${prov.id}" style="background: #f44336; color: #fff; width: 48\%; padding: 8px; font-size: 13px; margin: 0; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">🗑️ Eliminar</button> </div> </div> </div>`; listaProveedoresDiv.appendChild(divProv); });  const totalDeudaBs = (totalCuentasPorPagar * tasaBCV).toFixed(2); divResumenProv.innerHTML = `<h3 style="margin: 0 0 5px 0; color: #ff9800; font-size: 16px;">🏢 Total Cuentas por Pagar (Proveedores)</h3><span style="font-size: 22px; color: #fff; font-weight: bold;">$${totalCuentasPorPagar.toFixed(2)}</span> <span style="color: #bbb; font-size: 14px;">| Bs. ${totalDeudaBs}</span>`;
    }

    // ==========================================
    // MÓDULO DE GASTOS
    // ==========================================
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
                <button id="btn-volver-admin-gas" style="background-color: transparent; color: #ff80ab; padding: 8px 16px; border: 1px solid #e91e63; border-radius: 20px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: bold; width: max-content; transition: all 0.2s;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/></svg>
                    Volver al Panel
                </button>
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
                    <button type="submit" id="btn-guardar-gas" style="background-color: #e91e63; color: white; padding: 12px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 10px;">Registrar Gasto (Solo Dinero) 💸</button>
                </form>
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
            btnGuardarGas.textContent = "Registrar Gasto (Solo Dinero) 💸";
            btnGuardarGas.style.backgroundColor = "#e91e63";
        } else {
            gasMontoCantidad.placeholder = "Cantidad a restar del inventario (Unidades)";
            gasMontoCantidad.step = "1";
            gasMontoCantidad.min = "1";
            btnGuardarGas.textContent = "Restar del Inventario 📦";
            btnGuardarGas.style.backgroundColor = "#ff80ab";
            btnGuardarGas.style.color = "#000";
        }
        gasMontoCantidad.value = "";
    });

    formGasto.addEventListener("submit", async (e) => {
        e.preventDefault();
        btnGuardarGas.disabled = true;
        const textoOriginal = btnGuardarGas.textContent;
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
                    Swal.fire({ title: "Stock insuficiente", text: `Solo quedan ${stockDisponible} unidades de ${prod.nombre}.`, icon: "warning" }); btnGuardarGas.disabled = false; btnGuardarGas.textContent = textoOriginal; return; }  totalUSD = cantidad * parseFloat(prod.precio \vert{}\vert{} 0);  await addDoc(collection(db, "gastos"), { concepto: concepto, tipo: "Retiro de Inventario", productoId: prod.id, productoNombre: prod.nombre, cantidad: cantidad, totalUSD: totalUSD, fecha: serverTimestamp() });  await updateDoc(doc(db, "productos", prod.id), { stock: increment(-cantidad) }); }  Toast.fire({ icon: 'success', title: 'Gasto Registrado', text: `Contabilizado: $${totalUSD.toFixed(2)}`
            });
            
            formGasto.reset();
            gasMontoCantidad.placeholder = "Monto del gasto en $";
            gasMontoCantidad.step = "0.01";
            gasMontoCantidad.min = "0.01";
            btnGuardarGas.textContent = "Registrar Gasto (Solo Dinero) 💸";
            btnGuardarGas.style.backgroundColor = "#e91e63";
            btnGuardarGas.style.color = "#fff";
        } catch (error) {
            Swal.fire({ title: "Error de Conexión", text: "Motivo: " + error.message, icon: "error" });
        } finally {
            btnGuardarGas.disabled = false;
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

        let divFiltrosGas = document.getElementById("contenedor-filtros-gastos");
        if (!divFiltrosGas) {
            divFiltrosGas = document.createElement("div");
            divFiltrosGas.id = "contenedor-filtros-gastos";
            divFiltrosGas.style.cssText = "background-color: #33151d; padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #e91e63; display: flex; flex-direction: column; gap: 10px;";
            
            const currentYear = new Date().getFullYear();
            let yearOptions = `<option value="todos">Todos los años</option>`;
            for(let y = 2024; y <= currentYear + 2; y++) {
                yearOptions += `<option value="${y}">${y}</option>`;
            }

            divFiltrosGas.innerHTML = `
                <div style="display: flex; gap: 10px; justify-content: space-between;">
                    <select id="filtro-mes-gas" style="width: 48%; padding: 8px; background: #222; color: white; border: 1px solid #e91e63; border-radius: 4px; font-size: 14px;">
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
                    <select id="filtro-anio-gas" style="width: 48%; padding: 8px; background: #222; color: white; border: 1px solid #e91e63; border-radius: 4px; font-size: 14px;">
                        ${yearOptions}
                    </select>
                </div>
                <div style="text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #444;">
                    <h3 style="margin: 0 0 5px 0; color: #ff80ab; font-size: 16px;">💰 Total Gastos del Periodo</h3>
                    <span style="font-size: 22px; color: #fff; font-weight: bold;" id="total-gas-usd">$0.00</span> 
                    <span style="color: #bbb; font-size: 14px;">| Bs. <span id="total-gas-bs">0.00</span></span>
                </div>
            `;
            listaGastosDiv.parentNode.insertBefore(divFiltrosGas, listaGastosDiv);
            
            document.getElementById("filtro-mes-gas").value = (new Date().getMonth() + 1).toString();
            document.getElementById("filtro-anio-gas").value = currentYear.toString();

            document.getElementById("filtro-mes-gas").addEventListener("change", renderizarGastos);
            document.getElementById("filtro-anio-gas").addEventListener("change", renderizarGastos);
        }

        const mesSel = document.getElementById("filtro-mes-gas").value;
        const anioSel = document.getElementById("filtro-anio-gas").value;

        listaGastosDiv.innerHTML = "";
        let totalUSDGastos = 0;

        const gastosFiltrados = gastosActuales.filter(gasto => {
            if (!gasto.fecha) return mesSel === "todos" && anioSel === "todos";
            const fechaObj = new Date(gasto.fecha.toMillis());
            const mesGasto = (fechaObj.getMonth() + 1).toString();
            const anioGasto = fechaObj.getFullYear().toString();
            
            const pasaMes = (mesSel === "todos" || mesSel === mesGasto);
            const pasaAnio = (anioSel === "todos" || anioSel === anioGasto);
            
            return pasaMes && pasaAnio;
        });

        if (gastosFiltrados.length === 0) {
            listaGastosDiv.innerHTML = "<p style='text-align:center; color:#aaa; font-size:14px;'>No hay gastos registrados para este periodo.</p>";
        } else {
            gastosFiltrados.forEach(gasto => {
                const totalUSD = parseFloat(gasto.totalUSD || 0);
                totalUSDGastos += totalUSD;
                const fechaStr = gasto.fecha ? new Date(gasto.fecha.toMillis()).toLocaleString() : "Fecha desconocida";
                
                const div = document.createElement("div");
                div.style.cssText = "background-color: #222; padding: 12px; border-radius: 6px; border-left: 4px solid #e91e63; margin-bottom: 8px;";
                
                let badgeTipo = gasto.tipo === "Externo" 
                    ? `<span style="background: #555; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Gasto Externo/Efectivo</span>`
                    : `<span style="background: #e91e63; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Uso Inventario: ${gasto.cantidad}x${gasto.productoNombre}</span>`;

                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong style="color: white; font-size: 15px;">${gasto.concepto}</strong>
                        <button class="btn-eliminar-gas" data-id="${gasto.id}" data-tipo="${gasto.tipo}" data-prodid="${gasto.productoId}" data-cant="${gasto.cantidad}" style="background: none; border: none; cursor: pointer; font-size: 18px;">🗑️</button>
                    </div>
                    <div style="margin-bottom: 8px;">${badgeTipo}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; color: #bbb; font-size: 12px;">
                        <span>${fechaStr}</span> <strong style="color: #ff80ab; font-size: 15px;">-$${totalUSD.toFixed(2)}</strong>
                    </div>
                `;
                listaGastosDiv.appendChild(div);
            });
        }

        document.getElementById("total-gas-usd").textContent = "$" + totalUSDGastos.toFixed(2);
        document.getElementById("total-gas-bs").textContent = (totalUSDGastos * tasaBCV).toFixed(2);
    }

    // ==========================================
    // MÓDULO: CREAR PEDIDO MANUAL (POS + ASISTENTE IA)
    // ==========================================
    let btnPos = document.getElementById("btn-pos");
    if (!btnPos && btnPedidos) {
        btnPos = document.createElement("button");
        btnPos.id = "btn-pos";
        btnPos.className = btnPedidos.className; 
        btnPos.style.cssText = "background-color: #00bcd4; color: white; padding: 15px; margin-top: 10px; margin-bottom: 10px; width: 100%; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;";
        btnPos.innerHTML = "📝 Crear Pedido Manual";
        let referencia = btnGastos ? btnGastos : btnPedidos;
        referencia.parentNode.insertBefore(btnPos, referencia.nextSibling);
    }

    // ==========================================
    // BOTÓN COPIAR CATÁLOGO PARA WHATSAPP
    // ==========================================
    let btnCopiarCat = document.getElementById("btn-copiar-catalogo");
    if (!btnCopiarCat && btnPedidos) {
        btnCopiarCat = document.createElement("button");
        btnCopiarCat.id = "btn-copiar-catalogo";
        btnCopiarCat.className = btnPedidos.className; 
        btnCopiarCat.style.cssText = "background-color: #25D366; color: white; padding: 15px; margin-top: 10px; margin-bottom: 10px; width: 100%; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;";
        btnCopiarCat.innerHTML = "📲 Copiar Catálogo para WhatsApp";
        let referenciaCopiar = btnPos ? btnPos : (btnGastos ? btnGastos : btnPedidos);
        referenciaCopiar.parentNode.insertBefore(btnCopiarCat, referenciaCopiar.nextSibling);
    }

    if (btnCopiarCat) {
        btnCopiarCat.addEventListener("click", () => {
            let texto = `🌟 *Catálogo Pasión Paraguanera* 🌟\n*(Tasa BCV: Bs. ${tasaBCV.toFixed(2)})*\n\n`;
            let hayProductos = false;
            productosActuales.forEach(prod => {
                const stock = parseInt(prod.stock) || 0;
                if (stock > 0) {
                    hayProductos = true;
                    const precioNum = typeof prod.precio === 'number' ? prod.precio : parseFloat(prod.precio || 0);
                    const precioBs = (precioNum * tasaBCV).toFixed(2);
                    texto += `🔹 *${prod.nombre}* -$${precioNum.toFixed(2)} *(Bs.${precioBs})*\n`;
                }
            });
            if (!hayProductos) { Swal.fire({ title: "Catálogo vacío", text: "No hay productos con stock disponible para mostrar.", icon: "info" }); return; }
            texto += `\n🛒 *Para ver fotos y comprar directo entra aquí:*\n👉 https://pasion-paraguanera-app.vercel.app/`;
            navigator.clipboard.writeText(texto).then(() => { Toast.fire({ icon: 'success', title: '¡Catálogo Copiado!', text: 'Ya puedes pegarlo en WhatsApp.' });
            }).catch(err => { Swal.fire({ title: "Error", text: "No se pudo copiar el texto automáticamente. Intenta de nuevo.", icon: "error" }); });
        });
    }

    let moduloPos = document.getElementById("modulo-pos");
    if (!moduloPos) {
        moduloPos = document.createElement("div");
        moduloPos.id = "modulo-pos";
        moduloPos.classList.add("oculto");
        moduloPos.innerHTML = `
            <div style="text-align: left; margin-bottom: 20px;">
                <button id="btn-volver-admin-pos" style="background-color: transparent; color: #00bcd4; padding: 8px 16px; border: 1px solid #00bcd4; border-radius: 20px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: bold; width: max-content; transition: all 0.2s;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/></svg>
                    Volver al Panel
                </button>
            </div>
            <h2 style="text-align: center; color: #00bcd4; margin-bottom: 10px;">📝 Crear Pedido Manual</h2>
            <p style="text-align: center; font-size: 13px; color: #aaa; margin-bottom: 20px;">Registra compras de ventanilla o clientes que no usan la App.</p>

            <div style="background-color: #161824; padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #7c4dff;">
                <h3 style="color: #b388ff; margin-top: 0; font-size: 15px; border-bottom: 1px solid #2e294e; padding-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                    <span>✨ Pegar Mensaje de WhatsApp (Opcional)</span>
                    <span style="font-size: 11px; background: #2e294e; color: #d1c4e9; padding: 2px 8px; border-radius: 10px;">IA</span>
                </h3>
                <p style="font-size: 12px; color: #bbb; margin-top: 0; margin-bottom: 10px;">Pega el mensaje del cliente y la IA rellenará los datos y el carrito automáticamente.</p>
                <textarea id="pos-ia-texto" rows="3" placeholder="Ej: Hola, soy María (0412
