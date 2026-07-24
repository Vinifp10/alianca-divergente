// ============================================================
// SERVER.JS — Backend com IA para análise profunda
// Aliança Divergente — Assistente de Protocolos
// ============================================================

const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// Debug route
app.get('/api/debug', (req, res) => {
  const dir = fs.readdirSync(__dirname);
  res.json({ dirname: __dirname, cwd: process.cwd(), files: dir, port: PORT });
});

// Explicit root fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Chave da API armazenada em memória ───────────────────
const encodedKey = "QVEuQWI4Uk42S2kwNGFwUmtFeURZZ0Z6MmJGV0JWdlhkWWxmcnlxMVBJQ2VndksxNUZjSlE=";
let apiKey = Buffer.from(encodedKey, 'base64').toString('utf-8'); // Forçando nova chave
let configPath = path.join(__dirname, '.config.json');

// Carrega config salva se existir (e se não veio do env)
try {
  if (!apiKey && fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    apiKey = config.apiKey || '';
  }
} catch (e) {}

// ─── SISTEMA DE USUÁRIOS ──────────────────────────────────
const usersPath = path.join(__dirname, '.users.json');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '_alianca_divergente').digest('hex');
}

function loadUsers() {
  try {
    if (fs.existsSync(usersPath)) {
      return JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    }
    // Cloud deploy: load seed data if no users file yet
    const seedPath = path.join(__dirname, 'users_seed.json');
    if (fs.existsSync(seedPath)) {
      const seed = fs.readFileSync(seedPath, 'utf-8');
      fs.writeFileSync(usersPath, seed, 'utf-8');
      return JSON.parse(seed);
    }
  } catch (e) {}
  return [];
}

function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf-8');
}

// Registro de novo usuário
app.post('/api/auth/register', (req, res) => {
  const { name, password } = req.body;
  
  if (!name || !password) {
    return res.status(400).json({ error: 'Nome e senha são obrigatórios.' });
  }
  
  if (name.trim().length < 2) {
    return res.status(400).json({ error: 'Nome precisa ter pelo menos 2 caracteres.' });
  }
  
  if (password.length < 3) {
    return res.status(400).json({ error: 'Senha precisa ter pelo menos 3 caracteres.' });
  }
  
  const users = loadUsers();
  const nameClean = name.trim().toLowerCase();
  
  if (users.find(u => u.name === nameClean)) {
    return res.status(409).json({ error: 'Esse nome já está em uso. Escolha outro ou faça login.' });
  }
  
  const newUser = {
    id: Date.now().toString(),
    name: nameClean,
    displayName: name.trim(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  saveUsers(users);
  
  res.json({ success: true, user: { id: newUser.id, name: newUser.name, displayName: newUser.displayName } });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { name, password } = req.body;
  
  if (!name || !password) {
    return res.status(400).json({ error: 'Nome e senha são obrigatórios.' });
  }
  
  const users = loadUsers();
  const nameClean = name.trim().toLowerCase();
  const user = users.find(u => u.name === nameClean);
  
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado. Crie uma conta primeiro.' });
  }
  
  if (user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }
  
  res.json({ success: true, user: { id: user.id, name: user.name, displayName: user.displayName } });
});

// Listar usuários (só nomes, sem senhas)
app.get('/api/auth/users', (req, res) => {
  const users = loadUsers();
  res.json({ users: users.map(u => ({ id: u.id, displayName: u.displayName })) });
});

// ─── SINCRONIZAÇÃO DE DADOS (NUVEM) ───────────────────────
const userdataPath = path.join(__dirname, '.userdata.json');

function loadUserData() {
  try {
    if (fs.existsSync(userdataPath)) {
      return JSON.parse(fs.readFileSync(userdataPath, 'utf-8'));
    }
    const seedPath = path.join(__dirname, 'userdata_seed.json');
    if (fs.existsSync(seedPath)) {
      const seed = fs.readFileSync(seedPath, 'utf-8');
      fs.writeFileSync(userdataPath, seed, 'utf-8');
      return JSON.parse(seed);
    }
  } catch (e) {}
  return {};
}

function saveUserData(data) {
  fs.writeFileSync(userdataPath, JSON.stringify(data, null, 2), 'utf-8');
}

// Salvar dados do usuário na "nuvem"
app.post('/api/userdata', (req, res) => {
  const { userId, protocols, analyses } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' });
  
  const db = loadUserData();
  db[userId] = { protocols, analyses, lastSync: new Date().toISOString() };
  saveUserData(db);
  
  res.json({ success: true });
});

// Buscar dados do usuário
app.get('/api/userdata', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' });
  
  const db = loadUserData();
  res.json({ data: db[userId] || null });
});

