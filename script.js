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

/* ================= PREPARAR COMPRA ================= */

function prepararCompra(nome, quantidade) {

  const form = document.getElementById("formCompra");

  form.innerHTML = `
    <h3>${nome}</h3>
    <p><strong>Quantidade sugerida:</strong> ${quantidade}</p>

    <label>Quantidade que vai comprar:</label>
    <input type="number" id="qtdCompra" value="${quantidade}" min="0" step="0.01">

    <label>Preço unitário:</label>
    <input type="number" id="precoCompra" step="0.01" min="0">

    <button onclick="confirmarCompra('${nome}')">
      Confirmar Compra
    </button>
  `;
}

/* ================= CONFIRMAR COMPRA ================= */

async function confirmarCompra(nome) {

  const qtd = parseFloat(document.getElementById("qtdCompra").value);
  const preco = parseFloat(document.getElementById("precoCompra").value);

  if (isNaN(qtd) || isNaN(preco) || qtd <= 0 || preco <= 0) {
    alert("Informe quantidade e preço válidos.");
    return;
  }

  await addItem(nome, qtd, preco);
  await renderList();

  document.getElementById("formCompra").innerHTML =
    "<p style='color:#aaa;'>Compra adicionada!</p>";

  falar("Produto adicionado ao carrinho.");
}

/* ================= FLUXO ================= */

let fluxo = {
  ativo: false,
  etapa: 0,
  dias: 0,
  pessoas: 0
};

async function iniciarFluxo() {

  await limparCarrinho();
  await renderList();

  document.getElementById("listaConsumo").innerHTML = "";
  document.getElementById("formCompra").innerHTML = "";

  fluxo = { ativo: true, etapa: 1, dias: 0, pessoas: 0 };

  falar("Compra para quantos dias?");
  document.getElementById("status").innerText = "Compra para quantos dias?";
}

/* ================= NUMEROS ================= */

const numerosExtenso = {
  um: 1, dois: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10
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

/* ================= PROCESSAR FLUXO ================= */

async function processarFluxo(frase) {

  frase = normalizar(frase);

  if (fluxo.etapa === 1) {
    const dias = extrairNumero(frase);
    if (!dias || dias <= 0) {
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
    if (!pessoas || pessoas <= 0) {
      falar("Não entendi as pessoas.");
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

        const consumoPessoaDia = consumoMedio[produto];
        const totalNecessario =
          consumoPessoaDia * fluxo.pessoas * fluxo.dias;

        let quantidadeCompra = 0;
        let detalhe = "";

        if (["arroz","feijao","macarrao","carne"].includes(produto)) {

  // Detectar se foi informado pacote com peso
  const matchPacote = frase.match(/(\d+)\s*(quilo|quilos|kg)/);

  if (matchPacote) {

    const pesoPacote = parseInt(matchPacote[1]);

    if (pesoPacote > 0) {

      quantidadeCompra = Math.ceil(totalNecessario / pesoPacote);

      detalhe = `
        Consumo médio: ${(consumoPessoaDia*1000).toFixed(0)}g por pessoa/dia<br>
        Total necessário: ${totalNecessario.toFixed(2)} kg<br>
        Pacote informado: ${pesoPacote} kg<br>
        <strong>Sugestão: ${quantidadeCompra} pacotes de ${pesoPacote}kg</strong>
      `;
    }

  } else {

    quantidadeCompra = Math.ceil(totalNecessario);

    detalhe = `
      Consumo médio: ${(consumoPessoaDia*1000).toFixed(0)}g por pessoa/dia<br>
      Total necessário: ${totalNecessario.toFixed(2)} kg<br>
      <strong>Sugestão de compra: ${quantidadeCompra} kg</strong>
    `;
  }
}


        else if (produto === "leite") {

          quantidadeCompra = Math.ceil(totalNecessario);

          detalhe = `
            Consumo médio: ${consumoPessoaDia.toFixed(2)}L por pessoa/dia<br>
            Total necessário: ${totalNecessario.toFixed(2)} litros<br>
            <strong>Sugestão de compra: ${quantidadeCompra} litros</strong>
          `;
        }

        else if (produto === "pao") {

          quantidadeCompra = Math.ceil(totalNecessario);

          detalhe = `
            Consumo médio: ${consumoPessoaDia} unidades por pessoa/dia<br>
            Total necessário: ${totalNecessario} unidades<br>
            <strong>Sugestão de compra: ${quantidadeCompra} unidades</strong>
          `;
        }

        listaProdutos.push({
          nome: produto,
          quantidade: quantidadeCompra,
          detalhe
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

/* ================= VOZ ================= */

let recognition = null;
let ouvindo = false;

function startVoice() {

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

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
    ouvindo = false;
    recognition.stop();
  }
}

/* ================= START ================= */

window.onload = async () => {
  await initDB();
  await renderList();
};

