/* ================= CONFIG BANCO ================= */

const DB_NAME = "comprasDB";
const DB_VERSION = 9;

const STORE_ITENS = "itens";
const STORE_PRODUTOS = "produtos";

let db;

/* ================= CONTROLE VOZ GLOBAL ================= */

let ultimaFraseGlobal = "";
let bloqueioVoz = false;
let bloqueioCadastro = false; // bloqueio para evitar duplicação

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
        db.createObjectStore(STORE_ITENS, { keyPath: "id", autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(STORE_PRODUTOS)) {
        db.createObjectStore(STORE_PRODUTOS, { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

/* ================= NORMALIZAR ================= */

function normalizar(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/* ================= CRUD PRODUTOS ================= */

function addProduto(nome, consumoPessoaDia, tipo) {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_PRODUTOS, "readwrite");
    tx.objectStore(STORE_PRODUTOS).add({
      nome: normalizar(nome),
      consumoPessoaDia: parseFloat(consumoPessoaDia),
      tipo
    }).onsuccess = resolve;
  });
}

function getProdutos() {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_PRODUTOS, "readonly");
    tx.objectStore(STORE_PRODUTOS).getAll().onsuccess = e => resolve(e.target.result || []);
  });
}

/* ================= LISTAR PRODUTOS ================= */

async function renderProdutos() {
  const container = document.getElementById("listaProdutos");
  if (!container) return;

  const produtos = await getProdutos();

  if (produtos.length === 0) {
    container.innerHTML = "<p style='color:#aaa;'>Nenhum produto cadastrado...</p>";
    return;
  }

  container.innerHTML = "";

  produtos.forEach(p => {
    const div = document.createElement("div");
    div.style.marginBottom = "6px";
    div.innerHTML = `<strong>${p.nome}</strong> (${p.consumoPessoaDia} por pessoa/dia - ${p.tipo})`;
    container.appendChild(div);
  });
}

/* ================= CADASTRO MANUAL ================= */

async function cadastrarProduto() {
  const nome = document.getElementById("nomeProduto").value;
  const consumo = document.getElementById("consumoProduto").value;
  const tipo = document.getElementById("tipoProduto").value;

  if (!nome || !consumo) { alert("Preencha todos os campos."); return; }

  await addProduto(nome, consumo, tipo);
  await renderProdutos();
  falar("Produto cadastrado com sucesso.");
}

/* ================= CRUD ITENS ================= */

function addItem(nome, quantidade, preco) {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).add({ nome, quantidade, preco }).onsuccess = resolve;
  });
}

function getItems() {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_ITENS, "readonly");
    tx.objectStore(STORE_ITENS).getAll().onsuccess = e => resolve(e.target.result || []);
  });
}

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

/* ================= RENDER CARRINHO ================= */

async function renderList() {
  const lista = document.getElementById("lista");
  const totalEl = document.getElementById("total");
  if (!lista || !totalEl) return;

  lista.innerHTML = "";

  const itens = await getItems();
  let total = 0;

  itens.forEach(item => {
    const subtotal = item.quantidade * item.preco;
    total += subtotal;

    const li = document.createElement("li");
    li.innerHTML = `<strong>${item.nome}</strong><br>Qtd: ${item.quantidade} | Preço: R$ ${item.preco.toFixed(2)} | Subtotal: R$ ${subtotal.toFixed(2)}`;
    lista.appendChild(li);
  });

  totalEl.innerText = "R$ " + total.toFixed(2);
}

/* ================= NUMEROS ================= */

const numerosExtenso = { um:1, dois:2, tres:3, quatro:4, cinco:5, seis:6, sete:7, oito:8, nove:9, dez:10 };

function extrairNumero(texto) {
  const numeroDigito = texto.match(/\d+/);
  if (numeroDigito) return parseInt(numeroDigito[0]);
  for (let palavra in numerosExtenso) if (texto.includes(palavra)) return numerosExtenso[palavra];
  return null;
}

/* ================= CADASTRO POR VOZ ================= */

async function processarCadastroPorVoz(frase) {
  frase = normalizar(frase);
  if (!frase.includes("cadastrar produto") && !frase.includes("novo produto")) return false;

  // regex mais flexível: captura nome do produto (qualquer coisa até "consumo"), número e unidade
  const regex = /(?:cadastrar produto|novo produto)\s+(.+?)\s*(?:consumo)?\s*(\d+(?:[\.,]\d+)?)\s*(kg|quilo|quilos|litro|l|unidade|unidades)?/;
  const match = frase.match(regex);

  if (!match) { falar("Não consegui entender o cadastro."); return true; }

  let nome = match[1].trim(); // captura todo o nome do produto
  let consumo = parseFloat(match[2].replace(",", "."));
  let tipoFalado = match[3] || "kg";

  let tipo = "kg";
  if (tipoFalado.includes("litro") || tipoFalado === "l") tipo = "litro";
  if (tipoFalado.includes("unidade")) tipo = "unidade";
  if (tipoFalado.includes("kg") || tipoFalado.includes("quilo")) tipo = "kg";

  await addProduto(nome, consumo, tipo);
  await renderProdutos();
  falar("Produto cadastrado com sucesso.");
  return true;
}

