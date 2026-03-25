/* ================= CONFIG BANCO ================= */

const DB_NAME = "comprasDB";
const DB_VERSION = 10;

const STORE_ITENS = "itens";
const STORE_PRODUTOS = "produtos";
const STORE_COMPRAS = "compras"; // 👈 FALTAVA ISSO

let db;

/* ================= CONTROLE VOZ GLOBAL ================= */

let ultimaFraseGlobal = "";
let bloqueioVoz = false;


/* ================= PRODUTO GUIA PENDENTE ================= */

let produtoPendenteCadastro = null;

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

      if (!db.objectStoreNames.contains(STORE_PRODUTOS)) {
        db.createObjectStore(STORE_PRODUTOS, {
          keyPath: "id",
          autoIncrement: true
        });
      }


// 🔥 NOVA STORE PARA HISTÓRICO DE COMPRAS
   if (!db.objectStoreNames.contains(STORE_COMPRAS)) {
    db.createObjectStore(STORE_COMPRAS, {
      keyPath: "id",
      autoIncrement: true
    });
  }

}; // fecha onupgradeneeded

}); // fecha Promise

} // fecha função initDB

/* ================= NORMALIZAR ================= */

function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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
    tx.objectStore(STORE_PRODUTOS)
      .getAll()
      .onsuccess = e => resolve(e.target.result || []);
  });
}


/* ================= ATIVAR CLIQUE GUIA ================= */

function ativarCliqueGuia() {

  document.querySelectorAll(".guia-item").forEach(item => {

    item.style.cursor = "pointer";

    item.addEventListener("click", () => {

      const strong = item.querySelector("strong");

      if (!strong) return;

      const nome = strong.innerText.trim();

      const textoCompleto = item.innerText;

      const consumoMatch = textoCompleto.match(/–\s*([\d.]+)\s*(quilo|litro|unidade)/i);

      if (!consumoMatch) return;

      const consumo = parseFloat(consumoMatch[1]);

      let tipo = "kg";

      if (consumoMatch[2].includes("litro")) tipo = "litro";
      if (consumoMatch[2].includes("unidade")) tipo = "unidade";
      if (consumoMatch[2].includes("quilo")) tipo = "kg";

      produtoPendenteCadastro = { nome, consumo, tipo };

      mostrarConfirmacaoCadastro(nome);

      falar(`Deseja cadastrar ${nome}?`);
    });
  });
}


/* ================= CONFIRMAÇÃO GUIA ================= */

function mostrarConfirmacaoCadastro(nome) {

  const container = document.getElementById("formCompra");

  container.innerHTML = `
    <div style="padding:15px; border:1px solid #ddd; border-radius:8px;">
      <h3>Cadastrar Produto</h3>
      <p>Deseja cadastrar <strong>${nome}</strong>?</p>
      <button onclick="confirmarCadastroGuia()">Confirmar</button>
      <button onclick="cancelarCadastroGuia()">Cancelar</button>
    </div>
  `;
}

async function confirmarCadastroGuia() {

  if (!produtoPendenteCadastro) return;

  const produtos = await getProdutos();

  const jaExiste = produtos.some(p =>
    normalizar(p.nome) === normalizar(produtoPendenteCadastro.nome)
  );

  if (jaExiste) {
    falar("Este produto já está cadastrado.");
    cancelarCadastroGuia();
    return;
  }

  await addProduto(
    produtoPendenteCadastro.nome,
    produtoPendenteCadastro.consumo,
    produtoPendenteCadastro.tipo
  );

  await renderProdutos();

  falar("Produto cadastrado com sucesso.");

  cancelarCadastroGuia();
}

function cancelarCadastroGuia() {

  produtoPendenteCadastro = null;

  document.getElementById("formCompra").innerHTML =
    "<p style='color:#aaa;'>Selecione um item do consumo</p>";
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

    div.innerHTML = `
      <strong>${p.nome}</strong>
      (${p.consumoPessoaDia} por pessoa/dia - ${p.tipo})
    `;

    container.appendChild(div);
  });
}

