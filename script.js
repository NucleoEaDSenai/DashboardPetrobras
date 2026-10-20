// Os dados lançados (valores, quinzenas, quantitativos) ficam em dados.js,
// carregado antes deste arquivo.

// ============== CONSTANTES E VALORES DERIVADOS ==============
const meses = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
const mesesExtenso = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// Total mensal de 2026 = soma das medições do mês (null = mês sem medição)
const d2026 = meses.map((_, m) => {
  const doMes = quinzenas2026.filter((q) => q.mes === m);
  if (!doMes.length) return null;
  const soma = doMes.reduce((s, q) => s + q.valor, 0);
  return Math.round(soma * 100) / 100;
});

const fmtBRL = (v) =>
  v == null
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtCurto = (v) => (v == null ? "" : "R$ " + (v / 1000).toFixed(0) + "k");

const somaAno = (dados) => dados.reduce((s, v) => s + (v ?? 0), 0);
const mesesCom2026 = d2026.filter((v) => v != null).length;
const parcial2026 = mesesCom2026 < 12;
const ultimoMes2026 = mesesExtenso[mesesCom2026 - 1].toLowerCase();

document.getElementById("atualizadoEm").textContent = `${ultimoMes2026}/2026`;
document.getElementById("totaisSub").textContent = parcial2026
  ? `2026 ainda em curso — jan a ${meses[mesesCom2026 - 1].toLowerCase()} considerados.`
  : "Todos os exercícios fechados.";

// ============== KPIs ==============
// Valor em R$ com os centavos menores (classe .cents)
const fmtKpi = (v) => {
  const [inteiro, centavos] = fmtBRL(v).split(",");
  return `${inteiro}<span class="cents">,${centavos}</span>`;
};
const fmtBRLSemCentavos = (v) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

const anosKpi = [
  ["2024", d2024],
  ["2025", d2025],
  ["2026", d2026],
];
let htmlKpis = "";
let totalAcumulado = 0;
let mesesAcumulados = 0;
anosKpi.forEach(([ano, dados], i) => {
  const total = somaAno(dados);
  const qtdMeses = dados.filter((v) => v != null).length;
  const parcial = qtdMeses < 12;
  const ultimo = i === anosKpi.length - 1;
  totalAcumulado += total;
  mesesAcumulados += qtdMeses;

  // Lado direito: período (ano em curso), variação vs ano anterior ou nº de meses
  let lateral = `<span>${qtdMeses} meses</span>`;
  if (parcial) {
    lateral = `<span>Jan a ${meses[qtdMeses - 1]} (fechado)</span>`;
  } else if (i > 0) {
    const anterior = somaAno(anosKpi[i - 1][1]);
    const pct = ((total - anterior) / anterior) * 100;
    const cor = pct >= 0 ? "var(--green-mid)" : "var(--danger)";
    lateral = `<span style="color: ${cor}; font-weight: 500;">${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% vs ${anosKpi[i - 1][0]}</span>`;
  }

  htmlKpis += `
    <div class="kpi${ultimo ? " featured" : ""}">
      ${parcial ? '<div class="kpi-tag">Em curso</div>' : ""}
      <div class="kpi-year">Exercício ${ano}</div>
      <div class="kpi-value">${fmtKpi(total)}</div>
      <div class="kpi-meta">
        <span>Média: <strong>${fmtBRLSemCentavos(total / qtdMeses)}</strong></span>
        ${lateral}
      </div>
    </div>
  `;
});
htmlKpis += `
  <div class="kpi">
    <div class="kpi-year">Total acumulado</div>
    <div class="kpi-value">${fmtKpi(totalAcumulado)}</div>
    <div class="kpi-meta">
      <span>${mesesAcumulados} meses computados</span>
      <span><strong>${anosKpi.length} anos</strong></span>
    </div>
  </div>
`;
document.getElementById("kpis").innerHTML = htmlKpis;

// ============== INSIGHTS ==============
// Números calculados dos dados; a interpretação vem de comentariosInsights (dados.js)
const fmtPct = (p) => `${p >= 0 ? "+" : ""}${p.toFixed(0)}%`;
const cardInsight = (rotulo, titulo, destaque, texto, comentario) => `
  <div class="insight">
    <div class="insight-label">${rotulo}</div>
    <h3>${titulo}</h3>
    <span class="num-big">${destaque}</span>
    <p>${texto}${comentario ? " " + comentario : ""}</p>
  </div>
`;
let htmlInsights = "";

