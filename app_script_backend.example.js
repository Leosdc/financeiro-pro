const SPREADSHEET_ID = 'ID DA PLANILHA DO GOOGLE SHEETS';
const GROQ_API_KEY = PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');

// ===== INICIALIZAÇÃO =====
function initializeSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Criar aba Users se não existir
  let usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) {
    usersSheet = ss.insertSheet('Users');
    usersSheet.appendRow(['Username', 'Password', 'CreatedAt']);
    usersSheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#4F46E5').setFontColor('#FFFFFF');
  }

  // Criar aba Transacoes se não existir
  let transSheet = ss.getSheetByName('Transacoes');
  if (!transSheet) {
    transSheet = ss.insertSheet('Transacoes');
    transSheet.appendRow(['Username', 'Data', 'Descricao', 'Valor', 'Tipo', 'Metodo', 'Cartao', 'Categoria']);
    transSheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#4F46E5').setFontColor('#FFFFFF');
  }

  return { usersSheet, transSheet };
}

// ===== GET =====
function doGet(e) {
  const params = e.parameter;
  const action = params.action;

  // Login / Check User
  if (action === 'checkUser') {
    return checkUser(params.username, params.password);
  }

  // Get Data
  if (action === 'getData') {
    const username = params.username;
    if (!username) {
      return jsonResponse({ error: 'Usuário não fornecido' });
    }
    return getData(username);
  }

  return jsonResponse({ error: 'Ação GET inválida' });
}

// ===== POST =====
function doPost(e) {
  try {
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

    return jsonResponse({ error: 'Ação POST inválida' });
  } catch (err) {
    return jsonResponse({ error: 'Erro ao processar requisição: ' + err.toString() });
  }
}

// ===== HELPER =====
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== DADOS =====
function getData(username) {
  const { transSheet } = initializeSheets();

  const rows = transSheet.getDataRange().getValues();
  if (rows.length <= 1) {
    return jsonResponse([]);
  }

  const headers = rows[0];
  const data = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] === username) {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index];
      });
      item._rowIndex = i + 1;
      data.push(item);
    }
  }

  return jsonResponse(data);
}

function addTransaction(data) {
  const { transSheet } = initializeSheets();

  transSheet.appendRow([
    data.username,
    data.date,
    data.description,
    parseFloat(data.amount) || 0,
    data.type,
    data.method,
    data.card,
    data.category
  ]);

  return jsonResponse({ success: true, message: 'Transação adicionada' });
}

function updateTransaction(data) {
  const { transSheet } = initializeSheets();
  const rowIndex = data.rowIndex;

  if (!rowIndex || rowIndex <= 1) {
    return jsonResponse({ success: false, error: 'Índice inválido' });
  }

  const range = transSheet.getRange(rowIndex, 1, 1, 8);
  range.setValues([[
    data.username,
    data.date,
    data.description,
    parseFloat(data.amount) || 0,
    data.type,
    data.method,
    data.card,
    data.category
  ]]);

  return jsonResponse({ success: true, message: 'Transação atualizada' });
}

function deleteTransaction(data) {
  const { transSheet } = initializeSheets();

  if (!data.rowIndex || data.rowIndex <= 1) {
    return jsonResponse({ success: false, error: 'Índice inválido' });
  }

  transSheet.deleteRow(data.rowIndex);
  return jsonResponse({ success: true, message: 'Transação removida' });
}

// ===== AUTENTICAÇÃO =====
function checkUser(username, password) {
  const { usersSheet } = initializeSheets();

  const rows = usersSheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === username && rows[i][1] === password) {
      return jsonResponse({ success: true, username: username });
    }
  }

  return jsonResponse({ success: false, message: 'Usuário ou senha inválidos' });
}

function registerUser(username, password) {
  const { usersSheet } = initializeSheets();

  // Verificar se usuário já existe
  const rows = usersSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === username) {
      return jsonResponse({ success: false, message: 'Usuário já existe' });
    }
  }

  // Criar novo usuário
  const timestamp = new Date().toISOString();
  usersSheet.appendRow([username, password, timestamp]);

  return jsonResponse({ success: true, message: 'Usuário criado com sucesso' });
}

// ===== GROQ API =====
function callGroqAI(messages) {
  if (!GROQ_API_KEY) {
    return jsonResponse({ error: 'Chave da API Groq não configurada' });
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const payload = {
    model: "llama-3.1-70b-versatile",
    messages: messages,
    temperature: 0.7,
    max_tokens: 1000
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

    if (json.error) {
      return jsonResponse({ error: json.error.message || 'Erro na API Groq' });
    }

    return jsonResponse(json);
  } catch (e) {
    return jsonResponse({ error: 'Falha ao conectar com Groq: ' + e.toString() });
  }
}