const API_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_URL) || '';

// State
let currentUser = null;
let transactions = [];
let view = 'login'; // login, register, dashboard, form, list
let isLoading = false;
let insightResult = null;

// Mock Data for Initial Dev (until connected)
const CARD_OPTIONS = [
    { id: 'nubank', name: 'NuBank', color: 'bg-purple-600' },
    { id: 'itau', name: 'Itaú', color: 'bg-orange-500' },
    { id: 'santander', name: 'Santander', color: 'bg-red-600' },
    { id: 'mercadopago', name: 'Mercado Pago', color: 'bg-cyan-500' },
    { id: 'inter', name: 'Inter', color: 'bg-orange-400' },
    { id: 'cash', name: 'Dinheiro', color: 'bg-emerald-500' },
    { id: 'other', name: 'Outro', color: 'bg-slate-500' }
];

// --- INIT ---
function init() {
    const savedUser = localStorage.getItem('finUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        view = 'dashboard';
        loadData();
    }
    render();
}

// --- API NOTIFICATIONS ---
function showNotification(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg transform transition-all duration-300 ${type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'} backdrop-blur-md font-medium text-sm flex items-center gap-2`;
    el.innerHTML = type === 'success' ? '<span>✅</span> ' + msg : '<span>⚠️</span> ' + msg;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-10px)';
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

// --- DATA HANDLING ---
async function loadData() {
    if (!currentUser) return;
    isLoading = true;
    render();

    try {
        const res = await fetch(`${API_URL}?action=getData&username=${encodeURIComponent(currentUser.username)}`);
        const data = await res.json();

        if (Array.isArray(data)) {
            transactions = data.map(item => ({
                id: item._rowIndex,
                date: item['Data'] || '',
                description: item['Descricao'] || '',
                amount: parseFloat(item['Valor']) || 0,
                type: item['Tipo'] || 'despesa',
                method: item['Metodo'] || 'credito',
                card: item['Cartao'] || 'other',
                category: item['Categoria'] || 'Geral'
            }));
            // Sort by date desc
            transactions.sort((a, b) => {
                const da = new Date(a.date);
                const db = new Date(b.date);
                return db - da;
            });
        }
    } catch (e) {
        console.error(e);
        // showNotification('Modo Offline: Não foi possivel conectar a planilha', 'error');
        // Keep empty or cached if implemented
    } finally {
        isLoading = false;
        render();
    }
}

async function saveData(transaction) {
    isLoading = true;
    render();

    try {
        const action = transaction.id ? 'update' : 'add';
        const payload = {
            action,
            username: currentUser.username,
            rowIndex: transaction.id,
            date: transaction.date,
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            method: transaction.method,
            card: transaction.card,
            category: transaction.category
        };

        console.log('Enviando payload:', payload); // Debug

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status); // Debug

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Response data:', result); // Debug

        if (result.success || result.success === undefined) {
            await loadData();
            showNotification('Transação salva com sucesso!');
            view = 'dashboard';
        } else {
            throw new Error(result.message || 'Erro ao salvar');
        }
    } catch (e) {
        console.error('Erro completo:', e);
        showNotification('Erro ao salvar: ' + e.message, 'error');
    } finally {
        isLoading = false;
        render();
    }
}

async function deleteData(id) {
    if (!confirm('Tem certeza?')) return;

    isLoading = true;
    render();
    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'delete',
                rowIndex: id
            })
        });
        await new Promise(r => setTimeout(r, 1000));
        await loadData();
        showNotification('Transação removida!');
    } catch (e) {
        showNotification('Erro ao remover', 'error');
    } finally {
        isLoading = false;
        render();
    }
}

async function handleLogin(username, password) {
    if (!username || !password) {
        showNotification('Preencha todos os campos', 'error');
        return;
    }

    isLoading = true;
    render();

    try {
        const url = `${API_URL}?action=checkUser&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&timestamp=${Date.now()}`;
        const check = await fetch(url);

        if (!check.ok) {
            throw new Error(`HTTP error! status: ${check.status}`);
        }

        const res = await check.json();

        if (res.success) {
            currentUser = { username };
            localStorage.setItem('finUser', JSON.stringify(currentUser));
            view = 'dashboard';
            showNotification('Bem-vindo de volta! 👋');
            await loadData();
        } else {
            showNotification(res.message || 'Login inválido', 'error');
        }
    } catch (e) {
        console.error('Erro no login:', e);
        showNotification('Erro ao conectar: ' + e.message, 'error');
    } finally {
        isLoading = false;
        render();
    }
}

