async function obtenerModelosDisponibles(apiKey) {
  const respaldo = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.0-flash'
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
      'robotics', 'computer-use', 'deep-research', 'aqa', 'vision', 'image', 'gemma'
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

    const puntaje = (nombre) => {
      const low = nombre.toLowerCase();
      let p = 50;
      if (low.includes('flash-lite')) p = 10;
      else if (low.includes('flash')) p = 20;
      else if (low.includes('pro')) p = 40;
      if (low.includes('exp') || low.includes('preview')) p += 5;
      return p;
    };

    validos.sort((a, b) => {
      const diff = puntaje(a) - puntaje(b);
      if (diff !== 0) return diff;
      return b.localeCompare(a);
    });

    return validos.slice(0, 4);
  } catch (err) {
    return respaldo;
  }
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

    const modelos = await obtenerModelosDisponibles(apiKey);
    const errores = [];
    let textoRespuesta = null;

    for (const modelo of modelos) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

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
          errores.push(modelo + ': respuesta vacía');
        } else {
          const msg = (data && data.error && data.error.message) ? data.error.message : ('HTTP ' + response.status);
          errores.push(modelo + ': ' + msg);
        }
      } catch (errModelo) {
        const motivo = errModelo.name === 'AbortError' ? 'tiempo agotado' : errModelo.message;
        errores.push(modelo + ': ' + motivo);
      }
    }

    if (!textoRespuesta) {
      return res.status(502).json({
        error: 'No se pudo completar con la IA. Detalle: ' + errores.join(' | ')
      });
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
