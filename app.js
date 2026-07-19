// ============================================================
// APP.JS — Aliança Divergente Protocol Assistant
// Chat interativo no estilo Elton Euler
// ============================================================

// ─── AUTH STATE ──────────────────────────────────────────────
let currentUser = null; // { id, name, displayName }

function userKey(key) {
  if (!currentUser) return key;
  return `${currentUser.name}_${key}`;
}

// ─── STATE ───────────────────────────────────────────────────
let state = {
  mode: 'welcome', // welcome | chat | protocol | reference | analysis | analysis_chat
  currentProtocol: null,
  currentPhase: 0,
  currentQuestion: 0,
  protocolResponses: {},
  chatHistory: [],
  sidebarOpen: true
};

// ─── DOM REFS ────────────────────────────────────────────────
const chatContainer = document.getElementById('chatContainer');
const chatInput = document.getElementById('chatInput');
const headerTitle = document.getElementById('headerTitle');
const btnExport = document.getElementById('btnExport');

// ─── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in this session
  const savedSession = sessionStorage.getItem('ad_session');
  if (savedSession) {
    try {
      currentUser = JSON.parse(savedSession);
      onLoginSuccess();
    } catch (e) {
      showLoginScreen();
    }
  } else {
    showLoginScreen();
  }
});

// ─── LOGIN SCREEN ────────────────────────────────────────────
function showLoginScreen() {
  // Hide main app, show login
  document.getElementById('appContainer').style.display = 'none';
  
  let loginDiv = document.getElementById('loginScreen');
  if (!loginDiv) {
    loginDiv = document.createElement('div');
    loginDiv.id = 'loginScreen';
    document.body.appendChild(loginDiv);
  }
  
  loginDiv.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="login-logo">⚡</div>
          <h1>Aliança Divergente</h1>
          <p>Assistente de Protocolos — Elton Euler</p>
        </div>
        
        <div class="login-form">
          <div class="login-tabs">
            <button class="login-tab active" onclick="switchLoginTab('login')" id="tabLogin">Entrar</button>
            <button class="login-tab" onclick="switchLoginTab('register')" id="tabRegister">Criar Conta</button>
          </div>
          
          <div id="loginFormContent">
            <input type="text" id="loginName" placeholder="Seu nome" autocomplete="off" />
            <input type="password" id="loginPassword" placeholder="Sua senha" />
            <button class="login-btn" onclick="doLogin()" id="loginBtn">⚡ Entrar</button>
          </div>
          
          <div id="registerFormContent" style="display:none;">
            <input type="text" id="registerName" placeholder="Escolha seu nome" autocomplete="off" />
            <input type="password" id="registerPassword" placeholder="Crie uma senha" />
            <input type="password" id="registerPasswordConfirm" placeholder="Confirme a senha" />
            <button class="login-btn" onclick="doRegister()" id="registerBtn">✨ Criar Conta</button>
          </div>
          
          <div id="loginError" class="login-error" style="display:none;"></div>
        </div>
        
        <div class="login-quote">
          <em>"A vida entende decisões, não problemas nem sonhos."</em>
          <span>— Elton Euler</span>
        </div>
      </div>
    </div>
  `;
  
  // Enter key support
  setTimeout(() => {
    const loginPass = document.getElementById('loginPassword');
    const regPassConf = document.getElementById('registerPasswordConfirm');
    if (loginPass) loginPass.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    if (regPassConf) regPassConf.addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });
  }, 100);
}

function switchLoginTab(tab) {
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('loginFormContent').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerFormContent').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('loginError').style.display = 'none';
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.innerHTML = msg;
  
  // Se for erro de conexão, adiciona o botão de atualizar
  if (msg.includes('servidor está rodando') || msg.includes('conexão')) {
    el.innerHTML += `<div style="margin-top: 15px;">
      <button onclick="window.location.reload()" style="padding: 10px 20px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: #fff; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">🔄 Reconectar / Atualizar</button>
    </div>`;
    el.style.display = 'block';
    // Não esconde automaticamente para dar tempo de clicar
  } else {
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  }
}

async function doLogin() {
  const name = document.getElementById('loginName').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!name || !password) { showLoginError('Preencha nome e senha.'); return; }
  
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Entrando...';
  
  try {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });
    const data = await r.json();
    
    if (!r.ok) { showLoginError(data.error); btn.disabled = false; btn.textContent = '⚡ Entrar'; return; }
    
    currentUser = data.user;
    sessionStorage.setItem('ad_session', JSON.stringify(currentUser));
    onLoginSuccess();
  } catch (e) {
    showLoginError('Erro de conexão. O servidor está rodando?');
    btn.disabled = false;
    btn.textContent = '⚡ Entrar';
  }
}

async function doRegister() {
  const name = document.getElementById('registerName').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerPasswordConfirm').value;
  
  if (!name || !password) { showLoginError('Preencha todos os campos.'); return; }
  if (password !== confirm) { showLoginError('As senhas não conferem.'); return; }
  
  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Criando...';
  
  try {
    const r = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });
    const data = await r.json();
    
    if (!r.ok) { showLoginError(data.error); btn.disabled = false; btn.textContent = '✨ Criar Conta'; return; }
    
    currentUser = data.user;
    sessionStorage.setItem('ad_session', JSON.stringify(currentUser));
    onLoginSuccess();
  } catch (e) {
    showLoginError('Erro de conexão. O servidor está rodando?');
    btn.disabled = false;
    btn.textContent = '✨ Criar Conta';
  }
}

async function onLoginSuccess() {
  // Remove login screen
  const loginScreen = document.getElementById('loginScreen');
  if (loginScreen) loginScreen.remove();
  
  // Show app
  document.getElementById('appContainer').style.display = 'flex';
  
  // Update header with user name
  const userBadge = document.getElementById('userBadge');
  if (userBadge) {
    userBadge.textContent = `👤 ${currentUser.displayName}`;
    userBadge.style.display = 'inline-block';
  }
  
  // Sincronizar dados da nuvem antes de prosseguir
  await syncFromServer();
  
  showWelcome();
}

function doLogout() {
  sessionStorage.removeItem('ad_session');
  currentUser = null;
  state = {
    mode: 'welcome',
    currentProtocol: null,
    currentPhase: 0,
    currentQuestion: 0,
    protocolResponses: {},
    chatHistory: [],
    sidebarOpen: true
  };
  document.getElementById('appContainer').style.display = 'none';
  showLoginScreen();
}

// ─── SIDEBAR ─────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
  state.sidebarOpen = !state.sidebarOpen;
}

function setActiveNav(id) {
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  if (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }
  
  // Auto-collapse on mobile after selecting an item
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && !sidebar.classList.contains('collapsed')) {
      sidebar.classList.add('collapsed');
      state.sidebarOpen = false;
    }
  }
}

// ─── WELCOME SCREEN ─────────────────────────────────────────
function showWelcome() {
  state.mode = 'welcome';
  state.currentProtocol = null;
  btnExport.style.display = 'none';
  setActiveNav('nav-home');
  updateHeader('Aliança Divergente', 'Assistente de Protocolos — Elton Euler');
  
  const quote = KNOWLEDGE.quotes[Math.floor(Math.random() * KNOWLEDGE.quotes.length)];
  
  chatContainer.innerHTML = `
    <div class="welcome-screen">
      <div class="welcome-avatar">⚡</div>
      <h2 class="welcome-title">Fala, Memorável!</h2>
      <p class="welcome-subtitle">
        Eu sou o assistente baseado nos princípios do <strong>Elton Euler</strong> e da <strong>Aliança Divergente</strong>. 
        Estou aqui para te guiar pelos protocolos e te apoiar na construção da sua vida memorável.
      </p>
      <blockquote class="welcome-quote">
        "${quote}" — Elton Euler
      </blockquote>
      <div class="welcome-actions">
        <div class="welcome-action-card" onclick="startProtocol('combate_medo')">
          <div class="card-icon">⚔️</div>
          <div class="card-title">Combate do Medo</div>
          <div class="card-desc">Identifique, analise e supere seus medos.</div>
        </div>
        <div class="welcome-action-card" onclick="startProtocol('dep_emocional_passiva')">
          <div class="card-icon">🛡️</div>
          <div class="card-title">Dep. Emocional Passiva</div>
          <div class="card-desc">Proteja seu núcleo de invasores.</div>
        </div>
        <div class="welcome-action-card" onclick="startProtocol('dep_emocional_ativa')">
          <div class="card-icon">🔓</div>
          <div class="card-title">Dep. Emocional Ativa</div>
          <div class="card-desc">Pare de invadir o núcleo do outro.</div>
        </div>
        <div class="welcome-action-card" onclick="showChatMode()">
          <div class="card-icon">💬</div>
          <div class="card-title">Conversar com Elton</div>
          <div class="card-desc">Tire dúvidas sobre conceitos e princípios.</div>
        </div>
        
        <div class="welcome-action-card" onclick="startProtocol('combate_culpa')">
          <div class="card-icon">🛡️</div>
          <div class="card-title">Combate à Culpa</div>
          <div class="card-desc">Analise fatos e limites de responsabilidade.</div>
        </div>
        <div class="welcome-action-card" onclick="startProtocol('culpa_dirigida')">
          <div class="card-icon">🎯</div>
          <div class="card-title">Culpa Dirigida</div>
          <div class="card-desc">Roteiro para perdoar e se libertar.</div>
        </div>
        <div class="welcome-action-card" onclick="startProtocol('culpa_ilegitima')">
          <div class="card-icon">🧱</div>
          <div class="card-title">Culpa Ilegítima</div>
          <div class="card-desc">Roteiro para devolver pesos que não são seus.</div>
        </div>
        <div class="welcome-action-card" onclick="startProtocol('autoculpa')">
          <div class="card-icon">🧘</div>
          <div class="card-title">Autoculpa</div>
          <div class="card-desc">PDA para autoperdão e ações para o futuro.</div>
        </div>
<div class="welcome-action-card" onclick="startProtocol('pense_comigo')">
          <div class="card-icon">💭</div>
          <div class="card-title">Pense Comigo</div>
          <div class="card-desc">Use a estrutura de apoio para resolver problemas.</div>
        </div>
        <div class="welcome-action-card" onclick="showEscadaPostura()">
          <div class="card-icon">🪜</div>
          <div class="card-title">Escada da Postura</div>
          <div class="card-desc">Revise os 6 degraus da postura memorável.</div>
        </div>
      </div>
    </div>
  `;
  scrollToBottom();
}

// ─── CHAT MODE ───────────────────────────────────────────────
function showChatMode() {
  state.mode = 'chat';
  state.currentProtocol = null;
  btnExport.style.display = 'none';
  setActiveNav('nav-chat');
  updateHeader('Conversando com Elton', 'Tire dúvidas sobre conceitos, protocolos e princípios');
  
  chatContainer.innerHTML = '';
  addBotMessage(`Fala, Memorável! 💛

Estou aqui para te apoiar. Pode me perguntar sobre:

• **Conceitos e termos** da Aliança Divergente
• **Protocolos** — como usar, quando aplicar
• **PDA** — Percepção, Decisão, Ação
• **Escada da Postura** — os 6 degraus
• **Padrões Controladores** — Vítima, Narcisista, Vingador
• **Apoio vs Ajuda** — qual a diferença
• Qualquer dúvida sobre o material

_"A vida não entende problemas, a vida não entende sonhos, a vida entende decisões."_ — Elton Euler

**O que você quer saber?**`);
  
  chatInput.focus();
  scrollToBottom();
}

// ─── PROTOCOL MODE ───────────────────────────────────────────
function startProtocol(protocolId) {
  const protocol = PROTOCOLS[protocolId];
  if (!protocol) return;
  
  state.mode = 'protocol';
  state.currentProtocol = protocol;
  state.currentPhase = 0;
  state.currentQuestion = 0;
  state.protocolResponses = { protocolId, protocolName: protocol.nome, startedAt: new Date().toISOString(), responses: {} };
  btnExport.style.display = 'flex';
  
  setActiveNav(null);
  updateHeader(protocol.nome, protocol.descricao);
  
  chatContainer.innerHTML = '';
  
  addBotMessage(`${protocol.icon} **${protocol.nome}**

${protocol.instrucao}

_Vou te guiar pergunta por pergunta. Responda com calma e honestidade — sem desculpas, sem ilusões._

Vamos começar! 👊`);
  
  setTimeout(() => renderCurrentStep(), 600);
  scrollToBottom();
}

function renderCurrentStep() {
  const protocol = state.currentProtocol;
  if (!protocol) return;
  
  const phase = protocol.fases[state.currentPhase];
  if (!phase) {
    completeProtocol();
    return;
  }
  
  const question = phase.perguntas[state.currentQuestion];
  if (!question) {
    // Move to next phase
    state.currentPhase++;
    state.currentQuestion = 0;
    if (state.currentPhase < protocol.fases.length) {
      const nextPhase = protocol.fases[state.currentPhase];
      addBotMessage(`${nextPhase.icon} **${nextPhase.nome}**\n\nVamos para a próxima fase. Continue com a mesma honestidade.`);
      setTimeout(() => renderCurrentStep(), 400);
    } else {
      completeProtocol();
    }
    return;
  }
  
  // Calculate progress
  const totalQuestions = protocol.fases.reduce((sum, f) => sum + f.perguntas.length, 0);
  let answeredSoFar = 0;
  for (let i = 0; i < state.currentPhase; i++) {
    answeredSoFar += protocol.fases[i].perguntas.length;
  }
  answeredSoFar += state.currentQuestion;
  const progress = Math.round((answeredSoFar / totalQuestions) * 100);
  
  // Build step HTML
  let inputHTML = '';
  
  switch (question.tipo) {
    case 'textarea':
      inputHTML = `<textarea id="stepAnswer" placeholder="Escreva sua resposta aqui..." rows="4"></textarea>`;
      break;
    case 'text':
      inputHTML = `<input type="text" id="stepAnswer" placeholder="Sua resposta...">`;
      break;
    case 'choice':
      inputHTML = `<div class="choice-options" id="stepAnswer">
        ${question.opcoes.map((op, i) => `
          <div class="choice-option" onclick="selectChoice(this, '${escapeAttr(op)}', false)" data-value="${escapeAttr(op)}">
            <div class="radio-dot"></div>
            <span>${op}</span>
          </div>
        `).join('')}
      </div>`;
      break;
    case 'multichoice':
      inputHTML = `<div class="choice-options" id="stepAnswer" data-multi="true">
        ${question.opcoes.map((op, i) => `
          <div class="choice-option" onclick="selectChoice(this, '${escapeAttr(op)}', true)" data-value="${escapeAttr(op)}">
            <div class="checkbox-box"></div>
            <span>${op}</span>
          </div>
        `).join('')}
      </div>`;
      break;
    case 'scale':
      const btns = [];
      for (let i = question.min; i <= question.max; i++) {
        btns.push(`<button class="scale-btn" onclick="selectScale(this, ${i})" data-value="${i}">${i}</button>`);
      }
      inputHTML = `<div class="scale-input" id="stepAnswer">${btns.join('')}</div>`;
      break;
  }
  
  const stepHTML = `
    <div class="protocol-progress">
      <span class="progress-phase">${phase.icon} ${phase.nome}</span>
      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width: ${progress}%"></div>
      </div>
      <span class="progress-text">${answeredSoFar + 1}/${totalQuestions}</span>
    </div>
    <div class="protocol-step" id="currentStep">
      <div class="protocol-step-header">
        <span class="step-phase-badge">${phase.nome}</span>
        <span class="step-number">Pergunta ${question.id}</span>
      </div>
      <div class="question-text">${question.texto}</div>
      ${inputHTML}
      <div class="step-actions">
        <button class="step-btn skip" onclick="skipQuestion()">Pular</button>
        <button class="step-btn next" onclick="submitAnswer()">Próxima ➤</button>
      </div>
    </div>
  `;
  
  chatContainer.insertAdjacentHTML('beforeend', stepHTML);
  scrollToBottom();
  
  // Focus input
  const answerEl = document.getElementById('stepAnswer');
  if (answerEl && (answerEl.tagName === 'TEXTAREA' || answerEl.tagName === 'INPUT')) {
    setTimeout(() => answerEl.focus(), 300);
  }
}

function selectChoice(element, value, isMulti) {
  if (isMulti) {
    element.classList.toggle('selected');
  } else {
    element.parentElement.querySelectorAll('.choice-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
  }
}

function selectScale(element, value) {
  element.parentElement.querySelectorAll('.scale-btn').forEach(el => el.classList.remove('selected'));
  element.classList.add('selected');
}

function submitAnswer() {
  const protocol = state.currentProtocol;
  const phase = protocol.fases[state.currentPhase];
  const question = phase.perguntas[state.currentQuestion];
  
  let answer = '';
  const answerEl = document.getElementById('stepAnswer');
  
  switch (question.tipo) {
    case 'textarea':
    case 'text':
      answer = answerEl.value.trim();
      break;
    case 'choice':
      const selected = answerEl.querySelector('.selected');
      answer = selected ? selected.dataset.value : '';
      break;
    case 'multichoice':
      const selectedMulti = answerEl.querySelectorAll('.selected');
      answer = Array.from(selectedMulti).map(el => el.dataset.value).join(', ');
      break;
    case 'scale':
      const selectedScale = answerEl.querySelector('.selected');
      answer = selectedScale ? selectedScale.dataset.value : '';
      break;
  }
  
  if (!answer) {
    showToast('⚠️ Responda a pergunta antes de avançar. Sem desculpas!');
    return;
  }
  
  // Save response
  const key = `${state.currentPhase}_${state.currentQuestion}_${question.id}`;
  state.protocolResponses.responses[key] = {
    phase: phase.nome,
    questionId: question.id,
    questionText: question.texto,
    answer: answer,
    answeredAt: new Date().toISOString()
  };
  
  // Show user answer as message
  addUserMessage(answer);
  
  // Remove current step
  const stepEl = document.getElementById('currentStep');
  if (stepEl) stepEl.remove();
  const progressEl = chatContainer.querySelector('.protocol-progress');
  if (progressEl) progressEl.remove();
  
  // Move to next
  state.currentQuestion++;
  
  // Add encouragement sometimes
  const encouragements = [
    "Boa! Continue com essa honestidade. 💪",
    "Excelente percepção. Vamos para a próxima.",
    "Muito bom. Você está fazendo o básico bem feito.",
    "Isso! Sem desculpas, sem ilusões. 🔥",
    "Perfeito. Continue assim, Memorável.",
    "Ótimo. Cada resposta é um passo em direção à sua vida memorável."
  ];
  
  if (Math.random() < 0.35) {
    const enc = encouragements[Math.floor(Math.random() * encouragements.length)];
    addBotMessage(enc);
  }
  
  setTimeout(() => renderCurrentStep(), 400);
}

function skipQuestion() {
  const stepEl = document.getElementById('currentStep');
  if (stepEl) stepEl.remove();
  const progressEl = chatContainer.querySelector('.protocol-progress');
  if (progressEl) progressEl.remove();
  
  state.currentQuestion++;
  setTimeout(() => renderCurrentStep(), 200);
}

function completeProtocol() {
  state.protocolResponses.completedAt = new Date().toISOString();
  const protocol = state.currentProtocol;
  const protocolId = state.protocolResponses.protocolId;
  
  // ── Special flow for Conversas Difíceis ──
  if (protocolId === 'conversas_dificeis') {
    saveProtocolToStorage(state.protocolResponses);
    completeConversasDificeis();
    return;
  }
  
  chatContainer.insertAdjacentHTML('beforeend', `
    <div class="protocol-complete" id="saveProtocolBlock">
      <div class="complete-icon">🏆</div>
      <h3 class="complete-title">Protocolo Concluído!</h3>
      <p class="complete-text" style="margin-bottom: 15px;">
        Você preencheu todas as perguntas do <strong>${protocol.nome}</strong>.
      </p>
      
      <div style="background: var(--surface-2); padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-gold); font-size: 0.9rem;">
          👤 Nome da pessoa envolvida (opcional):
        </label>
        <input type="text" id="protocolTargetName" placeholder="Ex: Pai, Mãe, Chefe, João..." style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid var(--surface-3); background: var(--surface-1); color: var(--text-primary); font-family: 'Inter', sans-serif;" />
        <small style="display: block; margin-top: 5px; color: var(--text-muted);">Isso ajuda a organizar seu histórico no menu lateral.</small>
      </div>

      <div class="complete-actions">
        <button class="step-btn next" onclick="saveAndAnalyzeProtocol()" style="background: var(--brand-gold); color: #000; width: 100%; margin-bottom: 10px; font-weight: bold;">🧠 Salvar e Analisar com IA</button>
        <div style="display: flex; gap: 10px; width: 100%;">
            <button class="step-btn skip" onclick="justSaveProtocol()" style="flex: 1;">📥 Apenas Salvar</button>
        </div>
      </div>
    </div>
  `);
  
  setTimeout(() => {
    const input = document.getElementById('protocolTargetName');
    if (input) input.focus();
  }, 300);
  scrollToBottom();
}

function saveAndAnalyzeProtocol() {
    const targetName = document.getElementById('protocolTargetName').value.trim();
    if (targetName) {
        state.protocolResponses.targetName = targetName;
    }
    
    // Disable buttons
    document.getElementById('saveProtocolBlock').style.opacity = '0.5';
    document.getElementById('saveProtocolBlock').style.pointerEvents = 'none';
    
    saveProtocolToStorage(state.protocolResponses);
    
    // Go directly to Analysis
    const textProtocol = `Protocolo: ${state.protocolResponses.protocolName} ${targetName ? ' (Alvo: ' + targetName + ')' : ''}\n\n` +
      Object.values(state.protocolResponses.responses).map(r => `${r.questionId}. ${r.questionText}\nResposta: ${r.answer}\n`).join('\n');
    
    startProtocolAutoAnalysis(textProtocol, state.protocolResponses.protocolId);
}

function justSaveProtocol() {
    const targetName = document.getElementById('protocolTargetName').value.trim();
    if (targetName) {
        state.protocolResponses.targetName = targetName;
    }
    saveProtocolToStorage(state.protocolResponses);
    
    document.getElementById('saveProtocolBlock').innerHTML = `
      <div class="complete-icon">✅</div>
      <h3 class="complete-title">Salvo com sucesso!</h3>
      <div class="complete-actions" style="margin-top: 20px;">
        <button class="step-btn skip" onclick="exportCurrentProtocol()">📥 Exportar Respostas</button>
        <button class="step-btn next" onclick="showWelcome()">✨ Voltar ao Início</button>
      </div>
    `;
    updateSidebar();
}

function startProtocolAutoAnalysis(fullText, protocolType) {
  addUserMessage("Por favor, analise as respostas do protocolo que acabei de preencher.");
  showTyping();
  
  state.analysisHistory = [{ role: 'user', content: fullText }];
  state.mode = 'analysis_chat';
  state.currentAnalysisId = Date.now().toString();
  
  fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: fullText,
      protocolType: protocolType,
      conversationHistory: []
    })
  })
  .then(r => {
    if (!r.ok) return r.json().then(err => { throw new Error(err.error || 'Erro na análise'); });
    return r.json();
  })
  .then(data => {
    removeTyping();
    state.analysisHistory.push({ role: 'model', content: data.analysis });
    
    addBotMessage(data.analysis);
    
    addBotMessage(`💬 **Quer aprofundar?** Me pergunte sobre qualquer ponto desta análise.`);
    
    if (typeof saveAnalysisToStorage === 'function') {
      saveAnalysisToStorage({
        id: state.currentAnalysisId,
        protocolType: protocolType,
        originalText: fullText.substring(0, 500),
        history: state.analysisHistory,
        savedAt: new Date().toISOString()
      });
    }
    
    scrollToBottom();
  })
  .catch(err => {
    removeTyping();
    addBotMessage(`❌ **Erro na análise:** ${err.message}\n\nTente novamente através do menu lateral.`);
    scrollToBottom();
  });
}

// ─── CONVERSAS DIFÍCEIS — Fluxo especial pós-protocolo ───────
function completeConversasDificeis() {
  // Build summary of what the user filled
  let resumo = '';
  for (const [key, resp] of Object.entries(state.protocolResponses.responses)) {
    resumo += `**${resp.questionId}. ${resp.questionText}**\n${resp.answer}\n\n`;
  }
  
  // Get saved analyses
  const savedAnalyses = (typeof getAnalysesSaved === 'function') ? getAnalysesSaved() : [];
  // Get saved protocols
  const savedProtocols = getSavedProtocols();
  
  const hasSaved = savedAnalyses.length > 0 || savedProtocols.length > 0;
  
  let introMsg = `🏆 **Roteiro de Conversa Difícil concluído!** Suas respostas foram salvas.

Agora vem a parte mais importante, Memorável. 👇

Antes de ter essa conversa, quero cruzar seu roteiro com um **protocolo ou análise que você já fez** sobre essa situação. Isso vai revelar pontos cegos e te preparar muito melhor.`;
  
  if (hasSaved) {
    introMsg += `\n\n📋 **Selecione uma análise/protocolo salvo abaixo** ou cole manualmente:`;
  } else {
    introMsg += `\n\n📋 **Cole abaixo um protocolo que já preencheu** ou descreva a situação em texto livre:`;
  }
  
  addBotMessage(introMsg);
  
  // Build saved items cards
  let savedCardsHTML = '';
  
  if (savedAnalyses.length > 0) {
    const protocolIcons = { 'medo': '⚔️', 'dep_ativa': '🔓', 'dep_passiva': '🛡️', 'protecao': '🔰', 'contraste': '📊', 'geral': '📋', 'conversas_dificeis': '🗣️' };
    const protocolLabels = { 'medo': 'Combate do Medo', 'dep_ativa': 'Dep. Emocional Ativa', 'dep_passiva': 'Dep. Emocional Passiva', 'protecao': 'Proteção Emocional', 'contraste': 'Contraste de Controle', 'geral': 'Geral', 'conversas_dificeis': 'Conversas Difíceis' };
    
    savedCardsHTML += '<div style="margin-bottom: 12px; font-size: 0.8rem; color: var(--text-gold); font-weight: 600;">🧠 ANÁLISES SALVAS</div>';
    savedCardsHTML += '<div class="analysis-protocol-select" style="margin-bottom: 16px;">';
    
    savedAnalyses.slice(-6).reverse().forEach(a => {
      const icon = protocolIcons[a.protocolType] || '📋';
      const label = protocolLabels[a.protocolType] || a.protocolType;
      const date = new Date(a.savedAt).toLocaleDateString('pt-BR');
      const msgCount = a.history ? a.history.length : 0;
      const preview = (a.originalText || '').substring(0, 80).replace(/[<>&"']/g, '');
      
      savedCardsHTML += `
        <div class="analysis-protocol-option" onclick="selectSavedForConversa('analysis', '${a.id}')" data-type="analysis" data-id="${a.id}">
          <span class="opt-icon">${icon}</span>
          <strong>${label}${a.originalText && a.originalText.includes("Alvo: ") ? " — " + a.originalText.split("Alvo: ")[1].split(")")[0] : ""}</strong><br>
          <small style="opacity:0.7">${date} · ${msgCount} msgs</small>
        </div>
      `;
    });
    savedCardsHTML += '</div>';
  }
  
  if (savedProtocols.length > 0) {
    savedCardsHTML += '<div style="margin-bottom: 12px; font-size: 0.8rem; color: var(--text-gold); font-weight: 600;">📂 PROTOCOLOS PREENCHIDOS</div>';
    savedCardsHTML += '<div class="analysis-protocol-select" style="margin-bottom: 16px;">';
    
    savedProtocols.slice(-6).reverse().forEach((p, i) => {
      const date = new Date(p.startedAt).toLocaleDateString('pt-BR');
      const respCount = Object.keys(p.responses).length;
      
      savedCardsHTML += `
        <div class="analysis-protocol-option" onclick="selectSavedForConversa('protocol', ${savedProtocols.length - 1 - i})" data-type="protocol" data-idx="${savedProtocols.length - 1 - i}">
          <span class="opt-icon">📋</span>
          <strong>${p.protocolName}${p.targetName ? " — " + p.targetName : ""}</strong><br>
          <small style="opacity:0.7">${date} · ${respCount} respostas</small>
        </div>
      `;
    });
    savedCardsHTML += '</div>';
  }
  
  chatContainer.insertAdjacentHTML('beforeend', `
    <div class="analysis-form" id="conversasDificeisAnalysis">
      ${savedCardsHTML}
      
      <div style="margin-bottom: 12px; font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">✍️ OU COLE MANUALMENTE</div>
      <textarea 
        class="analysis-textarea" 
        id="conversasDificeisText" 
        placeholder="Cole aqui um protocolo preenchido ou descreva a situação em texto livre..."
        rows="6"
      ></textarea>
      <div style="display: flex; gap: 8px;">
        <button class="analysis-submit-btn" onclick="analyzeConversaDificil()" style="flex:1" id="btnAnaliseConversa">
          🧠 Analisar e Preparar
        </button>
        <button class="step-btn skip" onclick="skipConversaAnalysis()" style="padding: 14px 20px; white-space: nowrap;">
          Pular →
        </button>
      </div>
    </div>
  `);
  
  scrollToBottom();
}

function selectSavedForConversa(type, idOrIdx) {
  // Deselect all
  document.querySelectorAll('#conversasDificeisAnalysis .analysis-protocol-option').forEach(el => el.classList.remove('selected'));
  
  // Select this one
  const selector = type === 'analysis' 
    ? `[data-type="analysis"][data-id="${idOrIdx}"]`
    : `[data-type="protocol"][data-idx="${idOrIdx}"]`;
  const el = document.querySelector(`#conversasDificeisAnalysis ${selector}`);
  if (el) el.classList.add('selected');
  
  // Build text from saved item
  let text = '';
  const textarea = document.getElementById('conversasDificeisText');
  
  if (type === 'analysis') {
    const analyses = getAnalysesSaved();
    const analysis = analyses.find(a => a.id === idOrIdx);
    if (analysis && analysis.history) {
      analysis.history.forEach(msg => {
        if (msg.role === 'user') text += `[ALIADO]: ${msg.content}\n\n`;
        else text += `[ANÁLISE]: ${msg.content}\n\n`;
      });
    }
  } else {
    const protocols = getSavedProtocols();
    const protocol = protocols[parseInt(idOrIdx)];
    if (protocol) {
      text += `Protocolo: ${protocol.protocolName}\n\n`;
      for (const [key, resp] of Object.entries(protocol.responses)) {
        text += `${resp.questionId}. ${resp.questionText}\nResposta: ${resp.answer}\n\n`;
      }
    }
  }
  
  textarea.value = text;
  textarea.style.minHeight = '100px';
  
  // Update button text
  const btn = document.getElementById('btnAnaliseConversa');
  if (btn) btn.innerHTML = '🧠 Cruzar e Analisar';
  
  showToast('✅ Análise selecionada! Clique em "Cruzar e Analisar"');
}