// 1. Crescimento: último ano fechado vs o anterior
const fechados = anosKpi.filter(([, d]) => d.every((v) => v != null));
if (fechados.length >= 2) {
  const [anoA, dadosA] = fechados[fechados.length - 2];
  const [anoB, dadosB] = fechados[fechados.length - 1];
  const dif = somaAno(dadosB) - somaAno(dadosA);
  const pct = (dif / somaAno(dadosA)) * 100;
  htmlInsights += cardInsight(
    "Crescimento",
    dif >= 0 ? `${anoB} superou ${anoA}` : `${anoB} ficou abaixo de ${anoA}`,
    fmtPct(pct),
    `O exercício ${anoB} fechou ${fmtBRL(Math.abs(dif))} ${dif >= 0 ? "acima" : "abaixo"} de ${anoA}.`,
    comentariosInsights.crescimento,
  );
}

// 2. Aceleração: ano atual vs mesmo período do ano anterior
const [anoCorrente, dadosCorrente] = anosKpi[anosKpi.length - 1];
const [anoAnt, dadosAnt] = anosKpi[anosKpi.length - 2];
const mesesCorrente = dadosCorrente.filter((v) => v != null).length;
const acumCorrente = somaAno(dadosCorrente.slice(0, mesesCorrente));
const acumAnt = somaAno(dadosAnt.slice(0, mesesCorrente));
const pctPeriodo = ((acumCorrente - acumAnt) / acumAnt) * 100;
const periodoTxt = `jan a ${meses[mesesCorrente - 1].toLowerCase()}`;
htmlInsights += cardInsight(
  pctPeriodo >= 0 ? "Aceleração" : "Desaceleração",
  `${anoCorrente} ${pctPeriodo >= 0 ? "supera" : "fica abaixo de"} ${anoAnt} no mesmo período`,
  fmtPct(pctPeriodo),
  `De ${periodoTxt}, ${anoCorrente} acumula ${fmtBRL(acumCorrente)} contra ${fmtBRL(acumAnt)} no mesmo período de ${anoAnt}.`,
  comentariosInsights.aceleracao,
);

// 3. Pico histórico: maior mês de toda a série
let pico = { v: -Infinity };
anosKpi.forEach(([ano, dados]) =>
  dados.forEach((v, i) => {
    if (v != null && v > pico.v) pico = { ano, i, v };
  }),
);
const nomePico = `${mesesExtenso[pico.i]}/${pico.ano}`;
const partesPico =
  pico.ano === "2026" ? quinzenas2026.filter((q) => q.mes === pico.i) : [];
const textoPico =
  partesPico.length > 1
    ? `Somando as ${partesPico.length} quinzenas (${partesPico.map((q) => fmtBRL(q.valor)).join(" + ")}), ${nomePico.toLowerCase()} se tornou o maior mês em ${anosKpi.length} anos de medições.`
    : `Com ${fmtBRL(pico.v)}, ${nomePico.toLowerCase()} é o maior mês em ${anosKpi.length} anos de medições.`;
htmlInsights += cardInsight(
  "Pico histórico",
  `${nomePico} é o maior mês da série`,
  `R$ ${Math.round(pico.v / 1000)}mil`,
  textoPico,
  comentariosInsights.pico,
);

// 4. Consistência: meses do ano atual acima da média mensal do ano anterior
const mediaAnt = somaAno(dadosAnt) / dadosAnt.filter((v) => v != null).length;
const acimaMedia = dadosCorrente.filter((v) => v != null && v > mediaAnt).length;
htmlInsights += cardInsight(
  "Consistência",
  acimaMedia > mesesCorrente / 2
    ? `${anoCorrente} acima da média de ${anoAnt} na maioria dos meses`
    : `${anoCorrente} acima da média de ${anoAnt} em poucos meses`,
  `${acimaMedia} de ${mesesCorrente}`,
  `${acimaMedia} dos ${mesesCorrente} meses de ${anoCorrente} superaram a média mensal de ${anoAnt} (${fmtBRLSemCentavos(mediaAnt)}).`,
  comentariosInsights.consistencia,
);