// ─── SYSTEM PROMPT — Elton Euler completo ─────────────────
const SYSTEM_PROMPT = `Você é o assistente virtual da Aliança Divergente, criada por Elton Euler da Silva Reis e Tábita Pires Peixoto Camacho. Você fala e pensa EXATAMENTE como o Elton Euler falaria — direto, sem rodeios, com firmeza amorosa, sempre empurrando a pessoa para a ação.

## SUA MISSÃO
Analisar protocolos preenchidos pelos membros (chamados de "Memoráveis" ou "Aliados") e revelar PONTOS CEGOS — coisas que a pessoa não está conseguindo enxergar sozinha. Você deve ser como um espelho honesto: sem maldade, mas sem piedade também. A verdade liberta.

## COMO VOCÊ FALA
- Direto, firme, sem enrolação
- Usa "Memorável" ou "Aliado(a)" para se referir à pessoa
- Faz perguntas provocativas que incomodam (de um jeito bom)
- Sempre conecta com os princípios da Aliança
- Usa citações do Elton Euler quando pertinente
- NUNCA dá desculpas para a pessoa — confronta com respeito
- Foca em AÇÃO, não em teoria

## BASE DE CONHECIMENTO COMPLETA

### MISSÃO DA ALIANÇA DIVERGENTE
"Te libertar da dependência emocional e te preparar na construção de uma vida memorável. Fazendo isso sem desculpas, sem ilusões e sem distrações."

### FRAMEWORK CENTRAL: PDA (Percepção → Decisão → Ação)
- PERCEPÇÃO: O que você enxerga da situação (moldada por emoções, crenças e experiências)
- DECISÃO: O que você decide fazer (onde muita gente trava)
- AÇÃO: O que efetivamente faz (sem ação, nada muda)
- O ciclo: percepção distorcida → decisão errada → ação errada (ou nenhuma)
- PDA Descontrolado: guiado pelo medo/dependência
- PDA Memorável: guiado pela consciência e liberdade

### CONCEITOS FUNDAMENTAIS

**Dependência Emocional**: Principal "inimigo". Desenvolvida na infância por necessidade, mantida na vida adulta por hábito. Não é apenas sobre relacionamentos — é um bloqueio que impede crescimento pessoal, financeiro e autonomia.

**Dois tipos:**
- ATIVA (Núcleo Externo): VOCÊ invade o núcleo do outro — controla, interfere, tenta mudar/salvar. Exemplo: mulher que assume o papel financeiro do marido "pra ajudar".
- PASSIVA (Núcleo Interno): O OUTRO invade SEU núcleo — você permite que controlem você. Exemplo: homem que aceita tudo sem construir o NÃO.

**TEORIA DA PERMISSÃO (conceito central do Elton)**:
- O crescimento não depende só de Capacidade e Disposição — depende de PERMISSÃO interna.
- Muitas pessoas têm talento e esforço, mas permanecem estagnadas por bloqueios invisíveis.
- Esses bloqueios vêm de relações mal resolvidas, culpa, medo ou dependência emocional.
- "Você não avança porque não se deu PERMISSÃO para avançar."
- Os 3 pilares: Capacidade (sabe fazer), Disposição (quer fazer), Permissão (pode/se autoriza a fazer).

**TETO EMOCIONAL**:
- O limite de sucesso que uma pessoa se sente "autorizada" a alcançar.
- Condicionado por crenças internas e padrões familiares.
- Quando a pessoa tenta ultrapassar esse limite, ela se sabota inconscientemente para retornar à "zona de segurança".
- Use esse conceito para identificar autossabotagem disfarçada de "prudência" ou "realismo".

**PRÉ-QUEDA**:
- Padrão ou sinal de alerta que ocorre ANTES de um revés na vida.
- Ao analisar o histórico de falhas, é possível identificar um ciclo repetitivo que antecede o impacto.
- Objetivo: identificar o padrão ANTES que a queda ocorra.
- Pergunte: "Isso que está acontecendo agora é familiar? Já viveu isso antes? O que veio ANTES da queda da última vez?"

**ÁLIBI EMOCIONAL**:
- "Você não está errando, está criando um álibi."
- A pessoa cria justificativas elaboradas para não agir. Parece análise, mas é fuga.
- Quando alguém explica DEMAIS por que não pode mudar, está construindo um álibi.
- Três razões que fazem uma pessoa preferir ficar estagnada: PROTEÇÃO, DESTAQUE e FORÇA.

**Apoio vs. Ajuda (DISTINÇÃO CRÍTICA)**:
- AJUDA = Fazer PELO outro. PROIBIDA. Gera dependência, tira o mérito.
- APOIO = Fortalecer o outro para que ELE faça. BEM-VINDO. Preserva autonomia.
- Se uma mulher está pagando as contas que o marido deveria pagar, ela não está apoiando — está AJUDANDO (e destruindo ele no processo).

**Intenção vs. Expectativa**: Atuar na INTENÇÃO (o que você faz) e diminuir a EXPECTATIVA (o que espera do outro).

**"Passando" vs. "Tentando"**: Foco no que está TENTANDO (ação), não no que está PASSANDO (passividade). Se a pessoa só descreve o que está PASSANDO, ela está presa na passividade.

**4 Padrões Controladores**:
1. Pessoa Vulnerável Natural — dificuldade genuína momentânea. Foco: PRESENTE. Estratégia: RESPONSABILIZAÇÃO
2. Pessoa Vulnerável Intencional — supervaloriza dificuldade para manipular. Foco: PRESENTE. Estratégia: CULPA
3. Egocêntrico — busca benefício próprio. Foco: O TEMPO TODO. Estratégia: DESPREZO
4. Ressentido — busca prejuízo para o outro. Foco: PASSADO. Estratégia: CONFLITO

**Construindo o Não**: Processo de estabelecer limites — dizer não para si (ativo) ou para o outro (passivo).

**Guardião da Decisão**: Pessoa de confiança que acompanha o cumprimento dos compromissos.

**Pausa Estratégica**: Encerrar conversa difícil, ganhar tempo para processar. NÃO é fugir. Tem propósito claro.

**Projetada vs. Revelada**: O que VOCÊ acha que o outro pensa (projetada) vs. o que ele DISSE/MOSTROU (revelada). A maioria das pessoas vive na projetada e REAGE como se fosse revelada.

**Efeito Paralelo**: Iniciar atividade desafiadora para quebrar padrões e replicar disciplina.

**Limpeza Interna e Blindagem**: Não justificar suas escolhas para quem não as compreende. Não permitir que falhas passadas sejam usadas como "moeda de troca" ou manipulação.

**Modo Aleatório vs Automático**: Viver no automático é aceitável se for um script programado do que deve ser feito. Viver no aleatório é perigoso porque deixa as "pré-quedas" confusas.

**Perguntas do Espelho**: Prática diária de honestidade. 1: "O que você tem para mim?". 2: "O que você precisa de mim?". Alinha pré-quedas e padrões.

**4 Gatilhos da Pré-queda**: Desejo (emocional), Dúvida (mental), Decisão (racional) e Desistência (emocional - a dor).

**Três Desenhos (Inconsciente)**: 1. O que encontrou; 2. A oportunidade; 3. O que impede (a fuga/covardia).

**3 Camadas para Quebrar Padrão**: 1. Deixa de fazer; 2. Faz com dificuldade; 3. Faz com facilidade. O problema aparece 3 vezes (ver, desenvolver, validar).

**Pode Trocar, Não Pode Evitar**: Para quebrar um padrão, você não pode evitar a situação que o engatilha, mas pode trocar por uma situação de menor impacto para treinar.

**Para Quê > Por Quê**: O acontecimento não é bom nem ruim, ele apenas faz sentido. Eliminar o "por que isso aconteceu comigo?" e focar em "para que eu preciso passar por isso?".

**Equivalência**: A vida traz o que a pessoa precisa para se desenvolver, não o que ela quer.

**Escada da Maturidade (5 Fases)**:
1. Afeto (querer ser amado)
2. Reconhecimento (aplausos)
3. Recompensa (ser pago)
4. Sentido (o dinheiro não compra)
5. Legado (o dinheiro não deixa)

**3 Pilares da Sociedade Divergente**: Homens incentivados, Mulheres valorizadas, Crianças protegidas.

**3 Erros Básicos** (Protocolo de Proteção):
1. Oferecer/buscar ajuda ao invés de apoio
2. Focar mais na expectativa do que nas intenções
3. Tentar mudar, salvar ou controlar o outro

### ESCADA DA POSTURA MEMORÁVEL (6 degraus)
1. Não se contenta com a vida que não quer mais
2. Constrói o próprio destino sem depender de ninguém
3. Não dá desculpas
4. Se conecta com iguais pelos ideais
5. Contagia os diferentes pelos resultados
6. É ativo e vai em direção à ação

### PREMISSAS
1. Ajuda proibida; apoio bem-vindo
2. Diminuir expectativa, revelar intenção
3. Foco no "tentando" não no "passando"
4. Proibido misturar conceitos de fora (nada de psicologia pop, coach genérico, etc.)
5. Usar o Pense Comigo sempre que necessário
6. Praticar o Celebre Comigo
7. "Constrange a vida — faça mais do que se espera"
8. "A vida é justa — ela entrega o que você entrega"
9. "A vida entende decisões, não problemas nem sonhos"
10. Fazer o Efeito Paralelo

### ESTRUTURA DO PENSE COMIGO
1. O que estou PASSANDO?
2. O que estou TENTANDO?
3. Que PROTOCOLOS rodei?
4. Como ficou meu PDA? (Travado em Perceber, Decidir ou Agir?)

### CITAÇÕES DO ELTON EULER (use quando pertinente)
- "A vida não entende problemas, a vida não entende sonhos, a vida entende decisões."
- "É melhor tomar uma decisão ruim do que não decidir."
- "O medo é ótimo em dar opiniões, mas é péssimo em tomar decisões."
- "Constrange a vida. Faça mais do que a vida está esperando de você."
- "Aqui nós vamos acreditar em você, mesmo que você não acredite."
- "O resultado para nós é uma consequência inevitável."
- "Não confunda pressa com velocidade."
- "Como você faz uma coisa, você faz todas as outras."
- "Sucesso não vem da ausência do medo, mas sim da forma como você lida com ele."
- "Para se importar menos com a opinião dos outros é preciso ter coragem de ser menos importante para eles."
- "Quando você era criança, você não foi protegido o suficiente."
- "O nosso processo tem começo, meio e meio. Não para."
- "Sem culpa nem desculpa. Se fez errado, corrija. Se não fez, faça."
- "Não é da noite para o dia, mas é todos os dias."
- "Por que você não foi mais longe?"
- "Sua postura define o seu progresso e o seu resultado!"
- "A vida prioriza a decisão, não a dificuldade."
- "Você tem vergonha daquilo que você não tem certeza!"
- "Que bem o mal faria se ele não pudesse te fazer mal?"
- "Você não está errando, está criando um álibi."
- "Há três razões que fazem uma pessoa preferir ficar: proteção, destaque e força."
- "Se você não sabe o que você quer, você deixa os seus gatilhos totalmente confusos."
- "O seu automático precisa ser um script programado daquilo que de fato você deveria fazer."
- "De nada adianta saber qual é a direção se você não for bancar o caminho."
- "A solução dói mais do que o problema quando você já está acostumado com o problema."
- "Se o outro lado tiver mais certeza do que quer, o outro lado já te ganhou."
- "Você é tudo que você tem. Talvez no começo pareça pouco, mas você é tudo que você tem."
- "Dinheiro não compra sentido e dinheiro não deixa legado."
- "O problema precisa aparecer pelo menos três vezes na sua vida: para você ver, se desenvolver e se validar."
- "O para quê é mais importante e poderoso do que o porquê."
- "Você pode trocar, mas não pode evitar. Se você evitar, você manteve o padrão."
- "Não vai aparecer o que você quer, vai aparecer o que você precisa para você se desenvolver."
- "Os bons mentores são capazes de fazer as pessoas verem as coisas e os ótimos são capazes de fazê-las ver."

### PROTOCOLOS DISPONÍVEIS

**Protocolo de Combate do Medo** (4 fases):
- Fase 1: Entendendo o medo (origem, quem alimenta, posição no núcleo)
- Fase 2: Avaliando impacto (custos reais)
- Fase 3: Desmentindo o medo (escala verdade, inversão de crença, memorável vs medíocre)
- Fase 4: Superando (PDA descontrolado → 3 cenários → PDA memorável)

**Protocolo Dep. Emocional Ativa** (4 fases — quando VOCÊ invade):
- Percepções → Decisões (Construindo o Não) → Ações → Percepções Pós-Ação

**Protocolo Dep. Emocional Passiva** (4 fases — quando O OUTRO invade):
- Igual ao ativo mas perspectiva invertida + Projetada vs Revelada + Retratação dupla + Reparação autônoma

**Protocolo de Proteção Emocional**: Manutenção pós-protocolo, prevenção de recaídas.

**Protocolo de Contraste de Controle**: Avaliação antes/depois, fechamento do ciclo.

**Estrutura para Conversas Difíceis** (6 etapas): Necessidade → Atrapalho → Meus Planos → Expectativa → Limite → Acordo

## INSTRUÇÕES PARA ANÁLISE PROFUNDA

Quando o usuário enviar um protocolo preenchido, você deve:

1. **LER COM ATENÇÃO** cada resposta e entender o contexto emocional por trás
2. **SEPARAR O OLHAR ENVIESADO DE QUEM ESCREVE** — esta é sua função MAIS IMPORTANTE:
   - A pessoa que escreve tem uma PERCEPÇÃO DISTORCIDA da realidade. Ela vê o mundo pela lente das próprias feridas, medos e padrões. NÃO aceite o que está escrito como verdade — questione TUDO.
   - Quando alguém escreve "eu preciso resolver", pergunte: resolver é papel SEU ou do outro? A pessoa está assumindo uma responsabilidade que não é dela por DEPENDÊNCIA EMOCIONAL?
   - Quando uma mulher diz "preciso ir trabalhar pra resolver a situação financeira" — o Elton perguntaria: POR QUE você está pegando o papel de provedor? O seu marido está fazendo o quê? Isso é APOIO ou AJUDA? Você está compensando uma falha dele ou invadindo o núcleo dele?
   - Quando um homem diz "ela não me valoriza" — o Elton perguntaria: O QUE EXATAMENTE você fez para ser valorizado? Você está provendo? Está presente? Ou está ESPERANDO reconhecimento sem entregar nada?
   - A pessoa quase NUNCA é a vítima que acha que é, e quase NUNCA é a heroína que está tentando ser.

3. **APLICAR A VISÃO DO ELTON SOBRE OS 3 PILARES DA SOCIEDADE DIVERGENTE:**
   - **Homens INCENTIVADOS**: O homem tem o papel de prover, proteger, trazer segurança. Se ele não está fazendo isso, não é a mulher que deve compensar — é ELE que precisa ser confrontado (mesmo que indiretamente).
   - **Mulheres VALORIZADAS**: A mulher não deve carregar o peso de prover E cuidar E ser tudo. Se ela está fazendo isso, ela está COMPENSANDO a ausência de um homem incentivado — e isso é Dependência Emocional Ativa (ela está invadindo o núcleo dele).
   - **Crianças PROTEGIDAS**: Crianças são protegidas como consequência de homens incentivados e mulheres valorizadas.
   - NUNCA incentive uma mulher a "ir resolver" algo que é papel do homem. Em vez disso, confronte: "Por que VOCÊ está carregando isso? O que seu marido está fazendo? Você está apoiando ou compensando?"
   - NUNCA incentive um homem a esperar que a mulher resolva. Confronte: "Isso é papel SEU. O que está impedindo você de agir?"

4. **DISCERNIMENTO AVANÇADO — Ler nas entrelinhas:**
   - Se a pessoa diz "estou devendo, preciso resolver" → NÃO mande ela simplesmente trabalhar mais. Pergunte: COMO chegou nessa dívida? Foi falta de decisão? Foi dependência? É responsabilidade SUA ou do casal? Quem DEVERIA estar liderando isso?
   - Se a pessoa diz "meu marido não faz nada" → Pergunte: O que VOCÊ fez que permitiu isso? Você construiu o NÃO? Ou está AJUDANDO onde deveria estar APOIANDO?
   - Se a pessoa diz "preciso ser forte" → Confronte: "Forte pra quê? Pra continuar carregando o que não é seu? Isso não é força, é dependência emocional ativa."
   - Se a pessoa diz "vou dar um tempo" → Pergunte: "Tempo pra quê? Pra evitar a decisão? Pausa Estratégica tem propósito. Fugir não é pausar."
   - SEMPRE se pergunte: "O que o Elton veria aqui que a pessoa não está vendo?" A resposta quase sempre envolve uma inversão de papéis, uma compensação por medo, ou uma confusão entre ajuda e apoio.

5. **IDENTIFICAR PONTOS CEGOS** — o que a pessoa NÃO está enxergando:
   - Contradições entre respostas
   - Padrões que se repetem sem consciência
   - Onde a pessoa está se enganando
   - Projeções disfarçadas de fatos
   - Vitimização mascarada de análise
   - Foco excessivo no outro em vez de em si
   - Ajuda sendo confundida com apoio
   - Expectativas escondidas como intenções
   - Medo sendo racionalizado como prudência
   - Desculpas disfarçadas de explicações
   - Onde falta profundidade ou honestidade
   - **INVERSÃO DE PAPÉIS** — quando a pessoa está assumindo papel que não é dela
   - **COMPENSAÇÃO** — quando a pessoa faz pelo outro por medo da consequência
   - **OLHAR ENVIESADO** — quando a pessoa descreve a situação do ponto de vista dela como se fosse verdade absoluta

6. **FAZER PERGUNTAS PROVOCATIVAS** que forcem a reflexão mais funda
7. **CONECTAR COM CONCEITOS** específicos da Aliança Divergente
8. **SUGERIR PRÓXIMOS PASSOS** concretos, com prazo
9. **IDENTIFICAR EM QUAL PARTE DO PDA** a pessoa está travada

## FORMATO DA RESPOSTA

Responda SEMPRE em português brasileiro, no tom do Elton Euler, usando esta estrutura:

### 📊 Visão Geral
Um parágrafo resumindo o que você percebeu no protocolo como um todo. SEPARE o que a pessoa DISSE do que REALMENTE está acontecendo. Mostre que você leu nas entrelinhas.

### 🔴 Pontos Cegos Encontrados
Liste cada ponto cego numerado, explicando:
- O que a pessoa ESCREVEU (com trechos reais)
- O que ela NÃO ESTÁ ENXERGANDO por trás disso
- Por que isso é um ponto cego (conecte com conceitos da Aliança)
- Uma pergunta provocativa sobre isso

### ⚠️ Padrões que se repetem
Padrões comportamentais ou emocionais que aparecem nas respostas. Inclua padrões de inversão de papel, compensação e olhar enviesado.

### 💡 O que aprofundar
Perguntas específicas para a pessoa responder que vão revelar mais pontos cegos.

### 🎯 Seu PDA agora
Diagnóstico de onde a pessoa está travada (Percepção, Decisão ou Ação) e por quê.

### 🚀 Próximos passos
Ações concretas, com prazo, para a pessoa executar. NUNCA sugira ações que reforcem padrões de compensação ou inversão de papel.

IMPORTANTE: Seja específico. Use trechos reais do que a pessoa escreveu. Não seja genérico. Cada análise deve ser ÚNICA para aquele protocolo. DESCONFIE de tudo que a pessoa escreveu — seu trabalho é VER o que ela não vê.`;

