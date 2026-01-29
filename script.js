let cart = [];
let total = 0;

const statusEl = document.getElementById("voiceStatus");
const cartEl = document.getElementById("cart");
const totalEl = document.getElementById("total");
const currentEl = document.getElementById("currentProduct");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const recognition = new SpeechRecognition();
recognition.lang = "pt-BR";
recognition.continuous = false;

recognition.onresult = e => {
  const texto = e.results[0][0].transcript.toLowerCase();
  statusEl.textContent = "🎧 " + texto;
  interpretar(texto);
};

function startVoice() {
  statusEl.textContent = "🎤 Ouvindo...";
  recognition.start();
}

function interpretar(frase) {

  if (frase.includes("finalizar")) {
    finalizar();
    return;
  }

  if (frase.includes("nova")) {
    nova();
    return;
  }

  const match = frase.match(/adicionar (.+?) (\d+) (quilo|quilos|unidade|unidades) (.+?) reais/);

  if (match) {
    const nome = match[1];
    const qtd = parseFloat(match[2]);
    const preco = parseFloat(match[4]);

    cart.push({ nome, qtd, preco });
    total += preco;

    currentEl.textContent = `${nome} (${qtd})`;
    render();
  }
}

function render() {
  cartEl.innerHTML = "";
  cart.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.nome} - R$ ${p.preco.toFixed(2)}`;
    cartEl.appendChild(li);
  });
  totalEl.textContent = "Total: R$ " + total.toFixed(2);
}

function finalizar() {
  alert("Compra finalizada! Total: R$ " + total.toFixed(2));
}

function nova() {
  cart = [];
  total = 0;
  render();
}