function analyzeConversaDificil() {
  const extraText = document.getElementById('conversasDificeisText').value.trim();
  
  if (!extraText) {
    showToast('⚠️ Cole o protocolo ou descreva a situação antes de analisar!');
    return;
  }
  
  // Build the complete context: Conversas Difíceis answers + extra protocol
  let conversaRespostas = '';
  for (const [key, resp] of Object.entries(state.protocolResponses.responses)) {
    conversaRespostas += `${resp.questionId}. ${resp.questionText}\nResposta: ${resp.answer}\n\n`;
  }
  
  const fullContext = `O Aliado preencheu o ROTEIRO DE CONVERSA DIFÍCIL com as seguintes respostas:

--- ROTEIRO DE CONVERSA DIFÍCIL ---
${conversaRespostas}
--- FIM DO ROTEIRO ---

E também enviou a seguinte ANÁLISE/PROTOCOLO relacionado à mesma situação:

--- PROTOCOLO/ANÁLISE ADICIONAL ---
${extraText}
--- FIM ---

INSTRUÇÕES: Cruze as duas informações e faça uma análise profunda:
1. O roteiro da conversa está alinhado com o que o protocolo revelou?
2. Tem algum PONTO CEGO no roteiro que o protocolo já mostrou?
3. A pessoa está preparada para ter essa conversa ou precisa rodar mais algum protocolo antes?
4. Os LIMITES definidos são coerentes com o que foi trabalhado no protocolo?
5. A NECESSIDADE está clara ou está misturando assuntos?
6. Os PLANOS são realistas ou são uma forma disfarçada de tentar MUDAR o outro?
7. Tem AJUDA disfarçada de APOIO no roteiro?
8. Se precisar, REDIRECIONE para outro protocolo antes da conversa.
9. Dê sugestões específicas de ajustes no roteiro baseado nos pontos cegos encontrados.`;
  
  // Remove the form
  const form = document.getElementById('conversasDificeisAnalysis');
  if (form) form.remove();
  
  addUserMessage(extraText);
  showTyping();
  
  // Initialize analysis conversation
  state.analysisHistory = [{ role: 'user', content: fullContext }];
  state.mode = 'analysis_chat';
  state.currentAnalysisId = Date.now().toString();
  analysisSelectedProtocol = 'conversas_dificeis';
  
  fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: fullContext,
      protocolType: 'conversas_dificeis',
      conversationHistory: []
    })
  })
  .then(r => {
    if (!r.ok) return r.json().then(err => { throw new Error(err.error || 'Erro na análise'); });
    return r.json();
  })
  .then(data => {
    removeTyping();
    state.analysisHistory.push({ role: 'model', content: data.analysis });
    
    addBotMessage(data.analysis);
    
    addBotMessage(`💬 **Quer aprofundar?** Me pergunte sobre qualquer ponto, peça ajustes no roteiro, ou me conte mais sobre a situação. Posso te ajudar a refinar até você estar pronto(a) para a conversa.

_A conversa é salva automaticamente — pode fechar e voltar depois._`);
    
    // Save analysis
    if (typeof saveAnalysisToStorage === 'function') {
      saveAnalysisToStorage({
        id: state.currentAnalysisId,
        protocolType: 'conversas_dificeis',
        originalText: fullContext.substring(0, 500),
        history: state.analysisHistory,
        savedAt: new Date().toISOString()
      });
    }
    
    scrollToBottom();
  })
  .catch(err => {
    removeTyping();
    addBotMessage(`❌ **Erro na análise:** ${err.message}\n\nTente novamente.`);
    scrollToBottom();
  });
}

