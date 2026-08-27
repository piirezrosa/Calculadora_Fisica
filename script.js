/* ESTADO E CONSTANTES */
let modoAtual = "serie"; // 'serie' | 'paralelo' | 'mista'
let contadorResistorSimples = 0;
let contadorGrupo = 0;

// Ícone SVG de um resistor reaproveitado em toda linha
const ICONE_RESISTOR = `
  <svg width="28" height="14" viewBox="0 0 28 14" class="resistor-row__icon">
    <path d="M0 7 H4 L7 1 L11 13 L15 1 L19 13 L23 1 L25 7 H28"
          fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
  </svg>`;

/* TROCA DE ABAS (SÉRIE / PARALELO / MISTA) */
const tabs = document.querySelectorAll(".tab");
const painelSimples = document.getElementById("painel-simples");
const painelMista = document.getElementById("painel-mista");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    modoAtual = tab.dataset.mode;

    tabs.forEach((t) => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });

    // Série e Paralelo usam a MESMA interface (lista simples de resistores);
    // só muda a fórmula aplicada no cálculo. Por isso um único painel serve aos dois.
    const ehMista = modoAtual === "mista";
    painelSimples.hidden = ehMista;
    painelMista.hidden = !ehMista;
  });
});

/* PAINEL SÉRIE / PARALELO — construção dinâmica das linhas */
const listaResistoresSimples = document.getElementById("lista-resistores-simples");

function criarLinhaResistor(container, numero) {
  const linha = document.createElement("div");
  linha.className = "resistor-row";
  linha.innerHTML = `
    ${ICONE_RESISTOR}
    <input type="number" min="0" step="any" placeholder="R${numero} em ohms" data-resistor />
    <button type="button" class="resistor-row__remove" title="Remover">×</button>
  `;
  linha.querySelector(".resistor-row__remove").addEventListener("click", () => {
    linha.remove();
  });
  container.appendChild(linha);
  return linha;
}

document.getElementById("add-resistor-simples").addEventListener("click", () => {
  contadorResistorSimples++;
  criarLinhaResistor(listaResistoresSimples, contadorResistorSimples);
});

// Começa a página já com 2 resistores de exemplo, para o usuário entender o padrão
criarLinhaResistor(listaResistoresSimples, ++contadorResistorSimples);
criarLinhaResistor(listaResistoresSimples, ++contadorResistorSimples);

/* PAINEL MISTA — construção dinâmica de grupos */
const listaGrupos = document.getElementById("lista-grupos");

function criarGrupo() {
  contadorGrupo++;
  const card = document.createElement("div");
  card.className = "grupo-card";
  card.dataset.grupoId = contadorGrupo;
  card.innerHTML = `
    <div class="grupo-card__head">
      <strong style="font-family: var(--font-display); font-size: 0.85rem;">Grupo ${contadorGrupo}</strong>
      <select data-tipo-grupo>
        <option value="serie">Interno: série</option>
        <option value="paralelo">Interno: paralelo</option>
      </select>
      <button type="button" class="grupo-card__remove">Remover grupo</button>
    </div>
    <div class="resistor-list" data-lista-resistores-grupo></div>
    <button type="button" class="btn-add" data-add-resistor-grupo>+ Resistor neste grupo</button>
  `;

  const listaDoGrupo = card.querySelector("[data-lista-resistores-grupo]");
  let contadorLocal = 0;

  const addResistorAoGrupo = () => {
    contadorLocal++;
    criarLinhaResistor(listaDoGrupo, contadorLocal);
  };

  card.querySelector("[data-add-resistor-grupo]").addEventListener("click", addResistorAoGrupo);
  card.querySelector(".grupo-card__remove").addEventListener("click", () => card.remove());

  // cada grupo novo já nasce com 1 resistor, para guiar o usuário
  addResistorAoGrupo();

  listaGrupos.appendChild(card);
}

document.getElementById("add-grupo").addEventListener("click", criarGrupo);
// A página começa com 2 grupos de exemplo (o caso mais comum de circuito misto)
criarGrupo();
criarGrupo();

/* FUNÇÕES AUXILIARES DE FÍSICA (puras, sem tocar no DOM) */

// R_eq de resistores em série: soma simples
function reqSerie(resistencias) {
  return resistencias.reduce((soma, r) => soma + r, 0);
}

// R_eq de resistores em paralelo: inverso da soma dos inversos
function reqParalelo(resistencias) {
  const somaInversos = resistencias.reduce((soma, r) => soma + 1 / r, 0);
  return 1 / somaInversos;
}

// Formata número para exibição, cortando casas decimais desnecessárias
function fmt(numero) {
  if (!isFinite(numero)) return "—";
  return Number(numero.toFixed(4)).toString();
}

/* LEITURA DOS INPUTS */

// Lê todos os valores de resistores dentro de um container, ignorando vazios/inválidos
function lerResistencias(container) {
  const inputs = container.querySelectorAll("[data-resistor]");
  const valores = [];
  inputs.forEach((input) => {
    const v = parseFloat(input.value);
    if (!isNaN(v) && v > 0) valores.push(v);
  });
  return valores;
}

