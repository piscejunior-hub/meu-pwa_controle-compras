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

  totalEl.innerText = "R$ " + total.toFixed(2);
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
      <strong>${item.nome}</strong><br>
      Quantidade recomendada: ${item.quantidade}<br>
      <button onclick="prepararCompra('${item.nome}', ${item.quantidade})">
        Comprar
      </button>
    `;
    container.appendChild(div);
  });
}

/* ================= FLUXO ================= */

let fluxo = {
  ativo: false,
  etapa: 0,
  dias: 0,
  pessoas: 0
};

function iniciarFluxo() {
  fluxo = { ativo: true, etapa: 1, dias: 0, pessoas: 0 };
  falar("Compra para quantos dias?");
  document.getElementById("status").innerText = "Compra para quantos dias?";
}

/* ================= NUMEROS POR EXTENSO ================= */

const numerosExtenso = {
  um: 1, dois: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, quatorze: 14,
  quinze: 15, dezesseis: 16, dezessete: 17,
  dezoito: 18, dezenove: 19, vinte: 20,
  trinta: 30
};

function extrairNumero(texto) {

  const numeroDigito = texto.match(/\d+/);
  if (numeroDigito) return parseInt(numeroDigito[0]);

  for (let palavra in numerosExtenso) {
    if (texto.includes(palavra)) {
      return numerosExtenso[palavra];
    }
  }

  return null;
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

    if (!dias || dias <= 0) {
      falar("Não entendi os dias. Diga apenas o número.");
      return;
    }

    fluxo.dias = dias;
    fluxo.etapa = 2;
    falar("Quantas pessoas?");
    return;
  }

  if (fluxo.etapa === 2) {
    const pessoas = extrairNumero(frase);

    if (!pessoas || pessoas <= 0) {
      falar("Não entendi as pessoas. Diga apenas o número.");
      return;
    }

    fluxo.pessoas = pessoas;
    fluxo.etapa = 3;
    falar("Quais produtos deseja comprar?");
    return;
  }

  if (fluxo.etapa === 3) {

    let listaProdutos = [];

    for (const produto in consumoMedio) {

      if (frase.includes(produto)) {

        let quantidade =
          consumoMedio[produto] *
          fluxo.pessoas *
          fluxo.dias;

        quantidade = produto === "pao"
          ? Math.ceil(quantidade)
          : parseFloat(quantidade.toFixed(2));

        listaProdutos.push({
          nome: produto,
          quantidade
        });
      }
    }

    if (listaProdutos.length === 0) {
      falar("Nenhum produto reconhecido.");
      return;
    }

    mostrarConsumo(listaProdutos);

    falar("Cálculo concluído.");

    fluxo.ativo = false;
    fluxo.etapa = 0;
  }
}

/* ================= VOZ ESTÁVEL ================= */

let recognition = null;
let ouvindo = false;

function startVoice() {

  if (!('webkitSpeechRecognition' in window) &&
      !('SpeechRecognition' in window)) {
    alert("Use o Google Chrome.");
    return;
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!recognition) {

    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {

      const frase =
        event.results[event.results.length - 1][0].transcript;

      document.getElementById("status").innerText =
        "Você disse: " + frase;

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

    recognition.onend = () => {
      if (ouvindo) {
        try {
          recognition.start();
        } catch (e) {}
      }
    };
  }

  if (!ouvindo) {
    try {
      recognition.start();
      ouvindo = true;
    } catch (e) {}
  } else {
    ouvindo = false;
    recognition.stop();
  }
}

/* ================= START ================= */

window.onload = async () => {
  await initDB();
  await renderList();
};
