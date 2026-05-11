const Config = {
  get groqKey() { return localStorage.getItem('groq_key') || ''; },
  get geminiKey() { return localStorage.getItem('gemini_key') || ''; },
  get sheetsKey() { return localStorage.getItem('sheets_key') || ''; },
  get spreadsheetId() { return localStorage.getItem('spreadsheet_id') || ''; },

  save(groqKey, geminiKey, sheetsKey, spreadsheetId) {
    localStorage.setItem('groq_key', groqKey);
    localStorage.setItem('gemini_key', geminiKey);
    localStorage.setItem('sheets_key', sheetsKey);
    localStorage.setItem('spreadsheet_id', spreadsheetId);
  },

  isComplete() {
    return this.groqKey && this.geminiKey && this.sheetsKey && this.spreadsheetId;
  },

  clear() {
    localStorage.removeItem('groq_key');
    localStorage.removeItem('gemini_key');
    localStorage.removeItem('sheets_key');
    localStorage.removeItem('spreadsheet_id');
  }
};