function skipConversaAnalysis() {
  const form = document.getElementById('conversasDificeisAnalysis');
  if (form) form.remove();
  
  const quote = KNOWLEDGE.quotes[Math.floor(Math.random() * KNOWLEDGE.quotes.length)];
  
  addBotMessage(`👊 Tudo bem, Memorável! Seu roteiro está salvo.

Mas lembre-se: antes de ter a conversa difícil, é **muito importante** rodar pelo menos um protocolo sobre a situação. Recomendo:

• ⚔️ **Combate do Medo** — se tem medo/ansiedade sobre a conversa
• 🛡️ **Dep. Emocional Passiva** — se a pessoa invade seu núcleo
• 🔓 **Dep. Emocional Ativa** — se você percebe que invade o núcleo dela

Depois de rodar, volta aqui em **🧠 Analisar meu Protocolo** e eu cruzo tudo para você.

_"${quote}"_ — Elton Euler`);
  
  chatContainer.insertAdjacentHTML('beforeend', `
    <div class="protocol-complete">
      <div class="complete-actions">
        <button class="step-btn skip" onclick="exportCurrentProtocol()">📥 Exportar Roteiro</button>
        <button class="step-btn next" onclick="showWelcome()">✨ Voltar ao Início</button>
      </div>
    </div>
  `);
  
  scrollToBottom();
}

// ─── CHAT RESPONSES ──────────────────────────────────────────
// handleSend() is defined below in the AI-POWERED CHAT section