/* ================= FLUXO ================= */

let fluxo = { ativo:false, etapa:0, dias:0, pessoas:0 };

async function iniciarFluxo() {
  await limparCarrinho();
  await renderList();
  document.getElementById("listaConsumo").innerHTML = "";
  document.getElementById("formCompra").innerHTML = "";
  fluxo = { ativo:true, etapa:1, dias:0, pessoas:0 };
  falar("Compra para quantos dias?");
}

/* ================= PROCESSAR FLUXO ================= */

async function processarFluxo(frase) {
  frase = normalizar(frase);

  if (fluxo.etapa === 1) {
    const dias = extrairNumero(frase);
    if (!dias) { falar("Não entendi os dias."); return; }
    fluxo.dias = dias; fluxo.etapa = 2; falar("Quantas pessoas?"); return;
  }

  if (fluxo.etapa === 2) {
    const pessoas = extrairNumero(frase);
    if (!pessoas) { falar("Não entendi as pessoas."); return; }
    fluxo.pessoas = pessoas; fluxo.etapa = 3; falar("Quais produtos deseja comprar?"); return;
  }

  if (fluxo.etapa === 3) {
    const produtos = await getProdutos();
    let listaProdutos = [];

    for (const produtoObj of produtos) {
      const produto = produtoObj.nome;
      if (!frase.includes(produto)) continue;

      const consumoPessoaDia = produtoObj.consumoPessoaDia;
      const tipo = produtoObj.tipo;
      const totalNecessario = consumoPessoaDia * fluxo.pessoas * fluxo.dias;
      let quantidadeCompra = 0;
      let detalhe = "";

      if (tipo === "kg") {
        const regexPacote = new RegExp(produto + "\\s*(?:pacote\\s*de\\s*)?(\\d+)\\s*(kg|quilo|quilos)?");
        const matchPacote = frase.match(regexPacote);
        let pesoPacote = matchPacote?.[1] ? parseInt(matchPacote[1]) : null;

        if (pesoPacote && pesoPacote > 0) {
          quantidadeCompra = Math.ceil(totalNecessario / pesoPacote);
          detalhe = `Total necessário: ${totalNecessario.toFixed(2)} kg<br>Pacote informado: ${pesoPacote} kg<br><strong>Sugestão: ${quantidadeCompra} pacotes de ${pesoPacote}kg</strong>`;
        } else {
          quantidadeCompra = Math.ceil(totalNecessario);
          detalhe = `Total necessário: ${totalNecessario.toFixed(2)} kg<br><strong>Sugestão: ${quantidadeCompra} kg</strong>`;
        }
      }

      if (tipo === "litro") {
        quantidadeCompra = Math.ceil(totalNecessario);
        detalhe = `Total necessário: ${totalNecessario.toFixed(2)} litros<br><strong>Sugestão: ${quantidadeCompra} litros</strong>`;
      }

      if (tipo === "unidade") {
        quantidadeCompra = Math.ceil(totalNecessario);
        detalhe = `Total necessário: ${totalNecessario} unidades<br><strong>Sugestão: ${quantidadeCompra} unidades</strong>`;
      }

      listaProdutos.push({ nome: produto, quantidade: quantidadeCompra, detalhe, tipo });
    }

    if (listaProdutos.length === 0) { falar("Nenhum produto reconhecido."); return; }

    mostrarConsumo(listaProdutos);
    falar("Cálculo concluído.");

    fluxo.ativo = false;
    fluxo.etapa = 0;
  }
}

/* ================= MOSTRAR CONSUMO ================= */

function mostrarConsumo(listaProdutos) {
  const container = document.getElementById("listaConsumo");
  container.innerHTML = "";

  listaProdutos.forEach(item => {
    const div = document.createElement("div");
    div.style.marginBottom = "15px";
    div.style.padding = "10px";
    div.style.border = "1px solid #ddd";
    div.style.borderRadius = "8px";
    div.style.cursor = "pointer";

    div.innerHTML = `
      <strong>${item.nome.toUpperCase()}</strong><br><br>
      ${item.detalhe}<br><br>
      <button onclick="prepararCompra('${item.nome}', ${item.quantidade})">Comprar</button>
    `;

    // usa pointerdown para evitar duplicação no mobile
    div.addEventListener("pointerdown", e => {
      if (e.target.tagName.toLowerCase() === "button") return;

      cadastrarProdutoClicado({ 
        nome: item.nome, 
        consumoPessoaDia: item.quantidade, 
        tipo: item.tipo 
      });
    });

    container.appendChild(div);
  });
}

