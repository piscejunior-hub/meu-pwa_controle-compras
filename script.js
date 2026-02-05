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

/* ================= ORÇAMENTO ================= */
function atualizarOrcamento() {
  const budgetInput = document.getElementById("budget");
  const info = document.getElementById("budgetInfo");
  if (!budgetInput || !info) return;

  const orcamento = num(budgetInput.value);
  if (!orcamento) {
    info.innerHTML = "";
    return;
  }

  const total = cart.reduce((s, i) => s + i.total, 0);
  const saldo = orcamento - total;

  let cor = "#22c55e";
  if (saldo < orcamento * 0.2) cor = "#facc15";
  if (saldo < 0) cor = "#ef4444";

  info.style.color = cor;
  info.innerHTML = `
    Gasto: <strong>${moeda(total)}</strong><br>
    Saldo: <strong>${moeda(saldo)}</strong>
  `;
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
  if (!hint || !wrapper || !unitSelect) return;

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
  atualizarOrcamento();
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
  atualizarOrcamento();
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

  atualizarOrcamento();
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

/* ================= INIT ================= */
renderCatalog();
atualizarHistorico();
analisarMercados();
atualizarOrcamento();