function generateResponse(input) {
  const lower = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // ── PDA ──
  if (lower.includes('pda') || (lower.includes('percepcao') && lower.includes('decisao')) || (lower.includes('percepcao') && lower.includes('acao'))) {
    return `📐 **PDA — Percepção, Decisão, Ação**

Este é o framework fundamental de todo o nosso sistema.

**P — Percepção:** O que você ENXERGA da situação. Suas percepções são moldadas pelas suas emoções, crenças e experiências.

**D — Decisão:** O que você DECIDE fazer diante da percepção. Aqui é onde muita gente trava — não decide.

**A — Ação:** O que você efetivamente FAZ. Sem ação, percepção e decisão não valem nada.

O ciclo funciona assim: uma **percepção** gera uma **decisão**, que leva a uma **ação**. Quando o medo ou a dependência emocional distorce sua percepção, todo o ciclo é comprometido.

_"A vida não entende problemas, a vida não entende sonhos, a vida entende decisões."_ — Elton Euler

Nos protocolos, trabalhamos o PDA em duas versões:
• **PDA Descontrolado** — guiado pelo medo/dependência
• **PDA Memorável** — guiado pela consciência e liberdade

Quer rodar algum protocolo para trabalhar seu PDA?`;
  }
  
  // ── Apoio vs Ajuda ──
  if ((lower.includes('apoio') && lower.includes('ajuda')) || lower.includes('diferenca entre apoio') || lower.includes('ajuda x apoio')) {
    return `🤝 **Apoio vs. Ajuda — Uma das distinções mais importantes**

Na Aliança Divergente, **ajuda é proibida** e **apoio é bem-vindo**.

**AJUDA** = Fazer PELO outro. Gera dependência. Tira o mérito da conquista. Cria uma relação de necessidade.

**APOIO** = Fortalecer o outro para que ELE faça. Preserva o mérito. Promove autonomia e independência.

Quando você AJUDA alguém, você está invadindo o núcleo dela. Quando você APOIA, está respeitando a capacidade dela.

🔑 **Exemplo prático:**
• Ajuda: "Deixa que eu resolvo pra você"
• Apoio: "O que você já tentou? Vamos pensar juntos"

Essa distinção aparece em todos os protocolos. Nos de dependência emocional, você avalia se há ajuda ou apoio na relação, e trabalha para transformar ajuda em apoio.

_"Aqui nós vamos acreditar em você, mesmo que você não acredite."_ — Elton Euler`;
  }
  
  // ── Padrões Controladores ──
  if (lower.includes('padrao') && (lower.includes('controlador') || lower.includes('controle')) || lower.includes('vitima natural') || lower.includes('vitima intencional') || lower.includes('narcisista') || lower.includes('vingador')) {
    return `🎭 **Os 4 Padrões Controladores**

Toda pessoa que invade um núcleo (ou é invadida) se encaixa em um destes padrões:

**1. Vítima Natural** 🟢
• Apresenta dificuldade momentânea **genuína**
• Foco no **PRESENTE**
• Arma: **RESPONSABILIZAÇÃO** (te faz sentir responsável)
• É o mais "saudável" dos 4 — a pessoa realmente está passando por algo

**2. Vítima Intencional** 🟡
• **Supervaloriza** a dificuldade para manipular
• Foco no **PRESENTE**
• Arma: **CULPA** (te faz sentir culpado)
• Dramatiza para ganhar atenção ou controle

**3. Narcisista** 🔴
• Busca benefício **próprio**, tenta se engrandecer
• Foco **O TEMPO TODO**
• Arma: **DESPREZO** (te diminui para se sentir superior)
• Padrão constante e difícil de identificar

**4. Vingador** ⚫
• Busca **prejuízo** para o outro
• Foco no **PASSADO**
• Arma: **ATAQUE** (tenta te diminuir ativamente)
• Age por ressentimento ou mágoa

📍 Nos Mapas de Núcleo, você identifica qual padrão cada pessoa usa (ou qual VOCÊ usa). Quer fazer o mapeamento?`;
  }
  
  // ── Escada da Postura ──
  if (lower.includes('escada') || lower.includes('postura') || lower.includes('degrau') || lower.includes('postura memoravel')) {
    return renderEscadaText();
  }
  
  // ── Núcleo ──
  if (lower.includes('nucleo') && (lower.includes('interno') || lower.includes('externo') || lower.includes('emocional'))) {
    return `🎯 **Núcleo Emocional — Interno e Externo**

Cada pessoa tem dois núcleos emocionais:

**Núcleo Interno** 🗺️ = SEU espaço emocional
• Quem está interferindo nas SUAS emoções?
• Quem afeta suas Percepções, Decisões e Ações?
• Quem NÃO deveria estar ali, mas ESTÁ?
• → Leva ao Protocolo de **Dependência Emocional Passiva**

**Núcleo Externo** 🌐 = O espaço emocional DO OUTRO
• Em quem VOCÊ está interferindo?
• De quem VOCÊ está invadindo o núcleo?
• Onde VOCÊ está controlando?
• → Leva ao Protocolo de **Dependência Emocional Ativa**

📊 **Como mapear:**
Posicione cada pessoa numa escala de **1 (centro, interfere MAIS) a 5 (fora, interfere MENOS)**. Classifique em um dos 4 padrões controladores.

Quer fazer o **Mapa de Núcleo Interno** ou **Externo**?`;
  }
  
  // ── Medo ──
  if (lower.includes('medo') || lower.includes('medo de') || lower.includes('com medo')) {
    return `⚔️ **Sobre o Medo**

_"Sucesso não vem da ausência do medo, mas sim da forma como você lida com ele."_ — Elton Euler

O medo distorce seu PDA inteiro:
• Percepção errada → Decisão errada → Ação errada (ou nenhuma ação)

**Duas formas de lidar com o medo:**

| Medíocre | Memorável |
|----------|-----------|
| Ignora o medo | Analisa o medo |
| Foge dele | Encara ele |
| Acha que não tem | Cria alternativas |
| Padrão ESCASSO | Padrão ABUNDANTE |

_"O medo é ótimo em dar opiniões, mas é péssimo em tomar decisões."_ — Elton Euler

O **Protocolo de Combate do Medo** tem 4 fases:
1. 🔍 Entendendo o medo
2. 💥 Avaliando o impacto
3. 🧠 Desmentindo o medo
4. 🚀 Superando o medo

Quer rodar o protocolo agora?`;
  }
  
  // ── Dependência Emocional ──
  if (lower.includes('dependencia emocional') || lower.includes('dependencia') || lower.includes('dep emocional')) {
    return `🔗 **Dependência Emocional**

É o principal "inimigo" que combatemos na Aliança. Foi desenvolvida na **infância por necessidade** e se manteve na vida adulta **por hábito**.

_"Quando você era criança, você não foi protegido o suficiente. E você desenvolveu uma dependência emocional por necessidade [...] e depois eles se mantiveram na sua vida por hábito."_ — Elton Euler

**Dois tipos:**

🔓 **Dependência Emocional Ativa** = VOCÊ invade o núcleo do outro
• Você tenta controlar, mudar, salvar ou interferir na vida de alguém
• Protocolo trabalha o "Construindo o Não" para SI MESMO

🛡️ **Dependência Emocional Passiva** = O OUTRO invade SEU núcleo
• Você permite que outros controlem, interfiram, decidam por você
• Protocolo trabalha o "Construindo o Não" para O OUTRO

Ambos seguem a estrutura PDA: Percepção → Decisão → Ação → Percepção Pós-Ação

Qual tipo você quer trabalhar?`;
  }
  
  // ── Pense Comigo ──
  if (lower.includes('pense comigo') || lower.includes('penso comigo')) {
    return `💭 **Pense Comigo — Estrutura de Apoio**

O Pense Comigo segue uma estrutura obrigatória:

**1. "O que eu estou PASSANDO?"**
Qual é a dificuldade ou problema.

**2. "O que eu estou TENTANDO?"**
Diante do problema, o que já tentei — mostra AÇÃO, não passividade.

**3. "Que PROTOCOLOS eu rodei?"**
Quais protocolos apliquei e por quê.

**4. "Como ficou meu PDA?"**
Onde estou travado:
• Dificuldade em **PERCEBER** (perdido, não sei onde está o problema)
• Dificuldade em **DECIDIR** (percebi, mas bloqueei na decisão)
• Dificuldade em **AGIR** (percebi, decidi, mas não consigo executar)

📌 **Regras:**
• Mínimo 1x por semana
• Sempre baseado nos protocolos
• Proibido misturar conceitos de fora

Quer usar o Pense Comigo agora?`;
  }
  
  // ── Celebre Comigo ──
  if (lower.includes('celebre') || lower.includes('comemorar') || lower.includes('celebrar') || lower.includes('conquista')) {
    return `🎉 **Celebre Comigo!**

Baseado em três elementos: **Reconhecimento, Merecimento e Estímulo**

Frase-chave: **"Parabéns, você merece e não pare!"**

**Princípios:**
• Celebrar TODAS as conquistas — pequenas, médias e grandes
• Não esperar o resultado final para celebrar
• Celebrar o PROCESSO, não só o resultado

🌱 **Analogia do Plantio:**
Não celebre só a colheita! Celebre:
1. A compra da terra
2. A compra da semente
3. O plantio
4. O cuidado
5. E SÓ DEPOIS a colheita

O que você conquistou recentemente que merece ser celebrado? 🎊`;
  }
  
  // ── Premissas ──
  if (lower.includes('premissa') || lower.includes('regra') || lower.includes('principio')) {
    return renderPremissasText();
  }
  
  // ── Efeito Paralelo ──
  if (lower.includes('efeito paralelo') || lower.includes('paralelo')) {
    return `🔄 **Efeito Paralelo**

Prática de iniciar uma atividade — geralmente **física** — para quebrar padrões negativos e replicar disciplina em outras áreas da vida.

**Como funciona:**
• Escolha uma atividade desafiadora (exercício, rotina matinal, etc.)
• A disciplina que você constrói nessa atividade se replica para outras áreas
• Quebra o ciclo de inércia e passividade

_"Como você faz uma coisa, você faz todas as outras."_ — Elton Euler

A ideia é: se você consegue manter a disciplina em UMA coisa, isso prova que você PODE manter em TODAS as outras.

Qual atividade você poderia começar como seu Efeito Paralelo?`;
  }

  // ── Botão de Pânico ──
  if (lower.includes('botao de panico') || lower.includes('panico') || lower.includes('emergencia')) {
    return `🚨 **Botão de Pânico**

Técnica de emergência relacional:

Quando uma conversa difícil tomar um rumo ruim:
1. **PARE** — Encerre a conversa
2. **DIGA:** "Vamos continuar essa conversa outro dia"
3. **GANHE TEMPO** para processar emoções
4. **CONSTRUA** o "não" com calma

O Botão de Pânico te dá tempo para:
• Sair do calor da emoção
• Pensar com clareza
• Montar sua posição racionalmente
• Não tomar decisões por impulso

_"É melhor tomar uma decisão ruim do que não decidir."_ — Elton Euler

Mas antes de decidir, use o Botão de Pânico para garantir que você está decidindo COM consciência.`;
  }

  // ── Guardião da Decisão ──
  if (lower.includes('guardiao') || lower.includes('guardiao da decisao')) {
    return `🛡️ **Guardião da Decisão**

Uma pessoa de confiança que **acompanha o cumprimento dos seus compromissos**.

**Papel do Guardião:**
• Não é terapeuta, não é conselheiro
• É alguém que VOCÊ escolhe e confia
• Ele vai te cobrar quando você recuar
• Ele vai te lembrar do compromisso que fez

**Quando usar:**
• Ao completar um protocolo de dependência emocional
• Ao estabelecer novos limites
• Quando fizer um "Construindo o Não"

**Quem pode ser:**
• Outro aliado da tribo
• Um amigo próximo e honesto
• Alguém que te conhece e respeita seus objetivos

Quem seria um bom Guardião para você?`;
  }
  
  // ── Glossário search ──
  for (const [term, def] of Object.entries(KNOWLEDGE.glossary)) {
    const termNorm = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (lower.includes(termNorm) && lower.length < termNorm.length + 30) {
      return `📖 **${term}**\n\n${def}\n\nQuer saber mais sobre algum outro conceito?`;
    }
  }
  
  // ── Saudações ──
  if (lower.match(/^(oi|ola|hey|eai|e ai|bom dia|boa tarde|boa noite|salve|fala)/)) {
    const greetings = [
      `Fala, Memorável! 💛 Como posso te apoiar hoje?\n\nPosso te guiar por um protocolo, explicar conceitos ou bater um papo sobre qualquer tema da Aliança.`,
      `E aí, Aliado(a)! ⚡ O que tá pegando?\n\nMe conta o que você precisa — protocolo, conceito, ou só quer pensar comigo.`,
      `Boa! 🔥 Que bom te ver por aqui.\n\n_"Constrange a vida. Faça mais do que a vida está esperando de você."_ — Elton Euler\n\nComo posso te apoiar?`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // ── Obrigado ──
  if (lower.match(/(obrigad|valeu|brigad|thanks|agradeço)/)) {
    return `De nada, Memorável! 💛\n\n_"O resultado para nós é uma consequência inevitável. Quando você faz o que precisa ser feito, o resultado não é opcional."_ — Elton Euler\n\nContinue fazendo o básico bem feito. Estou aqui sempre que precisar!`;
  }
  
  // ── Default ──
  const defaultResponses = [
    `Boa pergunta, Memorável! 💛\n\nDeixe-me entender melhor. Você está com dificuldade em:\n\n• **PERCEBER** (não sabe onde está o problema)?\n• **DECIDIR** (sabe o problema mas não sabe o que fazer)?\n• **AGIR** (sabe o que fazer mas não consegue executar)?\n\nMe conta mais para eu te direcionar ao protocolo certo.\n\n_"A vida não entende problemas, a vida não entende sonhos, a vida entende decisões."_`,
    
    `Entendi, Memorável! Vamos trabalhar isso juntos. 🤝\n\nPosso te ajudar de algumas formas:\n\n• 💭 **Pense Comigo** — se quer estruturar um problema\n• ⚔️ **Protocolo de Medo** — se o medo está travando você\n• 🛡️ **Protocolo de Dep. Emocional** — se alguém está invadindo seu núcleo\n• 🔓 **Protocolo Ativo** — se você está invadindo o núcleo de alguém\n\nQual dessas se encaixa mais na sua situação?`,
    
    `Vamos lá, Memorável! Sem desculpas, sem ilusões. 🔥\n\nPara te direcionar melhor, me conta:\n\n1. **O que você está passando?**\n2. **O que está tentando fazer?**\n3. **Já rodou algum protocolo sobre isso?**\n\n_"O medo causa muita insegurança, confusão e indecisão. Tudo isso começa a sumir quando você sai da indecisão ao entrar em decisão."_ — Elton Euler`
  ];
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// ─── REFERENCE SCREENS ──────────────────────────────────────
function showEscadaPostura() {
  state.mode = 'reference';
  btnExport.style.display = 'none';
  setActiveNav(null);
  updateHeader('Escada da Postura Memorável', 'Os 6 degraus para construir uma vida memorável');
  
  chatContainer.innerHTML = '';
  addBotMessage(`🪜 **Escada da Postura Memorável**\n\nEsses são os 6 degraus que definem como um Memorável deve se comportar dentro e fora da Aliança. Suba cada degrau com consciência:`);
  
  let escadaHTML = '<div class="escada-container">';
  KNOWLEDGE.escadaPostura.forEach(d => {
    escadaHTML += `
      <div class="escada-degrau">
        <div class="degrau-number">${d.degrau}</div>
        <div class="degrau-content">
          <h4>${d.titulo}</h4>
          <p>${d.descricao}</p>
        </div>
      </div>
    `;
  });
  escadaHTML += '</div>';
  
  chatContainer.insertAdjacentHTML('beforeend', escadaHTML);
  
  addBotMessage(`_"O resultado para nós é uma consequência inevitável. Quando você faz o que precisa ser feito, o resultado não é opcional."_ — Elton Euler\n\nEm qual degrau você sente que precisa trabalhar mais?`);
  
  scrollToBottom();
}

function showGlossario() {
  state.mode = 'reference';
  btnExport.style.display = 'none';
  setActiveNav(null);
  updateHeader('Glossário', 'Todos os termos e conceitos da Aliança Divergente');
  
  chatContainer.innerHTML = '';
  addBotMessage(`📖 **Glossário da Aliança Divergente**\n\nClique em qualquer termo para expandir a definição:`);
  
  let glossHTML = '<div class="glossary-grid">';
  for (const [term, def] of Object.entries(KNOWLEDGE.glossary)) {
    glossHTML += `
      <div class="glossary-item" onclick="this.classList.toggle('expanded')">
        <div class="term">${term}</div>
        <div class="definition">${def}</div>
      </div>
    `;
  }
  glossHTML += '</div>';
  
  chatContainer.insertAdjacentHTML('beforeend', glossHTML);
  scrollToBottom();
}

function showPremissas() {
  state.mode = 'reference';
  btnExport.style.display = 'none';
  setActiveNav(null);
  updateHeader('Premissas Fundamentais', 'As regras da Aliança Divergente');
  
  chatContainer.innerHTML = '';
  addBotMessage(renderPremissasText());
  
  // Add pilares
  let pilarHTML = `<div class="concept-card"><h3>📐 Três Pilares do Membro</h3><ul>`;
  KNOWLEDGE.pilares.membro.forEach(p => {
    pilarHTML += `<li><strong>${p.nome}:</strong> ${p.definicao} (${p.onde})</li>`;
  });
  pilarHTML += '</ul></div>';
  
  pilarHTML += `<div class="concept-card"><h3>🌍 Três Pilares da Sociedade Divergente</h3><ul>`;
  KNOWLEDGE.pilares.sociedade.forEach(p => {
    pilarHTML += `<li><strong>${p.nome}:</strong> ${p.definicao}</li>`;
  });
  pilarHTML += '</ul></div>';
  
  chatContainer.insertAdjacentHTML('beforeend', pilarHTML);
  scrollToBottom();
}

function showSavedProtocols() {
  const saved = getSavedProtocols();
  
  if (saved.length === 0) {
    showToast('📂 Nenhum protocolo salvo ainda. Complete um protocolo para salvar!');
    return;
  }
  
  state.mode = 'reference';
  btnExport.style.display = 'none';
  updateHeader('Protocolos Salvos', `${saved.length} protocolo(s) concluído(s)`);
  
  chatContainer.innerHTML = '';
  addBotMessage(`📂 **Seus Protocolos Salvos**\n\nVocê tem **${saved.length}** protocolo(s) concluído(s). Clique para visualizar:`);
  
  let html = '<div class="glossary-grid">';
  saved.forEach((p, i) => {
    const date = new Date(p.startedAt).toLocaleDateString('pt-BR');
    const responses = Object.values(p.responses).length;
    html += `
      <div class="glossary-item" onclick="viewSavedProtocol(${i})">
        <div class="term">${p.protocolName}</div>
        <div class="definition" style="display:block">${date} — ${responses} respostas</div>
      </div>
    `;
  });
  html += '</div>';
  
  chatContainer.insertAdjacentHTML('beforeend', html);
  scrollToBottom();
}

function viewSavedProtocol(index) {
  const saved = getSavedProtocols();
  const p = saved[index];
  if (!p) return;
  
  let text = `📋 **${p.protocolName}**\nIniciado: ${new Date(p.startedAt).toLocaleString('pt-BR')}\n`;
  if (p.completedAt) text += `Concluído: ${new Date(p.completedAt).toLocaleString('pt-BR')}\n`;
  text += `\n---\n\n`;
  
  for (const [key, resp] of Object.entries(p.responses)) {
    text += `**${resp.questionId}. ${resp.questionText}**\n${resp.answer}\n\n`;
  }
  
  showModal('Protocolo Salvo', text);
}

// ─── TEXT RENDERERS ──────────────────────────────────────────
function renderEscadaText() {
  let text = `🪜 **Escada da Postura Memorável**\n\nOs 6 degraus para uma postura memorável:\n\n`;
  KNOWLEDGE.escadaPostura.forEach(d => {
    text += `**${d.degrau}. ${d.titulo}** — ${d.descricao}\n\n`;
  });
  text += `_"O nosso processo tem começo, meio e meio. Não para."_ — Elton Euler`;
  return text;
}

function renderPremissasText() {
  let text = `📜 **Premissas Fundamentais da Aliança Divergente**\n\n`;
  KNOWLEDGE.premissas.forEach((p, i) => {
    text += `**${i + 1}.** ${p}\n`;
  });
  text += `\n_"Aqui dentro nós estamos em uma guerra contra a dependência emocional e a falta de permissão."_ — Elton Euler`;
  return text;
}

// ─── UI HELPERS ──────────────────────────────────────────────
function addBotMessage(text) {
  const html = `
    <div class="message bot">
      <div class="message-avatar">⚡</div>
      <div class="message-bubble">${formatMarkdown(text)}</div>
    </div>
  `;
  chatContainer.insertAdjacentHTML('beforeend', html);
  scrollToBottom();
}

function addUserMessage(text) {
  const html = `
    <div class="message user">
      <div class="message-avatar">👤</div>
      <div class="message-bubble">${escapeHTML(text)}</div>
    </div>
  `;
  chatContainer.insertAdjacentHTML('beforeend', html);
  scrollToBottom();
}

function showTyping() {
  const html = `
    <div class="message bot" id="typingIndicator">
      <div class="message-avatar">⚡</div>
      <div class="message-bubble">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>
  `;
  chatContainer.insertAdjacentHTML('beforeend', html);
  scrollToBottom();
}

function removeTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

function updateHeader(title, subtitle) {
  headerTitle.innerHTML = `<h2>${title}</h2><p>${subtitle || ''}</p>`;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  });
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showModal(title, content) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="modal-content">
      <h3>${title}</h3>
      <pre>${escapeHTML(typeof content === 'string' ? content.replace(/\*\*/g, '').replace(/_/g, '') : JSON.stringify(content, null, 2))}</pre>
      <div class="modal-actions">
        <button class="step-btn skip" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
        <button class="step-btn next" onclick="copyModalContent(this)">📋 Copiar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function copyModalContent(btn) {
  const pre = btn.closest('.modal-content').querySelector('pre');
  navigator.clipboard.writeText(pre.textContent).then(() => {
    showToast('✅ Copiado para a área de transferência!');
  });
}

// ─── EXPORT ──────────────────────────────────────────────────
function exportCurrentProtocol() {
  if (!state.protocolResponses || !state.protocolResponses.responses) {
    showToast('⚠️ Nenhuma resposta para exportar ainda.');
    return;
  }
  
  let text = `═══════════════════════════════════════\n`;
  text += `  ${state.protocolResponses.protocolName}\n`;
  text += `  Aliança Divergente — Assistente de Protocolos\n`;
  text += `═══════════════════════════════════════\n\n`;
  text += `Iniciado: ${new Date(state.protocolResponses.startedAt).toLocaleString('pt-BR')}\n`;
  if (state.protocolResponses.completedAt) {
    text += `Concluído: ${new Date(state.protocolResponses.completedAt).toLocaleString('pt-BR')}\n`;
  }
  text += `\n───────────────────────────────────────\n\n`;
  
  for (const [key, resp] of Object.entries(state.protocolResponses.responses)) {
    text += `[${resp.phase}] Pergunta ${resp.questionId}\n`;
    text += `${resp.questionText}\n`;
    text += `→ ${resp.answer}\n\n`;
  }
  
  text += `\n───────────────────────────────────────\n`;
  text += `"A vida não entende problemas, a vida não entende sonhos, a vida entende decisões." — Elton Euler\n`;
  
  showModal('Exportar Protocolo', text);
}

// ─── MERGE HELPER ────────────────────────────────────────────
function mergeArrays(localArr, serverArr) {
  if (!serverArr || serverArr.length === 0) return localArr;
  if (!localArr || localArr.length === 0) return serverArr;
  
  const merged = [...localArr];
  const localTimes = new Set(localArr.map(item => item.savedAt || item.date || JSON.stringify(item)));
  
  for (const serverItem of serverArr) {
    const key = serverItem.savedAt || serverItem.date || JSON.stringify(serverItem);
    if (!localTimes.has(key)) {
      merged.push(serverItem);
    }
  }
  return merged;
}

// ─── CLOUD SYNC ──────────────────────────────────────────────
async function syncToServer() {
  if (!currentUser) return;
  const protocols = JSON.parse(localStorage.getItem(userKey('ad_protocols')) || '[]');
  const analyses = JSON.parse(localStorage.getItem(userKey('ad_analyses')) || '[]');
  
  try {
    await fetch('/api/userdata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, protocols, analyses })
    });
  } catch (e) {
    console.error('Failed to sync to server', e);
  }
}

async function syncFromServer() {
  if (!currentUser) return;
  try {
    const r = await fetch('/api/userdata?userId=' + currentUser.id);
    const result = await r.json();
    
    const localP = JSON.parse(localStorage.getItem(userKey('ad_protocols')) || '[]');
    const localA = JSON.parse(localStorage.getItem(userKey('ad_analyses')) || '[]');
    const localHasData = localP.length > 0 || localA.length > 0;
    
    if (result.data) {
      const serverP = result.data.protocols || [];
      const serverA = result.data.analyses || [];
      const serverHasData = serverP.length > 0 || serverA.length > 0;
      
      if (serverHasData && !localHasData) {
        // Celular vazio, servidor tem dados: baixar do servidor
        localStorage.setItem(userKey('ad_protocols'), JSON.stringify(serverP));
        localStorage.setItem(userKey('ad_analyses'), JSON.stringify(serverA));
      } else if (localHasData) {
        // Celular tem dados: NUNCA apagar. Mesclar com servidor e subir.
        const mergedP = mergeArrays(localP, serverP);
        const mergedA = mergeArrays(localA, serverA);
        localStorage.setItem(userKey('ad_protocols'), JSON.stringify(mergedP));
        localStorage.setItem(userKey('ad_analyses'), JSON.stringify(mergedA));
        await syncToServer();
      }
    } else if (localHasData) {
      await syncToServer();
    }
  } catch (e) {
    console.error('Failed to sync from server', e);
  }
}

// ─── STORAGE ─────────────────────────────────────────────────
async function saveProtocolToStorage(data) {
  try {
    const saved = JSON.parse(localStorage.getItem(userKey('ad_protocols')) || '[]');
    saved.push(data);
    localStorage.setItem(userKey('ad_protocols'), JSON.stringify(saved));
    showToast('✅ Protocolo salvo com sucesso!');
    syncToServer();
  } catch (e) {
    console.error('Error saving protocol:', e);
  }
}

function getSavedProtocols() {
  try {
    return JSON.parse(localStorage.getItem(userKey('ad_protocols')) || '[]');
  } catch (e) {
    return [];
  }
}

// ─── ANALYSIS STORAGE ────────────────────────────────────────
async function saveAnalysisToStorage(data) {
  try {
    const saved = JSON.parse(localStorage.getItem(userKey('ad_analyses')) || '[]');
    // Check if this analysis already exists (update it)
    const existingIndex = saved.findIndex(a => a.id === data.id);
    if (existingIndex >= 0) {
      saved[existingIndex] = data;
    } else {
      saved.push(data);
    }
    localStorage.setItem(userKey('ad_analyses'), JSON.stringify(saved));
    syncToServer();
  } catch (e) {
    console.error('Error saving analysis:', e);
  }
}

function getAnalysesSaved() {
  try {
    return JSON.parse(localStorage.getItem(userKey('ad_analyses')) || '[]');
  } catch (e) {
    return [];
  }
}

async function deleteAnalysis(id) {
  try {
    let saved = JSON.parse(localStorage.getItem(userKey('ad_analyses')) || '[]');
    saved = saved.filter(a => a.id !== id);
    localStorage.setItem(userKey('ad_analyses'), JSON.stringify(saved));
    showToast('🗑️ Análise removida!');
    syncToServer();
    showSavedAnalyses();
  } catch (e) {
    console.error('Error deleting analysis:', e);
  }
}

function showSavedAnalyses() {
  const saved = getAnalysesSaved();
  
  if (saved.length === 0) {
    showToast('📂 Nenhuma análise salva ainda. Analise um protocolo para salvar!');
    return;
  }
  
  state.mode = 'reference';
  btnExport.style.display = 'none';
  setActiveNav('nav-saved-analyses');
  updateHeader('💾 Análises Salvas', `${saved.length} análise(s) salva(s)`);
  
  chatContainer.innerHTML = '';
  addBotMessage(`💾 **Suas Análises Salvas**\n\nVocê tem **${saved.length}** análise(s) salva(s). Clique para restaurar, ou use **🗣️ Gerar Conversa Difícil** para criar um roteiro automático baseado na análise:`);
  
  let html = `
    <div style="margin-bottom: 20px; text-align: center;">
      <button onclick="crossReferenceAllAnalyses()" style="padding: 12px 24px; background: linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05)); border: 1px solid rgba(212,175,55,0.4); border-radius: 12px; color: var(--text-gold); cursor: pointer; font-size: 0.95rem; font-weight: 600; font-family: 'Inter', sans-serif; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px;" onmouseover="this.style.background='linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))'" onmouseout="this.style.background='linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline><polyline points="7.5 19.79 7.5 14.6 3 12"></polyline><polyline points="21 12 16.5 14.6 16.5 19.79"></polyline><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        Cruzar Todas as Análises (Análise Global)
      </button>
    </div>
    <div class="glossary-grid">
  `;
  saved.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)).forEach((a) => {
    const date = new Date(a.savedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const typeLabels = {
      'medo': '⚔️ Combate do Medo',
      'dep_ativa': '🔓 Dep. Emocional Ativa',
      'dep_passiva': '🛡️ Dep. Emocional Passiva',
      'protecao': '🔰 Proteção Emocional',
      'contraste': '📊 Contraste de Controle',
      'conversas_dificeis': '🗣️ Conversas Difíceis',
      'geral': '📋 Geral'
    };
    const typeLabel = typeLabels[a.protocolType] || '📋 ' + a.protocolType;
    const preview = a.originalText ? a.originalText.substring(0, 120) + (a.originalText.length > 120 ? '...' : '') : '';
    const msgCount = a.history ? a.history.length : 0;
    html += `
      <div class="glossary-item" style="position:relative;">
        <div onclick="restoreSavedAnalysis('${a.id}')" style="padding-right: 32px; cursor:pointer;">
          <div class="term">${typeLabel}</div>
          <div class="definition" style="display:block">
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">${date} — ${msgCount} mensagens</div>
            <div style="font-size:0.85rem; color:var(--text-secondary);">${escapeHTML(preview)}</div>
          </div>
        </div>
        <div style="display:flex; gap:6px; margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.06);">
          <button onclick="event.stopPropagation(); gerarConversaDificil('${a.id}')" style="flex:1; padding:8px 12px; background:linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05)); border:1px solid rgba(212,175,55,0.3); border-radius:8px; color:var(--text-gold); cursor:pointer; font-size:0.8rem; font-family:'Inter',sans-serif; transition:all 0.2s;" onmouseover="this.style.background='linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))'" onmouseout="this.style.background='linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'">🗣️ Gerar Conversa Difícil</button>
          <button onclick="event.stopPropagation(); deleteAnalysis('${a.id}')" style="padding:8px 12px; background:rgba(244,67,54,0.1); border:1px solid rgba(244,67,54,0.2); border-radius:8px; color:#F44336; cursor:pointer; font-size:0.8rem; font-family:'Inter',sans-serif;" title="Excluir">🗑️</button>
        </div>
      </div>
    `;
  });
  html += '</div>';
  
  chatContainer.insertAdjacentHTML('beforeend', html);
  scrollToBottom();
}