/* CÁLCULO — MODO SÉRIE / PARALELO */
document.getElementById("calcular-simples").addEventListener("click", () => {
  const areaResultado = document.getElementById("resultado-simples");
  const tensao = parseFloat(document.getElementById("tensao-simples").value);
  const resistencias = lerResistencias(listaResistoresSimples);

  if (isNaN(tensao) || tensao <= 0) {
    areaResultado.innerHTML = `<p class="erro">Informe uma tensão de fonte válida (maior que zero).</p>`;
    return;
  }
  if (resistencias.length === 0) {
    areaResultado.innerHTML = `<p class="erro">Adicione ao menos um resistor com valor válido.</p>`;
    return;
  }

  const req = modoAtual === "serie" ? reqSerie(resistencias) : reqParalelo(resistencias);
  const correnteTotal = tensao / req;
  const potenciaTotal = tensao * correnteTotal;

  // Distribuição por resistor:
  // - Em série: a CORRENTE é igual em todos; a tensão varia (queda em cada R).
  // - Em paralelo: a TENSÃO é igual em todos; a corrente varia.
  const linhasTabela = resistencias.map((r, i) => {
    let vR, iR;
    if (modoAtual === "serie") {
      iR = correnteTotal;
      vR = iR * r;
    } else {
      vR = tensao;
      iR = vR / r;
    }
    const pR = vR * iR;
    return { nome: `R${i + 1}`, r, vR, iR, pR };
  });

  areaResultado.innerHTML = renderizarResultado({
    req,
    correnteTotal,
    potenciaTotal,
    linhas: linhasTabela,
  });
});

/* CÁLCULO — MODO MISTA */
document.getElementById("calcular-mista").addEventListener("click", () => {
  const areaResultado = document.getElementById("resultado-mista");
  const tensao = parseFloat(document.getElementById("tensao-mista").value);
  const combinacaoGrupos = document.getElementById("combinacao-grupos").value; // 'serie' | 'paralelo'
  const cards = listaGrupos.querySelectorAll(".grupo-card");

  if (isNaN(tensao) || tensao <= 0) {
    areaResultado.innerHTML = `<p class="erro">Informe uma tensão de fonte válida (maior que zero).</p>`;
    return;
  }
  if (cards.length === 0) {
    areaResultado.innerHTML = `<p class="erro">Adicione ao menos um grupo.</p>`;
    return;
  }

  // Passo 1: calcular o R_eq de CADA grupo isoladamente
  const grupos = [];
  for (const card of cards) {
    const tipo = card.querySelector("[data-tipo-grupo]").value;
    const lista = card.querySelector("[data-lista-resistores-grupo]");
    const resistencias = lerResistencias(lista);

    if (resistencias.length === 0) {
      areaResultado.innerHTML = `<p class="erro">O grupo ${card.dataset.grupoId} não tem nenhum resistor válido.</p>`;
      return;
    }

    const reqGrupo = tipo === "serie" ? reqSerie(resistencias) : reqParalelo(resistencias);
    grupos.push({ id: card.dataset.grupoId, tipo, resistencias, reqGrupo });
  }

  // Passo 2: combinar os R_eq dos grupos entre si (série ou paralelo, conforme o select)
  const reqsDosGrupos = grupos.map((g) => g.reqGrupo);
  const reqTotal =
    combinacaoGrupos === "serie" ? reqSerie(reqsDosGrupos) : reqParalelo(reqsDosGrupos);

  const correnteTotal = tensao / reqTotal;
  const potenciaTotal = tensao * correnteTotal;

  // Passo 3: descobrir tensão e corrente de CADA grupo
  //  - se os grupos estão em série entre si: corrente igual em todos os grupos
  //  - se os grupos estão em paralelo entre si: tensão igual em todos os grupos
  grupos.forEach((g) => {
    if (combinacaoGrupos === "serie") {
      g.iGrupo = correnteTotal;
      g.vGrupo = g.iGrupo * g.reqGrupo;
    } else {
      g.vGrupo = tensao;
      g.iGrupo = g.vGrupo / g.reqGrupo;
    }
  });

  // Passo 4: dentro de cada grupo, distribuir para os resistores individuais
  // usando a mesma regra de série/paralelo aplicada ao V e I do próprio grupo
  const linhasTabela = [];
  grupos.forEach((g) => {
    g.resistencias.forEach((r, i) => {
      let vR, iR;
      if (g.tipo === "serie") {
        iR = g.iGrupo;
        vR = iR * r;
      } else {
        vR = g.vGrupo;
        iR = vR / r;
      }
      linhasTabela.push({
        nome: `Grupo ${g.id} · R${i + 1}`,
        r,
        vR,
        iR,
        pR: vR * iR,
      });
    });
  });

  areaResultado.innerHTML = renderizarResultado({
    req: reqTotal,
    correnteTotal,
    potenciaTotal,
    linhas: linhasTabela,
  });
});

/* RENDERIZAÇÃO DO RESULTADO (compartilhada pelos dois modos) */
function renderizarResultado({ req, correnteTotal, potenciaTotal, linhas }) {
  const linhasHtml = linhas
    .map(
      (l) => `
      <tr>
        <td>${l.nome}</td>
        <td>${fmt(l.r)} Ω</td>
        <td>${fmt(l.vR)} V</td>
        <td>${fmt(l.iR)} A</td>
        <td>${fmt(l.pR)} W</td>
      </tr>`
    )
    .join("");

  return `
    <div class="resultado__stats">
      <div class="stat">
        <div class="stat__label">R equivalente</div>
        <div class="stat__value">${fmt(req)} Ω</div>
      </div>
      <div class="stat">
        <div class="stat__label">Corrente total</div>
        <div class="stat__value">${fmt(correnteTotal)} A</div>
      </div>
      <div class="stat">
        <div class="stat__label">Potência total</div>
        <div class="stat__value">${fmt(potenciaTotal)} W</div>
      </div>
    </div>
    <table class="tabela-resultado">
      <caption>Valores individuais por resistor</caption>
      <thead>
        <tr><th>Resistor</th><th>R</th><th>Tensão</th><th>Corrente</th><th>Potência</th></tr>
      </thead>
      <tbody>${linhasHtml}</tbody>
    </table>
  `;
}