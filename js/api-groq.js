const Groq = {
  async transcribir(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'audio.mp4');
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'es');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Config.groqKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error Groq: ${error.error?.message || response.status}`);
    }

    const data = await response.json();
    return data.text;
  }
};