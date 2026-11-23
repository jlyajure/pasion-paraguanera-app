async function obtenerModelosDiversos(apiKey) {
  const respaldo = [
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-pro-latest',
    'gemini-3.5-flash-lite'
  ];

  try {
    const controller = new AbortController();
    const timeoutLista = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(apiKey),
      { signal: controller.signal }
    );
    clearTimeout(timeoutLista);

    if (!resp.ok) return respaldo;
    const data = await resp.json();
    if (!Array.isArray(data.models)) return respaldo;

    const excluidos = [
      'embedding', 'imagen', 'veo', 'tts', 'audio', 'live',
      'robotics', 'computer-use', 'deep-research', 'aqa', 'vision', 'image', 'gemma',
      'gemini-1.', 'gemini-2.0', 'gemini-2.5'
    ];

    const validos = data.models
      .filter((m) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent')
      )
      .map((m) => String(m.name || '').replace('models/', ''))
      .filter((nombre) => {
        const low = nombre.toLowerCase();
        return low.includes('gemini') && !excluidos.some((ex) => low.includes(ex));
      });

    if (validos.length === 0) return respaldo;

    const flashNormal = validos
      .filter((n) => n.toLowerCase().includes('flash') && !n.toLowerCase().includes('lite'))
      .sort((a, b) => b.localeCompare(a));

    const proModels = validos
      .filter((n) => n.toLowerCase().includes('pro'))
      .sort((a, b) => b.localeCompare(a));

    const flashLite = validos
      .filter((n) => n.toLowerCase().includes('flash') && n.toLowerCase().includes('lite'))
      .sort((a, b) => b.localeCompare(a));

    const otros = validos
      .filter((n) => !flashNormal.includes(n) && !proModels.includes(n) && !flashLite.includes(n))
      .sort((a, b) => b.localeCompare(a));

    const seleccion = [];
    const agregar = (arr, idx) => {
      if (arr[idx] && !seleccion.includes(arr[idx])) seleccion.push(arr[idx]);
    };

    agregar(flashNormal, 0);
    agregar(proModels, 0);
    agregar(flashNormal, 1);
    agregar(flashLite, 0);
    agregar(proModels, 1);
    agregar(otros, 0);

    return seleccion.length > 0 ? seleccion.slice(0, 4) : respaldo;
  } catch (err) {
    return respaldo;
  }
}

