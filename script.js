/* ================= CONFIG BANCO ================= */

const DB_NAME = "comprasDB";
const DB_VERSION = 3;
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

/* ================= VOZ FALA (RESPOSTA) ================= */

function falar(texto) {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "pt-BR";
  synth.speak(utterance);
}

/* ================= IA COMANDOS ================= */

async function salvarComando(palavra) {
  const tx = db.transaction(STORE_COMANDOS, "readwrite");
  tx.objectStore(STORE_COMANDOS).put({ palavra });
}

async function listarComandos() {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_COMANDOS, "readonly");
    const request = tx.objectStore(STORE_COMANDOS).getAll();

    request.onsuccess = () => {
      resolve(request.result.map(c => c.palavra));
    };
  });
}

/* ================= CRUD ================= */

function addItem(nome, quantidade, preco) {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).add({
      nome,
      quantidade,
      preco
    }).onsuccess = resolve;
  });
}

function getItems() {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_ITENS, "readonly");
    tx.objectStore(STORE_ITENS).getAll().onsuccess = e => {
      resolve(e.target.result);
    };
  });
}

function deleteItem(id) {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).delete(id).onsuccess = resolve;
  });
}

function limparLista() {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).clear().onsuccess = resolve;
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

/* ================= RECONHECIMENTO ================= */

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

/* ================= IA PRINCIPAL ================= */

async function interpretarComando(frase) {
  frase = frase.toLowerCase().trim();
  const palavras = frase.split(" ");
  const verbo = palavras[0];

  const comandosAprendidos = await listarComandos();

  const adicionarCmd = ["adicionar", "colocar", "incluir", ...comandosAprendidos];
  const removerCmd = ["remover", "tirar", "excluir"];
  const limparCmd = ["limpar", "zerar"];

  /* ===== LIMPAR ===== */
  if (limparCmd.includes(verbo)) {
    await limparLista();
    renderList();
    falar("Lista limpa com sucesso.");
    return;
  }

  /* ===== REMOVER ===== */
  if (removerCmd.includes(verbo)) {
    palavras.shift();
    const nomeRemover = palavras.join(" ");

    const itens = await getItems();
    const item = itens.find(i => i.nome.includes(nomeRemover));

    if (item) {
      await deleteItem(item.id);
      renderList();
      falar(nomeRemover + " removido.");
    } else {
      falar("Item não encontrado.");
    }
    return;
  }

  /* ===== ADICIONAR ===== */
  if (!adicionarCmd.includes(verbo)) {
    if (palavras.length >= 2) {
      await salvarComando(verbo);
    } else {
      return;
    }
  }

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
  falar(nome + " adicionado com sucesso.");
}

/* ================= START ================= */

window.onload = async () => {
  await initDB();
  renderList();
};
