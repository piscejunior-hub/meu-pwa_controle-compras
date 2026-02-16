/* ================= ESTADO ================= */
let catalog = JSON.parse(localStorage.getItem("catalog")) || {};
let history = JSON.parse(localStorage.getItem("history")) || [];

/* ================= SALVAR ================= */
function salvar() {
  localStorage.setItem("catalog", JSON.stringify(catalog));
  localStorage.setItem("history", JSON.stringify(history));
}

/* ================= CADASTRAR PRODUTO ================= */
function cadastrarProduto(nome, unidadeTipo, preco, pesoPorPacote = null) {
  nome = nome.toLowerCase();

  catalog[nome] = {
    nome,
    unidadeTipo,
    preco: parseFloat(preco),
    pesoPorPacote: pesoPorPacote ? parseFloat(pesoPorPacote) : null
  };

  salvar();
  atualizarLista();
}

/* ================= ATUALIZAR LISTA ================= */
function atualizarLista() {
  const lista = document.getElementById("listaProdutos");
  lista.innerHTML = "";

  Object.values(catalog).forEach(prod => {
    const li = document.createElement("li");

    let texto = `${prod.nome} - R$ ${prod.preco.toFixed(2)}`;

    if (prod.unidadeTipo === "pacote" && prod.pesoPorPacote) {
      const precoKg = prod.preco / prod.pesoPorPacote;
      texto += ` (${prod.pesoPorPacote}kg - R$ ${precoKg.toFixed(2)}/kg)`;
    }

    if (prod.unidadeTipo === "kg") {
      texto += " /kg";
    }

    if (prod.unidadeTipo === "unidade") {
      texto += " /un";
    }

    li.textContent = texto;
    lista.appendChild(li);
  });
}

/* ================= VOZ ================= */

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.continuous = false;

  document.getElementById("btnVoz").addEventListener("click", () => {
    recognition.start();
  });

  recognition.onresult = function (event) {
    const texto = event.results[0][0].transcript.toLowerCase();
    processarComandoVoz(texto);
  };
}

function processarComandoVoz(texto) {
  console.log("Comando:", texto);

  // Detectar preço
  const precoMatch = texto.match(/(\d+[.,]?\d*)\s*reais?/);
  const preco = precoMatch ? precoMatch[1].replace(",", ".") : null;

  if (!preco) {
    alert("Não consegui identificar o preço.");
    return;
  }

  // Detectar peso
  const pesoMatch = texto.match(/(\d+[.,]?\d*)\s*quilo/);
  const peso = pesoMatch ? pesoMatch[1].replace(",", ".") : null;

  let unidadeTipo = "unidade";

  if (texto.includes("quilo")) {
    unidadeTipo = peso ? "pacote" : "kg";
  }

  if (texto.includes("unidade")) {
    unidadeTipo = "unidade";
  }

  // Nome do produto (remove palavras-chave)
  let nome = texto
    .replace(/cadastrar|adicionar|pacote|quilo|quilos|unidade|reais?|[0-9.,]/g, "")
    .trim();

  if (!nome) {
    alert("Não consegui identificar o nome do produto.");
    return;
  }

  cadastrarProduto(nome, unidadeTipo, preco, peso);
}

/* ================= INICIAR ================= */
atualizarLista();
