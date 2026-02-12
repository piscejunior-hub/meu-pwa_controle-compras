let modo = "esperando";
let orcamento = 0;
let deslocamento = 0;
let carrinho = [];

const statusEl = document.getElementById("status");
const listaEl = document.getElementById("lista");
const totalEl = document.getElementById("total");
const orcamentoEl = document.getElementById("orcamento");
const deslocamentoEl = document.getElementById("deslocamento");

let recognition;

function iniciarReconhecimento() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Seu navegador não suporta reconhecimento de voz.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.continuous = true; // 🔥 agora contínuo
  recognition.interimResults = false;

  recognition.onresult = function(event) {
    const texto = event.results[event.results.length - 1][0].transcript.toLowerCase();
    console.log("Reconhecido:", texto);
    statusEl.textContent = "Você disse: " + texto;
    interpretarComando(texto);
  };

  recognition.onerror = function(e) {
    console.error(e);
    statusEl.textContent = "Erro no reconhecimento.";
  };

  recognition.start();
}

function startVoice() {
  if (!recognition) {
    iniciarReconhecimento();
  } else {
    recognition.start();
  }
}

function interpretarComando(texto) {

  if (texto.includes("iniciar compra")) {
    modo = "compra_iniciada";
    carrinho = [];
    orcamento = 0;
    deslocamento = 0;
    atualizarTela();
    statusEl.textContent = "Compra iniciada.";
    return;
  }

  if (texto.includes("orçamento")) {
    let valor = extrairNumero(texto);
    if (valor > 0) {
      orcamento = valor;
      atualizarTela();
    }
    return;
  }

  if (texto.includes("deslocamento")) {
    let valor = extrairNumero(texto);
    if (valor > 0) {
      deslocamento = valor;
      atualizarTela();
    }
    return;
  }

  if (texto.includes("encher carrinho")) {
    modo = "enchendo";
    statusEl.textContent = "Modo carrinho ativado.";
    return;
  }

  if (texto.includes("finalizar compra")) {
    modo = "esperando";
    statusEl.textContent = "Compra finalizada.";
    return;
  }

  if (modo === "enchendo") {
    adicionarProdutoPorVoz(texto);
  }
}

function extrairNumero(texto) {
  let match = texto.match(/(\d+[.,]?\d*)/);
  if (match) {
    return parseFloat(match[1].replace(",", "."));
  }
  return 0;
}

function adicionarProdutoPorVoz(texto) {

  let precoMatch = texto.match(/preço\s*(\d+[.,]?\d*)/);
  let qtdMatch = texto.match(/(\d+)\s*(pacote|pacotes|quilo|quilos|kg|unidade|unidades)/);

  let preco = precoMatch ? parseFloat(precoMatch[1].replace(",", ".")) : 0;
  let quantidade = qtdMatch ? parseInt(qtdMatch[1]) : 1;

  let nome = texto.split("preço")[0].trim();

  if (preco === 0) {
    statusEl.textContent = "Não consegui identificar o preço.";
    return;
  }

  carrinho.push({
    nome: nome,
    preco: preco,
    quantidade: quantidade
  });

  atualizarTela();
}

function atualizarTela() {
  listaEl.innerHTML = "";
  let total = 0;

  carrinho.forEach(item => {
    let li = document.createElement("li");
    li.textContent = `${item.nome} - ${item.quantidade}x - R$ ${item.preco.toFixed(2)}`;
    listaEl.appendChild(li);
    total += item.preco * item.quantidade;
  });

  total += deslocamento;

  totalEl.textContent = "R$ " + total.toFixed(2);
  orcamentoEl.textContent = "R$ " + orcamento.toFixed(2);
  deslocamentoEl.textContent = "R$ " + deslocamento.toFixed(2);
}
