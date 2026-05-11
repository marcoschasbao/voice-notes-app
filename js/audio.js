const Audio = {
  mediaRecorder: null,
  chunks: [],
  stream: null,
  audioContext: null,
  analyser: null,
  animationId: null,
  timerInterval: null,
  segundosGrabados: 0,
  MAX_SEGUNDOS: 300, // 5 minutos

  async pedirPermiso() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (e) {
      alert('No se pudo acceder al micrófono. Ve a Ajustes > Safari > Micrófono y permite el acceso.');
      return false;
    }
  },

  async iniciarGrabacion(onTiempoActualizado) {
    if (!this.stream) {
      const ok = await this.pedirPermiso();
      if (!ok) return false;
    }

    this.chunks = [];
    this.segundosGrabados = 0;

    // Elegir formato compatible
    const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : {});

    this.mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.start(1000);

    // Temporizador
    this.timerInterval = setInterval(() => {
      this.segundosGrabados++;
      if (onTiempoActualizado) onTiempoActualizado(this.segundosGrabados);
      if (this.segundosGrabados >= this.MAX_SEGUNDOS) {
        this.detenerGrabacion();
      }
    }, 1000);

    // Visualizador
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    source.connect(this.analyser);
    this.analyser.fftSize = 256;

    return true;
  },

  detenerGrabacion() {
    return new Promise(resolve => {
      clearInterval(this.timerInterval);
      this.pararVisualizador();

      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder.mimeType });
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  },

  dibujarVisualizador(canvas) {
    if (!this.analyser) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const dibujar = () => {
      this.animationId = requestAnimationFrame(dibujar);
      this.analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#16213e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgb(233, 69, ${96 + i})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    dibujar();
  },

  pararVisualizador() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
};