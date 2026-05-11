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
  mostrarDashboard();
}

function mostrarDashboard() {
  document.getElementById('app').innerHTML = `
    <h1>Notas de Voz</h1>
    <p class="mensaje">¡Configuración completada! App lista.</p><br>
    <button onclick="Config.clear(); mostrarConfig()">Borrar configuración</button>
  `;
}

// Punto de entrada
if (Config.isComplete()) {
  mostrarDashboard();
} else {
  mostrarConfig();
}