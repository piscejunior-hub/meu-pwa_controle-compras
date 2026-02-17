/* =====================================================
   CONFIG BANCO
===================================================== */

const DB_NAME = "comprasDB";
const DB_VERSION = 8;
const STORE_ITENS = "itens";

let db;

/* =====================================================
   INIT DB
===================================================== */

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
    };
  });
}

/* =====================================================
   CONSUMO (ÚNICO BLOCO)
===================================================== */

const consumoMedio = {
  // KG
  arroz: 0.08,
  feijao: 0.05,
  macarrao: 0.07,
  carne: 0.15,
  frango: 0.18,
  peixe: 0.12,
  farinha: 0.04,
  acucar: 0.03,
  cafe: 0.02,
  batata: 0.2,
  cebola: 0.05,
  tomate: 0.06,
  cenoura: 0.05,

  // LITROS
  leite: 0.2,
  refrigerante: 0.3,
  suco: 0.25,
  agua: 1.5,
  oleo: 0.02,

  // UNIDADES
  pao: 2,
  ovo: 1,
  banana: 1,
  maca: 1,
  iogurte: 1,
  bolacha: 1
};

/* =====================================================
   UTIL
===================================================== */

function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function falar(texto) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "pt-BR";
  window.speechSynthesis.speak(utterance);
}

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

/* =====================================================
   CRUD
===================================================== */

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

function limparCarrinho() {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).clear().onsuccess = resolve;
  });
}

/* =====================================================
   RENDER
===================================================== */

async function renderList() {
  const lista = document.getElementById("lista");
  const totalEl = document.getElementById("total");

  if (!lista || !totalEl) return;

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

/* =====================================================
   FLUXO
===================================================== */

let fluxo = {
  ativo: false,
  etapa: 0,
  dias: 0,
  pessoas: 0
};

async function iniciarFluxo() {

  await limparCarrinho();
  await renderList();

  const listaConsumo = document.getElementById("listaConsumo");
  const formCompra = document.getElementById("formCompra");

  if (listaConsumo) listaConsumo.innerHTML = "";
  if (formCompra) formCompra.innerHTML = "";

  fluxo = { ativo: true, etapa: 1, dias: 0, pessoas: 0 };

  falar("Compra para quantos dias?");
  document.getElementById("status").innerText =
    "Compra para quantos dias?";
}

/* =====================================================
   PROCESSAR FLUXO
===================================================== */

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

    let listaProdutos = [];

    for (const produto in consumoMedio) {

      if (!frase.includes(produto)) continue;

      const consumo = consumoMedio[produto];
      const total = consumo * fluxo.pessoas * fluxo.dias;
      const quantidade = Math.ceil(total);

      listaProdutos.push({
        nome: produto,
        quantidade,
        detalhe: `
          Consumo médio: ${consumo}<br>
          Total necessário: ${total.toFixed(2)}<br>
          <strong>Sugestão: ${quantidade}</strong>
        `
      });
    }

    if (listaProdutos.length === 0) {
      falar("Nenhum produto reconhecido.");
      return;
    }

    mostrarConsumo(listaProdutos);
    falar("Cálculo concluído.");

    fluxo = { ativo: false, etapa: 0, dias: 0, pessoas: 0 };
  }
}

/* =====================================================
   VOZ PROFISSIONAL
===================================================== */

let recognition = null;
let ouvindo = false;

function startVoice() {

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Use Google Chrome.");
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

    recognition.onerror = (event) => {
      console.error("Erro:", event.error);
      alert("Erro no microfone: " + event.error);
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
    document.getElementById("status").innerText = "🎤 Ouvindo...";
  } else {
    ouvindo = false;
    recognition.stop();
    document.getElementById("status").innerText = "⏹️ Voz desligada";
  }
}

/* =====================================================
   START
===================================================== */

window.onload = async () => {
  await initDB();
  await renderList();
};