async function handleRegister(username, password) {
    if (!username || !password) {
        showNotification('Preencha todos os campos', 'error');
        return;
    }

    if (username.length < 3) {
        showNotification('Usuário deve ter no mínimo 3 caracteres', 'error');
        return;
    }

    if (password.length < 4) {
        showNotification('Senha deve ter no mínimo 4 caracteres', 'error');
        return;
    }

    isLoading = true;
    render();

    try {
        const url = `${API_URL}?timestamp=${Date.now()}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                action: 'registerUser',
                username: username,
                password: password
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const res = await response.json();

        if (res.success) {
            showNotification('Conta criada! Faça login agora 🎉');
            view = 'login';
        } else {
            showNotification(res.message || 'Erro ao criar conta', 'error');
        }
    } catch (e) {
        console.error('Erro no registro:', e);
        showNotification('Erro ao conectar: ' + e.message, 'error');
    } finally {
        isLoading = false;
        render();
    }
}

async function getGroqInsights() {
    isLoading = true;
    render();
    try {
        // Formata os dados para enviar para a IA
        const summary = transactions.slice(0, 50).map(t =>
            `${t.date}: ${t.description} - R$${t.amount} (${t.type}, ${t.card})`
        ).join('\n');

        const prompt = [
            { role: "system", content: "Você é um consultor financeiro pessoal. Analise os gastos do usuário e dê 3 insights curtos e diretos sobre onde ele pode economizar ou padrões de gastos. Seja amigável mas profissional. Use emojis." },
            { role: "user", content: "Meus gastos recentes:\n" + summary }
        ];

        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'callGroq',
                messages: prompt
            })
        });
        const json = await res.json();
        if (json.choices) {
            insightResult = json.choices[0].message.content;
            document.getElementById('dialog-insight').showModal();
        } else {
            insightResult = "Não consegui gerar insights agora. Verifique a chave da API no Script.";
            document.getElementById('dialog-insight').showModal();
        }

    } catch (e) {
        showNotification('Erro ao gerar insights', 'error');
    } finally {
        isLoading = false;
        render();
    }
}

// --- RENDER ---
function render() {
    const app = document.getElementById('app');

    if (isLoading) {
        app.innerHTML = `
            <div class="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
                <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-indigo-300 animate-pulse">Carregando...</p>
            </div>
        `;
        return;
    }

    if (!currentUser || view === 'login' || view === 'register') {
        app.innerHTML = renderLogin();
        lucide.createIcons(); // Fix: Garante que ícones apareçam
        return;
    }

    if (view === 'dashboard') {
        app.innerHTML = renderDashboard();
    } else if (view === 'form') {
        app.innerHTML = renderForm();
    }

    lucide.createIcons();
}

function renderLogin() {
    const isRegisterMode = view === 'register';

    return `
        <div class="flex-1 flex flex-col justify-center p-8 bg-slate-900">
            <div class="text-center mb-10">
                <div class="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4" id="wallet-icon">
                    <i data-lucide="wallet" class="text-white w-10 h-10"></i>
                </div>
                <h1 class="text-3xl font-bold text-white mb-2">Financeiro Pro</h1>
                <p class="text-slate-400">${isRegisterMode ? 'Crie sua conta' : 'Controle total na palma da mão'}</p>
            </div>

            <form onsubmit="event.preventDefault(); ${isRegisterMode ? 'handleRegister' : 'handleLogin'}(this.username.value, this.password.value)" class="space-y-4">
                <div>
                    <label class="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Usuário</label>
                    <input name="username" type="text" class="w-full bg-slate-800 border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none" placeholder="Seu usuário" required minlength="3">
                </div>
                <div>
                    <label class="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Senha</label>
                    <input name="password" type="password" class="w-full bg-slate-800 border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none" placeholder="•••••••" required minlength="4">
                </div>
                <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/25 mt-4">
                    ${isRegisterMode ? 'Criar Conta' : 'Entrar'}
                </button>
            </form>
            
            <div class="mt-6 text-center">
                <button onclick="view = '${isRegisterMode ? 'login' : 'register'}'; render()" class="text-sm text-slate-400 hover:text-indigo-400 transition-colors">
                    ${isRegisterMode ? '← Voltar para login' : 'Criar nova conta →'}
                </button>
            </div>
            
            <p class="mt-8 text-center text-xs text-slate-600">v1.0.0 • Secure Access</p>
        </div>
    `;
}

function renderDashboard() {
    // Calc Totals
    const totalIncome = transactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0);
    const balance = totalIncome - totalExpense;

    return `
        <!-- Navbar -->
        <div class="p-6 pb-2 flex justify-between items-center glass-panel sticky top-0 z-10 backdrop-blur-xl bg-slate-900/80 border-b border-white/5">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <i data-lucide="layout-dashboard" class="text-white w-5 h-5"></i>
                </div>
                <div>
                    <h2 class="font-bold text-lg leading-tight">Olá, ${currentUser.username}</h2>
                    <p class="text-xs text-slate-400">Visão Geral</p>
                </div>
            </div>
            <button onclick="localStorage.removeItem('finUser'); location.reload()" class="p-2 text-slate-400 hover:text-white transition-colors">
                <i data-lucide="log-out" class="w-5 h-5"></i>
            </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-8 pb-24">
            
            <!-- Balance Card -->
            <div class="glass-card rounded-2xl p-6 relative overflow-hidden bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-white/5">
                <!-- Background decoration -->
                <div class="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
                
                <p class="text-slate-400 text-sm font-medium mb-1">Saldo Total</p>
                <h3 class="text-3xl font-bold text-white mb-6">R$ ${balance.toFixed(2)}</h3>

                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/10">
                        <div class="flex items-center gap-2 mb-1">
                            <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span class="text-xs text-emerald-200 uppercase font-semibold tracking-wider">Entradas</span>
                        </div>
                        <p class="text-lg font-bold text-emerald-400">R$ ${totalIncome.toFixed(2)}</p>
                    </div>
                    <div class="bg-red-500/10 p-3 rounded-xl border border-red-500/10">
                        <div class="flex items-center gap-2 mb-1">
                            <div class="w-2 h-2 rounded-full bg-red-500"></div>
                            <span class="text-xs text-red-200 uppercase font-semibold tracking-wider">Saídas</span>
                        </div>
                        <p class="text-lg font-bold text-red-400">R$ ${totalExpense.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="grid grid-cols-2 gap-4">
                <button onclick="view = 'form'; render()" class="glass-card p-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white/5 active:scale-95 transition-all group">
                    <div class="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <i data-lucide="plus" class="w-5 h-5"></i>
                    </div>
                    <span class="font-medium text-sm">Nova Transação</span>
                </button>
                <button onclick="getGroqInsights()" class="glass-card p-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white/5 active:scale-95 transition-all group from-purple-900/20 to-pink-900/20 bg-gradient-to-br">
                    <div class="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                        <i data-lucide="sparkles" class="w-5 h-5"></i>
                    </div>
                    <span class="font-medium text-sm">IA Insights</span>
                </button>
            </div>

            <!-- Recent Transactions -->
            <div>
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-lg">Transações Recentes</h3>
                    <span class="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">${transactions.length} registros</span>
                </div>

                <div class="space-y-3">
                    ${transactions.length === 0 ? `
                        <div class="text-center py-10 text-slate-500">
                            <i data-lucide="ghost" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                            <p class="text-sm">Nada por aqui ainda.</p>
                        </div>
                    ` : transactions.map(t => {
        const cardInfo = CARD_OPTIONS.find(c => c.id === t.card) || CARD_OPTIONS[6];
        return `
                        <div class="glass-card p-4 rounded-2xl flex items-center justify-between group">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold text-white shadow-sm ${cardInfo.color}">
                                    <span>${cardInfo.name.substring(0, 4)}</span>
                                </div>
                                <div>
                                    <p class="font-semibold text-sm line-clamp-1">${t.description}</p>
                                    <div class="flex items-center gap-2 mt-1">
                                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">${t.category}</span>
                                        <span class="text-[10px] text-slate-500">${t.date} • ${t.method}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-bold text-sm ${t.type === 'receita' ? 'text-emerald-400' : 'text-white'}">
                                    ${t.type === 'receita' ? '+' : '-'} R$ ${t.amount.toFixed(2)}
                                </p>
                                <button onclick="deleteData(${t.id})" class="text-[10px] text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1">Excluir</button>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            </div>
        </div>

        <!-- Insight Dialog -->
        <dialog id="dialog-insight" class="backdrop:bg-black/80 bg-transparent p-0 w-full max-w-sm m-auto shadow-none">
            <div class="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <i data-lucide="sparkles" class="text-purple-400 w-5 h-5"></i>
                    Insights da IA
                </h3>
                <div class="prose prose-invert prose-sm max-h-60 overflow-y-auto">
                    <p class="text-slate-300 leading-relaxed whitespace-pre-wrap">${insightResult || 'Carregando...'}</p>
                </div>
                <form method="dialog" class="mt-6 flex justify-end">
                    <button class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors">Fechar</button>
                </form>
            </div>
        </dialog>
    `;
}

function renderForm() {
    return `
        <div class="p-6 border-b border-white/5 flex items-center gap-4 sticky top-0 bg-slate-900/90 z-10 backdrop-blur-md">
            <button onclick="view = 'dashboard'; render()" class="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <i data-lucide="arrow-left" class="w-6 h-6 text-white"></i>
            </button>
            <h2 class="font-bold text-lg text-white">Nova Transação</h2>
        </div>

        <div class="flex-1 overflow-y-auto p-6 pb-24">
            <form onsubmit="event.preventDefault(); submitForm(this)" class="space-y-6">
                
                <!-- Type Toggle -->
                <div class="grid grid-cols-2 gap-2 p-1 bg-slate-800/50 rounded-xl border border-white/5">
                    <label class="cursor-pointer">
                        <input type="radio" name="type" value="despesa" checked class="peer sr-only">
                        <div class="text-center py-2.5 rounded-lg text-sm font-medium text-slate-400 peer-checked:bg-red-500/10 peer-checked:text-red-400 peer-checked:border peer-checked:border-red-500/20 transition-all">
                            Despesa
                        </div>
                    </label>
                    <label class="cursor-pointer">
                        <input type="radio" name="type" value="receita" class="peer sr-only">
                        <div class="text-center py-2.5 rounded-lg text-sm font-medium text-slate-400 peer-checked:bg-emerald-500/10 peer-checked:text-emerald-400 peer-checked:border peer-checked:border-emerald-500/20 transition-all">
                            Receita
                        </div>
                    </label>
                </div>

                <!-- Amount -->
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Valor (R$)</label>
                    <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                        <input name="amount" type="number" step="0.01" inputmode="decimal" class="input-premium w-full text-2xl font-bold pl-12 pr-4 py-4 rounded-xl bg-slate-800/50 border-white/10 focus:border-indigo-500 transition-colors" placeholder="0,00" required>
                    </div>
                </div>

                <!-- Description -->
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Descrição</label>
                    <input name="description" type="text" class="input-premium w-full px-4 py-3 rounded-xl bg-slate-800/50 border-white/10 text-sm" placeholder="Ex: Almoço, Uber, Salário" required>
                </div>

                <!-- Date & Category -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Data</label>
                        <input name="date" type="date" value="${new Date().toISOString().split('T')[0]}" class="input-premium w-full px-4 py-3 rounded-xl bg-slate-800/50 border-white/10 text-sm text-slate-200" required>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Categoria</label>
                        <select name="category" class="input-premium w-full px-4 py-3 rounded-xl bg-slate-800/50 border-white/10 text-sm text-slate-200 appearence-none">
                            <option>Alimentação</option>
                            <option>Transporte</option>
                            <option>Lazer</option>
                            <option>Saúde</option>
                            <option>Educação</option>
                            <option>Contas</option>
                            <option>Outros</option>
                        </select>
                    </div>
                </div>

                <!-- Payment Method -->
                 <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Cartão / Conta</label>
                    <div class="grid grid-cols-3 gap-3">
                        ${CARD_OPTIONS.map((card, idx) => `
                            <label class="cursor-pointer relative">
                                <input type="radio" name="card" value="${card.id}" ${idx === 0 ? 'checked' : ''} class="peer sr-only">
                                <div class="flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 bg-slate-800/30 peer-checked:bg-indigo-600/20 peer-checked:border-indigo-500 peer-checked:ring-1 peer-checked:ring-indigo-500 transition-all hover:bg-slate-800">
                                    <div class="w-8 h-5 rounded-md ${card.color} shadow-sm mb-2"></div>
                                    <span class="text-[10px] font-medium text-slate-300 text-center leading-tight">${card.name}</span>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                 <!-- Credito/Debito Toggle -->
                <div class="grid grid-cols-2 gap-2 p-1 bg-slate-800/50 rounded-xl border border-white/5">
                    <label class="cursor-pointer">
                        <input type="radio" name="method" value="credito" checked class="peer sr-only">
                        <div class="text-center py-2 rounded-lg text-xs font-medium text-slate-400 peer-checked:bg-indigo-500 peer-checked:text-white transition-all">
                            Crédito
                        </div>
                    </label>
                    <label class="cursor-pointer">
                        <input type="radio" name="method" value="debito" class="peer sr-only">
                        <div class="text-center py-2 rounded-lg text-xs font-medium text-slate-400 peer-checked:bg-indigo-500 peer-checked:text-white transition-all">
                            Débito
                        </div>
                    </label>
                </div>

                <div class="pt-4">
                    <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all transform active:scale-[0.98]">
                        Salvar Transação
                    </button>
                </div>
            </form>
        </div>
    `;
}

function submitForm(form) {
    const data = {
        type: form.type.value,
        amount: parseFloat(form.amount.value),
        description: form.description.value,
        date: form.date.value,
        category: form.category.value,
        card: form.card.value,
        method: form.method.value
    };

    // Validações
    if (!data.amount || data.amount <= 0) {
        showNotification('Informe um valor válido', 'error');
        return;
    }

    if (!data.description || data.description.trim() === '') {
        showNotification('Informe uma descrição', 'error');
        return;
    }

    console.log('Dados a salvar:', data); // Debug
    saveData(data);
}

// Start
init();