// ─── GERAR CONVERSA DIFÍCIL A PARTIR DE ANÁLISE SALVA ────────
function gerarConversaDificil(analysisId) {
  const saved = getAnalysesSaved();
  const analysis = saved.find(a => a.id === analysisId);
  
  if (!analysis) {
    showToast('❌ Análise não encontrada.');
    return;
  }
  
  // Switch to analysis chat mode
  state.mode = 'analysis_chat';
  btnExport.style.display = 'none';
  setActiveNav('nav-saved-analyses');
  updateHeader('🗣️ Conversa Difícil', 'Roteiro gerado automaticamente pela IA');
  chatContainer.innerHTML = '';
  
  // Build the analysis content
  let analysisContent = '';
  if (analysis.history && analysis.history.length > 0) {
    analysis.history.forEach(msg => {
      if (msg.role === 'user') analysisContent += `[ALIADO]: ${msg.content}\n\n`;
      else analysisContent += `[ANÁLISE DO ELTON]: ${msg.content}\n\n`;
    });
  }
  
  const prompt = `Com base na análise abaixo, por favor, elabore o roteiro de Conversa Difícil. Preencha as etapas a seguir de forma focada e objetiva, assumindo o tom do Elton Euler e escrevendo como se fosse o Aliado.

--- ANÁLISE DO ALIADO ---
${analysisContent}
--- FIM ---

Por favor, preencha as etapas do roteiro de forma concisa e entregue o resultado pronto para o Aliado usar:

## 1. 📌 NECESSIDADE
[Preencha direto qual é o assunto central da conversa, em 2-3 frases objetivas]

## 2. 🚧 ATRAPALHO
[Preencha direto o que está atrapalhando — liste os pontos concretos]

## 3. 📋 MEUS PLANOS
[Preencha direto os planos para a conversa — o que vai propor, como vai falar]

## 4. ⚠️ EXPECTATIVA
[Preencha direto o que NÃO esperar do outro e qual a intenção real]

## 5. 🛑 LIMITE
[Preencha direto até onde aceita e o que não aceita mais]

## 6. 🤝 ACORDO
[Preencha direto como fechar o acordo — o desfecho ideal e o aceitável]

---

## ⚡ PONTOS DE ATENÇÃO
[Liste 3-5 alertas curtos sobre o que pode sabotar a conversa]

## 💡 FRASES-CHAVE
[3 a 5 frases prontas que o aliado pode usar durante a conversa, entre aspas]

REGRAS: Seja ESPECÍFICO usando os detalhes reais da análise. Preencha as etapas de forma clara e objetiva para facilitar o uso prático pelo Aliado.`;

  addBotMessage(`🗣️ **Gerando Roteiro de Conversa Difícil...**\n\nEstou cruzando sua análise para criar o roteiro completo das 6 etapas automaticamente. Aguarde...`);
  
  showTyping();
  
  // Initialize new analysis conversation for this
  state.analysisHistory = [{ role: 'user', content: prompt }];
  state.currentAnalysisId = Date.now().toString();
  analysisSelectedProtocol = 'conversas_dificeis';
  
  fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: prompt,
      protocolType: 'conversas_dificeis',
      conversationHistory: []
    })
  })
  .then(r => {
    if (!r.ok) return r.json().then(err => { throw new Error(err.error || 'Erro'); });
    return r.json();
  })
  .then(data => {
    removeTyping();
    state.analysisHistory.push({ role: 'model', content: data.analysis });
    
    addBotMessage(data.analysis);
    
    addBotMessage(`💬 **Quer ajustar algo?** Me diga o que quer mudar no roteiro — posso refinar a necessidade, ajustar os limites, trocar frases, ou aprofundar qualquer ponto.

_A conversa é salva automaticamente — pode voltar depois em 💾 Análises Salvas._`);
    
    // Save this as a new analysis
    if (typeof saveAnalysisToStorage === 'function') {
      saveAnalysisToStorage({
        id: state.currentAnalysisId,
        protocolType: 'conversas_dificeis',
        originalText: 'Conversa Difícil gerada a partir de análise',
        history: state.analysisHistory,
        savedAt: new Date().toISOString()
      });
    }
    
    scrollToBottom();
  })
  .catch(err => {
    removeTyping();
    addBotMessage(`❌ **Erro:** ${err.message}\n\nTente novamente.`);
    scrollToBottom();
  });
}

