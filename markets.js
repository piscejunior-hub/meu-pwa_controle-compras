import { history } from "./state.js";
import { moeda } from "./utils.js";

export function analisarMercados() {
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
