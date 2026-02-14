/* ================= CONFIG BANCO ================= */

const DB_NAME = "comprasDB";
const DB_VERSION = 4;
const STORE_ITENS = "itens";
const STORE_COMANDOS = "comandos";

let db;

/* ================= INIT DB ================= */

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject();

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

      if (!db.objectStoreNames.contains(STORE_COMANDOS)) {
        db.createObjectStore(STORE_COMANDOS, {
          keyPath: "palavra"
        });
      }
    };
  });
}

/* ================= FALAR ================= */

function falar(texto) {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "pt-BR";
  synth.speak(utterance);
}

/* ================= CRUD ================= */

function addItem(nome, quantidade, preco) {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).add({ nome, quantidade, preco })
      .onsuccess = resolve;
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

    if (!item.nome) return; // protege contra lixo

    total += (item.quantidade || 0) * (item.preco || 0);

    const li = document.createElement("li");
    li.className = "item-card";
    li.innerHTML = `
      <strong>${item.nome}</strong><br>
      Qtd: ${item.quantidade}<br>
      Preço: R$ ${Number(item.preco).toFixed(2)}<br>
      <button onclick="editar(${item.id})">Editar</button>
      <button onclick="remover(${item.id})" class="secondary">Remover</button>
    `;
    lista.appendChild(li);
  });

  totalElement.innerText = "R$ " + total.toFixed(2);
}

/* ================= EDITAR ================= */

async function editar(id) {
  const itens = await getItems();
  const item = itens.find(i => i.id === id);

  if (!item) return;

  const novoNome = prompt("Novo nome:", item.nome);
  const novaQtd = prompt("Nova quantidade:", item.quantidade);
  const novoPreco = prompt("Novo preço:", item.preco);

  item.nome = novoNome || item.nome;
  item.quantidade = parseInt(novaQtd) || item.quantidade;
  item.preco = parseFloat(novoPreco) || item.preco;

  await updateItem(item);
  renderList();
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
    status.innerText = "Não suportado.";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";

  recognition.onresult = async (event) => {
    const frase = event.results[0][0].transcript;
    status.innerText = "Você disse: " + frase;
    await interpretarComando(frase);
  };

  recognition.start();
}

/* ================= IA ================= */

async function interpretarComando(frase) {
  frase = frase.toLowerCase().trim();
  const palavras = frase.split(" ");
  const verbo = palavras[0];

  /* ===== LIMPAR ===== */
  if (verbo === "limpar" || verbo === "zerar") {
    await limparLista();
    await renderList();
    falar("Lista limpa completamente.");
    return;
  }

  /* ===== EDITAR ===== */
  if (verbo === "editar" || verbo === "atualizar") {
    palavras.shift();
    const nomeBusca = palavras[0];

    const itens = await getItems();
    const item = itens.find(i => i.nome.includes(nomeBusca));

    if (!item) {
      falar("Item não encontrado.");
      return;
    }

    const numeros = palavras.filter(p => !isNaN(p));
    if (numeros.length >= 1) item.quantidade = parseInt(numeros[0]);
    if (numeros.length >= 2) item.preco = parseFloat(numeros[1]);

    await updateItem(item);
    renderList();
    falar("Item atualizado.");
    return;
  }

  /* ===== REMOVER ===== */
  if (verbo === "remover" || verbo === "tirar") {
    palavras.shift();
    const nomeBusca = palavras.join(" ");

    const itens = await getItems();
    const item = itens.find(i => i.nome.includes(nomeBusca));

    if (item) {
      await deleteItem(item.id);
      renderList();
      falar("Item removido.");
    } else {
      falar("Item não encontrado.");
    }
    return;
  }

  /* ===== ADICIONAR ===== */
  palavras.shift();

  let quantidade = 1;
  let preco = 0;

  const numeros = palavras.filter(p =>
    !isNaN(p.replace(",", "."))
  );

  if (numeros.length === 1) preco = parseFloat(numeros[0]);
  if (numeros.length >= 2) {
    quantidade = parseInt(numeros[0]);
    preco = parseFloat(numeros[1]);
  }

  const nome = palavras
    .filter(p => isNaN(p.replace(",", ".")))
    .join(" ") || "Item";

  await addItem(nome, quantidade, preco);
  renderList();
  falar("Item adicionado.");
}

/* ================= START ================= */

window.onload = async () => {
  await initDB();
  renderList();
};