/* ================= CADASTRO MANUAL ================= */

async function cadastrarProduto() {

  const nome = document.getElementById("nomeProduto").value;
  const consumo = document.getElementById("consumoProduto").value;
  const tipo = document.getElementById("tipoProduto").value;

  if (!nome || !consumo) {
    alert("Preencha todos os campos.");
    return;
  }

  await addProduto(nome, consumo, tipo);
  await renderProdutos();

  falar("Produto cadastrado com sucesso.");
}

/* ================= CRUD ITENS ================= */

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

function limparCarrinho() {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).clear().onsuccess = resolve;
  });
}


function updateItem(id, nome, quantidade, preco) {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).put({
      id,
      nome,
      quantidade,
      preco
    }).onsuccess = resolve;
  });
}

function deleteItem(id) {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_ITENS, "readwrite");
    tx.objectStore(STORE_ITENS).delete(id).onsuccess = resolve;
  });
}


/* ================= FINANCEIRO ================= */

function obterValorMonetario(id) {
  const el = document.getElementById(id);
  if (!el) return 0;

  return parseFloat(
    el.innerText
      .replace("R$", "")
      .replace(",", ".")
      .trim()
  ) || 0;
}

function atualizarResumoFinanceiro(totalCompras) {

  const totalEl = document.getElementById("total");

  const orcamento = obterValorMonetario("orcamento");
  const deslocamento = obterValorMonetario("deslocamento");

  const totalGeral = totalCompras + deslocamento;
  const restante = orcamento - totalGeral;

  let cor = restante < 0 ? "red" : "lime";

  totalEl.innerHTML = `
    Total Compras: R$ ${totalCompras.toFixed(2)} <br>
    Deslocamento: R$ ${deslocamento.toFixed(2)} <br>
    <strong>Total Geral: R$ ${totalGeral.toFixed(2)}</strong><br>
    <span style="color:${cor}">
      Orçamento Restante: R$ ${restante.toFixed(2)}
    </span>
  `;

  if (restante < 0) {
    falar("Atenção. Orçamento ultrapassado.");
  }
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

    li.innerHTML = `
      <strong>${item.nome}</strong><br>
      Qtd: ${item.quantidade} |
      Preço: R$ ${item.preco.toFixed(2)} |
      Subtotal: R$ ${subtotal.toFixed(2)}
      <br><br>
      <button onclick="editarItem(${item.id}, '${item.nome}', ${item.quantidade}, ${item.preco})">✏️ Editar</button>
      <button onclick="excluirItem(${item.id})">🗑️ Excluir</button>
    `;

    lista.appendChild(li);
  });

  atualizarResumoFinanceiro(total);
}


/* ================= NUMEROS ================= */

const numerosExtenso = {
  um: 1, dois: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10
};

function extrairNumero(texto) {

  // aceita 32.50 ou 32,50
  const numeroDecimal = texto.match(/\d+[.,]?\d*/);

  if (numeroDecimal) {
    return parseFloat(
      numeroDecimal[0].replace(",", ".")
    );
  }

  for (let palavra in numerosExtenso) {
    if (texto.includes(palavra)) {
      return numerosExtenso[palavra];
    }
  }

  return null;
}


/* ================= CADASTRO POR VOZ ================= */

async function processarCadastroPorVoz(frase) {

  frase = normalizar(frase);

  if (!frase.includes("cadastrar produto") &&
      !frase.includes("novo produto")) {
    return false;
  }

  const regex = /(?:cadastrar produto|novo produto)\s+(\w+).*?consumo\s+([\d.]+)\s+(quilo|kg|litro|unidade)/;

  const match = frase.match(regex);

  if (!match) {
    falar("Não consegui entender o cadastro.");
    return true;
  }

  let nome = match[1];
  let consumo = parseFloat(match[2]);
  let tipoFalado = match[3];

  let tipo = "kg";

  if (tipoFalado.includes("litro")) tipo = "litro";
  if (tipoFalado.includes("unidade")) tipo = "unidade";
  if (tipoFalado.includes("kg") || tipoFalado.includes("quilo")) tipo = "kg";

  await addProduto(nome, consumo, tipo);
  await renderProdutos();

  falar("Produto cadastrado com sucesso.");
  return true;
}