function normalizarTexto(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/(\d)([a-z])/g, (_, num, letra) => num + ' ' + letra)
    .replace(/[^a-z0-9.,\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extraerPedidoRespaldoLocal(mensaje, catalogo) {
  const textoOriginal = String(mensaje || '').trim();
  const textoNorm = normalizarTexto(textoOriginal);

  let telefono = '';
  const matchTlf = textoOriginal.match(/(?:\+?58[\s-]?)?(?:0?4(?:12|14|16|24|26))[\s.-]?\d{3}[\s.-]?\d{4}/);
  if (matchTlf) {
    telefono = matchTlf[0].replace(/\D/g, '');
  }

  let nombre = '';
  const matchNombre = textoOriginal.match(/(?:soy|me llamo|mi nombre es)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]+){0,2})/i);
  if (matchNombre) {
    nombre = matchNombre[1].trim();
  }

  let direccion = '';
  const matchDir = textoOriginal.match(/(?:direcci[oó]n|direci[oó]n|env[ií]o a|entregar en|ubicaci[oó]n)\s*[:\-]?\s*([^.\n;]+)/i);
  if (matchDir) {
    direccion = matchDir[1].trim();
  }

  const tipoPago = /\b(fiado|credito|cr[eé]dito|abono|cuotas)\b/i.test(textoOriginal)
    ? 'credito'
    : 'contado';

  const palabrasIgnoradas = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'en', 'con', 'para', 'por', 'y', 'a', 'lts', 'lt', 'litro', 'litros']);
  const numerosTexto = {
    un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
    seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10
  };

  const items = [];
  if (Array.isArray(catalogo)) {
    const candidatos = [];

    catalogo.forEach((prod) => {
      const nombreProdNorm = normalizarTexto(prod.nombre);
      const palabrasProd = nombreProdNorm
        .split(' ')
        .filter((w) => w.length >= 2 && !palabrasIgnoradas.has(w));

      if (palabrasProd.length === 0) return;

      let coincidencias = 0;
      let palabraPrincipal = '';
      palabrasProd.forEach((w) => {
        if (textoNorm.includes(w)) {
          coincidencias++;
          if (!palabraPrincipal && /[a-z]/.test(w)) palabraPrincipal = w;
        }
      });

      const proporcion = coincidencias / palabrasProd.length;
      if (coincidencias >= 2 || (palabrasProd.length === 1 && coincidencias === 1) || proporcion >= 0.5) {
        candidatos.push({
          prod,
          coincidencias,
          proporcion,
          palabraPrincipal: palabraPrincipal || palabrasProd[0]
        });
      }
    });

    candidatos.sort((a, b) => {
      if (b.coincidencias !== a.coincidencias) return b.coincidencias - a.coincidencias;
      return b.proporcion - a.proporcion;
    });

    const clavesUsadas = new Set();
    candidatos.forEach((cand) => {
      const clave = cand.palabraPrincipal;
      if (clavesUsadas.has(clave)) return;
      clavesUsadas.add(clave);

      let cantidad = 1;
      const regexCant = new RegExp('(\\d+|\\b(?:un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\\b)\\s+(?:[a-z0-9.]+\\s+){0,2}' + clave, 'i');
      const matchCant = textoNorm.match(regexCant);
      if (matchCant) {
        const raw = matchCant[1].toLowerCase();
        cantidad = numerosTexto[raw] || parseInt(raw, 10) || 1;
      }

      items.push({
        id: cand.prod.id,
        nombre: cand.prod.nombre,
        cantidad: cantidad
      });
    });
  }

  return {
    cliente: { nombre, telefono, direccion },
    items,
    tipoPago,
    observaciones: 'Los servidores de Gemini estaban ocupados en este momento, así que se usó el lector de respaldo local. Verifica los productos antes de procesar.'
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en Vercel' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { mensaje, productos } = body;

    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ error: 'El mensaje de WhatsApp está vacío' });
    }

    const catalogoResumido = Array.isArray(productos)
      ? productos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          precio: p.precio,
          stock: p.stock ?? 0
        }))
      : [];

    const prompt =
      'Eres el asistente de toma de pedidos de la tienda "Pasión Paraguanera" en Venezuela.\n' +
      'Analiza el mensaje de WhatsApp de un cliente y extrae sus datos y los productos solicitados cruzándolos ÚNICAMENTE con el catálogo disponible.\n\n' +
      'Catálogo actual de la tienda (JSON):\n' +
      JSON.stringify(catalogoResumido) + '\n\n' +
      'Mensaje del cliente por WhatsApp:\n"""\n' +
      mensaje + '\n"""\n\n' +
      'Reglas estrictas:\n' +
      '1. Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:\n' +
      '{\n' +
      '  "cliente": {\n' +
      '    "nombre": "",\n' +
      '    "telefono": "",\n' +
      '    "direccion": ""\n' +
      '  },\n' +
      '  "items": [\n' +
      '    {\n' +
      '      "id": "id_exacto_del_producto",\n' +
      '      "nombre": "nombre_exacto_del_producto",\n' +
      '      "cantidad": 1\n' +
      '    }\n' +
      '  ],\n' +
      '  "tipoPago": "contado",\n' +
      '  "observaciones": ""\n' +
      '}\n' +
      '2. Si el mensaje no menciona nombre, teléfono o dirección del cliente, deja esos campos como cadena vacía "".\n' +
      '3. En "items", usa SOLO el "id" y "nombre" exactos de los productos del catálogo que coincidan con lo que pidió el cliente. Si pide algo que no existe en el catálogo, menciónalo brevemente en "observaciones".\n' +
      '4. "cantidad" debe ser siempre un número entero positivo (si no especifica cantidad, asume 1).\n' +
      '5. En "tipoPago", usa "credito" si el cliente pide fiado, abono o crédito; de lo contrario usa "contado".';

    const modelos = await obtenerModelosDiversos(apiKey);
    let textoRespuesta = null;

    for (const modelo of modelos) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const url =
          'https://generativelanguage.googleapis.com/v1beta/models/' +
          encodeURIComponent(modelo) +
          ':generateContent?key=' +
          encodeURIComponent(apiKey);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          })
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (response.ok) {
          const texto = data && data.candidates && data.candidates[0] &&
            data.candidates[0].content && data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;

          if (texto) {
            textoRespuesta = texto;
            break;
          }
        }
      } catch (errModelo) {
        console.warn('Modelo no disponible:', modelo, errModelo.message);
      }
    }

    if (!textoRespuesta) {
      const respaldoLocal = extraerPedidoRespaldoLocal(mensaje, catalogoResumido);
      return res.status(200).json(respaldoLocal);
    }

    const inicioJson = textoRespuesta.indexOf('{');
    const finJson = textoRespuesta.lastIndexOf('}');
    const soloJson = (inicioJson !== -1 && finJson !== -1)
      ? textoRespuesta.slice(inicioJson, finJson + 1)
      : textoRespuesta.trim();

    const pedidoEstructurado = JSON.parse(soloJson);
    return res.status(200).json(pedidoEstructurado);
  } catch (error) {
    console.error('Error en /api/pedido-ia:', error);
    return res.status(500).json({ error: 'Error interno: ' + error.message });
  }
};
