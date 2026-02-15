/* ================= CONFIG BANCO ================= */

const DB_NAME = "comprasDB";
const DB_VERSION = 4;
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

/* ================= VOZ ================= */

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
  const lista = document.getElementById("shoppingList");
  const totalElement = document.getElementById("total");

  lista.innerHTML = "";
  let total = 0;

  const itens = await getItems();

  itens.forEach(item => {
    if (!item.nome) return;

    total += item.quantidade * item.preco;

    const li = document.createElement("li");
    li.className = "item-card";
    li.innerHTML = `
      <strong>${item.nome}</strong><br>
      Qtd: ${item.quantidade}<br>
      Preço: R$ ${item.preco.toFixed(2)}
    `;
    lista.appendChild(li);
  });

  totalElement.innerText = "R$ " + total.toFixed(2);
}

/* ================= FLUXO INTELIGENTE ================= */

let fluxo = resetFluxo();

function resetFluxo() {
  return {
    ativo: false,
    etapa: 0,
    dias: 0,
    pessoas: 0
  };
}

const consumoMedio = {
  arroz: 0.08,
  feijao: 0.05,
  leite: 0.2,
  pao: 2,
  macarrao: 0.07,
  carne: 0.15
};

function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extrairNumero(texto) {
  const match = texto.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

function iniciarFluxo() {
  fluxo = { ativo: true, etapa: 1, dias: 0, pessoas: 0 };
  falar("Compra para quantos dias?");
}

async function processarFluxo(resposta) {

  resposta = normalizar(resposta);

  if (fluxo.etapa === 1) {
    const numero = extrairNumero(resposta);
    if (!numero) {
      falar("Diga apenas o número de dias.");
      return true;
    }
    fluxo.dias = numero;
    fluxo.etapa = 2;
    falar("Quantas pessoas tem na casa?");
    return true;
  }

  if (fluxo.etapa === 2) {
    const numero = extrairNumero(resposta);
    if (!numero) {
      falar("Diga apenas o número de pessoas.");
      return true;
    }
    fluxo.pessoas = numero;
    fluxo.etapa = 3;
    falar("Quais produtos?");
    return true;
  }

  if (fluxo.etapa === 3) {

    const palavras = resposta.split(" ");

    for (const palavra of palavras) {

      if (!consumoMedio[palavra]) continue;

      let quantidade =
        consumoMedio[palavra] *
        fluxo.pessoas *
        fluxo.dias;

      quantidade = palavra === "pao"
        ? Math.ceil(quantidade)
        : parseFloat(quantidade.toFixed(2));

      await addItem(palavra, quantidade, 0);
    }

    await renderList();
    falar("Compra calculada com sucesso.");

    fluxo = resetFluxo();
    return true;
  }

  return false;
}

/* ================= VOZ ================= */

function startVoice() {

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Voz não suportada neste navegador.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onresult = async (event) => {

    const frase = event.results[0][0].transcript;
    console.log("Reconhecido:", frase);

    if (fluxo.ativo) {
      const tratado = await processarFluxo(frase);
      if (tratado) return;
    }

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
  };

  recognition.start();
}

/* ================= START ================= */

window.onload = async () => {
  await initDB();
  await renderList();
};
