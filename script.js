/* ================= CONFIG BANCO ================= */

const DB_NAME = "comprasDB";
const DB_VERSION = 5;
const STORE_ITENS = "itens";

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
    };
  });
}

/* ================= FALAR ================= */

function falar(texto) {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "pt-BR";
  speechSynthesis.speak(utterance);
}

/* ================= CRUD ================= */

function addItem(nome, quantidade, preco) {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).add({
      nome: nome.trim(),
      quantidade: Number(quantidade) || 0,
      preco: Number(preco) || 0
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

function limparLista() {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).clear()
      .onsuccess = resolve;
  });
}

/* ================= RENDER ================= */

async function renderList() {
  const lista = document.getElementById("lista");
  const totalElement = document.getElementById("total");

  lista.innerHTML = "";
  let total = 0;

  const itens = await getItems();

  itens.forEach(item => {
    total += item.quantidade * item.preco;

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.nome}</strong> —
      Qtd: ${item.quantidade} —
      R$ ${item.preco.toFixed(2)}
    `;
    lista.appendChild(li);
  });

  totalElement.innerText = "R$ " + total.toFixed(2);
}

/* ================= FLUXO INTELIGENTE ================= */

let fluxo = {
  ativo: false,
  etapa: 0,
  dias: 0,
  pessoas: 0
};

const consumoMedio = {
  arroz: 0.08,
  feijao: 0.05,
  leite: 0.2,
  pao: 2,
  macarrao: 0.07,
  carne: 0.15
};

function iniciarFluxo() {
  fluxo = { ativo: true, etapa: 1, dias: 0, pessoas: 0 };
  falar("Compra para quantos dias?");
  document.getElementById("status").innerText = "Compra para quantos dias?";
}

function extrairNumero(texto) {
  const match = texto.match(/\d+/);
  return match ? parseInt(match[0]) : null;
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
    if (!dias) {
      falar("Não entendi os dias.");
      return true;
    }
    fluxo.dias = dias;
    fluxo.etapa = 2;
    falar("Quantas pessoas?");
    return true;
  }

  if (fluxo.etapa === 2) {
    const pessoas = extrairNumero(frase);
    if (!pessoas) {
      falar("Não entendi o número de pessoas.");
      return true;
    }
    fluxo.pessoas = pessoas;
    fluxo.etapa = 3;
    falar("Quais produtos? Pode falar arroz, feijão, carne...");
    return true;
  }

  if (fluxo.etapa === 3) {

    const produtos = frase.split(" ");

    for (const produto of produtos) {

      if (!consumoMedio[produto]) continue;

      let quantidade =
        consumoMedio[produto] *
        fluxo.pessoas *
        fluxo.dias;

      quantidade = produto === "pao"
        ? Math.ceil(quantidade)
        : parseFloat(quantidade.toFixed(2));

      await addItem(produto, quantidade, 0);
    }

    await renderList();

    falar("Lista inteligente criada.");
    fluxo.ativo = false;
    fluxo.etapa = 0;

    return true;
  }

  return false;
}

/* ================= VOZ ================= */

let recognition = null;
let ouvindo = false;

function startVoice() {

  const status = document.getElementById("status");

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Use Chrome no Android.");
    return;
  }

  if (ouvindo) {
    recognition.stop();
    ouvindo = false;
    status.innerText = "Parado.";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    ouvindo = true;
    status.innerText = "Ouvindo...";
  };

  recognition.onresult = async (event) => {
    const frase = event.results[0][0].transcript;
    status.innerText = "Você disse: " + frase;

    if (fluxo.ativo) {
      const tratado = await processarFluxo(frase);
      if (tratado) return;
    }

    interpretarComando(frase);
  };

  recognition.onerror = (e) => {
    status.innerText = "Erro: " + e.error;
    ouvindo = false;
  };

  recognition.onend = () => {
    ouvindo = false;
    status.innerText = "Pronto.";
  };

  recognition.start();
}

/* ================= COMANDOS ================= */

async function interpretarComando(frase) {

  frase = normalizar(frase);

  if (frase.includes("iniciar compra")) {
    iniciarFluxo();
    return;
  }

  if (frase.includes("limpar")) {
    await limparLista();
    await renderList();
    falar("Lista limpa.");
    return;
  }
}

/* ================= START ================= */

window.onload = async () => {
  await initDB();
  await renderList();
};