/* ================= FLUXO ================= */

let fluxo = {
  ativo: false,
  etapa: 0,
  mercado: "",
  dias: 0,
  pessoas: 0
};

async function iniciarFluxo() {

  const orcamento = obterValorMonetario("orcamento");

  if (orcamento <= 0) {
    alert("Defina um orçamento antes de iniciar.");
    falar("Defina um orçamento antes de iniciar.");
    return;
  }

  // 🔥 1️⃣ Limpa banco
  await limparCarrinho();

  // 🔥 2️⃣ Limpa visual imediatamente
  const lista = document.getElementById("lista");
  if (lista) lista.innerHTML = "";

  const totalEl = document.getElementById("total");
  if (totalEl) {
    totalEl.innerHTML = `
      Total Compras: R$ 0.00 <br>
      Deslocamento: R$ ${obterValorMonetario("deslocamento").toFixed(2)} <br>
      <strong>Total Geral: R$ ${obterValorMonetario("deslocamento").toFixed(2)}</strong><br>
      <span style="color:lime">
        Orçamento Restante: R$ ${(orcamento - obterValorMonetario("deslocamento")).toFixed(2)}
      </span>
    `;
  }

  // 🔥 3️⃣ Limpa consumo e formulário
  document.getElementById("listaConsumo").innerHTML = "";
  document.getElementById("formCompra").innerHTML = "";

  // 🔥 4️⃣ Reseta fluxo
  fluxo = { ativo: true, etapa: 1, mercado: "", dias: 0, pessoas: 0 };

falar("Nova compra iniciada. Em qual mercado você está?");

}  


/* ================= PROCESSAR FLUXO ================= */