/* ================= PREPARAR + CONFIRMAR ================= */

function prepararCompra(nome, quantidade) {
  const form = document.getElementById("formCompra");
  form.innerHTML = `
    <h3>${nome}</h3>
    <p><strong>Quantidade sugerida:</strong> ${quantidade}</p>
    <label>Quantidade que vai comprar:</label>
    <input type="number" id="qtdCompra" value="${quantidade}" min="0" step="0.01">
    <label>Preço unitário:</label>
    <input type="number" id="precoCompra" step="0.01" min="0">
    <button onclick="confirmarCompra('${nome}')">Confirmar Compra</button>
  `;
}

async function confirmarCompra(nome) {
  const qtd = parseFloat(document.getElementById("qtdCompra").value);
  const preco = parseFloat(document.getElementById("precoCompra").value);

  if (isNaN(qtd) || isNaN(preco) || qtd <= 0 || preco <= 0) {
    alert("Informe quantidade e preço válidos."); return;
  }

  await addItem(nome, qtd, preco);
  await renderList();

  document.getElementById("formCompra").innerHTML = "<p style='color:#aaa;'>Compra adicionada!</p>";
  falar("Produto adicionado ao carrinho.");
}

/* ================= VOZ ================= */

let recognition = null;
let ouvindo = false;

function startVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { alert("Use o Google Chrome."); return; }

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = async event => {
      const fraseOriginal = event.results[event.results.length-1][0].transcript;
      const frase = normalizar(fraseOriginal);

      document.getElementById("status").innerText = "Você disse: " + fraseOriginal;

      if (bloqueioVoz) return;
      if (frase === ultimaFraseGlobal) return;

      bloqueioVoz = true;
      ultimaFraseGlobal = frase;
      setTimeout(() => { bloqueioVoz = false; }, 1500);

      const cadastrado = await processarCadastroPorVoz(fraseOriginal);
      if (cadastrado) return;

      if (fluxo.ativo) { await processarFluxo(fraseOriginal); return; }

      if (frase.includes("iniciar compra")) iniciarFluxo();
    };

    recognition.onend = () => { if (ouvindo) try { recognition.start(); } catch(e){} };
  }

  if (!ouvindo) { recognition.start(); ouvindo = true; } 
  else { recognition.stop(); ouvindo = false; }
}

/* ================= MENU LATERAL ================= */

function abrirMenu() { document.getElementById("menuLateral").style.left = "0"; }
function fecharMenu() { document.getElementById("menuLateral").style.left = "-260px"; }

function mostrarAba(id) {
  document.querySelectorAll(".aba-lateral").forEach(el => el.style.display = "none");
  const aba = document.getElementById(id);
  if (aba) aba.style.display = "block";
  if (id === "abaProdutos") carregarProdutosNaAba();
  fecharMenu();
}

/* ================= CADASTRO DIRETO AO CLICAR ================= */

async function cadastrarProdutoClicado(produto) {
  if (bloqueioCadastro) return;
  bloqueioCadastro = true;

  falar(`Deseja cadastrar o produto ${produto.nome}?`);
  const confirma = confirm(`Deseja cadastrar o produto ${produto.nome}?`);
  if (!confirma) { bloqueioCadastro = false; return; }

  await addProduto(produto.nome, produto.consumoPessoaDia, produto.tipo);
  await renderProdutos();
  await carregarProdutosNaAba();
  falar("Produto cadastrado com sucesso.");

  setTimeout(() => { bloqueioCadastro = false; }, 500);
}

/* ================= CARREGAR PRODUTOS ABA ================= */

async function carregarProdutosNaAba() {
  const produtos = await getProdutos();
  const container = document.getElementById("listaProdutosAba");
  if (!container) return;

  container.innerHTML = "";

  produtos.forEach(p => {
    const div = document.createElement("div");
    div.style.padding = "10px";
    div.style.borderBottom = "1px solid #ddd";
    div.style.cursor = "pointer";

    div.innerHTML = `<strong>${p.nome}</strong><br>Consumo: ${p.consumoPessoaDia} ${p.tipo} / pessoa/dia`;
    div.addEventListener("pointerdown", () => cadastrarProdutoClicado(p));
    container.appendChild(div);
  });
}

/* ================= START ================= */

window.onload = async () => {
  await initDB();
  await renderList();
  await renderProdutos();
};
