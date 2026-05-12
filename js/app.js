let grabando = false;
let clientesCache = [];
let transcripcionActual = '';
let analisisActual = null;

// ==================
// CONFIGURACIÓN
// ==================
function mostrarConfig() {
  document.getElementById('app').innerHTML = `
    <h1>Notas de Voz</h1>
    <p class="mensaje">Introduce tus claves para empezar</p><br>
    <input type="password" id="groq" placeholder="Groq API Key" />
    <input type="password" id="sheets" placeholder="Google Sheets API Key" />
    <input type="text" id="spreadsheet" placeholder="Spreadsheet ID" />
    <button onclick="guardarConfig()">Guardar y continuar</button>
  `;
}

function guardarConfig() {
  const groq = document.getElementById('groq').value.trim();
  const sheets = document.getElementById('sheets').value.trim();
  const spreadsheet = document.getElementById('spreadsheet').value.trim();

  if (!groq || !sheets || !spreadsheet) {
    alert('Por favor rellena todos los campos');
    return;
  }

  Config.save(groq, sheets, spreadsheet);
  iniciarApp();
}

// ==================
// INICIO
// ==================
async function iniciarApp() {
  document.getElementById('app').innerHTML = `
    <h1>Notas de Voz</h1>
    <p class="mensaje" id="estado-inicio">Cargando clientes...</p>
  `;

  try {
    clientesCache = await Sheets.obtenerClientes();
    document.getElementById('estado-inicio').textContent =
      `✅ ${clientesCache.length} clientes cargados`;
    setTimeout(mostrarGrabador, 800);
  } catch (e) {
    document.getElementById('estado-inicio').innerHTML = `
      ❌ Error cargando clientes: ${e.message}<br><br>
      <button onclick="iniciarApp()">Reintentar</button>
      <button onclick="Config.clear(); mostrarConfig()">⚙️ Reconfigurar</button>
    `;
  }
}

// ==================
// GRABADOR
// ==================
function mostrarGrabador() {
  document.getElementById('app').innerHTML = `
    <h1>Notas de Voz</h1>
    <canvas id="visualizador" width="440" height="80"></canvas>
    <p class="mensaje" id="timer">00:00</p>
    <button id="btnGrabar" onclick="toggleGrabacion()">🎙️ Grabar</button>
    <p class="mensaje" id="estado"></p>
    <div id="resultado"></div>
    <br>
    <button onclick="Config.clear(); mostrarConfig()">⚙️ Configuración</button>
  `;
}

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
    btn.textContent = '⏹️ Detener';
    btn.style.backgroundColor = '#c0392b';
    estado.textContent = 'Grabando...';

    const canvas = document.getElementById('visualizador');
    Audio.dibujarVisualizador(canvas);

  } else {
    grabando = false;
    btn.textContent = '🎙️ Grabar';
    btn.style.backgroundColor = '';
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
  document.getElementById('resultado').innerHTML = `
    <div class="resultado-box">
      <p class="resultado-label">Transcripción</p>
      <p class="resultado-texto">${transcripcionActual}</p>
    </div>
    <button onclick="analizarTranscripcion()">🧠 Analizar con IA</button>
    <button onclick="mostrarFormularioManual()">✏️ Rellenar manualmente</button>
  `;
  document.getElementById('estado').textContent = '✅ Transcripción completada';
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
    analisisActual = await IA.analizar(transcripcionActual, clientesCache);
    const clienteMatch = Sheets.buscarClienteFuzzy(analisisActual.cliente_sugerido, clientesCache);
    mostrarFormularioConfirmacion(analisisActual, clienteMatch);
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

  const urgenciaColores = ['', '#27ae60', '#2ecc71', '#f39c12', '#e67e22', '#e74c3c'];

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
      <p class="resultado-label">Urgencia: <span id="urgenciaValor" style="color:${urgenciaColores[analisis.urgencia]}; font-weight:bold;">${analisis.urgencia}/5</span></p>
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

    <button onclick="guardarNota()">💾 Guardar en Sheets</button>
    <button onclick="mostrarGrabador()">🎙️ Nueva nota</button>
  `;
}

function actualizarUrgencia(valor) {
  const colores = ['', '#27ae60', '#2ecc71', '#f39c12', '#e67e22', '#e74c3c'];
  const span = document.getElementById('urgenciaValor');
  span.textContent = `${valor}/5`;
  span.style.color = colores[parseInt(valor)];
}

// ==================
// GUARDAR EN SHEETS
// ==================
async function guardarNota() {
  const btn = document.querySelector('#resultado button');
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
    clienteId: clienteId,
    clienteConfirmado: clienteNombre
  };

  try {
    await Sheets.guardarNota(nota);
    document.getElementById('estado').textContent = '✅ Nota guardada correctamente';
    btn.textContent = '✅ Guardado';
    setTimeout(mostrarGrabador, 1500);
  } catch (e) {
    document.getElementById('estado').textContent = `❌ Error guardando: ${e.message}`;
    btn.disabled = false;
    btn.textContent = '💾 Guardar en Sheets';
  }
}

// ==================
// PUNTO DE ENTRADA
// ==================
if (Config.isComplete()) {
  iniciarApp();
} else {
  mostrarConfig();
}