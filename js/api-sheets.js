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
      id: index + 2, // fila real en el sheet (empieza en 2)
      nombre: fila[0] || '',
      empresa: fila[1] || '',
      estado: fila[2] || ''
    })).filter(c => c.nombre.trim() !== '');
  },

  async obtenerNotas() {
    const filas = await this.leerRango('Notas!A2:H');
    return filas.map(fila => ({
      fecha: fila[0] || '',
      hora: fila[1] || '',
      transcripcion: fila[2] || '',
      resumen: fila[3] || '',
      tareas: fila[4] || '',
      urgencia: fila[5] || '',
      clienteId: fila[6] || '',
      clienteConfirmado: fila[7] || ''
    }));
  },

  buscarClienteFuzzy(nombreSugerido, clientes) {
    if (!nombreSugerido || clientes.length === 0) return null;

    const normalizar = str => str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const busqueda = normalizar(nombreSugerido);

    // Primero buscamos coincidencia exacta
    let encontrado = clientes.find(c => normalizar(c.nombre) === busqueda);
    if (encontrado) return encontrado;

    // Luego buscamos si el nombre sugerido está contenido en algún cliente
    encontrado = clientes.find(c => normalizar(c.nombre).includes(busqueda) || busqueda.includes(normalizar(c.nombre)));
    if (encontrado) return encontrado;

    // Por último buscamos por palabras individuales
    const palabras = busqueda.split(' ').filter(p => p.length > 2);
    encontrado = clientes.find(c => {
      const nombreNorm = normalizar(c.nombre);
      return palabras.some(p => nombreNorm.includes(p));
    });

    return encontrado || null;
  }
};