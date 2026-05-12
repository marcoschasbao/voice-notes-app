const Config = {
  get groqKey() { return localStorage.getItem('groq_key') || ''; },
  get sheetsKey() { return localStorage.getItem('sheets_key') || ''; },
  get spreadsheetId() { return localStorage.getItem('spreadsheet_id') || ''; },

  save(groqKey, sheetsKey, spreadsheetId) {
    localStorage.setItem('groq_key', groqKey);
    localStorage.setItem('sheets_key', sheetsKey);
    localStorage.setItem('spreadsheet_id', spreadsheetId);
  },

  isComplete() {
    return this.groqKey && this.sheetsKey && this.spreadsheetId;
  },

  clear() {
    localStorage.removeItem('groq_key');
    localStorage.removeItem('sheets_key');
    localStorage.removeItem('spreadsheet_id');
  }
};