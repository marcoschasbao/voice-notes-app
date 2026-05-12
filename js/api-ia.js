const IA = {
  GROQ_URL: 'https://api.groq.com/openai/v1',

  async transcribir(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'audio.mp4');
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'es');

    const response = await fetch(`${this.GROQ_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Config.groqKey}` },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error transcripción: ${error.error?.message || response.status}`);
    }

    const data = await response.json();
    return data.text;
  },

  async analizar(transcripcion, clientes) {
    const listaClientes = clientes.map(c => c.nombre).join(', ');

    const prompt = `Eres un asistente que analiza notas de voz de un profesional y extrae información estructurada.

Nota transcrita: "${transcripcion}"

Clientes disponibles: ${listaClientes}

Devuelve ÚNICAMENTE un objeto JSON con exactamente estos campos:
{
  "resumen": "resumen breve en 1-2 frases",
  "tareas": ["tarea 1", "tarea 2"],
  "urgencia": 3,
  "cliente_sugerido": "nombre exacto de la lista o cadena vacía"
}

Reglas:
- urgencia: número del 1 al 5
- cliente_sugerido: debe coincidir exactamente con un nombre de la lista o ser cadena vacía
- tareas: array aunque esté vacío`;

    const response = await fetch(`${this.GROQ_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Config.groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error análisis: ${error.error?.message || response.status}`);
    }

    const data = await response.json();
    const texto = data.choices?.[0]?.message?.content || '{}';

    try {
      return JSON.parse(texto);
    } catch {
      return {
        resumen: 'No se pudo analizar',
        tareas: [],
        urgencia: 3,
        cliente_sugerido: ''
      };
    }
  }
};