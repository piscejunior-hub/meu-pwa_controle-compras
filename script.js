/* ================= CONFIG BANCO ================= */

const DB_NAME = "comprasDB";
const DB_VERSION = 7;
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

/* ================= RENDER ================= */

async function renderList() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  const itens = await getItems();

  itens.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.nome}</strong><br>
      Quantidade recomendada: ${item.quantidade}
    `;
    lista.appendChild(li);
  });
}

/* ================= FLUXO ================= */

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
      return;
    }
    fluxo.dias = dias;
    fluxo.etapa = 2;
    falar("Quantas pessoas?");
    return;
  }

  if (fluxo.etapa === 2) {
    const pessoas = extrairNumero(frase);
    if (!pessoas) {
      falar("Não entendi as pessoas.");
      return;
    }
    fluxo.pessoas = pessoas;
    fluxo.etapa = 3;
    falar("Quais produtos deseja comprar?");
    return;
  }

  if (fluxo.etapa === 3) {

    let respostaVisual = "Você deve comprar:\n";

    for (const produto in consumoMedio) {

      if (frase.includes(produto)) {

        let quantidade =
          consumoMedio[produto] *
          fluxo.pessoas *
          fluxo.dias;

        quantidade = produto === "pao"
          ? Math.ceil(quantidade)
          : parseFloat(quantidade.toFixed(2));

        await addItem(produto, quantidade, 0);

        respostaVisual += `${produto}: ${quantidade}\n`;
      }
    }

    await renderList();

    document.getElementById("status").innerText = respostaVisual;

    falar("Cálculo concluído.");

    fluxo.ativo = false;
    fluxo.etapa = 0;
  }
}

/* ================= VOZ ================= */

let recognition;
let ouvindo = false;

function startVoice() {

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Use Chrome.");
    return;
  }

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onresult = async (event) => {

      const frase = event.results[event.results.length - 1][0].transcript;

      document.getElementById("status").innerText = "Você disse: " + frase;

      if (fluxo.ativo) {
        await processarFluxo(frase);
        return;
      }

      if (normalizar(frase).includes("iniciar compra")) {
        iniciarFluxo();
      }
    };

    recognition.onerror = (e) => {
      console.log("Erro:", e.error);
    };
  }

  if (!ouvindo) {
    recognition.start();
    ouvindo = true;
  } else {
    recognition.stop();
    ouvindo = false;
  }
}

/* ================= START ================= */

window.onload = async () => {
  await initDB();
  await renderList();
};
