let grabando = false;
let clientesCache = [];
let notasCache = [];
let transcripcionActual = '';

// ==================
// TAB BAR
// ==================
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-btn');
  const views = document.querySelectorAll('.view');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetView = tab.getAttribute('data-view');
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      views.forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${targetView}`).classList.add('active');

      if (targetView === 'dashboard') renderNotas();
    });
  });

  // Arrancar app
  if (Config.isComplete()) {
    iniciarApp();
  } else {
    mostrarConfig();
  }
});

// ==================
// CONFIGURACIÓN
// ==================
function mostrarConfig() {
  document.getElementById('config-content').innerHTML = `
    <div class="config-section">
      <label>Groq API Key</label>
      <input type="password" id="groq" placeholder="gsk_..." />
      <label>Google Sheets API Key</label>
      <input type="password" id="sheets" placeholder="AIzaSy..." />
      <label>Spreadsheet ID</label>
      <input type="text" id="spreadsheet" placeholder="ID de tu hoja" />
      <label>Google Apps Script URL</label>
      <input type="text" id="gasUrl" placeholder="https://script.google.com/..." />
    </div>
    <button onclick="guardarConfig()">Guardar y continuar</button>
  `;

  // Si ya hay config guardada, mostrar campos rellenos
  if (Config.groqKey) document.getElementById('groq').value = Config.groqKey;
  if (Config.sheetsKey) document.getElementById('sheets').value = Config.sheetsKey;
  if (Config.spreadsheetId) document.getElementById('spreadsheet').value = Config.spreadsheetId;
  if (Config.gasUrl) document.getElementById('gasUrl').value = Config.gasUrl;
}

function guardarConfig() {
  const groq = document.getElementById('groq').value.trim();
  const sheets = document.getElementById('sheets').value.trim();
  const spreadsheet = document.getElementById('spreadsheet').value.trim();
  const gasUrl = document.getElementById('gasUrl').value.trim();

  if (!groq || !sheets || !spreadsheet || !gasUrl) {
    alert('Por favor rellena todos los campos');
    return;
  }

  Config.save(groq, sheets, spreadsheet, gasUrl);
  iniciarApp();
}

// ==================
// INICIO
// ==================
async function iniciarApp() {
  mostrarConfig();
  document.getElementById('estado').textContent = 'Cargando clientes...';

  try {
    clientesCache = await Sheets.obtenerClientes();
    try {
      notasCache = await Sheets.obtenerNotas();
    } catch {
      notasCache = [];
    }
    document.getElementById('estado').textContent = 
      `✅ ${clientesCache.length} clientes cargados`;
    setTimeout(() => {
      document.getElementById('estado').textContent = 'Listo para grabar';
    }, 2000);
  } catch (e) {
    document.getElementById('estado').textContent = `❌ Error: ${e.message}`;
  }
}

// ==================
// GRABADOR
// ==================
async function toggleGrabacion() {
  const btn = document.getElementById('btnGrabar');
  const estado = document.getElementById('estado');

  if (!grabando) {
    const ok = await Audio.iniciarGrabacion((segundos) => {
      const m = String(Math.floor(segundos / 60)).padStart(2, '0');
      const s = String(segundos % 60).padStart(2, '0');
      document.getElementById('timer').textContent = `${m}:${s}`;
    });

    if (!ok) return;

    grabando = true;
    btn.textContent = '⏹️';
    btn.classList.add('recording');
    estado.textContent = 'Grabando...';

    const canvas = document.getElementById('visualizador');
    Audio.dibujarVisualizador(canvas);

  } else {
    grabando = false;
    btn.textContent = '🎙️';
    btn.classList.remove('recording');
    btn.disabled = true;
    estado.textContent = 'Transcribiendo...';

    const blob = await Audio.detenerGrabacion();

    if (!blob) {
      estado.textContent = 'Error al obtener el audio.';
      btn.disabled = false;
      return;
    }

    try {
      transcripcionActual = await IA.transcribir(blob);
      mostrarTranscripcion();
    } catch (e) {
      estado.textContent = `❌ Error: ${e.message}`;
    }

    btn.disabled = false;
    document.getElementById('timer').textContent = '00:00';
  }
}

// ==================
// TRANSCRIPCIÓN
// ==================
function mostrarTranscripcion() {
  document.getElementById('estado').textContent = '✅ Transcripción completada';
  document.getElementById('resultado').innerHTML = `
    <div class="resultado-box">
      <p class="resultado-label">Transcripción</p>
      <p class="resultado-texto">${transcripcionActual}</p>
    </div>
    <button onclick="analizarTranscripcion()">🧠 Analizar con IA</button>
    <button class="btn-secondary" onclick="mostrarFormularioManual()">✏️ Rellenar manualmente</button>
  `;
}

// ==================
// ANÁLISIS IA
// ==================
async function analizarTranscripcion() {
  const estado = document.getElementById('estado');
  estado.textContent = '🧠 Analizando...';

  const btns = document.getElementById('resultado').querySelectorAll('button');
  btns.forEach(b => b.disabled = true);

  try {
    const analisis = await IA.analizar(transcripcionActual, clientesCache);
    const clienteMatch = Sheets.buscarClienteFuzzy(analisis.cliente_sugerido, clientesCache);
    mostrarFormularioConfirmacion(analisis, clienteMatch);
    estado.textContent = '✅ Análisis completado';
  } catch (e) {
    estado.textContent = `❌ Error IA: ${e.message}`;
    btns.forEach(b => b.disabled = false);
  }
}

// ==================
// FORMULARIO MANUAL
// ==================
function mostrarFormularioManual() {
  mostrarFormularioConfirmacion({
    resumen: '',
    tareas: [],
    urgencia: 3,
    cliente_sugerido: ''
  }, null);
}

// ==================
// FORMULARIO CONFIRMACIÓN
// ==================
function mostrarFormularioConfirmacion(analisis, clienteMatch) {
  const opcionesClientes = clientesCache.map(c =>
    `<option value="${c.id}" data-nombre="${c.nombre}" ${clienteMatch && clienteMatch.id === c.id ? 'selected' : ''}>
      ${c.nombre} — ${c.empresa}
    </option>`
  ).join('');

  const urgenciaLabels = ['', '⚪ Mínima', '🟢 Baja', '🟡 Media', '🟠 Alta', '🔴 Máxima'];

  document.getElementById('resultado').innerHTML = `
    <div class="resultado-box">
      <p class="resultado-label">Transcripción</p>
      <p class="resultado-texto">${transcripcionActual}</p>
    </div>
    <div class="resultado-box">
      <p class="resultado-label">Resumen</p>
      <textarea id="campoResumen" rows="3">${analisis.resumen}</textarea>
    </div>
    <div class="resultado-box">
      <p class="resultado-label">Tareas (separadas por |)</p>
      <textarea id="campoTareas" rows="3">${Array.isArray(analisis.tareas) ? analisis.tareas.join(' | ') : ''}</textarea>
    </div>
    <div class="resultado-box">
      <p class="resultado-label">Urgencia: <span id="urgenciaValor">${urgenciaLabels[analisis.urgencia]}</span></p>
      <input type="range" id="campoUrgencia" min="1" max="5" value="${analisis.urgencia}"
        oninput="actualizarUrgencia(this.value)" />
    </div>
    <div class="resultado-box">
      <p class="resultado-label">Cliente</p>
      <select id="campoCliente">
        <option value="">-- Sin cliente --</option>
        ${opcionesClientes}
      </select>
    </div>
    <button id="btnGuardar" onclick="guardarNota()">💾 Guardar nota</button>
    <button class="btn-secondary" onclick="limpiarGrabador()">🎙️ Nueva nota</button>
  `;
}

function actualizarUrgencia(valor) {
  const labels = ['', '⚪ Mínima', '🟢 Baja', '🟡 Media', '🟠 Alta', '🔴 Máxima'];
  document.getElementById('urgenciaValor').textContent = labels[parseInt(valor)];
}

// ==================
// GUARDAR EN SHEETS
// ==================
async function guardarNota() {
  const btn = document.getElementById('btnGuardar');
  btn.disabled = true;
  btn.textContent = '💾 Guardando...';

  const selectCliente = document.getElementById('campoCliente');
  const clienteId = selectCliente.value;
  const clienteNombre = selectCliente.options[selectCliente.selectedIndex]?.dataset?.nombre || '';

  const nota = {
    transcripcion: transcripcionActual,
    resumen: document.getElementById('campoResumen').value.trim(),
    tareas: document.getElementById('campoTareas').value.trim(),
    urgencia: document.getElementById('campoUrgencia').value,
    clienteId,
    clienteConfirmado: clienteNombre
  };

  try {
    await Sheets.guardarNota(nota);
    notasCache.push(nota);
    document.getElementById('estado').textContent = '✅ Nota guardada';
    btn.textContent = '✅ Guardado';
    setTimeout(limpiarGrabador, 1500);
  } catch (e) {
    document.getElementById('estado').textContent = `❌ Error: ${e.message}`;
    btn.disabled = false;
    btn.textContent = '💾 Guardar nota';
  }
}

function limpiarGrabador() {
  document.getElementById('resultado').innerHTML = '';
  document.getElementById('estado').textContent = 'Listo para grabar';
  document.getElementById('timer').textContent = '00:00';
  transcripcionActual = '';
}

// ==================
// DASHBOARD
// ==================
function renderNotas() {
  const filtroCliente = document.getElementById('filtroCliente')?.value || '';
  const filtroUrgencia = document.getElementById('filtroUrgencia')?.value || '';

  // Actualizar opciones de clientes en filtro
  const selectCliente = document.getElementById('filtroCliente');
  if (selectCliente && selectCliente.options.length <= 1) {
    const clientes = [...new Set(notasCache.map(n => n.clienteConfirmado).filter(Boolean))];
    clientes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      selectCliente.appendChild(opt);
    });
  }

  let notas = [...notasCache].reverse();
  if (filtroCliente) notas = notas.filter(n => n.clienteConfirmado === filtroCliente);
  if (filtroUrgencia) notas = notas.filter(n => String(n.urgencia) === filtroUrgencia);

  const urgencyLabels = ['', 'Mínima', 'Baja', 'Media', 'Alta', 'Máxima'];

  if (notas.length === 0) {
    document.getElementById('listanotas').innerHTML =
      `<p class="mensaje">No hay notas con estos filtros.</p>`;
    return;
  }

  document.getElementById('listanotas').innerHTML = notas.map(n => `
    <div class="nota-card">
      <div class="nota-header">
        <span class="nota-cliente">${n.clienteConfirmado || 'Sin cliente'}</span>
        <span class="urgency-tag urg-${n.urgencia}">${urgencyLabels[n.urgencia] || n.urgencia}</span>
      </div>
      <p class="nota-fecha">${n.fecha} · ${n.hora}</p>
      <p class="nota-resumen">${n.resumen}</p>
      ${n.tareas ? `<p class="nota-tareas">📌 ${n.tareas}</p>` : ''}
    </div>
  `).join('');
}