async function crossReferenceAllAnalyses() {
  const savedAnalyses = getAnalysesSaved();
  if (savedAnalyses.length < 2) {
    showToast('⚠️ Você precisa ter pelo menos 2 análises salvas para fazer o cruzamento global.');
    return;
  }

  // Gather all texts
  let combinedContext = 'Aqui estão os textos originais de vários protocolos respondidos pelo Aliado ao longo do tempo:\\n\\n';
  savedAnalyses.forEach((a, i) => {
    combinedContext += `--- PROTOCOLO ${i + 1} (${a.protocolType || 'Geral'}) ---\\n`;
    combinedContext += `${a.originalText || '(Texto não disponível)'}\\n\\n`;
  });

  const superPrompt = `O Aliado(a) preencheu múltiplos protocolos ao longo do tempo. Abaixo está o compilado de todos os relatos originais dele(a).
Faça uma ANÁLISE GLOBAL e PROFUNDA cruzando essas informações.
Revele:
1. Padrões de comportamento que se repetem.
2. Os maiores pontos cegos que essa pessoa ainda não enxergou em sua jornada.
3. Avanços ou contradições entre os relatos.
Use o tom direto, acolhedor e confrontador característico do Elton Euler. Seja específico e cite elementos que aparecem nos relatos.

${combinedContext}
--- FIM DOS PROTOCOLOS ---

Gere a análise global agora:`;

  // Setup the UI for the new chat
  state.mode = 'chat';
  state.currentAnalysisId = 'global_' + Date.now();
  state.conversationHistory = [];
  
  setActiveNav('nav-chat');
  updateHeader('🌐 Análise Global', 'Cruzamento de todas as suas análises');
  chatContainer.innerHTML = '';
  
  addBotMessage('🌐 **Iniciando Análise Global...**\\n\\nEstou cruzando todas as informações dos seus protocolos salvos. Isso pode levar alguns segundos. Aguarde...');
  showTyping();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: superPrompt,
        history: []
      })
    });
    
    const data = await response.json();
    removeTyping();
    
    if (data.success) {
      addBotMessage(data.response);
      
      // Save this global analysis
      state.conversationHistory.push({ role: 'user', content: 'Solicitou o cruzamento de todas as análises salvas.' });
      state.conversationHistory.push({ role: 'model', content: data.response });
      
      if (typeof saveAnalysisToStorage === 'function') {
        saveAnalysisToStorage({
          id: state.currentAnalysisId,
          title: 'Análise Global (Cruzamento)',
          protocolType: 'geral',
          originalText: 'Cruzamento de ' + savedAnalyses.length + ' análises.',
          history: state.conversationHistory,
          savedAt: new Date().toISOString()
        });
      }
    } else {
      addBotMessage(`❌ **Erro:** ${data.error}`);
    }
  } catch (error) {
    removeTyping();
    addBotMessage(`❌ **Erro de conexão:** ${error.message}`);
  }
}

function restoreSavedAnalysis(id) {
  const saved = getAnalysesSaved();
  const analysis = saved.find(a => a.id === id);
  if (!analysis) {
    showToast('❌ Análise não encontrada.');
    return;
  }
  
  // Restore state
  state.mode = 'analysis_chat';
  state.analysisHistory = analysis.history ? [...analysis.history] : [];
  state.currentAnalysisId = analysis.id;
  analysisSelectedProtocol = analysis.protocolType;
  
  btnExport.style.display = 'none';
  setActiveNav('nav-saved-analyses');
  
  const typeLabels = {
    'medo': 'Combate do Medo',
    'dep_ativa': 'Dep. Emocional Ativa',
    'dep_passiva': 'Dep. Emocional Passiva',
    'protecao': 'Proteção Emocional',
    'geral': 'Geral'
  };
  const typeLabel = typeLabels[analysis.protocolType] || analysis.protocolType;
  updateHeader('🧠 Análise: ' + typeLabel, 'Conversa restaurada — continue de onde parou');
  
  chatContainer.innerHTML = '';
  
  // Re-render the conversation
  if (analysis.history && analysis.history.length > 0) {
    analysis.history.forEach(msg => {
      if (msg.role === 'user') {
        addUserMessage(msg.content);
      } else if (msg.role === 'model') {
        addBotMessage(msg.content);
      }
    });
  }
  
  addBotMessage(`💬 **Conversa restaurada!** Continue digitando abaixo para aprofundar a análise.\n\n_A conversa continua de onde você parou..._`);
  
  chatInput.focus();
  scrollToBottom();
}

// ─── INPUT HANDLERS ──────────────────────────────────────────
function handleInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}

function autoResizeInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ─── FORMATTING ──────────────────────────────────────────────
function formatMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
    .replace(/\| (.+?) \| (.+?) \|/g, (match) => {
      return match; // Keep tables as-is for simplicity
    });
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ============================================================
// PROTOCOL ANALYSIS ENGINE — Pontos Cegos
// ============================================================

let analysisSelectedProtocol = null;

function showAnaliseProtocolo() {
  state.mode = 'analysis';
  btnExport.style.display = 'none';
  setActiveNav('nav-analise');
  updateHeader('🧠 Analisar meu Protocolo', 'Escreva seu protocolo preenchido e receba análise de pontos cegos');
  
  chatContainer.innerHTML = '';
  
  addBotMessage(`🧠 **Análise Inteligente de Protocolo**

Aqui você pode escrever ou colar o seu protocolo preenchido e eu vou analisar com base no material da Aliança Divergente, apontando:

• **Pontos cegos** que talvez você não esteja enxergando
• **Padrões** que se repetem nas suas respostas
• **Sugestões** baseadas nos princípios do Elton Euler
• **Perguntas provocativas** para aprofundar sua reflexão

_"Pontos cegos são aspectos que a pessoa não consegue enxergar sozinha."_ — Aliança Divergente

**Selecione o tipo de protocolo e depois cole ou escreva suas respostas:**`);
  
  const formHTML = `
    <div class="analysis-form">
      <div class="analysis-protocol-select" id="analysisProtocolSelect">
        <div class="analysis-protocol-option" onclick="selectAnalysisProtocol(this, 'medo')">
          <span class="opt-icon">⚔️</span>Combate do Medo
        </div>
        <div class="analysis-protocol-option" onclick="selectAnalysisProtocol(this, 'dep_ativa')">
          <span class="opt-icon">🔓</span>Dep. Emocional Ativa
        </div>
        <div class="analysis-protocol-option" onclick="selectAnalysisProtocol(this, 'dep_passiva')">
          <span class="opt-icon">🛡️</span>Dep. Emocional Passiva
        </div>
        <div class="analysis-protocol-option" onclick="selectAnalysisProtocol(this, 'protecao')">
          <span class="opt-icon">🔰</span>Proteção Emocional
        </div>
        <div class="analysis-protocol-option" onclick="selectAnalysisProtocol(this, 'geral')">
          <span class="opt-icon">📋</span>Outro / Geral
        </div>
      </div>
      
      <textarea 
        class="analysis-textarea" 
        id="analysisText" 
        placeholder="Cole ou escreva aqui o seu protocolo preenchido...

Exemplo:
1.1. Medo de perder meu emprego
1.2. Vem da infância, meu pai sempre dizia que eu não era bom o suficiente
1.3. Desde os 12 anos
2.1. Deixo de me candidatar a vagas melhores
2.2. Fico ansioso e não consigo dormir
..."
      ></textarea>
      
      <button class="analysis-submit-btn" onclick="runAnalysis()" id="analysisSubmitBtn">
        🧠 Analisar Protocolo
      </button>
    </div>
  `;
  
  chatContainer.insertAdjacentHTML('beforeend', formHTML);
  scrollToBottom();
}

function selectAnalysisProtocol(el, type) {
  document.querySelectorAll('.analysis-protocol-option').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  analysisSelectedProtocol = type;
}

function runAnalysis() {
  const text = document.getElementById('analysisText').value.trim();
  
  if (!text) {
    showToast('⚠️ Escreva ou cole seu protocolo antes de analisar!');
    return;
  }
  
  if (text.length < 50) {
    showToast('⚠️ Protocolo muito curto. Escreva mais detalhes para uma análise mais profunda.');
    return;
  }
  
  const type = analysisSelectedProtocol || 'geral';
  
  // Show loading
  const btn = document.getElementById('analysisSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '⏳ Analisando com IA...';
  
  // Remove the form
  const form = document.querySelector('.analysis-form');
  if (form) form.remove();
  
  // Show user text as message
  addUserMessage(text);
  
  // Show typing
  showTyping();
  
  // Initialize analysis conversation
  state.analysisHistory = [];
  
  // Call backend API
  fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      text: text, 
      protocolType: type,
      conversationHistory: []
    })
  })
  .then(r => {
    if (!r.ok) return r.json().then(err => { throw new Error(err.error || 'Erro na análise'); });
    return r.json();
  })
  .then(data => {
    removeTyping();
    btn.disabled = false;
    btn.innerHTML = '🧠 Analisar Protocolo';
    
    // Save to conversation history for follow-ups
    state.analysisHistory = [
      { role: 'user', content: `O Aliado preencheu o seguinte protocolo (${type}): ${text}` },
      { role: 'model', content: data.analysis }
    ];
    state.mode = 'analysis_chat';
    
    // Generate unique ID for this analysis session and save
    state.currentAnalysisId = Date.now().toString();
    saveAnalysisToStorage({
      id: state.currentAnalysisId,
      protocolType: type,
      originalText: text,
      history: [...state.analysisHistory],
      savedAt: Date.now()
    });
    
    // Render the AI analysis
    addBotMessage(data.analysis);
    
    // Add follow-up prompt
    addBotMessage(`💬 **Quer aprofundar?** Pode me perguntar sobre qualquer ponto da análise acima, pedir para eu detalhar um ponto cego específico, ou me contar mais sobre a situação. A conversa continua — vou te ajudar a enxergar o que está escondido.

_Digite na caixa abaixo para continuar a conversa..._`);
    
    scrollToBottom();
  })
  .catch(err => {
    removeTyping();
    btn.disabled = false;
    btn.innerHTML = '🧠 Analisar Protocolo';
    
    if (err.message.includes('API Key')) {
      addBotMessage(`🔑 **Chave da API não configurada ou inválida.**

Para a análise profunda funcionar, você precisa:

1. Acesse [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Crie uma chave gratuita
3. Clique no botão ⚙️ **Configurações** no canto superior direito
4. Cole sua chave e salve

A análise básica (sem IA) está rodando abaixo enquanto isso:`);
      
      // Fallback to local analysis
      const insights = analyzeProtocolLocal(text, type);
      renderLocalAnalysisResults(text, insights, type);
    } else {
      addBotMessage(`❌ **Erro na análise:** ${err.message}\n\nTente novamente em alguns segundos.`);
      
      // Re-add form
      const reHTML = `
        <div class="analysis-form" style="margin-top: 16px;">
          <textarea class="analysis-textarea" id="analysisText" placeholder="Cole seu protocolo novamente...">${escapeHTML(text)}</textarea>
          <button class="analysis-submit-btn" onclick="runAnalysis()" id="analysisSubmitBtn">🧠 Tentar Novamente</button>
        </div>
      `;
      chatContainer.insertAdjacentHTML('beforeend', reHTML);
    }
    scrollToBottom();
  });
}

// ─── AI-POWERED CHAT ─────────────────────────────────────────
// History for AI conversations
let aiChatHistory = [];

function handleSend() {
  const text = chatInput.value.trim();
  if (!text) return;
  
  chatInput.value = '';
  autoResizeInput(chatInput);
  
  // If in analysis follow-up mode
  if (state.mode === 'analysis_chat') {
    addUserMessage(text);
    showTyping();
    
    state.analysisHistory.push({ role: 'user', content: text });
    
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        protocolType: analysisSelectedProtocol || 'geral',
        conversationHistory: state.analysisHistory
      })
    })
    .then(r => {
      if (!r.ok) return r.json().then(err => { throw new Error(err.error); });
      return r.json();
    })
    .then(data => {
      removeTyping();
      state.analysisHistory.push({ role: 'model', content: data.analysis });
      addBotMessage(data.analysis);
      
      // Update saved analysis with new messages
      if (state.currentAnalysisId) {
        const saved = getAnalysesSaved();
        const existing = saved.find(a => a.id === state.currentAnalysisId);
        if (existing) {
          existing.history = [...state.analysisHistory];
          existing.savedAt = Date.now();
          saveAnalysisToStorage(existing);
        }
      }
      
      scrollToBottom();
    })
    .catch(err => {
      removeTyping();
      addBotMessage(`❌ Erro: ${err.message}`);
      scrollToBottom();
    });
    return;
  }
  
  // If in chat mode — try AI first, fallback to local
  if (state.mode === 'chat' || state.mode === 'welcome') {
    if (state.mode === 'welcome') {
      state.mode = 'chat';
      chatContainer.innerHTML = '';
      setActiveNav('nav-chat');
      updateHeader('Conversando com Elton', 'Chat com IA baseado nos princípios da Aliança Divergente');
      aiChatHistory = [];
    }
    
    addUserMessage(text);
    showTyping();
    
    aiChatHistory.push({ role: 'user', content: text });
    
    // Try AI backend first
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: aiChatHistory.slice(-20) // Last 20 messages for context
      })
    })
    .then(r => {
      if (!r.ok) throw new Error('API indisponível');
      return r.json();
    })
    .then(data => {
      removeTyping();
      aiChatHistory.push({ role: 'model', content: data.response });
      addBotMessage(data.response);
      scrollToBottom();
    })
    .catch(err => {
      removeTyping();
      // Fallback to local responses
      const response = generateResponse(text);
      aiChatHistory.push({ role: 'model', content: response });
      addBotMessage(response);
      scrollToBottom();
    });
    return;
  }
}

// ─── SETTINGS PANEL ──────────────────────────────────────────
function showSettings() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="modal-content">
      <h3>⚙️ Configurações</h3>
      <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 16px;">
        Configure sua chave da API do Google Gemini para análises profundas com IA.
        <br><br>
        📌 Pegue sua chave gratuita em: <a href="https://aistudio.google.com/apikey" target="_blank" style="color: var(--text-gold);">aistudio.google.com/apikey</a>
      </p>
      <input 
        type="password" 
        id="apiKeyInput" 
        placeholder="Cole sua chave da API aqui..." 
        style="width:100%; padding:12px 16px; background:rgba(8,8,16,0.6); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-family:'Inter',sans-serif; font-size:0.9rem; outline:none; margin-bottom: 12px;"
      >
      <div id="apiKeyStatus" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">Verificando...</div>
      <div class="modal-actions">
        <button class="step-btn skip" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
        <button class="step-btn next" onclick="saveApiKey()">💾 Salvar Chave</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Check current status
  fetch('/api/config/status')
    .then(r => r.json())
    .then(data => {
      const statusEl = document.getElementById('apiKeyStatus');
      if (data.configured) {
        statusEl.innerHTML = `✅ Chave configurada (${data.keyPreview})`;
        statusEl.style.color = '#4CAF50';
      } else {
        statusEl.innerHTML = '❌ Nenhuma chave configurada';
        statusEl.style.color = '#F44336';
      }
    })
    .catch(() => {
      document.getElementById('apiKeyStatus').innerHTML = '⚠️ Servidor não está rodando. Execute: npm start';
      document.getElementById('apiKeyStatus').style.color = '#FFC107';
    });
}