document.getElementById("insights").innerHTML = htmlInsights;

// Configurações compartilhadas Chart.js
Chart.defaults.font.family = "'IBM Plex Sans', system-ui, sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = "#3c4944";
Chart.defaults.borderColor = "#ecefe8";

// ============== GRÁFICO 1: EVOLUÇÃO ==============
new Chart(document.getElementById("chartEvolucao"), {
  type: "line",
  data: {
    labels: meses,
    datasets: [
      {
        label: "2024",
        data: d2024,
        borderColor: "#6b7770",
        backgroundColor: "#6b7770",
        borderDash: [6, 4],
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 7,
        borderWidth: 2,
      },
      {
        label: "2025",
        data: d2025,
        borderColor: "#1f5fa8",
        backgroundColor: "#1f5fa8",
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 7,
        borderWidth: 2,
      },
      {
        label: "2026",
        data: d2026,
        borderColor: "#00643c",
        backgroundColor: "#00643c",
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 8,
        borderWidth: 3,
        spanGaps: false,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0d1f1a",
        padding: 12,
        cornerRadius: 8,
        titleFont: { weight: 600 },
        callbacks: {
          label: (ctx) =>
            "  " + ctx.dataset.label + ": " + fmtBRL(ctx.parsed.y),
        },
      },
    },
    scales: {
      x: { ticks: { autoSkip: false }, grid: { display: false } },
      y: {
        ticks: { callback: (v) => fmtCurto(v) },
        grid: { color: "#ecefe8" },
        beginAtZero: true,
      },
    },
  },
});

// ============== GRÁFICO 2: TOTAIS ==============
new Chart(document.getElementById("chartTotais"), {
  type: "bar",
  data: {
    labels: ["2024", "2025", parcial2026 ? "2026 (parcial)" : "2026"],
    datasets: [
      {
        data: [somaAno(d2024), somaAno(d2025), somaAno(d2026)],
        backgroundColor: ["#6b7770", "#1f5fa8", "#00643c"],
        borderRadius: 8,
        barThickness: 32,
      },
    ],
  },
  options: {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0d1f1a",
        padding: 12,
        cornerRadius: 8,
        callbacks: { label: (ctx) => fmtBRL(ctx.parsed.x) },
      },
    },
    scales: {
      x: {
        ticks: { callback: (v) => fmtCurto(v) },
        grid: { color: "#ecefe8" },
      },
      y: { grid: { display: false } },
    },
  },
});

// ============== GRÁFICO 3: QUINZENAS ==============
new Chart(document.getElementById("chart2026"), {
  type: "bar",
  data: {
    labels: quinzenas2026.map(
      (q) => meses[q.mes] + (q.parte ? ` ${q.parte}ª` : ""),
    ),
    datasets: [
      {
        data: quinzenas2026.map((q) => q.valor),
        backgroundColor: (ctx) => {
          const v = ctx.parsed.y;
          if (v >= 70000) return "#00643c";
          if (v >= 40000) return "#008d4c";
          return "#a8c8b5";
        },
        borderRadius: 6,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0d1f1a",
        padding: 12,
        cornerRadius: 8,
        callbacks: { label: (ctx) => fmtBRL(ctx.parsed.y) },
      },
    },
    scales: {
      x: {
        ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 },
        grid: { display: false },
      },
      y: {
        ticks: { callback: (v) => fmtCurto(v) },
        grid: { color: "#ecefe8" },
        beginAtZero: true,
      },
    },
  },
});

