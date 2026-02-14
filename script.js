/* ================= CONFIG BANCO ================= */

const DB_NAME = "comprasDB";
const DB_VERSION = 2;
const STORE_ITENS = "itens";
const STORE_COMANDOS = "comandos";

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

      if (!db.objectStoreNames.contains(STORE_ITENS)) {
        db.createObjectStore(STORE_ITENS, {
          keyPath: "id",
          autoIncrement: true
        });
      }

      if (!db.objectStoreNames.contains(STORE_COMANDOS)) {
        db.createObjectStore(STORE_COMANDOS, {
          keyPath: "palavra"
        });
      }
    };
  });
}

/* ================= IA - COMANDOS ================= */

async function salvarComando(palavra) {
  const tx = db.transaction(STORE_COMANDOS, "readwrite");
  const store = tx.objectStore(STORE_COMANDOS);
  store.put({ palavra });
}

async function listarComandos() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COMANDOS, "readonly");
    const store = tx.objectStore(STORE_COMANDOS);
    const request = store.getAll();

    request.onsuccess = () => {
      const palavras = request.result.map(c => c.palavra);
      resolve(palavras);
    };

    request.onerror = () => reject([]);
  });
}

/* ================= CRUD ITENS ================= */

function addItem(nome, quantidade = 1, preco = 0) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    const store = tx.objectStore(STORE_ITENS);

    const request = store.add({
      nome,
      quantidade,
      preco,
      criadoEm: new Date()
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject();
  });
}

function getItems() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITENS, "readonly");
    const store = tx.objectStore(STORE_ITENS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject([]);
  });
}

function deleteItem(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    const store = tx.objectStore(STORE_ITENS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject();
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
    status.innerText = "Reconhecimento não suportado.";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";

  recognition.onstart = () => {
    status.innerText = "Ouvindo...";
  };

  recognition.onresult = async (event) => {
    const frase = event.results[0][0].transcript;
    status.innerText = "Você disse: " + frase;

    await interpretarComando(frase);
  };

  recognition.start();
}

/* ================= IA ADAPTATIVA ================= */

async function interpretarComando(frase) {
  frase = frase.toLowerCase().trim();

  const palavras = frase.split(" ");
  const verbo = palavras[0];

  const comandosAprendidos = await listarComandos();
  const comandosPadrao = ["adicionar", "colocar", "incluir"];

  const todosComandos = [...comandosPadrao, ...comandosAprendidos];

  if (!todosComandos.includes(verbo)) {
    // Aprende automaticamente novo verbo
    if (palavras.length >= 2) {
      await salvarComando(verbo);
    } else {
      return;
    }
  }

  // Remove verbo
  palavras.shift();

  let quantidade = 1;
  let preco = 0;

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

  const nome = palavras
    .filter(p => isNaN(p.replace(",", ".")))
    .join(" ") || "Item";

  await addItem(nome, quantidade, preco);
  renderList();
}

/* ================= START ================= */

window.onload = async () => {
  await initDB();
  renderList();
};
