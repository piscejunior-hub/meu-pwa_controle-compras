/* ================= CONFIG BANCO ================= */

const DB_NAME = "comprasDB";
const DB_VERSION = 7;
const STORE_ITENS = "itens";

let db;

/* ================= CONFIG FINANCEIRA (NOVO) ================= */

let configuracoes = {
  orcamento: 0,
  deslocamento: 0
};

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

/* ================= LIMPAR CARRINHO ================= */

function limparCarrinho() {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).clear().onsuccess = resolve;
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

/* ================= ATUALIZAR FINANCEIRO (NOVO) ================= */

function atualizarFinanceiro() {
  const elOrc = document.getElementById("orcamento");
  const elDes = document.getElementById("deslocamento");

  if (elOrc) elOrc.innerText = "R$ " + configuracoes.orcamento.toFixed(2);
  if (elDes) elDes.innerText = "R$ " + configuracoes.deslocamento.toFixed(2);
}

/* ================= RENDER CARRINHO ================= */

async function renderList() {
  const lista = document.getElementById("lista");
  const totalEl = document.getElementById("total");

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

  // 🔹 SOMANDO DESLOCAMENTO
  const totalFinal = total + configuracoes.deslocamento;
  totalEl.innerText = "R$ " + totalFinal.toFixed(2);

  // 🔹 ALERTA DE ORÇAMENTO
  if (configuracoes.orcamento > 0 && totalFinal > configuracoes.orcamento) {
    falar("Atenção. Você ultrapassou o orçamento.");
  }
}

/* ================= CONSUMO ================= */

const consumoMedio = {
  arroz: 0.08,
  feijao: 0.05,
  leite: 0.2,
  pao: 2,
  macarrao: 0.07,
  carne: 0.15
};

function mostrarConsumo(listaProdutos) {
  const container = document.getElementById("listaConsumo");
  container.innerHTML = "";

  listaProdutos.forEach(item => {
    const div = document.createElement("div");

    div.innerHTML = `
      <div style="margin-bottom:15px; padding:10px; border:1px solid #ddd; border-radius:8px;">
        <strong style="font-size:16px;">${item.nome.toUpperCase()}</strong><br><br>
        ${item.detalhe}
        <br><br>
        <button onclick="prepararCompra('${item.nome}', ${item.quantidade})">
          Comprar
        </button>
      </div>
    `;

    container.appendChild(div);
  });
}

/* ================= VOZ ================= */

let recognition = null;
let ouvindo = false;

function startVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Use o Google Chrome.");
    return;
  }

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = async (event) => {
      const frase = event.results[event.results.length - 1][0].transcript;
      const fraseNormalizada = normalizar(frase);

      document.getElementById("status").innerText = "Você disse: " + frase;

      // ===== ORÇAMENTO =====
      if (fraseNormalizada.includes("orcamento")) {
        const valor = frase.match(/\d+[.,]?\d*/);
        if (valor) {
          configuracoes.orcamento = parseFloat(valor[0].replace(",", "."));
          atualizarFinanceiro();
          falar("Orçamento atualizado.");
        }
        return;
      }

      // ===== DESLOCAMENTO =====
      if (fraseNormalizada.includes("deslocamento")) {
        const valor = frase.match(/\d+[.,]?\d*/);
        if (valor) {
          configuracoes.deslocamento = parseFloat(valor[0].replace(",", "."));
          atualizarFinanceiro();
          await renderList();
          falar("Deslocamento atualizado.");
        }
        return;
      }

      if (fluxo.ativo) {
        await processarFluxo(frase);
        return;
      }

      if (fraseNormalizada.includes("iniciar compra")) {
        iniciarFluxo();
      }
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
