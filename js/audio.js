const Audio = {
  animationId: null,

  async grabar(onTiempoActualizado) {
    // Solicitar stream en cada grabación
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    const chunks = [];
    let segundos = 0;

    // Visualizador
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.start(1000);

    // Temporizador
    const timerInterval = setInterval(() => {
      segundos++;
      if (onTiempoActualizado) onTiempoActualizado(segundos);
      if (segundos >= 300) detener();
    }, 1000);

    // Promesa que resuelve cuando se para la grabación
    const result = new Promise(resolve => {
      mediaRecorder.onstop = () => {
        // Liberar micrófono inmediatamente
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        clearInterval(timerInterval);

        const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
        resolve(blob);
      };
    });

    // Función para detener desde fuera
    const detener = () => {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    };

    return { detener, result, analyser, audioContext };
  },

  dibujarVisualizador(canvas, analyser) {
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const dibujar = () => {
      this.animationId = requestAnimationFrame(dibujar);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg').trim() || '#F2F2F7';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = 3;
      const gap = 2;
      const totalBars = Math.floor(canvas.width / (barWidth + gap));
      const centerY = canvas.height / 2;

      for (let i = 0; i < totalBars; i++) {
        const dataIndex = Math.floor(i * bufferLength / totalBars);
        const barHeight = (dataArray[dataIndex] / 255) * (canvas.height * 0.8);

        ctx.fillStyle = '#007AFF';
        ctx.beginPath();
        ctx.roundRect(
          i * (barWidth + gap),
          centerY - barHeight / 2,
          barWidth,
          Math.max(barHeight, 2),
          2
        );
        ctx.fill();
      }
    };

    dibujar();
  },

  limpiarVisualizador(canvas) {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = 64;
    const barWidth = 3;
    const gap = 2;
    const totalBars = Math.floor(canvas.width / (barWidth + gap));
    const centerY = canvas.height / 2;

    // Animación suave de bajada a cero
    let altura = canvas.height * 0.3;
    const bajar = () => {
      if (altura <= 1) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      altura *= 0.7;
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg').trim() || '#F2F2F7';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < totalBars; i++) {
        ctx.fillStyle = '#007AFF';
        ctx.beginPath();
        ctx.roundRect(
          i * (barWidth + gap),
          centerY - altura / 2,
          barWidth,
          Math.max(altura, 1),
          2
        );
        ctx.fill();
      }
      requestAnimationFrame(bajar);
    };

    bajar();
  }
};