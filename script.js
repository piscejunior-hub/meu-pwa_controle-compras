/* ================= CONFIG BANCO ================= */

const DB_NAME = "comprasDB";
const DB_VERSION = 9;
const STORE_ITENS = "itens";
const STORE_PRODUTOS = "produtos";

let db;

/* ================= INIT DB ================= */

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_ITENS)) {
        db.createObjectStore(STORE_ITENS, {
          keyPath: "id",
          autoIncrement: true
        });
      }

      if (!db.objectStoreNames.contains(STORE_PRODUTOS)) {
        db.createObjectStore(STORE_PRODUTOS, {
          keyPath: "nome"
        });
      }
    };
  });
}

/* ================= LIMPAR CARRINHO ================= */

function limparCarrinho() {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).clear().onsuccess = resolve;
  });
}

/* ================= CRUD ITENS ================= */

function addItem(nome, quantidade, preco) {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).add({
      nome,
      quantidade,
      preco
    }).onsuccess = resolve;
  });
}

function getItems() {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_ITENS, "readonly");
    tx.objectStore(STORE_ITENS).getAll()
      .onsuccess = e => resolve(e.target.result || []);
  });
}

/* ================= CRUD PRODUTOS ================= */

function addProduto(produto) {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_PRODUTOS, "readwrite");
    tx.objectStore(STORE_PRODUTOS).put(produto).onsuccess = resolve;
  });
}

function getProdutos() {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_PRODUTOS, "readonly");
    tx.objectStore(STORE_PRODUTOS).getAll()
      .onsuccess = e => resolve(e.target.result || []);
  });
}

/* ================= RENDER CARRINHO ================= */