async function processarFluxo(frase) {

  if (!fluxo.ativo) return;

  frase = normalizar(frase);

  /* ================= MERCADO ================= */

  if (fluxo.etapa === 1) {

    fluxo.mercado = frase;

    const campoMercado = document.getElementById("nomeMercado");
    if (campoMercado) {
      campoMercado.value = frase;
    }

    fluxo.etapa = 2;

    falar("Compra para quantos dias?");

    return;
  }

  /* ================= DIAS ================= */

  if (fluxo.etapa === 2) {

    const dias = extrairNumero(frase);

    if (!dias) {
      falar("Não entendi quantos dias. Diga por exemplo: 7 dias.");
      return;
    }

    fluxo.dias = dias;
    fluxo.etapa = 3;

    falar(`Compra para ${dias} dias. Quantas pessoas na casa?`);

    return;
  }

  /* ================= PESSOAS ================= */

  if (fluxo.etapa === 3) {

    const pessoas = extrairNumero(frase);

    if (!pessoas) {
      falar("Não entendi quantas pessoas. Diga por exemplo: 4 pessoas.");
      return;
    }

    fluxo.pessoas = pessoas;
    fluxo.etapa = 4;

    falar(`Ok. ${pessoas} pessoas. Agora diga os produtos que deseja comprar.`);

    return;
  }

  /* ================= PRODUTOS ================= */

  if (fluxo.etapa === 4) {

    const produtos = await getProdutos();
    let listaProdutos = [];

    for (const produtoObj of produtos) {

      const produto = normalizar(produtoObj.nome);

      if (frase.includes(produto)) {

        const consumoPessoaDia = produtoObj.consumoPessoaDia;
        const tipo = produtoObj.tipo;

        const totalNecessario =
          consumoPessoaDia * fluxo.pessoas * fluxo.dias;

        let quantidadeCompra = 0;
        let detalhe = "";

        /* ===== PRODUTO EM KG ===== */

        if (tipo === "kg") {

          const regexPacote = new RegExp(
            produto + "\\s*(?:pacote\\s*de\\s*)?(\\d+)\\s*(kg|quilo|quilos)?"
          );

          const matchPacote = frase.match(regexPacote);

          let pesoPacote = null;

          if (matchPacote && matchPacote[1]) {
            pesoPacote = parseInt(matchPacote[1]);
          }

          if (pesoPacote && pesoPacote > 0) {

            quantidadeCompra =
              Math.ceil(totalNecessario / pesoPacote);

            detalhe = `
              Total necessário: ${totalNecessario.toFixed(2)} kg<br>
              Pacote informado: ${pesoPacote} kg<br>
              <strong>Sugestão: ${quantidadeCompra} pacotes de ${pesoPacote} kg</strong>
            `;

          } else {

            quantidadeCompra = Math.ceil(totalNecessario);

            detalhe = `
              Total necessário: ${totalNecessario.toFixed(2)} kg<br>
              <strong>Sugestão: ${quantidadeCompra} kg</strong>
            `;
          }
        }

        /* ===== PRODUTO EM LITRO ===== */

        if (tipo === "litro") {

          quantidadeCompra = Math.ceil(totalNecessario);

          detalhe = `
            Total necessário: ${totalNecessario.toFixed(2)} litros<br>
            <strong>Sugestão: ${quantidadeCompra} litros</strong>
          `;
        }

        /* ===== PRODUTO EM UNIDADE ===== */

        if (tipo === "unidade") {

          quantidadeCompra = Math.ceil(totalNecessario);

          detalhe = `
            Total necessário: ${Math.ceil(totalNecessario)} unidades<br>
            <strong>Sugestão: ${quantidadeCompra} unidades</strong>
          `;
        }

        listaProdutos.push({
          nome: produtoObj.nome,
          quantidade: quantidadeCompra,
          detalhe
        });
      }
    }

    if (listaProdutos.length === 0) {

      falar("Nenhum produto reconhecido. Tente falar novamente os produtos.");

      return;
    }

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

    // 🔥 ID único para poder remover depois
    div.id = "card-" + normalizar(item.nome);

    div.innerHTML = `
      <div style="margin-bottom:15px; padding:10px; border:1px solid #ddd; border-radius:8px;">
        <strong>${item.nome.toUpperCase()}</strong><br><br>
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

    <button onclick="confirmarCompra('${nome}')">
      Confirmar Compra
    </button>
  `;
}

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

  // 🔥 REMOVE DA TELA DE CONSUMO
  const card = document.getElementById("card-" + normalizar(nome));
  if (card) {
    card.remove();
  }
}



function editarItem(id, nome, quantidade, preco) {

  const form = document.getElementById("formCompra");

  form.innerHTML = `
    <h3>Editar ${nome}</h3>

    <label>Quantidade:</label>
    <input type="number" id="editQtd" value="${quantidade}" step="0.01">

    <label>Preço:</label>
    <input type="number" id="editPreco" value="${preco}" step="0.01">

    <br><br>
    <button onclick="salvarEdicao(${id}, '${nome}')">
      Salvar Alteração
    </button>
  `;
}



async function salvarEdicao(id, nome) {

  const qtd = parseFloat(document.getElementById("editQtd").value);
  const preco = parseFloat(document.getElementById("editPreco").value);

  if (isNaN(qtd) || isNaN(preco) || qtd <= 0 || preco <= 0) {
    alert("Valores inválidos.");
    return;
  }

  await updateItem(id, nome, qtd, preco);
  await renderList();

  document.getElementById("formCompra").innerHTML =
    "<p style='color:#aaa;'>Item atualizado!</p>";

  falar("Item atualizado com sucesso.");
}

async function excluirItem(id) {

  if (!confirm("Deseja excluir este item do carrinho?")) return;

  await deleteItem(id);
  await renderList();

  falar("Item removido do carrinho.");
}


/* ================= Fnalizar compra ================= */