// ============== PICOS E VALES ==============
const boxPicos = document.getElementById("picosVales");
[
  ["2024", d2024],
  ["2025", d2025],
  ["2026", d2026],
].forEach(([ano, dados]) => {
  const validos = dados
    .map((v, i) => ({ v, i }))
    .filter((p) => p.v != null);
  const maior = validos.reduce((a, b) => (b.v > a.v ? b : a));
  const menor = validos.reduce((a, b) => (b.v < a.v ? b : a));
  const parcial = validos.length < 12 ? " (parcial)" : "";
  boxPicos.insertAdjacentHTML(
    "beforeend",
    `
      <div class="highlight">
        <div class="highlight-year">${ano}${parcial}</div>
        <div class="highlight-row"><span class="arrow up">▲</span> Maior · ${mesesExtenso[maior.i]} <strong>${fmtBRL(maior.v)}</strong></div>
        <div class="highlight-row"><span class="arrow down">▼</span> Menor · ${mesesExtenso[menor.i]} <strong>${fmtBRL(menor.v)}</strong></div>
      </div>
    `,
  );
});

// ============== TABELA ==============
const tbody = document.getElementById("tabelaCorpo");
meses.forEach((m, i) => {
  const v25 = d2025[i],
    v26 = d2026[i];
  let varCell = '<span class="empty">—</span>';
  if (v25 != null && v26 != null) {
    const pct = ((v26 - v25) / v25) * 100;
    const cor = pct >= 0 ? "var(--green-mid)" : "var(--danger)";
    const sinal = pct >= 0 ? "+" : "";
    varCell = `<span style="color:${cor}; font-weight:500;">${sinal}${pct.toFixed(1)}%</span>`;
  }
  tbody.insertAdjacentHTML(
    "beforeend",
    `
      <tr>
        <td><strong>${m}</strong></td>
        <td class="num">${d2024[i] != null ? fmtBRL(d2024[i]) : '<span class="empty">—</span>'}</td>
        <td class="num">${v25 != null ? fmtBRL(v25) : '<span class="empty">—</span>'}</td>
        <td class="num">${v26 != null ? fmtBRL(v26) : '<span class="empty">—</span>'}</td>
        <td class="num">${varCell}</td>
      </tr>
    `,
  );
});

document.getElementById("tabelaRodape").innerHTML = `
  <tr>
    <td>Total</td>
    <td class="num">${fmtBRL(somaAno(d2024))}</td>
    <td class="num">${fmtBRL(somaAno(d2025))}</td>
    <td class="num">${fmtBRL(somaAno(d2026))}${parcial2026 ? "*" : ""}</td>
    <td class="num">—</td>
  </tr>
`;
document.getElementById("tabelaNota").textContent = parcial2026
  ? `* 2026 parcial — janeiro a ${ultimoMes2026} (fechado).`
  : "";

// ============== MEDIÇÕES DAS QUINZENAS 2026 ==============
const tbodyQuinzenas = document.getElementById("quinzenasCorpo");
quinzenas2026.forEach((q) => {
  const nome = mesesExtenso[q.mes] + (q.parte ? ` ${q.parte}` : "");
  const periodo = q.periodo + (q.parte ? "" : " · medição única");
  tbodyQuinzenas.insertAdjacentHTML(
    "beforeend",
    `<tr><td><strong>${nome}</strong></td><td>${periodo}</td><td class="num">${fmtBRL(q.valor)}</td></tr>`,
  );
});

// ============== QUANTITATIVO POR CÓDIGO DE SERVIÇO ==============
const anosQtd = Object.keys(QTD);
// Último mês com quantitativo lançado em cada ano
const mesesAno = Object.fromEntries(
  anosQtd.map((a) => [a, Math.max(...Object.keys(QTD[a]).map(Number))]),
);
const codigos = Object.keys(SERVICOS)
  .map(Number)
  .sort((a, b) => a - b);
const corAno = { 2024: "#6b7770", 2025: "#1f5fa8", 2026: "#00643c" };

const qtdDe = (ano, mes, cod) => (QTD[ano][mes] && QTD[ano][mes][cod]) || 0;
const totalMes = (ano, mes, cod) =>
  cod === "todos"
    ? Object.values(QTD[ano][mes] || {}).reduce((s, v) => s + v, 0)
    : qtdDe(ano, mes, cod);

// --- Série cronológica completa e período selecionado ---
const serie = [];
const idxSerie = {};
anosQtd.forEach((ano) => {
  for (let m = 1; m <= mesesAno[ano]; m++) {
    idxSerie[ano + "-" + m] = serie.length;
    serie.push({ ano, mes: m, label: meses[m - 1] + "/" + ano.slice(2) });
  }
});
const periodo = { ini: 0, fim: serie.length - 1 };
const fatiaPeriodo = () => serie.slice(periodo.ini, periodo.fim + 1);
let anoAtivo = "2026";

