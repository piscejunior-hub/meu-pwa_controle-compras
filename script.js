/* ================= ESTADO ================= */
let catalog = JSON.parse(localStorage.getItem("catalog")) || {};
let history = JSON.parse(localStorage.getItem("history")) || [];
let cart = [];

/* ================= UTIL ================= */
function salvar() {
  localStorage.setItem("catalog", JSON.stringify(catalog));
  localStorage.setItem("history", JSON.stringify(history));
}

function moeda(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function num(v) {
  if (v === null || v === undefined || v === "") return 0;
  return parseFloat(String(v).replace(",", ".")) || 0;
}

/* ================= PRODUTOS POR PESO ================= */
const produtosPorPeso = [
  "arroz","feijão","feijao","açúcar","acucar",
  "farinha","macarrão","macarrao",
  "carne","frango","peixe","sal"
];

/* ================= DICA DE PESO ================= */
function mostrarDicaUnidade(nomeProduto) {
  const hint = document.getElementById("unitHint");
  const wrapper = document.getElementById("weightPerUnitWrapper");
  const unitSelect = document.getElementById("unit");

  if (!nomeProduto) {
    hint.style.display = "none";
    wrapper.style.display = "none";
    unitSelect.style.display = "block";
    return;
  }

  const precisaPeso = produtosPorPeso.some(p =>
    nomeProduto.toLowerCase().includes(p)
  );

  if (precisaPeso) {
    hint.innerHTML = "ℹ️ Informe o peso de cada pacote (ex: 5 kg)";
    hint.style.display = "block";
    wrapper.style.display = "block";
    unitSelect.value = "kg";
    unitSelect.style.display = "none";
  } else {
    hint.style.display = "none";
    wrapper.style.display = "none";
    unitSelect.style.display = "block";
  }
}

/* ================= CATÁLOGO ================= */
function renderCatalog() {
  const select = document.getElementById("productSelect");
  if (!select) return;

  select.innerHTML = `<option value="">Selecionar produto</option>`;
  Object.keys(catalog).forEach(nome => {
    select.innerHTML += `<option value="${nome}">${nome}</option>`;
  });
}

document.getElementById("productSelect")?.addEventListener("change", e => {
  const nome = e.target.value;
  if (!catalog[nome]) return;
  document.getElementById("productName").value = nome;
  document.getElementById("price").value = catalog[nome].price.toFixed(2);
  mostrarDicaUnidade(nome);
});

document.getElementById("productName")?.addEventListener("input", e =>
  mostrarDicaUnidade(e.target.value)
);

/* ================= ADICIONAR ITEM ================= */
function addItem() {
  const nome = document.getElementById("productName").value.trim();
  const preco = num(document.getElementById("price").value);
  const pacotes = num(document.getElementById("quantity").value);
  const pesoPacote = num(document.getElementById("weightPerUnit").value);
  const tipoPreco = document.getElementById("priceType").value;

  if (!nome || preco <= 0 || pacotes <= 0) {
    alert("Preencha corretamente os campos");
    return;
  }

  const precisaPeso = produtosPorPeso.some(p =>
    nome.toLowerCase().includes(p)
  );

  if (precisaPeso && pesoPacote <= 0) {
    alert("Informe o peso do pacote");
    return;
  }

  const quantidadeKg = precisaPeso ? pacotes * pesoPacote : pacotes;
  const precoUnitario = tipoPreco === "total" ? preco / pacotes : preco;

  cart.push({
    nome,
    pacotes,
    pesoPacote: precisaPeso ? pesoPacote : null,
    quantidadeKg,
    precoUnitario,
    subtotal: precoUnitario * pacotes,
    rateio: 0,
    total: 0,
    consumoPessoaDia: 0
  });

  catalog[nome] = { price: precoUnitario };

  salvar();
  aplicarRateio();
  renderCart();
  renderCatalog();
  limparCampos();
}

/* ================= RATEIO ================= */
function aplicarRateio() {
  const custo = num(document.getElementById("transportCost").value);
  const rateio = cart.length ? custo / cart.length : 0;

  cart.forEach(i => {
    i.rateio = rateio;
    i.total = i.subtotal + rateio;
  });

  calcularConsumo();
}

/* ================= CONSUMO ================= */
function calcularConsumo() {
  const pessoas = num(document.getElementById("familySize").value);
  const dias = num(document.getElementById("purchaseDays").value);
  if (!pessoas || !dias) return;

  cart.forEach(i => {
    i.consumoPessoaDia = i.quantidadeKg / pessoas / dias;
  });
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
        Quantidade total: ${i.quantidadeKg.toFixed(2)} kg<br>
        Preço unitário: ${moeda(i.precoUnitario)}<br>
        Subtotal: ${moeda(i.subtotal)}<br>
        Rateio: ${moeda(i.rateio)}<br>
        Consumo diário/pessoa: ${i.consumoPessoaDia.toFixed(3)} kg<br>
        <strong>Total: ${moeda(i.total)}</strong><br>
        <button onclick="editItem(${idx})">✏️ Editar</button>
        <button onclick="removeItem(${idx})">🗑 Excluir</button>
      </li>
    `;
  });
}

/* ================= EDITAR / REMOVER ================= */
function editItem(idx) {
  const i = cart[idx];
  const novoPreco = num(prompt("Novo preço unitário:", i.precoUnitario));
  const novosPacotes = num(prompt("Nova quantidade:", i.pacotes));
  if (novoPreco <= 0 || novosPacotes <= 0) return;

  i.precoUnitario = novoPreco;
  i.pacotes = novosPacotes;
  i.subtotal = novoPreco * novosPacotes;
  i.quantidadeKg = i.pesoPacote ? novosPacotes * i.pesoPacote : novosPacotes;

  aplicarRateio();
  renderCart();
}

function removeItem(idx) {
  cart.splice(idx, 1);
  aplicarRateio();
  renderCart();
}

/* ================= FINALIZAR ================= */
function finalizePurchase() {
  if (!cart.length) return alert("Carrinho vazio");
  const market = document.getElementById("market").value.trim();
  if (!market) return alert("Informe o mercado");

  aplicarRateio();

  history.push({
    data: new Date().toLocaleString(),
    mercado: market,
    transporte: num(document.getElementById("transportCost").value),
    orcamento: num(document.getElementById("budget").value),
    itens: JSON.parse(JSON.stringify(cart))
  });

  salvar();
  atualizarHistorico();
  gerarComparacao();
  analisarMercados();
  newPurchase();
}

/* ================= COPIAR COMPRA ANTERIOR ================= */
function copyPreviousPurchase() {
  if (!history.length) return alert("Nenhuma compra anterior");

  const ultima = history.at(-1);
  cart = JSON.parse(JSON.stringify(ultima.itens));

  document.getElementById("transportCost").value = ultima.transporte || "";
  document.getElementById("budget").value = ultima.orcamento || "";

  renderCart();
}

/* ================= HISTÓRICO / CUPOM ================= */
function atualizarHistorico() {
  const select = document.getElementById("historySelect");
  select.innerHTML = `<option value="">Selecione</option>`;

  history.forEach((h, i) => {
    select.innerHTML += `
      <option value="${i}">
        ${h.data} - ${h.mercado}
      </option>
    `;
  });
}

function showReceipt() {
  const idx = document.getElementById("historySelect").value;
  const h = history[idx];
  if (!h) return;

  const div = document.getElementById("receipt");
  let subtotalProdutos = 0;
  let totalRateio = 0;

  div.innerHTML = `
    <h3>🧾 CUPOM FISCAL</h3>
    <strong>Mercado:</strong> ${h.mercado}<br>
    <strong>Data:</strong> ${h.data}
    <hr>
  `;

  h.itens.forEach(i => {
    subtotalProdutos += i.subtotal;
    totalRateio += i.rateio;

    div.innerHTML += `
      <strong>${i.nome}</strong><br>
      Quantidade: ${i.pacotes}<br>
      Quantidade total: ${i.quantidadeKg.toFixed(2)} kg<br>
      Unitário: ${moeda(i.precoUnitario)}<br>
      Subtotal: ${moeda(i.subtotal)}<br>
      Rateio: ${moeda(i.rateio)}<br>
      Consumo diário/pessoa: ${i.consumoPessoaDia.toFixed(3)} kg
      <hr>
    `;
  });

  div.innerHTML += `
    <strong>Subtotal produtos:</strong> ${moeda(subtotalProdutos)}<br>
    <strong>Deslocamento:</strong> ${moeda(totalRateio)}<br>
    <hr>
    <h3>Total geral: ${moeda(subtotalProdutos + totalRateio)}</h3>
  `;
}

/* ================= COMPARAÇÃO ================= */
function gerarComparacao() {
  const tbody = document.getElementById("compareTable");
  if (!tbody || history.length < 2) return;

  tbody.innerHTML = "";
  const a = history.at(-1), b = history.at(-2);

  a.itens.forEach(i => {
    const ant = b.itens.find(x => x.nome === i.nome);
    if (!ant) return;

    tbody.innerHTML += `
      <tr>
        <td>${i.nome}</td>
        <td>${moeda(ant.precoUnitario)}</td>
        <td>${moeda(i.precoUnitario)}</td>
        <td>${moeda(i.precoUnitario - ant.precoUnitario)}</td>
      </tr>`;
  });
}

/* ================= MELHOR MERCADO ================= */
function analisarMercados() {
  const div = document.getElementById("melhorMercado");
  if (!div || history.length < 2) return;

  const resumo = {};
  history.forEach(c => {
    const total = c.itens.reduce((s, i) => s + i.total, 0);
    resumo[c.mercado] = resumo[c.mercado] || { total: 0, n: 0 };
    resumo[c.mercado].total += total;
    resumo[c.mercado].n++;
  });

  const melhor = Object.entries(resumo)
    .map(([m, d]) => ({ m, media: d.total / d.n }))
    .sort((a, b) => a.media - b.media)[0];

  div.innerHTML = `🏆 ${melhor.m} – Média ${moeda(melhor.media)}`;
}

/* ================= LIMPAR / NOVA COMPRA ================= */
function limparCampos() {
  ["productName","price","quantity","weightPerUnit"].forEach(id =>
    document.getElementById(id).value = ""
  );
}

function newPurchase() {
  cart = [];
  renderCart();
  document.getElementById("market").value = "";
  document.getElementById("transportCost").value = "";
}

/* ================= VOZ ================= */
let recognition;
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "pt-BR";
}
function startVoice() {
  if (!recognition) return alert("Voz não suportada");
  recognition.start();
}

/* ================= INIT ================= */
renderCatalog();
atualizarHistorico();
analisarMercados();