function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key) {
    showToast('⚠️ Cole a chave antes de salvar!');
    return;
  }
  
  fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key })
  })
  .then(r => r.json())
  .then(data => {
    showToast('✅ Chave salva com sucesso!');
    document.getElementById('apiKeyStatus').innerHTML = '✅ Chave configurada!';
    document.getElementById('apiKeyStatus').style.color = '#4CAF50';
    document.getElementById('apiKeyInput').value = '';
  })
  .catch(err => {
    showToast('❌ Erro ao salvar chave');
  });
}

// ─── LOCAL ANALYSIS FALLBACK ─────────────────────────────────
// (Kept as fallback when API is not available)

function analyzeProtocolLocal(text, type) {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const insights = [];
  const words = lower.split(/\s+/);
  const wordCount = words.length;
  
  if (wordCount < 80) {
    insights.push({ type: 'danger', icon: '🔴', title: 'Respostas superficiais', body: `Apenas <strong>${wordCount} palavras</strong>. Aprofunde suas respostas.`, quote: null });
  }
  
  const ajudaCount = (lower.match(/\bajud/g) || []).length;
  if (ajudaCount > 0 && !lower.includes('apoi')) {
    insights.push({ type: 'danger', icon: '🚨', title: 'Confusão Ajuda vs Apoio', body: `Mencionou "ajuda" ${ajudaCount}x sem mencionar "apoio". Lembre: ajuda é proibida, apoio é bem-vindo.`, quote: null });
  }
  
  const passividade = (lower.match(/\b(nao sei|nao consigo|nao posso|talvez|acho que)\b/g) || []).length;
  if (passividade > 3) {
    insights.push({ type: 'warning', icon: '🛑', title: 'Linguagem passiva', body: `${passividade} expressões de passividade. Foque no que está TENTANDO, não no que está PASSANDO.`, quote: null });
  }
  
  if (!lower.includes('decidi') && !lower.includes('vou fazer') && !lower.includes('resolvi')) {
    insights.push({ type: 'warning', icon: '📐', title: 'Falta DECISÃO no PDA', body: 'Não encontrei decisões claras. Onde está travado: Percepção, Decisão ou Ação?', quote: null });
  }
  
  insights.push({ type: 'info', icon: '💡', title: 'Análise limitada', body: 'Esta é a análise básica (sem IA). Para pontos cegos mais profundos, configure sua chave da API em ⚙️ Configurações.', quote: null });
  
  return insights;
}

function renderLocalAnalysisResults(text, insights, type) {
  let html = '<div class="analysis-results">';
  insights.forEach(insight => {
    html += `
      <div class="insight-card ${insight.type}">
        <div class="insight-header">
          <span class="insight-icon">${insight.icon}</span>
          <span class="insight-title">${insight.title}</span>
        </div>
        <div class="insight-body">${insight.body}</div>
        ${insight.quote ? `<div class="insight-quote">${insight.quote}</div>` : ''}
      </div>
    `;
  });
  html += '</div>';
  chatContainer.insertAdjacentHTML('beforeend', html);
  scrollToBottom();
}


function analyzeProtocol(text, type) {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const insights = [];
  const words = lower.split(/\s+/);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // ═══════════════════════════════════════════
  // 1. ANÁLISE DE PROFUNDIDADE
  // ═══════════════════════════════════════════
  
  if (wordCount < 80) {
    insights.push({
      type: 'danger',
      icon: '🔴',
      title: 'Respostas superficiais detectadas',
      body: `Seu protocolo tem apenas <strong>${wordCount} palavras</strong>. Protocolos bem preenchidos costumam ter pelo menos 200+ palavras. Respostas curtas geralmente indicam que você está evitando ir fundo — e é justamente no fundo que estão os pontos cegos.`,
      quote: '"Obesidade intelectual é acumular conhecimento sem aplicar. Mas o oposto — responder raso demais — também é um problema. Vá fundo." — Baseado nos princípios da Aliança'
    });
  } else if (wordCount < 150) {
    insights.push({
      type: 'warning',
      icon: '🟡',
      title: 'Pode aprofundar mais',
      body: `Seu protocolo tem <strong>${wordCount} palavras</strong>. Está no caminho, mas algumas respostas podem estar superficiais. Tente expandir as que respondeu em uma linha só — ali pode estar um ponto cego.`,
      quote: '"O nosso processo tem começo, meio e meio. Não para." — Elton Euler'
    });
  }
  
  // ═══════════════════════════════════════════
  // 2. DETECÇÃO DE AJUDA vs. APOIO
  // ═══════════════════════════════════════════
  
  const ajudaCount = (lower.match(/\bajud/g) || []).length;
  const apoioCount = (lower.match(/\bapoi/g) || []).length;
  
  if (ajudaCount > 0 && apoioCount === 0) {
    insights.push({
      type: 'danger',
      icon: '🚨',
      title: 'Ponto cego: Confusão entre Ajuda e Apoio',
      body: `Você mencionou "<strong>ajuda</strong>" ${ajudaCount}x mas não mencionou "<strong>apoio</strong>" nenhuma vez. Na Aliança Divergente, <strong>ajuda é proibida</strong> e <strong>apoio é bem-vindo</strong>. Ajuda = fazer PELO outro (gera dependência). Apoio = fortalecer o outro para que ELE faça (promove autonomia). Revise suas respostas: onde você escreveu "ajuda", será que está realmente ajudando ou apoiando?`,
      quote: '"Quando você AJUDA alguém, você está invadindo o núcleo dela. Quando você APOIA, está respeitando a capacidade dela." — Princípio da Aliança'
    });
  }
  
  if (ajudaCount > 2) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Padrão de ajuda excessiva',
      body: `Você mencionou "ajuda" <strong>${ajudaCount} vezes</strong>. Isso pode indicar um padrão de dependência emocional ativa — você pode estar invadindo o núcleo de alguém sob a justificativa de "ajudar". Pergunte-se: estou fazendo PELO outro ou fortalecendo o outro para que ELE faça?`,
      quote: null
    });
  }
  
  // ═══════════════════════════════════════════
  // 3. FOCO NO OUTRO vs. FOCO EM SI
  // ═══════════════════════════════════════════
  
  const elePronounCount = (lower.match(/\b(ele|ela|dele|dela|nele|nela)\b/g) || []).length;
  const euPronounCount = (lower.match(/\b(eu|meu|minha|me|mim)\b/g) || []).length;
  
  if (elePronounCount > euPronounCount * 1.5 && elePronounCount > 5) {
    insights.push({
      type: 'warning',
      icon: '🪞',
      title: 'Ponto cego: Foco excessivo no outro',
      body: `Você mencionou a outra pessoa <strong>${elePronounCount}x</strong> mas falou de si mesmo apenas <strong>${euPronounCount}x</strong>. O protocolo é sobre VOCÊ — sua percepção, sua decisão, sua ação. Quando o foco está demais no outro, geralmente significa que você está tentando <strong>controlar, mudar ou salvar</strong> essa pessoa. Redirecione para o que VOCÊ pode fazer, independente do outro.`,
      quote: '"Os sonhos de um indivíduo não podem ser prejudicados pela incapacidade e indisposição de outras pessoas." — Elton Euler'
    });
  }
  
  // ═══════════════════════════════════════════
  // 4. EXPECTATIVA vs. INTENÇÃO
  // ═══════════════════════════════════════════
  
  const expectativaCount = (lower.match(/\b(espero|esperava|esperando|quero que ele|quero que ela|gostaria que|deveria)\b/g) || []).length;
  const intencaoCount = (lower.match(/\b(minha intencao|pretendo|vou fazer|decidi|minha decisao)\b/g) || []).length;
  
  if (expectativaCount > 2 && intencaoCount === 0) {
    insights.push({
      type: 'danger',
      icon: '🎯',
      title: 'Ponto cego: Muita expectativa, pouca intenção',
      body: `Detectei <strong>${expectativaCount} expressões de expectativa</strong> sobre o comportamento do outro, mas <strong>nenhuma intenção clara</strong> sobre o que VOCÊ vai fazer. O princípio da Aliança é: <strong>diminuir expectativa, revelar intenção</strong>. Expectativa é sobre o que você ESPERA do outro. Intenção é sobre o que VOCÊ vai fazer. O que muda o jogo é a sua intenção, não a sua expectativa.`,
      quote: '"A vida não entende problemas, a vida não entende sonhos, a vida entende decisões." — Elton Euler'
    });
  }
  
  // ═══════════════════════════════════════════
  // 5. PASSIVIDADE vs. AÇÃO
  // ═══════════════════════════════════════════
  
  const passividadeWords = (lower.match(/\b(nao sei|nao consigo|nao posso|nao tenho|talvez|acho que|pode ser|quem sabe|sei la|dificil)\b/g) || []).length;
  const acaoWords = (lower.match(/\b(vou|decidi|fiz|farei|comecei|resolvi|tomei|estou fazendo|ja fiz|tentei)\b/g) || []).length;
  
  if (passividadeWords > 4 && acaoWords < 2) {
    insights.push({
      type: 'danger',
      icon: '🛑',
      title: 'Ponto cego: Linguagem de passividade',
      body: `Suas respostas contêm <strong>${passividadeWords} expressões de passividade</strong> ("não sei", "não consigo", "talvez") e apenas <strong>${acaoWords} expressões de ação</strong>. Isso indica que você pode estar travado no modo "passando" em vez de "tentando". Na Aliança, o foco é sempre no que você está <strong>TENTANDO</strong> (ação ativa), não no que está PASSANDO (dificuldade passiva).`,
      quote: '"É melhor tomar uma decisão ruim do que não decidir." — Elton Euler'
    });
  }
  
  // ═══════════════════════════════════════════
  // 6. DETECÇÃO DE CULPA / VÍTIMA
  // ═══════════════════════════════════════════
  
  const culpaWords = (lower.match(/\b(culpa|culpado|culpada|mereco|castigo|erro meu|fui eu|estraguei|falhei)\b/g) || []).length;
  const vitimWords = (lower.match(/\b(coitado|injusto|injusta|nao mereco|por que comigo|ninguem me|sempre eu|sofro|sofrer|nunca)\b/g) || []).length;
  
  if (culpaWords > 2) {
    insights.push({
      type: 'warning',
      icon: '⚖️',
      title: 'Ponto cego: Excesso de culpa',
      body: `Detectei <strong>${culpaWords} expressões de culpa</strong> nas suas respostas. A premissa da Aliança é: <strong>"Sem culpa nem desculpa. Se fez errado, corrija. Se não fez, faça."</strong> Culpa paralisa. A pergunta correta não é "de quem é a culpa?" mas sim "o que eu vou fazer agora?". Substitua a culpa por responsabilidade ativa.`,
      quote: null
    });
  }
  
  if (vitimWords > 2) {
    insights.push({
      type: 'warning',
      icon: '🎭',
      title: 'Ponto cego: Posição de vítima',
      body: `Detectei <strong>${vitimWords} expressões de vitimização</strong>. Isso pode indicar que você está usando o padrão de <strong>Vítima Natural</strong> (dificuldade genuína supervalorizada) ou <strong>Vítima Intencional</strong> (usando a dificuldade para justificar a inação). A Aliança pede que você saia da posição de "passando" para "tentando". O que você JÁ TENTOU fazer?`,
      quote: '"Constrange a vida. Faça mais do que a vida está esperando de você." — Elton Euler'
    });
  }
  
  // ═══════════════════════════════════════════
  // 7. PDA INCOMPLETO
  // ═══════════════════════════════════════════
  
  const hasPercepcao = lower.includes('percepcao') || lower.includes('percebi') || lower.includes('entendi') || lower.includes('enxergo') || lower.includes('notei');
  const hasDecisao = lower.includes('decisao') || lower.includes('decidi') || lower.includes('resolvi') || lower.includes('optei');
  const hasAcao = lower.includes('acao') || lower.includes('fiz') || lower.includes('vou fazer') || lower.includes('comecei') || lower.includes('farei');
  
  const pdaComplete = [hasPercepcao, hasDecisao, hasAcao];
  const pdaMissing = [];
  if (!hasPercepcao) pdaMissing.push('PERCEPÇÃO');
  if (!hasDecisao) pdaMissing.push('DECISÃO');
  if (!hasAcao) pdaMissing.push('AÇÃO');
  
  if (pdaMissing.length > 0) {
    insights.push({
      type: pdaMissing.length >= 2 ? 'danger' : 'warning',
      icon: '📐',
      title: `PDA incompleto: falta ${pdaMissing.join(' e ')}`,
      body: `O framework PDA (Percepção → Decisão → Ação) é a espinha dorsal de todo protocolo. No seu texto, não identifiquei claramente o componente de <strong>${pdaMissing.join(' e ')}</strong>. Sem PDA completo, o protocolo fica no ar. Onde exatamente você está travado?`,
      quote: '"O medo causa muita insegurança, confusão e indecisão. Tudo isso começa a sumir quando você sai da indecisão ao entrar em decisão." — Elton Euler'
    });
  }
  
  // ═══════════════════════════════════════════
  // 8. FALTA DE DATAS / COMPROMISSO CONCRETO
  // ═══════════════════════════════════════════
  
  const hasDate = /\d{1,2}[\/-]\d{1,2}/.test(text) || lower.includes('amanha') || lower.includes('segunda') || lower.includes('semana que vem') || lower.includes('hoje') || lower.includes('24 horas');
  
  if (!hasDate && (type === 'dep_ativa' || type === 'dep_passiva' || type === 'medo')) {
    insights.push({
      type: 'warning',
      icon: '📅',
      title: 'Ponto cego: Sem prazo definido',
      body: `Não encontrei nenhuma data ou prazo concreto nas suas respostas. O protocolo pede: <strong>"QUANDO fará?"</strong> e <strong>"O que pode fazer em NO MÁXIMO 24 HORAS?"</strong>. Sem prazo, a decisão fica suspensa no ar. Defina QUANDO vai agir — sem prazo não existe compromisso.`,
      quote: '"Não é da noite para o dia, mas é todos os dias." — Elton Euler'
    });
  }
  
  // ═══════════════════════════════════════════
  // 9. GUARDIÃO DA DECISÃO
  // ═══════════════════════════════════════════
  
  const hasGuardiao = lower.includes('guardiao') || lower.includes('guardian') || lower.includes('pessoa de confianca') || lower.includes('vai me cobrar') || lower.includes('vai me acompanhar');
  
  if (!hasGuardiao && (type === 'dep_ativa' || type === 'dep_passiva')) {
    insights.push({
      type: 'warning',
      icon: '🛡️',
      title: 'Falta o Guardião da Decisão',
      body: `Você não mencionou quem será o seu <strong>Guardião da Decisão</strong> — a pessoa de confiança que vai acompanhar o cumprimento dos seus compromissos. Sem guardião, é mais fácil recuar. Quem pode ser essa pessoa na sua vida?`,
      quote: null
    });
  }
  
  // ═══════════════════════════════════════════
  // 10. TENTATIVA DE MUDAR O OUTRO
  // ═══════════════════════════════════════════
  
  const mudarOutroCount = (lower.match(/\b(mudar ele|mudar ela|fazer ele|fazer ela|convencer|quero que ele mude|ela precisa mudar|preciso que ele|preciso que ela|se ele mudasse|se ela mudasse)\b/g) || []).length;
  
  if (mudarOutroCount > 0) {
    insights.push({
      type: 'danger',
      icon: '🚨',
      title: 'Ponto cego CRÍTICO: Tentando mudar o outro',
      body: `Detectei <strong>${mudarOutroCount} tentativa(s) de mudar, salvar ou controlar o outro</strong>. Este é um dos <strong>3 erros básicos</strong> do Protocolo de Proteção Emocional. Você NÃO pode mudar o outro — apenas pode mudar como VOCÊ lida com a situação. A pergunta correta é: "O que EU vou fazer de diferente?", não "Como faço ele/ela mudar?"`,
      quote: '"Para se importar menos com a opinião dos outros é preciso ter coragem de ser menos importante para eles." — Elton Euler'
    });
  }
  
  // ═══════════════════════════════════════════
  // 11. DESCULPAS / JUSTIFICATIVAS
  // ═══════════════════════════════════════════
  
  const desculpaWords = (lower.match(/\b(porque|mas e que|nao deu|nao tinha como|foi sem querer|nao tive opcao|unica opcao|nao podia|impossivel|tentei mas)\b/g) || []).length;
  
  if (desculpaWords > 3) {
    insights.push({
      type: 'warning',
      icon: '🚫',
      title: 'Padrão de desculpas detectado',
      body: `Encontrei <strong>${desculpaWords} justificativas</strong> nas suas respostas. O 3º degrau da Escada da Postura Memorável é: <strong>"Não dá desculpas"</strong>. Pode ter dificuldades, mas nunca dar desculpas. Revise suas respostas: onde há uma justificativa, substitua por uma ação. Em vez de "não deu porque...", escreva "da próxima vez vou...".`,
      quote: '"Não confunda pressa com velocidade." — Elton Euler'
    });
  }
  
  // ═══════════════════════════════════════════
  // 12. MEDO NÃO NOMEADO (específico para protocolo de medo)
  // ═══════════════════════════════════════════
  
  if (type === 'medo') {
    const medoOrigemWords = lower.includes('infancia') || lower.includes('crianca') || lower.includes('pai') || lower.includes('mae') || lower.includes('familia');
    
    if (!medoOrigemWords) {
      insights.push({
        type: 'info',
        icon: '💡',
        title: 'Pergunta provocativa: Origem do medo',
        body: `Você não mencionou a <strong>origem na infância</strong> do seu medo. O protocolo pergunta: "De onde vem esse medo?" e "Com quem você aprendeu isso?". Na Aliança, entendemos que a dependência emocional e os medos foram <strong>desenvolvidos na infância por necessidade</strong> e se mantêm por hábito. Volte à pergunta 1.2 e tente lembrar: quando foi a PRIMEIRA vez que sentiu esse medo?`,
        quote: '"Quando você era criança, você não foi protegido o suficiente. E você desenvolveu uma dependência emocional por necessidade." — Elton Euler'
      });
    }
    
    const hasInversao = lower.includes('oposto') || lower.includes('contrario') || lower.includes('inversao') || lower.includes('inverso') || lower.includes('ao contrario');
    if (!hasInversao) {
      insights.push({
        type: 'info',
        icon: '🔄',
        title: 'Faltou a inversão da crença',
        body: `A pergunta 3.7 pede que você crie uma <strong>versão completamente oposta</strong> do que acredita. Essa inversão é poderosa porque mostra que existe uma outra forma de ver a mesma situação. Se o medo diz "vou fracassar", a inversão é "vou ter sucesso". Mesmo que não acredite ainda — escreva. A inversão começa a enfraquecer o medo.`,
        quote: null
      });
    }
  }
  
  // ═══════════════════════════════════════════
  // 13. PROJETADA vs. REVELADA (específico para dep. passiva)
  // ═══════════════════════════════════════════
  
  if (type === 'dep_passiva') {
    const hasProjetada = lower.includes('projetada') || lower.includes('acho que ele') || lower.includes('acho que ela') || lower.includes('imagino que');
    const hasRevelada = lower.includes('revelada') || lower.includes('ele disse') || lower.includes('ela disse') || lower.includes('me falou');
    
    if (!hasProjetada && !hasRevelada) {
      insights.push({
        type: 'danger',
        icon: '🪞',
        title: 'Ponto cego: Projetada vs. Revelada',
        body: `No protocolo passivo, é essencial distinguir o que é <strong>PROJETADO</strong> (o que VOCÊ acha que o invasor pensa/sente) do que é <strong>REVELADO</strong> (o que o invasor efetivamente DISSE/MOSTROU). Sem essa distinção, você pode estar reagindo a suposições, não a fatos. Revise: o que o invasor realmente REVELOU vs. o que você está PROJETANDO?`,
        quote: null
      });
    }
  }
  
  // ═══════════════════════════════════════════
  // 14. CONSTRUINDO O NÃO
  // ═══════════════════════════════════════════
  
  const hasLimite = lower.includes('limite') || lower.includes('nao vou') || lower.includes('nao vou mais') || lower.includes('chega') || lower.includes('basta') || lower.includes('parei');
  
  if (!hasLimite && (type === 'dep_ativa' || type === 'dep_passiva')) {
    insights.push({
      type: 'warning',
      icon: '🚧',
      title: 'Falta: Construindo o Não',
      body: `Não identifiquei um <strong>limite claro</strong> nas suas respostas. A fase de "Construindo o Não" é onde você define o que NÃO vai mais aceitar ou fazer. Sem limite definido, nada muda. Escreva claramente: "NÃO vou mais..." — seja específico.`,
      quote: null
    });
  }
  
  // ═══════════════════════════════════════════
  // 15. PONTOS POSITIVOS / REFORÇO
  // ═══════════════════════════════════════════
  
  if (hasPercepcao && hasDecisao) {
    insights.push({
      type: 'tip',
      icon: '✅',
      title: 'Boa percepção e decisão',
      body: `Parabéns! Identifiquei que você tem clareza na <strong>percepção</strong> e na <strong>decisão</strong>. Isso é excelente — muita gente trava nesses dois pontos. Agora o próximo passo é garantir a <strong>AÇÃO</strong>. Lembre-se: percepção sem ação é apenas teoria.`,
      quote: '"O resultado para nós é uma consequência inevitável. Quando você faz o que precisa ser feito, o resultado não é opcional." — Elton Euler'
    });
  }
  
  if (hasAcao && hasDate) {
    insights.push({
      type: 'tip',
      icon: '🔥',
      title: 'Ação com prazo — Excelente!',
      body: `Você definiu ação E prazo — isso é postura memorável! Agora assegure-se de ter um <strong>Guardião da Decisão</strong> para te acompanhar e celebre cada passo do caminho.`,
      quote: '"Parabéns, você merece e não pare!" — Celebre Comigo'
    });
  }
  
  if (wordCount >= 200) {
    insights.push({
      type: 'tip',
      icon: '📝',
      title: 'Protocolo detalhado',
      body: `Seu protocolo tem <strong>${wordCount} palavras</strong> — isso mostra comprometimento e honestidade com o processo. Você está fazendo o básico bem feito.`,
      quote: '"Como você faz uma coisa, você faz todas as outras." — Elton Euler'
    });
  }
  
  // ═══════════════════════════════════════════
  // 16. PERGUNTA PROVOCATIVA FINAL
  // ═══════════════════════════════════════════
  
  const provocativas = [
    {
      type: 'info',
      icon: '🤔',
      title: 'Pergunta provocativa',
      body: `Se alguém que você admira lesse esse protocolo, o que essa pessoa diria que está faltando? O que ela apontaria que você está <strong>evitando enxergar</strong>?`,
      quote: '"Aqui nós vamos acreditar em você, mesmo que você não acredite." — Elton Euler'
    },
    {
      type: 'info',
      icon: '🤔',
      title: 'Pergunta provocativa',
      body: `Se você pudesse voltar no tempo e dar UM conselho ao seu "eu" antes de preencher esse protocolo, qual seria? Isso que veio na sua mente agora... é um ponto cego que você <strong>ainda não colocou no papel</strong>.`,
      quote: null
    },
    {
      type: 'info',
      icon: '🤔',
      title: 'Pergunta provocativa',
      body: `Releia suas respostas e se pergunte: <strong>"Isso é o que eu REALMENTE penso ou é o que eu GOSTARIA de pensar?"</strong>. Honestidade brutal consigo mesmo é o que faz o protocolo funcionar.`,
      quote: '"Não confunda pressa com velocidade." — Elton Euler'
    },
    {
      type: 'info',
      icon: '🤔',
      title: 'Pergunta provocativa',
      body: `Se NADA mudasse depois desse protocolo, se você continuasse exatamente como está... como vai estar sua vida daqui a 5 anos? Escreva isso. Depois pergunte se vale a pena NÃO agir.`,
      quote: '"A vida é justa — ela entrega exatamente o que você entrega."'
    }
  ];
  
  insights.push(provocativas[Math.floor(Math.random() * provocativas.length)]);
  
  return insights;
}