/* ================= FINALIZAR COMPRA ================= */

async function finalizarCompra() {

  const itens = await getItems();

  if (!itens || itens.length === 0) {
    alert("Nenhum item no carrinho.");
    falar("Nenhum item no carrinho.");
    return;
  }

  let total = 0;

  itens.forEach(item => {
    total += item.quantidade * item.preco;
  });

  const nomeMercado = prompt("Nome do mercado onde está comprando?");

const compra = {
  data: new Date().toISOString(),
  mercado: fluxo.mercado,
  itens: itens,
  total: total,
  status: "aberta"
};

  const tx = db.transaction(STORE_COMPRAS, "readwrite");
  const store = tx.objectStore(STORE_COMPRAS);
  store.add(compra);

  tx.oncomplete = async () => {

    await limparCarrinho();
    await renderList();

    alert("Compra finalizada com sucesso!");
    falar("Compra finalizada com sucesso.");
  };
}


/* ================= RETOMAR ÚLTIMA COMPRA ================= */

async function retomarUltimaCompra() {

  const tx = db.transaction(STORE_COMPRAS, "readonly");
  const store = tx.objectStore(STORE_COMPRAS);

  const req = store.getAll();

  return new Promise(resolve => {

    req.onsuccess = async () => {

      const compras = req.result;

      if (!compras.length) {
        falar("Nenhuma compra encontrada.");
        return resolve(null);
      }

      const ultima = compras[compras.length - 1];

      if (ultima.status !== "aberta") {
        falar("A última compra já foi finalizada.");
        return resolve(null);
      }

      // 🔥 LIMPA antes de restaurar
      await limparCarrinho();

      for (const item of ultima.itens) {
        await addItem(item.nome, item.quantidade, item.preco);
      }

      await renderList();

      resolve(ultima);
    };

  });
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

      const fraseOriginal =
        event.results[event.results.length - 1][0].transcript;

      const frase = normalizar(fraseOriginal);

      document.getElementById("status").innerText =
        "Você disse: " + fraseOriginal;

      if (bloqueioVoz) return;
      if (frase === ultimaFraseGlobal) return;

      bloqueioVoz = true;
      ultimaFraseGlobal = frase;

      setTimeout(() => {
        bloqueioVoz = false;
      }, 1500);

      // Confirmação guia
      if (produtoPendenteCadastro) {

        if (frase.includes("sim")) {
          await confirmarCadastroGuia();
          return;
        }

        if (frase.includes("nao")) {
          cancelarCadastroGuia();
          falar("Cadastro cancelado.");
          return;
        }
      }

      // Orçamento
      if (frase.includes("orcamento")) {
        const valor = extrairNumero(frase);
        if (valor) {
          document.getElementById("orcamento").innerText =
            "R$ " + valor.toFixed(2);
          falar("Orçamento definido.");
        }
        return;
      }

      // Deslocamento
      if (frase.includes("deslocamento")) {
        const valor = extrairNumero(frase);
        if (valor) {
          document.getElementById("deslocamento").innerText =
            "R$ " + valor.toFixed(2);
          falar("Deslocamento definido.");
        }
        return;
      }

      const cadastrado =
        await processarCadastroPorVoz(fraseOriginal);

      if (cadastrado) return;

      if (fluxo.ativo) {
        await processarFluxo(fraseOriginal);
        return;
      }

      if (frase.includes("iniciar compra")) {
        iniciarFluxo();
        return;
      }

      if (frase.includes("finalizar compra")) {
        await finalizarCompra();
        return;
      }


/* ================= ESQUECI PRODUTO ================= */

if (frase.includes("esqueci")) {

  const produto = frase
    .replace("esqueci de comprar", "")
    .replace("esqueci comprar", "")
    .replace("esqueci", "")
    .trim();

  if (!produto) {
    falar("O que você esqueceu de comprar?");
    return;
  }

  const compra = await retomarUltimaCompra();

  if (!compra) return;

  await addItem(produto, 1, 0);

  // 🔥 ATUALIZA TAMBÉM NO HISTÓRICO
  compra.itens.push({
    nome: produto,
    quantidade: 1,
    preco: 0
  });

  const tx = db.transaction(STORE_COMPRAS, "readwrite");
  tx.objectStore(STORE_COMPRAS).put(compra);

  await renderList();

  falar(`Retomando compra. ${produto} adicionado.`);

  return;
}

if (frase.includes("finalizar compra")) {
  await finalizarCompra();
  return;
}

    }; // ✅ FECHA onresult CORRETAMENTE

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
 
