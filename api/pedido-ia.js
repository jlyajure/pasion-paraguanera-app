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

    const prompt = `Eres el asistente de toma de pedidos de la tienda "Pasión Paraguanera" en Venezuela.
Analiza el mensaje de WhatsApp de un cliente y extrae sus datos y los productos solicitados cruzándolos ÚNICAMENTE con el catálogo disponible.

Catálogo actual de la tienda (JSON):
${JSON.stringify(catalogoResumido)}

Mensaje del cliente por WhatsApp:
"""
${mensaje}
"""

Reglas estrictas:
1. Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{
  "cliente": {
    "nombre": "",
    "telefono": "",
    "direccion": ""
  },
  "items": [
    {
      "id": "id_exacto_del_producto",
      "nombre": "nombre_exacto_del_producto",
      "cantidad": 1
    }
  ],
  "tipoPago": "contado",
  "observaciones": ""
}
2. Si el mensaje no menciona nombre, teléfono o dirección del cliente, deja esos campos como cadena vacía "".
3. En "items", usa SOLO el "id" y "nombre" exactos de los productos del catálogo que coincidan con lo que pidió el cliente. Si pide algo que no existe en el catálogo, menciónalo brevemente en "observaciones".
4. "cantidad" debe ser siempre un número entero positivo (si no especifica cantidad, asume 1).
5. En "tipoPago", usa "credito" si el cliente pide fiado, abono o crédito; de lo contrario usa "contado".`;

    const modelos = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-4-hydrogen'
    ];

    let ultimoError = 'No se pudo conectar con Gemini';
    let textoRespuesta = null;

    for (const modelo of modelos) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
          {
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
          }
        );

        clearTimeout(timeoutId);
        const data = await response.json();

        if (response.ok) {
          const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (texto) {
            textoRespuesta = texto;
            break;
          }
        } else {
          ultimoError = data?.error?.message || `Error con ${modelo}`;
          console.warn(`Falló ${modelo} (${response.status}):`, ultimoError);
        }
      } catch (errModelo) {
        ultimoError = errModelo.name === 'AbortError'
          ? `Tiempo agotado con ${modelo}`
          : errModelo.message;
        console.warn(`Excepción con ${modelo}:`, ultimoError);
      }
    }

    if (!textoRespuesta) {
      return res.status(502).json({
        error: `Los servidores de IA están ocupados ahora mismo. Intenta de nuevo en unos segundos. (${ultimoError})`
      });
    }

    const soloJson = textoRespuesta.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1').trim();
    const pedidoEstructurado = JSON.parse(soloJson);
    return res.status(200).json(pedidoEstructurado);
  } catch (error) {
    console.error('Error en /api/pedido-ia:', error);
    return res.status(500).json({ error: 'Error interno procesando el pedido con IA' });
  }
};