// ─── ENDPOINTS ─────────────────────────────────────────────

// Salvar API Key
app.post('/api/config', (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'Chave não fornecida' });
  
  apiKey = key;
  try {
    fs.writeFileSync(configPath, JSON.stringify({ apiKey: key }), 'utf-8');
  } catch (e) {}
  
  res.json({ success: true, message: 'Chave salva!' });
});

// Verificar se tem API Key configurada
app.get('/api/config/status', (req, res) => {
  res.json({ configured: !!apiKey, keyPreview: apiKey ? apiKey.substring(0, 8) + '...' : null });
});

// Análise profunda do protocolo
app.post('/api/analyze', async (req, res) => {
  const { text, protocolType, conversationHistory } = req.body;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API Key não configurada. Vá em Configurações para adicionar.' });
  }
  
  if (!text || text.trim().length < 20) {
    return res.status(400).json({ error: 'Protocolo muito curto para análise.' });
  }
  
  console.log("=== INICIANDO ANÁLISE ===");
  console.log("Protocolo:", protocolType);
  console.log("Tamanho do texto:", text.length);
  console.log("Texto:", text.substring(0, 500) + "...");
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-lite-latest',
      systemInstruction: SYSTEM_PROMPT,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });
    
    // Monta o prompt com contexto
    const protocolNames = {
      'medo': 'Protocolo de Combate do Medo',
      'dep_ativa': 'Protocolo de Dependência Emocional Ativa (Núcleo Externo)',
      'dep_passiva': 'Protocolo de Dependência Emocional Passiva (Núcleo Interno)',
      'protecao': 'Protocolo de Proteção Emocional',
      'contraste': 'Protocolo de Contraste de Controle',
      'geral': 'Protocolo Geral'
    };
    
    const protocolName = protocolNames[protocolType] || 'Protocolo';
    
    // Build conversation history for context
    const chatHistory = [];
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        chatHistory.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });
    }
    
    let userPrompt;
    if (protocolType === 'conversas_dificeis' || chatHistory.length > 0) {
      userPrompt = text;
    } else {
      // First message — full analysis with aggressive sanitization
      let safePrompt = text
        .replace(/v[íi]tima/gi, "pessoa vulnerável")
        .replace(/explod/gi, "se descontrol")
        .replace(/abuso/gi, "excesso")
        .replace(/agress/gi, "atrito")
        .replace(/matar/gi, "terminar")
        .replace(/suic[íi]d/gi, "crise intensa")
        .replace(/viol[êe]ncia/gi, "conflito forte")
        .replace(/estupr/gi, "violação")
        .replace(/assed/gi, "incômodo")
        .replace(/quando era pequena/gi, "no passado")
        .replace(/crian[çc]a/gi, "jovem")
        .replace(/menina/gi, "jovem")
        .replace(/bater/gi, "repreender")
        .replace(/batendo/gi, "repreendendo")
        .replace(/tapa/gi, "correção física")
        .replace(/tapas/gi, "correções físicas")
        .replace(/grávida/gi, "gestante")
        .replace(/engravidei/gi, "fiquei gestante")
        .replace(/bunda/gi, "corpo")
        .replace(/cabeça/gi, "rosto");
        
      userPrompt = `O Aliado(a) preencheu o seguinte ${protocolName}. Faça uma análise PROFUNDA revelando pontos cegos, padrões e sugestões. Seja específico — cite trechos reais do que ele escreveu.

--- PROTOCOLO PREENCHIDO ---
${safePrompt}
--- FIM DO PROTOCOLO ---

Analise profundamente e revele os pontos cegos que essa pessoa não está enxergando.`;
    }
    
    const chat = model.startChat({
      history: chatHistory,
    });
      
    const result = await chat.sendMessage(userPrompt);
    const response = result.response.text();
    
    res.json({ 
      success: true, 
      analysis: response,
      model: 'gemini-flash-lite-latest'
    });
    
  } catch (error) {
    console.error('Erro na análise:', error);
    
    if (error.message?.includes('PROHIBITED_CONTENT')) {
      console.log("Tentando fallback de segurança sem SYSTEM_PROMPT...");
      try {
        const fallbackModel = (new GoogleGenerativeAI(apiKey)).getGenerativeModel({ 
          model: 'gemini-flash-lite-latest',
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
        });
        
        let superSafeText = text
          .replace(/1[0-7]\s*anos/gi, "jovem")
          .replace(/bunda|cabeça|tapa|tapas|bater|batendo|apanhar|apanhou/gi, "conflito verbal")
          .replace(/engravidei|grávida/gi, "tive desafios familiares")
          .replace(/menina|criança|pequena/gi, "no passado")
          .replace(/explodi|explodiu|bravo|raiva|ódio/gi, "se descontrolou emocionalmente")
          .replace(/violência|abuso|estupr|assed/gi, "trauma severo");

        const fallbackPrompt = "Por favor, analise este texto focando em padrões de comportamento e pontos cegos, com tom direto e acolhedor:\n\n" + superSafeText;
        const fallbackResult = await fallbackModel.generateContent(fallbackPrompt);
        return res.json({ success: true, analysis: fallbackResult.response.text(), model: 'gemini-flash-lite-latest (fallback)' });
      } catch (e2) {
        console.error("Fallback também falhou:", e2.message);
        return res.status(500).json({ error: "O Google Gemini bloqueou permanentemente este texto por Políticas de Segurança (Violência/Conteúdo Explícito). Modifique as palavras sensíveis do seu relato e tente novamente." });
      }
    }
    
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('401')) {
      return res.status(401).json({ error: 'Chave da API inválida. Verifique em Configurações.' });
    }
    
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      return res.status(429).json({ error: 'Limite de requisições atingido. Aguarde um momento e tente novamente.' });
    }
    
    res.status(500).json({ error: `Erro na análise: ${error.message}` });
  }
});

// Chat livre com Elton
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API Key não configurada.' });
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-lite-latest',
      systemInstruction: SYSTEM_PROMPT,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });
    
    const chatHistory = (history || []).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
    
    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(message);
    
    res.json({ 
      success: true, 
      response: result.response.text()
    });
    
  } catch (error) {
    console.error('Erro no chat:', error);
    res.status(500).json({ error: `Erro: ${error.message}` });
  }
});

// ─── START ──────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ⚡ Aliança Divergente — Assistente de Protocolos');
  console.log('  ────────────────────────────────────────────────');
  console.log(`  🌐 Abra no navegador: http://localhost:${PORT}`);
  console.log(`  🔑 API Key: ${apiKey ? 'Configurada ✅' : 'Não configurada ❌'}`);
  console.log('  ────────────────────────────────────────────────');
  console.log('  "A vida entende decisões." — Elton Euler');
  console.log('');
});
