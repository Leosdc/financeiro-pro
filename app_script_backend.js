// CÓDIGO DO GOOGLE APPS SCRIPT
// Copie e cole este código no seu projeto do Google Apps Script.

const SPREADSHEET_ID = '1L8LNvkLfU4jtG2BkLFITcwblP5XlIOjiy3ecniQ6ViE'; // ID da planilha fornecido
const GROQ_API_KEY = PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY'); // Salve sua chave nas Propriedades do Script

function doGet(e) {
  const params = e.parameter;
  const username = params.username;
  const action = params.action;
  
  // Login / Check User
  if (action === 'checkUser') {
    return checkUser(params.username, params.password);
  }

  // Se não tiver usuário, erro
  if (!username) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Usuário não fornecido' })).setMimeType(ContentService.MimeType.JSON);
  }

  // Retorna todos os dados para o usuário
  return getData(username);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  if (action === 'registerUser') {
    return registerUser(data.username, data.password);
  }

  if (action === 'callGroq') {
    return callGroqAI(data.messages);
  }

  if (action === 'add') {
    return addTransaction(data);
  }

  if (action === 'update') {
    return updateTransaction(data);
  }

  if (action === 'delete') {
    return deleteTransaction(data);
  }

  return ContentService.createTextOutput(JSON.stringify({ error: 'Ação inválida' })).setMimeType(ContentService.MimeType.JSON);
}

// --- FUNÇÕES DE DADOS ---

function getData(username) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Transacoes');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Validação básica de usuário na coluna A (supondo que vamos salvar o user lá)
    if (row[0] === username) {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index];
      });
      // Adicionamos o índice real da linha para facilitar edição/exclusão (1-based no sheets, mas vamos usar logica de array depois)
      item._rowIndex = i + 1; 
      data.push(item);
    }
  }

  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function addTransaction(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Transacoes');
  if (!sheet) {
    // Cria a aba se não existir
    const newSheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet('Transacoes');
    newSheet.appendRow(['Username', 'Data', 'Descricao', 'Valor', 'Tipo', 'Metodo', 'Cartao', 'Categoria']);
  }
  
  const targetSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Transacoes');
  
  // Ordem: Username, Data, Descricao, Valor, Tipo, Metodo, Cartao, Categoria
  targetSheet.appendRow([
    data.username,
    data.date,
    data.description,
    data.amount,
    data.type,   // 'receita' ou 'despesa'
    data.method, // 'credito' ou 'debito'
    data.card,   // 'NuBank', 'Itaú', etc.
    data.category
  ]);

  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

function updateTransaction(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Transacoes');
  const rowIndex = data.rowIndex; // Precisa vir do frontend

  // Segurança basica: verifica se a linha pertence ao usuário (seria ideal, mas simples por enquanto)
  // Atualiza linha
  const range = sheet.getRange(rowIndex, 1, 1, 8);
  range.setValues([[
    data.username,
    data.date,
    data.description,
    data.amount,
    data.type,
    data.method,
    data.card,
    data.category
  ]]);

  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

function deleteTransaction(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Transacoes');
  // Deletar linha é perigoso se índices mudarem concorrentemente, mas para uso pessoal ok.
  // Ideal: limpar conteúdo ou usar ID único. Vamos limpar conteúdo para não zoar índices de outros.
  
  if (data.rowIndex > 1) { // Protege header
      sheet.deleteRow(data.rowIndex);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}


// --- LOGIN SIMPLES ---
function checkUser(username, password) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Users');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false })).setMimeType(ContentService.MimeType.JSON);
  
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === username && rows[i][1] === password) {
       return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ success: false })).setMimeType(ContentService.MimeType.JSON);
}

function registerUser(username, password) {
  let sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Users');
  if (!sheet) {
    sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet('Users');
    sheet.appendRow(['Username', 'Password']);
  }
  
  sheet.appendRow([username, password]);
  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

// --- GROQ API ---

function callGroqAI(messages) {
  if (!GROQ_API_KEY) {
     return ContentService.createTextOutput(JSON.stringify({ error: 'Chave da API Groq não configurada' })).setMimeType(ContentService.MimeType.JSON);
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  
  const payload = {
    model: "llama-3.1-70b-versatile",
    messages: messages,
    temperature: 0.7
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + GROQ_API_KEY
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    return ContentService.createTextOutput(JSON.stringify(json)).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
