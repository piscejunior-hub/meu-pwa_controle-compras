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

function updateItem(item) {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).put(item)
      .onsuccess = resolve;
  });
}

function deleteItem(id) {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).delete(id)
      .onsuccess = resolve;
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
      Preço: R$ ${item.preco.toFixed(2)}<br>
      <button onclick="editar(${item.id})">Editar</button>
      <button onclick="remover(${item.id})" class="secondary">Remover</button>
    `;
    lista.appendChild(li);
  });

  totalElement.innerText = "R$ " + total.toFixed(2);
}

/* ================= FLUXO INTELIGENTE ================= */

let fluxoCompra = resetFluxo();

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

function iniciarFluxoCompra() {
  fluxoCompra = { ativo: true, etapa: 1, dias: 0, pessoas: 0 };
  falar("Compra para quantos dias?");
}

function extrairNumero(texto) {
  const match = texto.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

function normalizarTexto(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

async function processarFluxo(resposta) {

  resposta = normalizarTexto(resposta);

  if (fluxoCompra.etapa === 1) {
    const numero = extrairNumero(resposta);
    if (!numero) {
      falar("Não entendi o número de dias. Pode repetir?");
      return true;
    }
    fluxoCompra.dias = numero;
    fluxoCompra.etapa = 2;
    falar("Quantas pessoas tem na casa?");
    return true;
  }

  if (fluxoCompra.etapa === 2) {
    const numero = extrairNumero(resposta);
    if (!numero) {
      falar("Não entendi o número de pessoas. Pode repetir?");
      return true;
    }
    fluxoCompra.pessoas = numero;
    fluxoCompra.etapa = 3;
    falar("Quais produtos serão comprados?");
    return true;
  }

  if (fluxoCompra.etapa === 3) {

    const produtos = resposta.split(",").map(p => p.trim());

    for (const produto of produtos) {

      if (!consumoMedio[produto]) continue;

      let quantidade =
        consumoMedio[produto] *
        fluxoCompra.pessoas *
        fluxoCompra.dias;

      quantidade = produto === "pao"
        ? Math.ceil(quantidade)
        : parseFloat(quantidade.toFixed(2));

      await addItem(produto, quantidade, 0);
    }

    await renderList();

    falar("Lista inteligente criada com sucesso.");

    fluxoCompra = resetFluxo();
    return true;
  }

  return false;
}

/* ================= VOZ ================= */

let recognition;

function iniciarReconhecimento() {

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Reconhecimento de voz não suportado.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onresult = async (event) => {

    const frase = event.results[0][0].transcript;
    console.log("Reconhecido:", frase);

    if (fluxoCompra.ativo) {
      const tratado = await processarFluxo(frase);
      if (tratado) return;
    }

    await interpretarComando(frase);
  };

  recognition.onend = () => {
    setTimeout(() => {
      if (recognition) recognition.start();
    }, 800);
  };

  recognition.start();
}

/* ================= INTERPRETAÇÃO ================= */

async function interpretarComando(frase) {

  frase = normalizarTexto(frase);

  if (frase.includes("iniciar compra")) {
    iniciarFluxoCompra();
    return;
  }

  if (frase.includes("limpar")) {
    await limparLista();
    await renderList();
    falar("Lista limpa completamente.");
    return;
  }

  const palavras = frase.split(" ");
  palavras.shift();

  const numeros = palavras.filter(p => !isNaN(p));

  let quantidade = 1;
  let preco = 0;

  if (numeros.length === 1) preco = parseFloat(numeros[0]);
  if (numeros.length >= 2) {
    quantidade = parseInt(numeros[0]);
    preco = parseFloat(numeros[1]);
  }

  const nome = palavras.filter(p => isNaN(p)).join(" ");

  await addItem(nome, quantidade, preco);
  await renderList();
  falar("Item adicionado.");
}

/* ================= START ================= */

window.onload = async () => {
  await initDB();
  await renderList();
};
