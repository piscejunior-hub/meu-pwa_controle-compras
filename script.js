document.addEventListener("DOMContentLoaded", function () {

/* ================= ESTADO ================= */
let catalog = JSON.parse(localStorage.getItem("catalog")) || {};
let cart = [];

/* ================= UTIL ================= */
function salvar() {
  localStorage.setItem("catalog", JSON.stringify(catalog));
}

function moeda(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function num(v) {
  if (!v) return 0;
  return parseFloat(String(v).replace(",", ".")) || 0;
}

/* ================= PRODUTOS POR PESO ================= */
const produtosPorPeso = [
  "arroz","feijão","feijao","açúcar","acucar",
  "farinha","macarrão","macarrao",
  "carne","frango","peixe","sal"
];

/* ================= CONSUMO MÉDIO ================= */
const consumoMedio = {
  arroz: 0.1,
  feijão: 0.12,
  feijao: 0.12,
  carne: 0.18,
  leite: 0.2
};

/* ================= ADICIONAR ITEM ================= */
window.addItem = function () {

  const nome = document.getElementById("productName").value.trim();
  const preco = num(document.getElementById("price").value);
  const pacotes = num(document.getElementById("quantity").value);
  const pesoPacote = num(document.getElementById("weightPerUnit").value);
  const tipoPreco = document.getElementById("priceType").value;

  if (!nome || preco <= 0 || pacotes <= 0) {
    alert("Preencha corretamente os campos.");
    return;
  }

  const precisaPeso = produtosPorPeso.some(p =>
    nome.toLowerCase().includes(p)
  );

  const quantidadeKg = precisaPeso ? pacotes * pesoPacote : pacotes;

  const precoUnitario =
    tipoPreco === "total" ? preco / pacotes : preco;

  cart.push({
    nome,
    pacotes,
    quantidadeKg,
    subtotal: precoUnitario * pacotes,
    rateio: 0,
    total: 0
  });

  catalog[nome] = { price: precoUnitario };

  salvar();
  aplicarRateio();
  renderCart();
  limparCampos();
};

/* ================= RATEIO ================= */
function aplicarRateio() {
  const custo = num(document.getElementById("transportCost").value);
  const rateio = cart.length ? custo / cart.length : 0;

  cart.forEach(i => {
    i.rateio = rateio;
    i.total = i.subtotal + rateio;
  });

  calcularDuracaoEstoque();
  verificarOrcamento();
}

/* ================= DURAÇÃO ================= */
function calcularDuracaoEstoque() {

  const pessoas = num(document.getElementById("familySize").value);
  const div = document.getElementById("duracaoEstoque");

  if (!pessoas || !div) {
    div.innerHTML = "";
    return;
  }

  let menorDuracao = Infinity;
  let produtoCritico = "";

  div.innerHTML = "<h3>📦 Duração do abastecimento</h3>";

  cart.forEach(i => {

    const chave = Object.keys(consumoMedio)
      .find(k => i.nome.toLowerCase().includes(k));

    if (!chave) return;

    const consumoCasaDia = consumoMedio[chave] * pessoas;
    if (consumoCasaDia === 0) return;

    const duracao = i.quantidadeKg / consumoCasaDia;

    if (duracao < menorDuracao) {
      menorDuracao = duracao;
      produtoCritico = i.nome;
    }

    div.innerHTML += `${i.nome}: ${duracao.toFixed(1)} dias<br>`;
  });

  if (produtoCritico) {
    div.innerHTML += `
      <hr>
      ⚠ Produto que acaba primeiro:
      <strong>${produtoCritico} (${menorDuracao.toFixed(1)} dias)</strong>
    `;
  }
}

/* ================= ORÇAMENTO ================= */
function verificarOrcamento() {

  const budget = num(document.getElementById("budget").value);
  const info = document.getElementById("budgetInfo");

  if (!budget) {
    info.innerHTML = "";
    return;
  }

  const totalFinal = cart.reduce((s, i) => s + i.total, 0);

  if (totalFinal > budget) {
    info.innerHTML =
      `⚠ Você ultrapassou em ${moeda(totalFinal - budget)}`;
    info.style.color = "red";
  } else {
    info.innerHTML =
      `✅ Restam ${moeda(budget - totalFinal)}`;
    info.style.color = "lightgreen";
  }
}

/* ================= CARRINHO ================= */
function renderCart() {
  const ul = document.getElementById("shoppingList");
  ul.innerHTML = "";

  cart.forEach((i, idx) => {
    ul.innerHTML += `
      <li class="item-card">
        <strong>${i.nome}</strong><br>
        Quantidade: ${i.pacotes}<br>
        Total: ${moeda(i.total)}<br>
        <button onclick="removeItem(${idx})">Excluir</button>
      </li>
    `;
  });
}

/* ================= REMOVER ================= */
window.removeItem = function (idx) {
  cart.splice(idx, 1);
  aplicarRateio();
  renderCart();
};

/* ================= LIMPAR ================= */
function limparCampos() {
  ["productName","price","quantity","weightPerUnit"]
  .forEach(id => document.getElementById(id).value = "");
}

/* ================= EVENTOS ================= */
document.getElementById("budget")
  .addEventListener("input", verificarOrcamento);

document.getElementById("familySize")
  .addEventListener("input", aplicarRateio);

document.getElementById("transportCost")
  .addEventListener("input", aplicarRateio);

/* ================= VOZ ================= */
let recognition;

if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "pt-BR";

  recognition.onresult = function (event) {
    const texto = event.results[0][0].transcript.toLowerCase();
    document.getElementById("productName").value =
      texto.split(" ")[0];
  };
}

window.startVoice = function () {
  if (!recognition) {
    alert("Use Google Chrome.");
    return;
  }
  recognition.start();
};

});
