/* ===== ESTADO ===== */
let cart = [];
let recognition;

/* ===== UTIL ===== */
function moeda(v){
  return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

/* ===== RENDER ===== */
function renderCart(){
  const ul = document.getElementById("shoppingList");
  ul.innerHTML = "";
  let total = 0;

  cart.forEach(i=>{
    total += i.total;
    ul.innerHTML += `
      <li>
        <strong>${i.nome}</strong><br>
        ${i.quantidade} ${i.unidade} - ${moeda(i.total)}
      </li>`;
  });

  document.getElementById("totalGeral").innerText =
    "Total: " + moeda(total);
}

/* ===== ADICIONAR ===== */
function addItem(nome, qtd, unidade, preco){
  const total = preco;
  cart.push({ nome, quantidade:qtd, unidade, total });

  document.getElementById("lastProduct").innerText = nome;
  document.getElementById("lastQty").innerText = qtd + " " + unidade;
  document.getElementById("lastPrice").innerText = moeda(preco);

  renderCart();
  falar("Produto adicionado");
}

/* ===== VOZ ===== */
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.continuous = false;

  recognition.onresult = e => {
    const texto = e.results[0][0].transcript.toLowerCase();
    document.getElementById("voiceStatus").innerText = texto;
    interpretarComando(texto);
  };

  recognition.onerror = () => {
    document.getElementById("voiceStatus").innerText = "Erro no microfone";
  };
}

function startVoice(){
  if(!recognition) return alert("Navegador não suporta voz");
  recognition.start();
  document.getElementById("voiceStatus").innerText = "Ouvindo...";
}

/* ===== INTERPRETAÇÃO ===== */
function interpretarComando(t){
  // adicionar arroz cinco quilos por trinta reais
  if(t.includes("adicionar")){
    const palavras = t.split(" ");
    const nome = palavras[1];

    const qtd = extrairNumero(t) || 1;
    const unidade = t.includes("quilo") ? "kg" : "un";
    const preco = extrairPreco(t);

    if(preco){
      addItem(nome,qtd,unidade,preco);
    }
  }

  if(t.includes("limpar")){
    cart = [];
    renderCart();
    falar("Carrinho limpo");
  }
}

/* ===== EXTRATORES ===== */
function extrairNumero(t){
  const n = t.match(/\d+/);
  return n ? Number(n[0]) : null;
}

function extrairPreco(t){
  const m = t.match(/(\d+)\s*(real|reais)/);
  return m ? Number(m[1]) : null;
}

/* ===== FEEDBACK FALADO ===== */
function falar(msg){
  const s = new SpeechSynthesisUtterance(msg);
  s.lang = "pt-BR";
  speechSynthesis.speak(s);
}

