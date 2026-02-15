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

/* ================= VOZ FALAR ================= */

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

/* ================= VOZ RECONHECIMENTO ================= */

let recognition = null;
let isListening = false;

function startVoice() {

  const status = document.getElementById("status");

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Seu navegador não suporta reconhecimento de voz. Use Chrome no Android.");
    return;
  }

  if (isListening) {
    recognition.stop();
    isListening = false;
    status.innerText = "Reconhecimento parado.";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    isListening = true;
    status.innerText = "Ouvindo...";
  };

  recognition.onresult = async (event) => {
    const frase = event.results[0][0].transcript.toLowerCase();
    status.innerText = "Você disse: " + frase;

    await interpretarComando(frase);
  };

  recognition.onerror = (event) => {
    console.error(event.error);
    status.innerText = "Erro no reconhecimento.";
    isListening = false;
  };

  recognition.onend = () => {
    isListening = false;
    status.innerText = "Pronto para ouvir...";
  };

  recognition.start();
}

/* ================= INTERPRETAÇÃO ================= */

async function interpretarComando(frase) {

  if (frase.includes("limpar")) {
    await limparLista();
    await renderList();
    falar("Lista limpa.");
    return;
  }

  const palavras = frase.split(" ");
  const numeros = palavras.filter(p => !isNaN(p));

  let quantidade = 1;
  let preco = 0;

  if (numeros.length === 1) preco = parseFloat(numeros[0]);
  if (numeros.length >= 2) {
    quantidade = parseInt(numeros[0]);
    preco = parseFloat(numeros[1]);
  }

  const nome = palavras.filter(p => isNaN(p)).join(" ");

  if (!nome) return;

  await addItem(nome, quantidade, preco);
  await renderList();
  falar("Item adicionado.");
}

/* ================= START ================= */

window.onload = async () => {
  await initDB();
  await renderList();
};