function renderAnalysisResults(originalText, insights, type) {
  // Remove form
  const form = document.querySelector('.analysis-form');
  if (form) form.remove();
  
  // Show user text as message
  addUserMessage(originalText);
  
  // Calculate score
  const dangers = insights.filter(i => i.type === 'danger').length;
  const warnings = insights.filter(i => i.type === 'warning').length;
  const tips = insights.filter(i => i.type === 'tip').length;
  const totalIssues = dangers * 3 + warnings * 1.5;
  let score = Math.max(0, Math.min(100, Math.round(100 - totalIssues * 8 + tips * 5)));
  const scoreClass = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  const scoreLabel = score >= 70 ? 'Bom trabalho!' : score >= 40 ? 'Pode melhorar' : 'Atenção necessária';
  
  let html = `<div class="analysis-results">`;
  
  // Score card
  html += `
    <div class="analysis-score">
      <div class="score-circle ${scoreClass}">
        ${score}
        <small>pontos</small>
      </div>
      <div class="score-info">
        <h3>${scoreLabel}</h3>
        <p>Encontrei <strong>${dangers} ponto(s) cego(s) crítico(s)</strong>, <strong>${warnings} alerta(s)</strong> e <strong>${tips} ponto(s) positivo(s)</strong> no seu protocolo.</p>
      </div>
    </div>
  `;
  
  // Pontos cegos (dangers first)
  const dangerInsights = insights.filter(i => i.type === 'danger');
  if (dangerInsights.length > 0) {
    html += `<div class="analysis-section-title">🔴 Pontos Cegos Críticos</div>`;
    dangerInsights.forEach(insight => { html += renderInsightCard(insight); });
  }
  
  // Warnings
  const warningInsights = insights.filter(i => i.type === 'warning');
  if (warningInsights.length > 0) {
    html += `<div class="analysis-section-title">⚠️ Alertas</div>`;
    warningInsights.forEach(insight => { html += renderInsightCard(insight); });
  }
  
  // Tips
  const tipInsights = insights.filter(i => i.type === 'tip');
  if (tipInsights.length > 0) {
    html += `<div class="analysis-section-title">✅ Pontos Positivos</div>`;
    tipInsights.forEach(insight => { html += renderInsightCard(insight); });
  }
  
  // Info / Provocative
  const infoInsights = insights.filter(i => i.type === 'info');
  if (infoInsights.length > 0) {
    html += `<div class="analysis-section-title">💡 Reflexões</div>`;
    infoInsights.forEach(insight => { html += renderInsightCard(insight); });
  }
  
  html += `</div>`;
  
  chatContainer.insertAdjacentHTML('beforeend', html);
  
  // Final bot message
  const finalMsg = score >= 70
    ? `🏆 **Bom trabalho, Memorável!** Seu protocolo está bem preenchido. Trabalhe os pontos sinalizados acima e lembre-se de definir seu Guardião da Decisão. _"Parabéns, você merece e não pare!"_`
    : score >= 40
    ? `💪 **Tá no caminho, Memorável!** Mas tem pontos cegos importantes que precisam de atenção. Revise as áreas sinalizadas em vermelho e amarelo. Aprofunde suas respostas e seja mais específico nas ações e prazos.`
    : `🔥 **Atenção, Memorável!** Seu protocolo precisa de mais trabalho. Vários pontos cegos foram detectados. Isso não é ruim — é justamente para isso que o protocolo serve: para REVELAR o que você não está enxergando. Volte ao protocolo, aprofunde cada resposta, e rode novamente.\n\n_"Aqui nós vamos acreditar em você, mesmo que você não acredite."_ — Elton Euler`;
  
  addBotMessage(finalMsg + `\n\nQuer **analisar novamente** ou **rodar um protocolo completo**?`);
  
  // Re-add the form below for easy re-analysis
  const reAnalyzeHTML = `
    <div class="analysis-form" style="margin-top: 16px;">
      <textarea class="analysis-textarea" id="analysisText" placeholder="Cole ou escreva outro protocolo para analisar...">${escapeHTML(originalText)}</textarea>
      <button class="analysis-submit-btn" onclick="runAnalysis()" id="analysisSubmitBtn">🧠 Analisar Novamente</button>
    </div>
  `;
  chatContainer.insertAdjacentHTML('beforeend', reAnalyzeHTML);
  
  scrollToBottom();
}

function renderInsightCard(insight) {
  return `
    <div class="insight-card ${insight.type}">
      <div class="insight-header">
        <span class="insight-icon">${insight.icon}</span>
        <span class="insight-title">${insight.title}</span>
      </div>
      <div class="insight-body">${insight.body}</div>
      ${insight.quote ? `<div class="insight-quote">${insight.quote}</div>` : ''}
    </div>
  `;
}
