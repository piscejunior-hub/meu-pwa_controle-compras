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

/* ================= ADICIONAR ITEM ================= */
function addItem() {
  const nome = productName.value.trim();
  const preco = num(price.value);
  const pacotes = num(quantity.value);
  const pesoPacote = num(weightPerUnit.value);
  const tipoPreco = priceType.value;

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
  const custo = num(transportCost.value);
  const rateio = cart.length ? custo / cart.length : 0;

  cart.forEach(i => {
    i.rateio = rateio;
    i.total = i.subtotal + rateio;
  });

  calcularConsumo();
}

/* ================= CONSUMO ================= */
function calcularConsumo() {
  const pessoas = num(familySize.value);
  const dias = num(purchaseDays.value);
  if (!pessoas || !dias) return;

  cart.forEach(i => {
    i.consumoPessoaDia = i.quantidadeKg / pessoas / dias;
  });
}

/* ================= CARRINHO ================= */
function renderCart() {
  shoppingList.innerHTML = "";

  cart.forEach((i, idx) => {
    shoppingList.innerHTML += `
      <li class="item-card">
        <strong>${i.nome}</strong><br>
        Quantidade: ${i.pacotes}<br>
        Total: ${i.quantidadeKg.toFixed(2)} kg<br>
        Unitário: ${moeda(i.precoUnitario)}<br>
        Subtotal: ${moeda(i.subtotal)}<br>
        Rateio: ${moeda(i.rateio)}<br>
        Consumo/dia/pessoa: ${i.consumoPessoaDia.toFixed(3)} kg<br>
        <strong>Total: ${moeda(i.total)}</strong><br>
        <button onclick="removeItem(${idx})">🗑 Excluir</button>
      </li>
    `;
  });
}

/* ================= FINALIZAR ================= */
function finalizePurchase() {
  if (!cart.length) return alert("Carrinho vazio");
  if (!market.value.trim()) return alert("Informe o mercado");

  aplicarRateio();

  history.push({
    data: new Date().toLocaleString(),
    mercado: market.value,
    transporte: num(transportCost.value),
    orcamento: num(budget.value),
    itens: JSON.parse(JSON.stringify(cart))
  });

  salvar();
  atualizarHistorico();
  newPurchase();
}

/* ================= VOZ ================= */
let recognition;
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.continuous = true;

  recognition.onresult = e => {
    const texto = e.results[e.results.length - 1][0].transcript.toLowerCase();
    console.log("🎤", texto);
    interpretarComando(texto);
  };
}

function startVoice() {
  if (!recognition) return alert("Voz não suportada");
  recognition.start();
}

/* ================= INTERPRETAÇÃO ================= */
function interpretarComando(t) {
  if (t.includes("produto")) productName.value = t.replace("produto", "").trim();
  if (t.includes("preço")) price.value = extrairNumero(t);
  if (t.includes("quantidade")) quantity.value = extrairNumero(t);
  if (t.includes("peso")) weightPerUnit.value = extrairNumero(t);
  if (t.includes("mercado")) market.value = t.replace("mercado", "").trim();
  if (t.includes("transporte")) transportCost.value = extrairNumero(t);
  if (t.includes("orçamento")) budget.value = extrairNumero(t);
  if (t.includes("pessoas")) familySize.value = extrairNumero(t);
  if (t.includes("dias")) purchaseDays.value = extrairNumero(t);

  if (t.includes("adicionar item")) addItem();
  if (t.includes("finalizar compra")) finalizePurchase();
  if (t.includes("nova compra")) newPurchase();
  if (t.includes("copiar compra")) copyPreviousPurchase();
  if (t.includes("mostrar cupom")) showReceipt();
}

function extrairNumero(t) {
  const n = t.match(/[\d]+([.,]\d+)?/);
  return n ? n[0].replace(",", ".") : "";
}

/* ================= INIT ================= */
renderCatalog();
atualizarHistorico();
analisarMercados();
