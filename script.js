/* ================= ESTADO ================= */

let carrinho = [];
let produtos = JSON.parse(localStorage.getItem("produtos")) || [];
let total = 0;

/* ================= ELEMENTOS ================= */

const lista = document.getElementById("lista");
const totalEl = document.getElementById("total");
const orcamentoEl = document.getElementById("orcamento");
const deslocamentoEl = document.getElementById("deslocamento");
const listaConsumo = document.getElementById("listaConsumo");
const formCompra = document.getElementById("formCompra");
const status = document.getElementById("status");

/* ================= SALVAR ================= */

function salvarProdutos() {
  localStorage.setItem("produtos", JSON.stringify(produtos));
}

/* ================= ATUALIZAR TELA ================= */

function atualizarTela() {
  lista.innerHTML = "";
  total = 0;

  carrinho.forEach((item, index) => {
    total += item.preco;

    const li = document.createElement("li");
    li.innerHTML = `
      ${item.nome} (${item.unidade}) - R$ ${item.preco.toFixed(2)}
      <button onclick="removerItem(${index})">❌</button>
    `;
    lista.appendChild(li);
  });

  totalEl.textContent = "R$ " + total.toFixed(2);
}

function removerItem(index) {
  carrinho.splice(index, 1);
  atualizarTela();
}

/* ================= NOVA COMPRA ================= */

function novaCompra() {
  carrinho = [];
  atualizarTela();
  orcamentoEl.textContent = "R$ 0,00";
  deslocamentoEl.textContent = "R$ 0,00";
}

/* ================= VOZ ================= */

let recognition;

function startVoice() {

  if (!('webkitSpeechRecognition' in window)) {
    alert("Seu navegador não suporta reconhecimento de voz.");
    return;
  }

  recognition = new webkitSpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.start();
  status.textContent = "🎤 Ouvindo...";

  recognition.onresult = function(event) {
    const texto = event.results[0][0].transcript.toLowerCase();
    status.textContent = "Você disse: " + texto;
    interpretarComando(texto);
  };

  recognition.onend = function() {
    status.textContent = "Pronto para ouvir...";
  };
}

/* ================= INTELIGÊNCIA DE COMANDO ================= */

function interpretarComando(texto) {

  // NOVA COMPRA
  if (texto.includes("nova compra")) {
    novaCompra();
    return;
  }

  // CADASTRAR PRODUTO
  // exemplo: cadastrar arroz unidade quilo
  if (texto.includes("cadastrar")) {

    let partes = texto.replace("cadastrar", "").trim();
    let palavras = partes.split(" ");

    let nome = palavras[0];
    let unidade = "un";

    if (texto.includes("quilo") || texto.includes("kg")) unidade = "kg";
    if (texto.includes("litro")) unidade = "litro";
    if (texto.includes("pacote")) unidade = "pacote";

    produtos.push({
      nome: nome,
      unidade: unidade
    });

    salvarProdutos();
    alert("Produto cadastrado: " + nome);
    return;
  }

  // ADICIONAR AO CARRINHO
  // exemplo: adicionar arroz 25 reais
  if (texto.includes("adicionar")) {

    let nomeEncontrado = null;

    produtos.forEach(prod => {
      if (texto.includes(prod.nome)) {
        nomeEncontrado = prod;
      }
    });

    if (!nomeEncontrado) {
      alert("Produto não cadastrado.");
      return;
    }

    let numero = texto.match(/\d+([.,]\d+)?/);

    if (!numero) {
      alert("Fale também o preço.");
      return;
    }

    let preco = parseFloat(numero[0].replace(",", "."));

    carrinho.push({
      nome: nomeEncontrado.nome,
      unidade: nomeEncontrado.unidade,
      preco: preco
    });

    atualizarTela();
    alert("Adicionado ao carrinho!");
    return;
  }
}

/* ================= CARREGAR PRODUTOS NA TELA ================= */

function carregarConsumo() {
  listaConsumo.innerHTML = "";

  if (produtos.length === 0) {
    listaConsumo.innerHTML = "<p style='color:#aaa;'>Nenhum produto cadastrado</p>";
    return;
  }

  produtos.forEach(prod => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${prod.nome}</strong> (${prod.unidade})
    `;
    listaConsumo.appendChild(div);
  });
}

/* ================= INICIAR ================= */

carregarConsumo();
atualizarTela();
