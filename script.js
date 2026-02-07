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

/* ================= VOZ ================= */
let recognition;
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.continuous = false;

  recognition.onresult = e => {
    const texto = e.results[0][0].transcript.toLowerCase();

    const preco = texto.match(/preço\s([\d,.]+)/);
    const qtd = texto.match(/quantidade\s(\d+)/);
    const peso = texto.match(/peso\s([\d,.]+)/);

    if (preco) document.getElementById("price").value = preco[1];
    if (qtd) document.getElementById("quantity").value = qtd[1];
    if (peso) document.getElementById("weightPerUnit").value = peso[1];

    const nome = texto
      .replace(/preço.*|quantidade.*|peso.*|adicionar.*|limpar.*/g, "")
      .trim();

    if (nome) {
      document.getElementById("productName").value = nome;
      mostrarDicaUnidade(nome);
    }

    if (texto.includes("adicionar")) addItem();
    if (texto.includes("limpar")) limparCampos();
  };
}

function startVoice() {
  if (!recognition) return alert("Voz não suportada");
  recognition.start();
}

/* ================= INIT ================= */
renderCatalog();
atualizarHistorico();
analisarMercados();