// --- Controles do período ---
const selDe = document.getElementById("selDe");
const selAte = document.getElementById("selAte");
serie.forEach((s, i) => {
  const opt = `<option value="${i}">${meses[s.mes - 1]}/${s.ano}</option>`;
  selDe.insertAdjacentHTML("beforeend", opt);
  selAte.insertAdjacentHTML("beforeend", opt);
});

const atalhos = [
  { id: "tudo", nome: "Todo o período", faixa: () => [0, serie.length - 1] },
];
anosQtd.forEach((a) =>
  atalhos.push({
    id: a,
    nome: a,
    faixa: () => [idxSerie[a + "-1"], idxSerie[a + "-" + mesesAno[a]]],
  }),
);
atalhos.push({
  id: "12m",
  nome: "Últimos 12 meses",
  faixa: () => [Math.max(0, serie.length - 12), serie.length - 1],
});
const boxAtalhos = document.getElementById("periodoAtalhos");
atalhos.forEach((a) =>
  boxAtalhos.insertAdjacentHTML(
    "beforeend",
    `<button type="button" class="atalho" data-id="${a.id}">${a.nome}</button>`,
  ),
);

// --- Gráfico: meses do período com filtro por código ---
const selCodigo = document.getElementById("selCodigo");
selCodigo.insertAdjacentHTML(
  "beforeend",
  '<option value="todos">Todos os códigos (total de itens)</option>',
);
codigos.forEach((c) => {
  selCodigo.insertAdjacentHTML(
    "beforeend",
    `<option value="${c}">${c} — ${SERVICOS[c]}</option>`,
  );
});

const dadosGrafico = (cod) =>
  fatiaPeriodo().map((s) =>
    totalMes(s.ano, String(s.mes), cod === "todos" ? "todos" : String(cod)),
  );

const chartQtd = new Chart(document.getElementById("chartQtd"), {
  type: "bar",
  data: {
    labels: serie.map((s) => s.label),
    datasets: [
      {
        data: dadosGrafico("todos"),
        backgroundColor: serie.map((s) => corAno[s.ano]),
        borderRadius: 4,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0d1f1a",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) =>
            ctx.parsed.y + (ctx.parsed.y === 1 ? " item" : " itens"),
        },
      },
    },
    scales: {
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: 60,
          minRotation: 60,
          font: { size: 10 },
        },
        grid: { display: false },
      },
      y: {
        grid: { color: "#ecefe8" },
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  },
});

function atualizarGrafico() {
  const fatia = fatiaPeriodo();
  chartQtd.data.labels = fatia.map((s) => s.label);
  chartQtd.data.datasets[0].data = dadosGrafico(selCodigo.value);
  chartQtd.data.datasets[0].backgroundColor = fatia.map((s) => corAno[s.ano]);
  chartQtd.update();
}

selCodigo.addEventListener("change", atualizarGrafico);

// --- Balão de destaques: projetos com maior volume (dados em dados.js) ---
const htmlDestaques = [...destaques]
  .sort((a, b) => b.qtd - a.qtd)
  .map((d) => {
    const totalCod = qtdDe(d.ano, d.mes, d.codigo);
    const quando = `${mesesExtenso[d.mes - 1]}/${d.ano}`;
    const obs = d.obs ? ` <em>(${d.obs})</em>` : "";

    // Conferência: o projeto não pode ter mais itens que o total do código no mês
    let peso;
    let classeErro = "";
    if (d.qtd > totalCod) {
      console.warn(
        `Destaque "${d.projeto}": qtd ${d.qtd} maior que o total do código ${d.codigo} em ${quando} no QTD (${totalCod}).`,
      );
      peso = `<span class="destaque-peso erro">⚠ Quantidade maior que o total do código no mês (${totalCod}) — confira os dados</span>`;
      classeErro = ' class="destaque-erro"';
    } else {
      const pct = Math.round((d.qtd / totalCod) * 100);
      peso = `<span class="destaque-peso">${pct}% do código ${d.codigo} no mês (${d.qtd} de ${totalCod} itens)</span>`;
    }

    return `
      <li${classeErro}>
        <span class="destaque-qtd">${d.qtd}</span>
        <div class="destaque-info">
          <span class="destaque-nome">${d.projeto}${obs}</span>
          <span class="destaque-meta">${quando} · Código ${d.codigo} — ${SERVICOS[d.codigo]} · <b>Motivo: ${d.motivo}</b></span>
          ${peso}
        </div>
      </li>
    `;
  })
  .join("");
