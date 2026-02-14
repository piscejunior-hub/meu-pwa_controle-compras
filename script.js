/* ================= CONFIG BANCO ================= */

const DB_NAME = "comprasDB";
const DB_VERSION = 1;
const STORE_NAME = "itens";

let db;

/* ================= INICIALIZAÇÃO ================= */

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject("Erro ao abrir banco");

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true
        });

        store.createIndex("nome", "nome", { unique: false });
      }
    };
  });
}

/* ================= ADICIONAR ITEM ================= */

function addItem(nome, quantidade = 1, preco = 0) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const item = {
      nome,
      quantidade,
      preco,
      criadoEm: new Date()
    };

    const request = store.add(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject("Erro ao adicionar item");
  });
}

/* ================= LISTAR ITENS ================= */

function getItems() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Erro ao buscar itens");
  });
}

/* ================= REMOVER ITEM ================= */

function deleteItem(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject("Erro ao remover item");
  });
}

/* ================= RENDERIZAR LISTA ================= */

async function renderList() {
  const lista = document.getElementById("shoppingList");
  const totalElement = document.getElementById("total");

  lista.innerHTML = "";
  let total = 0;

  const itens = await getItems();

  itens.forEach(item => {
    total += item.quantidade * item.preco;

    const li = document.createElement("li");
    li.className = "item-card";
    li.innerHTML = `
      <strong>${item.nome}</strong><br>
      Qtd: ${item.quantidade}<br>
      Preço: R$ ${item.preco.toFixed(2)}<br>
      <button onclick="remover(${item.id})" class="secondary">Remover</button>
    `;

    lista.appendChild(li);
  });

  totalElement.innerText = "R$ " + total.toFixed(2);
}

/* ================= REMOVER ================= */

async function remover(id) {
  await deleteItem(id);
  renderList();
}

/* ================= VOZ ================= */

function startVoice() {
  const status = document.getElementById("status");

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    status.innerText = "Reconhecimento de voz não suportado.";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    status.innerText = "Ouvindo...";
  };

  recognition.onresult = async (event) => {
    const frase = event.results[0][0].transcript;
    status.innerText = "Você disse: " + frase;

    await interpretarComando(frase);
  };

  recognition.onerror = () => {
    status.innerText = "Erro no reconhecimento.";
  };

  recognition.start();
}

/* ================= INTERPRETAR COMANDO INTELIGENTE ================= */

async function interpretarComando(frase) {
  frase = frase.toLowerCase();

  if (!frase.includes("adicionar") &&
      !frase.includes("colocar") &&
      !frase.includes("incluir")) {
    return;
  }

  // Limpeza da frase
  frase = frase
    .replace(/adicionar|colocar|incluir|quero|por|reais|real|de/g, "")
    .trim();

  const palavras = frase.split(" ");

  let quantidade = 1;
  let preco = 0;
  let nome = "";

  const numeros = palavras.filter(p =>
    !isNaN(p.replace(",", "."))
  );

  if (numeros.length === 1) {
    preco = parseFloat(numeros[0].replace(",", "."));
  }

  if (numeros.length >= 2) {
    quantidade = parseInt(numeros[0]);
    preco = parseFloat(numeros[1].replace(",", "."));
  }

  nome = palavras
    .filter(p => isNaN(p.replace(",", ".")))
    .join(" ");

  if (!nome) nome = "Item";

  await addItem(nome, quantidade, preco);
  renderList();
}

/* ================= INICIALIZAÇÃO APP ================= */

window.onload = async () => {
  await initDB();
  renderList();
};
