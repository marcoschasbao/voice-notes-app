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

  async guardarNota(nota) {
    const id = Config.spreadsheetId;
    const key = Config.sheetsKey;
    const url = `${this.BASE_URL}/${id}/values/Notas!A:H:append?valueInputOption=USER_ENTERED&key=${key}`;

    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-ES');
    const hora = ahora.toLocaleTimeString('es-ES');

    const fila = [
      fecha,
      hora,
      nota.transcripcion || '',
      nota.resumen || '',
      Array.isArray(nota.tareas) ? nota.tareas.join(' | ') : (nota.tareas || ''),
      nota.urgencia || 3,
      nota.clienteId || '',
      nota.clienteConfirmado || ''
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [fila] })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error guardando nota: ${error.error?.message || response.status}`);
    }

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