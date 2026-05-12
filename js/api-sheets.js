const Sheets = {
  BASE_URL: 'https://sheets.googleapis.com/v4/spreadsheets',

  async leerRango(rango) {
    const id = Config.spreadsheetId;
    const key = Config.sheetsKey;
    const url = `${this.BASE_URL}/${id}/values/${encodeURIComponent(rango)}?key=${key}`;

    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error Sheets: ${error.error?.message || response.status}`);
    }

    const data = await response.json();
    return data.values || [];
  },

  async obtenerClientes() {
    const filas = await this.leerRango('Clientes!A2:C');
    return filas.map((fila, index) => ({
      id: index + 2,
      nombre: fila[0] || '',
      empresa: fila[1] || '',
      estado: fila[2] || ''
    })).filter(c => c.nombre.trim() !== '');
  },

  async obtenerNotas() {
    const url = `${Config.gasUrl}?tipo=notas`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error obteniendo notas: ${response.status}`);
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'Error desconocido');
    return data.data || [];
  },

  async guardarNota(nota) {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-ES');
    const hora = ahora.toLocaleTimeString('es-ES');

    const payload = {
      fecha,
      hora,
      transcripcion: nota.transcripcion || '',
      resumen: nota.resumen || '',
      tareas: Array.isArray(nota.tareas) ? nota.tareas.join(' | ') : (nota.tareas || ''),
      urgencia: nota.urgencia || 3,
      clienteId: nota.clienteId || '',
      clienteConfirmado: nota.clienteConfirmado || ''
    };

    const response = await fetch(Config.gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Error guardando nota: ${response.status}`);
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'Error desconocido');
    return true;
  },

  buscarClienteFuzzy(nombreSugerido, clientes) {
    if (!nombreSugerido || clientes.length === 0) return null;

    const normalizar = str => str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const busqueda = normalizar(nombreSugerido);

    let encontrado = clientes.find(c => normalizar(c.nombre) === busqueda);
    if (encontrado) return encontrado;

    encontrado = clientes.find(c =>
      normalizar(c.nombre).includes(busqueda) ||
      busqueda.includes(normalizar(c.nombre))
    );
    if (encontrado) return encontrado;

    const palabras = busqueda.split(' ').filter(p => p.length > 2);
    encontrado = clientes.find(c => {
      const nombreNorm = normalizar(c.nombre);
      return palabras.some(p => nombreNorm.includes(p));
    });

    return encontrado || null;
  }
};