document.getElementById("destaques").innerHTML = htmlDestaques;

// --- Rodape Automatioco ---
const anoAtual = new Date().getFullYear();
const mesExtenso = new Date().toLocaleString('pt-BR', { month: 'long' });
document.getElementById("footer").innerHTML = `<p><strong>Comparativo de Medições Petrobras</strong> · Dashboard gerado em ${mesExtenso} de ${anoAtual} · Dados parciais para o exercício corrente`





// --- Chips de totais do período ---
function renderChips() {
  const porAno = {};
  let total = 0;
  fatiaPeriodo().forEach((s) => {
    const t = totalMes(s.ano, String(s.mes), "todos");
    total += t;
    porAno[s.ano] = porAno[s.ano] || { total: 0, meses: [] };
    porAno[s.ano].total += t;
    porAno[s.ano].meses.push(s.mes);
  });
  let html = `<span class="qtd-chip">Total do período <strong>${total.toLocaleString("pt-BR")} itens</strong></span>`;
  anosQtd
    .filter((a) => porAno[a])
    .forEach((a) => {
      const ms = porAno[a].meses;
      let faixa = "";
      if (ms.length < 12) {
        const ini = meses[ms[0] - 1],
          fim = meses[ms[ms.length - 1] - 1];
        faixa = " · " + (ms.length === 1 ? ini : ini + "–" + fim).toLowerCase();
      }
      html += `<span class="qtd-chip"><span class="swatch" style="background:${corAno[a]};"></span>${a}${faixa} <strong>${porAno[a].total.toLocaleString("pt-BR")}</strong></span>`;
    });
  document.getElementById("qtdChips").innerHTML = html;
}

