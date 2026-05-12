const Gemini = {
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',

  async analizar(transcripcion, clientes) {
    const listaClientes = clientes.map(c => c.nombre).join(', ');

    const prompt = `Analiza esta nota de voz transcrita y devuelve ÚNICAMENTE un objeto JSON válido, sin texto adicional, sin explicaciones, sin bloques de código markdown.

Nota transcrita:
"${transcripcion}"

Lista de clientes disponibles:
${listaClientes}

Devuelve exactamente este formato JSON:
{
  "resumen": "resumen breve de la nota en 1-2 frases",
  "tareas": ["tarea 1", "tarea 2"],
  "urgencia": 3,
  "cliente_sugerido": "nombre exacto del cliente más probable de la lista, o vacío si no aplica"
}

Reglas:
- urgencia es un número del 1 al 5 (1=muy baja, 5=muy alta)
- cliente_sugerido debe ser un nombre de la lista proporcionada o cadena vacía
- tareas debe ser un array, aunque esté vacío
- No incluyas nada más que el JSON`;

    const response = await fetch(`${this.BASE_URL}?key=${Config.geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error Gemini: ${error.error?.message || response.status}`);
    }

    const data = await response.json();
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return this.parsearRespuesta(texto);
  },

  parsearRespuesta(texto) {
    // Intento 1: parseo directo
    try {
      return JSON.parse(texto.trim());
    } catch {}

    // Intento 2: extraer JSON entre llaves
    try {
      const match = texto.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch {}

    // Intento 3: fallback por regex campo a campo
    try {
      const resumen = texto.match(/"resumen"\s*:\s*"([^"]+)"/)?.[1] || '';
      const urgencia = parseInt(texto.match(/"urgencia"\s*:\s*(\d)/)?.[1] || '3');
      const cliente = texto.match(/"cliente_sugerido"\s*:\s*"([^"]*)"/)?.[1] || '';
      const tareasMatch = texto.match(/"tareas"\s*:\s*\[([^\]]*)\]/)?.[1] || '';
      const tareas = tareasMatch
        ? tareasMatch.match(/"([^"]+)"/g)?.map(t => t.replace(/"/g, '')) || []
        : [];

      return { resumen, tareas, urgencia, cliente_sugerido: cliente };
    } catch {}

    // Fallback final
    return {
      resumen: 'No se pudo analizar la nota',
      tareas: [],
      urgencia: 3,
      cliente_sugerido: ''
    };
  }
};