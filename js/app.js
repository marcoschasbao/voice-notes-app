let grabando = false;
let clientesCache = [];

// ==================
// CONFIGURACIÓN
// ==================
function mostrarConfig() {
  document.getElementById('app').innerHTML = `
    <h1>Notas de Voz</h1>
    <p class="mensaje">Introduce tus claves para empezar</p><br>
    <input type="password" id="groq" placeholder="Groq API Key" />
    <input type="password" id="gemini" placeholder="Gemini API Key" />
    <input type="password" id="sheets" placeholder="Google Sheets API Key" />
    <input type="text" id="spreadsheet" placeholder="Spreadsheet ID" />
    <button onclick="guardarConfig()">Guardar y continuar</button>
  `;
}

function guardarConfig() {
  const groq = document.getElementById('groq').value.trim();
  const gemini = document.getElementById('gemini').value.trim();
  const sheets = document.getElementById('sheets').value.trim();
  const spreadsheet = document.getElementById('spreadsheet').value.trim();

  if (!groq || !gemini || !sheets || !spreadsheet) {
    alert('Por favor rellena todos los campos');
    return;
  }

  Config.save(groq, gemini, sheets, spreadsheet);
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
      const transcripcion = await Groq.transcribir(blob);
      estado.textContent = '🧠 Analizando con IA...';

      const analisis = await Gemini.analizar(transcripcion, clientesCache);
      const clienteMatch = Sheets.buscarClienteFuzzy(analisis.cliente_sugerido, clientesCache);

      mostrarResultado(transcripcion, analisis, clienteMatch);
      estado.textContent = '✅ Análisis completado';

    } catch (e) {
      estado.textContent = `❌ Error: ${e.message}`;
    }

    btn.disabled = false;
    document.getElementById('timer').textContent = '00:00';
  }
}

// ==================
// RESULTADO
// ==================
function mostrarResultado(transcripcion, analisis, clienteMatch) {
  const opcionesClientes = clientesCache.map(c =>
    `<option value="${c.id}" ${clienteMatch && clienteMatch.id === c.id ? 'selected' : ''}>
      ${c.nombre} — ${c.empresa}
    </option>`
  ).join('');

  const tareasHtml = analisis.tareas.length > 0
    ? analisis.tareas.map(t => `<li>${t}</li>`).join('')
    : '<li>Sin tareas detectadas</li>';

  const urgenciaColores = ['', '#27ae60', '#2ecc71', '#f39c12', '#e67e22', '#e74c3c'];

  document.getElementById('resultado').innerHTML = `
    <div class="resultado-box">
      <p class="resultado-label">Transcripción</p>
      <p class="resultado-texto">${transcripcion}</p>
    </div>

    <div class="resultado-box">
      <p class="resultado-label">Resumen</p>
      <p class="resultado-texto">${analisis.resumen}</p>
    </div>

    <div class="resultado-box">
      <p class="resultado-label">Tareas detectadas</p>
      <ul class="resultado-texto">${tareasHtml}</ul>
    </div>

    <div class="resultado-box">
      <p class="resultado-label">Urgencia</p>
      <p class="resultado-texto" style="color:${urgenciaColores[analisis.urgencia]}; font-size:1.4rem; font-weight:bold;">
        ${'★'.repeat(analisis.urgencia)}${'☆'.repeat(5 - analisis.urgencia)} (${analisis.urgencia}/5)
      </p>
    </div>

    <div class="resultado-box">
      <p class="resultado-label">Cliente asignado</p>
      <select id="clienteSeleccionado">
        <option value="">-- Sin cliente --</option>
        ${opcionesClientes}
      </select>
    </div>

    <button onclick="mostrarGrabador()">🎙️ Nueva nota</button>
  `;
}

// ==================
// PUNTO DE ENTRADA
// ==================
if (Config.isComplete()) {
  iniciarApp();
} else {
  mostrarConfig();
}