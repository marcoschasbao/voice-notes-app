const Config = {
  get groqKey() { return localStorage.getItem('groq_key') || ''; },
  get sheetsKey() { return localStorage.getItem('sheets_key') || ''; },
  get spreadsheetId() { return localStorage.getItem('spreadsheet_id') || ''; },
  get gasUrl() { return localStorage.getItem('gas_url') || ''; },

  save(groqKey, sheetsKey, spreadsheetId, gasUrl) {
    localStorage.setItem('groq_key', groqKey);
    localStorage.setItem('sheets_key', sheetsKey);
    localStorage.setItem('spreadsheet_id', spreadsheetId);
    localStorage.setItem('gas_url', gasUrl);
  },

  isComplete() {
    return this.groqKey && this.sheetsKey && this.spreadsheetId && this.gasUrl;
  },

  clear() {
    localStorage.removeItem('groq_key');
    localStorage.removeItem('sheets_key');
    localStorage.removeItem('spreadsheet_id');
    localStorage.removeItem('gas_url');
  }
};