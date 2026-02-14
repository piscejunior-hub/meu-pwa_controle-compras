/* ================= ESTADO GLOBAL ================= */

let state = {
  modo: "esperando",
  orcamento: 0,
  deslocamento: 0,
  carrinho: []
};

let recognition = null;
let ouvindo = false;

/* ================= ELEMENTOS DOM ================= */

const statusEl = document.getElementById("status");
const listaEl = document.getElementById("lista");
const totalEl = document.getElementById("total");
const orcamentoEl = document.getElementById("orcamento");
const deslocamentoEl = document.getElementById("deslocamento");

/* ================= PERSISTÊNCIA ================= */

function salvarDados() {
  localStorage.setItem("assistenteCompras", JSON.stringify(state));
}

function carregarDados() {
  const dados = localStorage.getItem("assistenteCompras");
  if (dados) {
    state = JSON.parse(dados);
  }
}

/* ================= UTIL ================= */

function formatarMoeda(valor) {
  return "R$ " + valor.toFixed(2);
}

function extrairNumero(texto) {
  const match = texto.match(/(\d+[.,]?\d*)/);
  if (match) {
    return parseFloat(match[1].replace(",", "."));
  }
  return 0;
}

/* ================= VOZ ================= */

function iniciarReconhecimento() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Seu navegador não suporta reconhecimento de voz.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = function (event) {
    const texto = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
    statusEl.textContent = "Você disse: " + texto;
    interpretarComando(texto);
  };

  recognition.onerror = function (e) {
    console.error(e);
    statusEl.textContent = "Erro no reconhecimento.";
  };

  recognition.onend = function () {
    if (ouvindo) {
      recognition.start(); // mantém contínuo
    }
  };
}

function startVoice() {
  if (!recognition) iniciarReconhecimento();

  if (!ouvindo) {
    recognition.start();
    statusEl.textContent = "🎤 Ouvindo...";
    ouvindo = true;
  } else {
    recognition.stop();
    statusEl.textContent = "Reconhecimento parado.";
    ouvindo = false;
  }
}

/* ================= INTERPRETAÇÃO ================= */

function interpretarComando(texto) {

  if (texto.includes("iniciar compra")) {
    state = {
      modo: "compra_iniciada",
      orcamento: 0,
      deslocamento: 0,
      carrinho: []
    };
    atualizarTela();
    statusEl.textContent = "Compra iniciada.";
    return;
  }

  if (texto.includes("orçamento")) {
    const valor = extrairNumero(texto);
    if (valor > 0) {
      state.orcamento = valor;
      atualizarTela();
    }
    return;
  }

  if (texto.includes("deslocamento")) {
    const valor = extrairNumero(texto);
    if (valor > 0) {
      state.deslocamento = valor;
      atualizarTela();
    }
    return;
  }

  if (texto.includes("remover")) {
    const nome = texto.replace("remover", "").trim();
    state.carrinho = state.carrinho.filter(item => !item.nome.includes(nome));
    atualizarTela();
    statusEl.textContent = `${nome} removido.`;
    return;
  }

  if (texto.includes("encher carrinho")) {
    state.modo = "enchendo";
    statusEl.textContent = "Modo carrinho ativado.";
    return;
  }

  if (texto.includes("finalizar compra")) {
    state.modo = "esperando";
    statusEl.textContent = "Compra finalizada.";
    return;
  }

  if (state.modo === "enchendo") {
    adicionarProdutoPorVoz(texto);
  }
}

/* ================= PRODUTO ================= */

function adicionarProdutoPorVoz(texto) {

  const precoMatch = texto.match(/(\d+[.,]?\d*)\s*(reais|real|r\$)?/);
  const qtdMatch = texto.match(/(\d+)\s*(pacote|pacotes|quilo|quilos|kg|unidade|unidades)/);

  const preco = precoMatch ? parseFloat(precoMatch[1].replace(",", ".")) : 0;
  const quantidade = qtdMatch ? parseInt(qtdMatch[1]) : 1;

  const nome = texto.replace(/(\d+[.,]?\d*).*$/, "").trim();

  if (preco === 0) {
    statusEl.textContent = "Não consegui identificar o preço.";
    return;
  }

  state.carrinho.push({
    nome,
    preco,
    quantidade
  });

  atualizarTela();
}

/* ================= TELA ================= */

function atualizarTela() {
  listaEl.innerHTML = "";
  let total = 0;

  state.carrinho.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.nome} - ${item.quantidade}x - ${formatarMoeda(item.preco)}`;
    listaEl.appendChild(li);

    total += item.preco * item.quantidade;
  });

  total += state.deslocamento;

  totalEl.textContent = formatarMoeda(total);
  orcamentoEl.textContent = formatarMoeda(state.orcamento);
  deslocamentoEl.textContent = formatarMoeda(state.deslocamento);

  // 🔥 Alerta de orçamento
  if (state.orcamento > 0 && total > state.orcamento) {
    totalEl.style.color = "#ff4b2b";
    statusEl.textContent = "⚠️ Orçamento ultrapassado!";
    if (navigator.vibrate) navigator.vibrate(300);
  } else {
    totalEl.style.color = "#00ff9d";
  }

  salvarDados();
}

/* ================= INICIALIZAÇÃO ================= */

carregarDados();
atualizarTela();