async function renderList() {

  const lista = document.getElementById("lista");
  const totalEl = document.getElementById("total");

  lista.innerHTML = "";

  const itens = await getItems();
  let total = 0;

  itens.forEach(item => {
    const subtotal = item.quantidade * item.preco;
    total += subtotal;

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.nome}</strong><br>
      Qtd: ${item.quantidade} |
      Preço: R$ ${item.preco.toFixed(2)} |
      Subtotal: R$ ${subtotal.toFixed(2)}
    `;
    lista.appendChild(li);
  });

  totalEl.innerText = "R$ " + total.toFixed(2);
}

/* ================= FALAR ================= */

function falar(texto) {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "pt-BR";
  speechSynthesis.speak(utterance);
}

/* ================= MOSTRAR CONSUMO ================= */

function mostrarConsumo(listaProdutos) {

  const container = document.getElementById("listaConsumo");
  container.innerHTML = "";

  listaProdutos.forEach(item => {

    const div = document.createElement("div");

    div.innerHTML = `
      <strong>${item.nome}</strong><br>
      Quantidade recomendada: ${item.quantidade} ${item.unidade}<br>
      <button onclick="prepararCompra('${item.nome}', ${item.quantidade})">
        Comprar
      </button>
    `;

    container.appendChild(div);
  });
}

/* ================= PREPARAR COMPRA ================= */

function prepararCompra(nome, quantidade) {

  const form = document.getElementById("formCompra");

  form.innerHTML = `
    <h3>${nome}</h3>
    <p>Quantidade recomendada: ${quantidade}</p>

    <label>Quantidade que vai comprar:</label>
    <input type="number" id="qtdCompra" value="${quantidade}" min="0">

    <label>Preço unitário:</label>
    <input type="number" id="precoCompra" step="0.01" min="0">

    <button onclick="confirmarCompra('${nome}')">
      Confirmar Compra
    </button>
  `;
}

/* ================= CONFIRMAR COMPRA ================= */

async function confirmarCompra(nome) {

  const qtd = parseFloat(document.getElementById("qtdCompra").value);
  const preco = parseFloat(document.getElementById("precoCompra").value);

  if (isNaN(qtd) || isNaN(preco) || qtd <= 0 || preco <= 0) {
    alert("Informe valores válidos.");
    return;
  }

  await addItem(nome, qtd, preco);
  await renderList();

  document.getElementById("formCompra").innerHTML =
    "<p style='color:#aaa;'>Compra adicionada!</p>";

  falar("Produto adicionado ao carrinho.");
}

/* ================= CADASTRAR PRODUTO ================= */

async function cadastrarProduto() {

  const nome = document.getElementById("novoNome").value.trim().toLowerCase();
  const tipo = document.getElementById("novoTipo").value;
  const consumo = parseFloat(document.getElementById("novoConsumo").value);
  const unidade = document.getElementById("novaUnidade").value.trim();

  if (!nome || isNaN(consumo) || consumo <= 0 || !unidade) {
    alert("Preencha corretamente os campos.");
    return;
  }

  await addProduto({
    nome,
    tipo,
    consumo,
    unidade
  });

  alert("Produto cadastrado com sucesso!");

  document.getElementById("novoNome").value = "";
  document.getElementById("novoConsumo").value = "";
  document.getElementById("novaUnidade").value = "";
}

/* ================= FLUXO ================= */

let fluxo = {
  ativo: false,
  etapa: 0,
  dias: 0,
  pessoas: 0
};

async function iniciarFluxo() {

  await limparCarrinho();
  await renderList();

  document.getElementById("listaConsumo").innerHTML = "";
  document.getElementById("formCompra").innerHTML = "";

  fluxo = { ativo: true, etapa: 1, dias: 0, pessoas: 0 };

  falar("Compra para quantos dias?");
  document.getElementById("status").innerText = "Compra para quantos dias?";
}

/* ================= NUMEROS ================= */

const numerosExtenso = {
  um: 1, dois: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10
};

function extrairNumero(texto) {
  const numeroDigito = texto.match(/\d+/);
  if (numeroDigito) return parseInt(numeroDigito[0]);

  for (let palavra in numerosExtenso) {
    if (texto.includes(palavra)) {
      return numerosExtenso[palavra];
    }
  }

  return null;
}

function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

async function processarFluxo(frase) {

  frase = normalizar(frase);

  if (fluxo.etapa === 1) {
    const dias = extrairNumero(frase);
    if (!dias || dias <= 0) {
      falar("Não entendi os dias.");
      return;
    }
    fluxo.dias = dias;
    fluxo.etapa = 2;
    falar("Quantas pessoas?");
    return;
  }

  if (fluxo.etapa === 2) {
    const pessoas = extrairNumero(frase);
    if (!pessoas || pessoas <= 0) {
      falar("Não entendi as pessoas.");
      return;
    }
    fluxo.pessoas = pessoas;
    fluxo.etapa = 3;
    falar("Quais produtos deseja comprar?");
    return;
  }

  if (fluxo.etapa === 3) {

    const produtos = await getProdutos();
    let listaProdutos = [];

    for (const produto of produtos) {

      if (frase.includes(produto.nome)) {

        let quantidade =
          produto.consumo *
          fluxo.pessoas *
          fluxo.dias;

        if (produto.tipo === "unidade") {
          quantidade = Math.ceil(quantidade);
        } else {
          quantidade = parseFloat(quantidade.toFixed(2));
        }

        listaProdutos.push({
          nome: produto.nome,
          quantidade,
          unidade: produto.unidade
        });
      }
    }

    if (listaProdutos.length === 0) {
      falar("Nenhum produto reconhecido.");
      return;
    }

    mostrarConsumo(listaProdutos);
    falar("Cálculo concluído.");

    fluxo.ativo = false;
    fluxo.etapa = 0;
  }
}

/* ================= VOZ ================= */

let recognition = null;
let ouvindo = false;

function startVoice() {

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Use o Google Chrome.");
    return;
  }

  if (!recognition) {

    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = async (event) => {

      const frase =
        event.results[event.results.length - 1][0].transcript;

      document.getElementById("status").innerText =
        "Você disse: " + frase;

      if (fluxo.ativo) {
        await processarFluxo(frase);
        return;
      }

      if (normalizar(frase).includes("iniciar compra")) {
        iniciarFluxo();
      }
    };

    recognition.onend = () => {
      if (ouvindo) {
        try { recognition.start(); } catch (e) {}
      }
    };
  }

  if (!ouvindo) {
    recognition.start();
    ouvindo = true;
  } else {
    ouvindo = false;
    recognition.stop();
  }
}

/* ================= START ================= */

window.onload = async () => {
  await initDB();
  await renderList();
};
