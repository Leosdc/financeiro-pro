# Financeiro Pro 💰

Um aplicativo de controle financeiro pessoal, inteligente e com design premium. Gerencie seus gastos, controle seus cartões e receba insights valiosos com Inteligência Artificial.

## � Funcionalidades

- **Dashboard Intuitivo**: Visão clara de Entradas, Saídas e Saldo Total.
- **Gestão de Cartões**: Controle separado por cartões (NuBank, Itaú, Inter, etc.) e métodos (Crédito/Débito).
- **IA Insights**: Integração com a **Groq API** para analisar seus hábitos de consumo e dar dicas de economia.
- **Armazenamento em Nuvem**: Seus dados ficam salvos em uma planilha do Google Sheets segura e privada.
- **Design Premium**: Interface moderna com modo escuro e efeitos de vidro (Glassmorphism).
- **PWA**: Instale no celular ou PC como um aplicativo nativo.

## 🛠️ Tecnologias

- **Frontend**: HTML5, Vanilla JavaScript, Tailwind CSS.
- **Backend**: Google Apps Script (Serverless).
- **Database**: Google Sheets.
- **AI**: Groq API (Llama 3 via Proxy no Apps Script).

## ⚙️ Configuração

Para rodar este projeto, você precisa configurar o backend no Google Apps Script:

1. Crie uma nova planilha no Google Sheets.
2. Abra `Extensões > Apps Script`.
3. Copie o código de `app_script_backend.js` e cole no editor.
4. Defina a propriedade do script `GROQ_API_KEY` com sua chave da Groq.
5. Publique como **Aplicativo da Web** (Acesso: Qualquer pessoa).
6. Copie a URL gerada e atualize a variável `API_URL` no arquivo `script.js`.

## 📱 Instalação

Este projeto é um **Progressive Web App (PWA)**. Acesse a URL do GitHub Pages pelo seu navegador móvel e clique em "Adicionar à Tela Inicial".

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