// --- Tabela matriz códigos × meses, com abas de ano (respeita o período) ---
function montarTabelaQtd(ano) {
  const head = document.getElementById("qtdHead");
  const corpo = document.getElementById("qtdCorpo");
  const rodape = document.getElementById("qtdRodape");
  const fatia = fatiaPeriodo();

  if (ano === "consolidado") {
    const anosVis = anosQtd.filter((a) => fatia.some((s) => s.ano === a));
    const somaAno = (a, cod) =>
      fatia
        .filter((s) => s.ano === a)
        .reduce((t, s) => t + qtdDe(a, String(s.mes), String(cod)), 0);

    let thsC = "<tr><th>Código de serviço</th>";
    anosVis.forEach((a) => {
      thsC += `<th class="mes">${a}</th>`;
    });
    thsC += '<th class="mes total-col">Total geral</th></tr>';
    head.innerHTML = thsC;

    corpo.innerHTML = "";
    const totaisPorAno = {};
    anosVis.forEach((a) => {
      totaisPorAno[a] = 0;
    });
    codigos.forEach((cod) => {
      const valoresAno = anosVis.map((a) => somaAno(a, cod));
      const totalGeral = valoresAno.reduce((s, v) => s + v, 0);
      if (totalGeral === 0) return; // omite códigos sem ocorrência no período
      anosVis.forEach((a, i) => {
        totaisPorAno[a] += valoresAno[i];
      });
      const maior = Math.max(...valoresAno);
      let tdsC = `<td class="cod-cell"><span class="cod-num">${cod}</span>${SERVICOS[cod]}</td>`;
      valoresAno.forEach((v) => {
        const classes = ["qtd"];
        if (v === 0) classes.push("zero");
        else if (v === maior) classes.push("max");
        tdsC += `<td class="${classes.join(" ")}">${v === 0 ? "·" : v}</td>`;
      });
      tdsC += `<td class="qtd total-col">${totalGeral}</td>`;
      corpo.insertAdjacentHTML("beforeend", `<tr>${tdsC}</tr>`);
    });

    let tfC = "<td>Total do ano</td>";
    let totalGeralTudo = 0;
    anosVis.forEach((a) => {
      tfC += `<td class="qtd">${totaisPorAno[a]}</td>`;
      totalGeralTudo += totaisPorAno[a];
    });
    tfC += `<td class="qtd total-col">${totalGeralTudo}</td>`;
    rodape.innerHTML = `<tr>${tfC}</tr>`;
    return;
  }

  const mesesVis = fatia.filter((s) => s.ano === ano).map((s) => s.mes);
  if (!mesesVis.length) {
    head.innerHTML = "";
    corpo.innerHTML = `<tr><td class="vazio">Nenhum mês de ${ano} dentro do período selecionado.</td></tr>`;
    rodape.innerHTML = "";
    return;
  }

  let ths = "<tr><th>Código de serviço</th>";
  mesesVis.forEach((m) => {
    ths += `<th class="mes">${meses[m - 1]}</th>`;
  });
  ths += '<th class="mes total-col">Total</th></tr>';
  head.innerHTML = ths;

  corpo.innerHTML = "";
  codigos.forEach((cod) => {
    const valores = mesesVis.map((m) => qtdDe(ano, String(m), String(cod)));
    const total = valores.reduce((s, v) => s + v, 0);
    if (total === 0) return; // omite códigos sem ocorrência no período
    const maior = Math.max(...valores);
    let tds = `<td class="cod-cell"><span class="cod-num">${cod}</span>${SERVICOS[cod]}</td>`;
    valores.forEach((v) => {
      const classes = ["qtd"];
      if (v === 0) classes.push("zero");
      else if (v === maior) classes.push("max");
      tds += `<td class="${classes.join(" ")}">${v === 0 ? "·" : v}</td>`;
    });
    tds += `<td class="qtd total-col">${total}</td>`;
    corpo.insertAdjacentHTML("beforeend", `<tr>${tds}</tr>`);
  });

  let tf = "<td>Total do mês</td>";
  let totalAno = 0;
  mesesVis.forEach((m) => {
    const t = totalMes(ano, String(m), "todos");
    totalAno += t;
    tf += `<td class="qtd">${t}</td>`;
  });
  tf += `<td class="qtd total-col">${totalAno}</td>`;
  rodape.innerHTML = `<tr>${tf}</tr>`;
}

// --- Aplicação do período (gráfico, chips e tabela) ---
function atualizarAbas() {
  document
    .querySelectorAll(".ano-tab")
    .forEach((b) => b.classList.toggle("ativo", b.dataset.ano === anoAtivo));
}

function aplicarPeriodo(ini, fim) {
  periodo.ini = ini;
  periodo.fim = fim;
  selDe.value = ini;
  selAte.value = fim;
  document.querySelectorAll(".atalho").forEach((b) => {
    const [i, f] = atalhos.find((a) => a.id === b.dataset.id).faixa();
    b.classList.toggle("ativo", i === ini && f === fim);
  });
  const fatia = fatiaPeriodo();
  if (anoAtivo !== "consolidado" && !fatia.some((s) => s.ano === anoAtivo)) {
    anoAtivo = fatia[fatia.length - 1].ano; // aba do ano fora do período → vai para o último ano exibido
  }
  atualizarAbas();
  atualizarGrafico();
  renderChips();
  montarTabelaQtd(anoAtivo);
}

selDe.addEventListener("change", () => {
  const de = +selDe.value;
  aplicarPeriodo(de, Math.max(de, +selAte.value));
});
selAte.addEventListener("change", () => {
  const ate = +selAte.value;
  aplicarPeriodo(Math.min(+selDe.value, ate), ate);
});
boxAtalhos.addEventListener("click", (e) => {
  const btn = e.target.closest(".atalho");
  if (btn)
    aplicarPeriodo(...atalhos.find((a) => a.id === btn.dataset.id).faixa());
});
document.querySelectorAll(".ano-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    anoAtivo = btn.dataset.ano;
    atualizarAbas();
    montarTabelaQtd(anoAtivo);
  });
});

aplicarPeriodo(0, serie.length - 1);