/* ================= MENU LATERAL ================= */

function abrirMenu() {
  document.getElementById("menuLateral").style.left = "0";
}

function fecharMenu() {
  document.getElementById("menuLateral").style.left = "-260px";
}

function mostrarAba(id) {

  // Esconde todas as abas laterais
  document.querySelectorAll(".aba-lateral")
    .forEach(el => el.style.display = "none");

  // Mostra a aba selecionada
  const aba = document.getElementById(id);
  if (aba) {
    aba.style.display = "block";
  }

  // Se for aba de produtos, carrega a lista
  if (id === "abaProdutos") {
    carregarProdutosNaAba();
  }

if(id === "abaHistorico"){
mostrarHistorico();
}

  // Fecha o menu lateral
  fecharMenu();
}

async function carregarProdutosNaAba() {
  const produtos = await getProdutos();
  const container = document.getElementById("listaProdutosAba");
  if (!container) return;

  container.innerHTML = "";

  produtos.forEach(p => {
    container.innerHTML += `
      <div style="padding:10px;border-bottom:1px solid #ddd">
        <strong>${p.nome}</strong><br>
        Consumo: ${p.consumoPessoaDia} ${p.tipo} / pessoa/dia
      </div>
    `;
  });
}



/* ================= HISTORICO ================= */

function getComprasHistorico(){

return new Promise(resolve=>{

const tx =
db.transaction(STORE_COMPRAS,"readonly");

tx.objectStore(STORE_COMPRAS)
.getAll()
.onsuccess=e=>resolve(e.target.result || []);

});

}




async function mostrarHistorico(){

  const container = document.getElementById("historicoLista");
  if(!container) return;

  const compras = await getComprasHistorico();

  if(compras.length < 2){
    container.innerHTML = "<p>Precisa de pelo menos 2 compras para comparar.</p>";
    return;
  }

  const atual = compras[compras.length - 1];
  const anterior = compras[compras.length - 2];

  let html = `
    <table border="1" style="width:100%; text-align:center;">
      <tr>
        <th>Produto</th>
        <th>${anterior.mercado || "Mercado A"}</th>
        <th>${atual.mercado || "Mercado B"}</th>
        <th>Diferença</th>
        <th>Melhor preço</th>
      </tr>
  `;

  atual.itens.forEach(itemAtual => {

    const itemAnterior = anterior.itens.find(i =>
      normalizar(i.nome) === normalizar(itemAtual.nome)
    );

    const precoA = itemAnterior ? itemAnterior.preco : 0;
    const precoB = itemAtual.preco;

    const diff = precoB - precoA;

    let melhor = "-";

    if (precoA && precoB) {
      melhor = precoA < precoB
        ? anterior.mercado || "A"
        : atual.mercado || "B";
    }

    html += `
      <tr>
        <td>${itemAtual.nome}</td>
        <td>R$ ${precoA.toFixed(2)}</td>
        <td>R$ ${precoB.toFixed(2)}</td>
        <td style="color:${diff > 0 ? 'red' : 'lime'}">
          R$ ${diff.toFixed(2)}
        </td>
        <td>${melhor}</td>
      </tr>
    `;
  });

  html += "</table>";

  container.innerHTML = html;
}



/* ================= START ================= */

window.onload = async () => {
  await initDB();
  await renderList();
  await renderProdutos();
ativarCliqueGuia();
};






