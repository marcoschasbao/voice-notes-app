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
  mostrarGrabador();
}

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

let grabando = false;

async function toggleGrabacion() {
  const btn = document.getElementById('btnGrabar');
  const estado = document.getElementById('estado');

  if (!grabando) {
    // Iniciar grabación
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
    // Detener grabación
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
      const texto = await Groq.transcribir(blob);
      document.getElementById('resultado').innerHTML = `
        <div class="resultado-box">
          <p class="resultado-label">Transcripción:</p>
          <p class="resultado-texto">${texto}</p>
        </div>
      `;
      estado.textContent = '✅ Transcripción completada';
    } catch (e) {
      estado.textContent = `❌ Error: ${e.message}`;
    }

    btn.disabled = false;
    document.getElementById('timer').textContent = '00:00';
  }
}

// Punto de entrada
if (Config.isComplete()) {
  mostrarGrabador();
} else {
  mostrarConfig();
}