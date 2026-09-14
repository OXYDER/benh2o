(function () {
  "use strict";

  /* ---------- Constantes et facteurs de conversion ----------
     Sources : MAPAQ (« Unités de conversion — sirop d'érable »), PPAQ,
     Centre ACER, CDL Inc. Toutes les valeurs de poids/volume sont basées
     sur un sirop d'érable à 66° Brix (norme légale). */

  const L_PER_GAL_US = 3.78541;
  const L_PER_GAL_IMP = 4.54609;

  // Poids (kg) d'un litre de chaque produit, dérivé des équivalences officielles
  // MAPAQ « 1 gallon canadien de sirop (4.54609 L) = X kg de <produit> ».
  const KG_PAR_GAL_CAN = {
    sirop: 6.00901,
    beurre: 4.8,
    tire: 4.6,
    sucre: 4.0,
  };
  const KG_PAR_LITRE = {};
  Object.keys(KG_PAR_GAL_CAN).forEach((k) => {
    KG_PAR_LITRE[k] = KG_PAR_GAL_CAN[k] / L_PER_GAL_IMP;
  });

  const LB_PAR_KG = 2.20462;

  const PRODUCT_LABELS = {
    sirop: "sirop d'érable",
    beurre: "beurre d'érable",
    tire: "tire d'érable",
    sucre: "sucre d'érable granulé",
  };

  function fmt(n, dec) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("fr-CA", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  /* ---------- 1) Rendement — Règle de 87 ---------- */
  function setupYieldCalc() {
    const brixInput = document.getElementById("conv-yield-brix");
    const litresInput = document.getElementById("conv-yield-litres");
    const unitSelect = document.getElementById("conv-yield-unit");
    const resultEl = document.getElementById("conv-yield-result");
    if (!brixInput || !resultEl) return;

    function toLitres(qty, unit) {
      if (unit === "galUS") return qty * L_PER_GAL_US;
      if (unit === "galImp") return qty * L_PER_GAL_IMP;
      return qty;
    }
    function fromLitres(litres, unit) {
      if (unit === "galUS") return litres / L_PER_GAL_US;
      if (unit === "galImp") return litres / L_PER_GAL_IMP;
      return litres;
    }
    const unitLabel = { L: "litres", galUS: "gallons US", galImp: "gallons canadiens" };

    function compute() {
      const brix = parseFloat(brixInput.value);
      const qty = parseFloat(litresInput.value);
      const unit = unitSelect.value;
      if (!brix || brix <= 0 || !qty || qty <= 0) {
        resultEl.innerHTML = "";
        return;
      }
      const ratio = 87 / brix;
      const litresSirop = toLitres(qty, unit);
      const litresSeve = litresSirop * ratio;
      const seveAffiche = fromLitres(litresSeve, unit);
      resultEl.innerHTML = `
        Il te faudra environ <strong>${fmt(seveAffiche, 1)} ${unitLabel[unit]}</strong> de sève à ${fmt(brix, 1)}° Brix
        pour produire ${fmt(qty, 1)} ${unitLabel[unit]} de sirop à 66° Brix.<br>
        <span class="conv-result-sub">Ratio sève : sirop ≈ ${fmt(ratio, 1)} : 1 (Règle de 87)</span>
      `;
    }

    [brixInput, litresInput, unitSelect].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ---------- 2) Point d'ébullition selon l'altitude ---------- */
  function boilingPointC(altitudeM) {
    // Formule barométrique standard (niveau de la mer -> pression), puis
    // relation pression -> température d'ébullition de l'eau (Clausius-Clapeyron).
    const P0 = 1013.25; // hPa au niveau de la mer
    const P = P0 * Math.pow(1 - (0.0065 * altitudeM) / 288.15, 5.255);
    const T_K = 1 / (1 / 373.15 - (8.314 / 40680) * Math.log(P / P0));
    return T_K - 273.15;
  }

  function setupBoilingCalc() {
    const altInput = document.getElementById("conv-alt");
    const resultEl = document.getElementById("conv-alt-result");
    const tableEl = document.getElementById("conv-alt-table");
    if (!altInput || !resultEl) return;

    // Écarts approximatifs au-dessus du point de finition du sirop (repères de cuisson,
    // à valider au thermomètre — la texture finale dépend de plus que la seule température).
    const PRODUITS_CUISSON = [
      { nom: "Sirop d'érable (66° Brix)", offsetC: 3.94 },
      { nom: "Beurre d'érable", offsetC: 3.94 + 8.1 },
      { nom: "Tire d'érable sur neige", offsetC: 3.94 + 9.9 },
      { nom: "Tire en pot / sucre mou", offsetC: 3.94 + 10.5 },
      { nom: "Sucre dur", offsetC: 3.94 + 13.8 },
      { nom: "Sucre granulé", offsetC: 3.94 + 20.0 },
    ];

    function compute() {
      const alt = parseFloat(altInput.value);
      if (isNaN(alt) || alt < 0) {
        resultEl.innerHTML = "";
        tableEl.innerHTML = "";
        return;
      }
      const tEau = boilingPointC(alt);
      const tEauF = tEau * 9/5 + 32;
      const tSirop = tEau + 3.94;
      const tSiropF = tSirop * 9/5 + 32;

      resultEl.innerHTML = `
        À ${fmt(alt, 0)} m d'altitude, l'eau bout à <strong>${fmt(tEau, 1)} °C (${fmt(tEauF, 1)} °F)</strong>.<br>
        Ton sirop sera à 66° Brix lorsqu'il atteindra <strong>${fmt(tSirop, 1)} °C (${fmt(tSiropF, 1)} °F)</strong>
        — soit 3,94 °C (7,1 °F) de plus que le point d'ébullition de l'eau ce jour-là.
      `;

      tableEl.innerHTML =
        "<tbody>" +
        PRODUITS_CUISSON.map((p) => {
          const tc = tEau + p.offsetC;
          const tf = tc * 9/5 + 32;
          return `<tr><td>${p.nom}</td><td>${fmt(tc, 1)} °C</td><td>${fmt(tf, 1)} °F</td></tr>`;
        }).join("") +
        "</tbody>";
    }

    altInput.addEventListener("input", compute);
    compute();
  }

  /* ---------- 3) Conversions de produits d'érable ---------- */
  function setupProductCalc() {
    const productSelect = document.getElementById("conv-product");
    const qtyInput = document.getElementById("conv-qty");
    const unitSelect = document.getElementById("conv-unit");
    const resultEl = document.getElementById("conv-product-result");
    if (!productSelect || !resultEl) return;

    function toKg(qty, unit, product) {
      const kgPerL = KG_PAR_LITRE[product];
      if (unit === "L") return qty * kgPerL;
      if (unit === "galUS") return qty * L_PER_GAL_US * kgPerL;
      if (unit === "galImp") return qty * L_PER_GAL_IMP * kgPerL;
      if (unit === "kg") return qty;
      if (unit === "lb") return qty / LB_PAR_KG;
      return NaN;
    }

    function compute() {
      const product = productSelect.value;
      const qty = parseFloat(qtyInput.value);
      const unit = unitSelect.value;
      if (!qty || qty < 0) {
        resultEl.innerHTML = "";
        return;
      }
      const kg = toKg(qty, unit, product);
      const kgPerL = KG_PAR_LITRE[product];
      const litres = kg / kgPerL;
      const lb = kg * LB_PAR_KG;
      const galUS = litres / L_PER_GAL_US;
      const galImp = litres / L_PER_GAL_IMP;

      resultEl.innerHTML = `
        ${fmt(qty, 2)} ${unitSelect.options[unitSelect.selectedIndex].text.toLowerCase()} de ${PRODUCT_LABELS[product]} équivaut à :
        <div class="conv-grid">
          <div><strong>${fmt(litres, 2)}</strong> litres</div>
          <div><strong>${fmt(galUS, 2)}</strong> gallons US</div>
          <div><strong>${fmt(galImp, 2)}</strong> gallons canadiens</div>
          <div><strong>${fmt(kg, 2)}</strong> kilogrammes</div>
          <div><strong>${fmt(lb, 2)}</strong> livres</div>
        </div>
      `;
    }

    [productSelect, qtyInput, unitSelect].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ---------- 4) Estimation par nombre d'entailles ---------- */
  function setupTapsCalc() {
    const tapsInput = document.getElementById("conv-taps");
    const resultEl = document.getElementById("conv-taps-result");
    if (!tapsInput || !resultEl) return;

    function compute() {
      const taps = parseFloat(tapsInput.value);
      if (!taps || taps <= 0) {
        resultEl.innerHTML = "";
        return;
      }
      const bas = taps * 0.8;
      const haut = taps * 1.5;
      const basGal = bas / L_PER_GAL_IMP;
      const hautGal = haut / L_PER_GAL_IMP;

      resultEl.innerHTML = `
        Avec ${fmt(taps, 0)} entailles, une production annuelle typique se situe environ entre
        <strong>${fmt(bas, 0)} et ${fmt(haut, 0)} litres</strong> de sirop
        (≈ ${fmt(basGal, 0)} à ${fmt(hautGal, 0)} gallons canadiens).<br>
        <span class="conv-result-sub">Fourchette très large — dépend fortement de l'équipement (vacuum, osmose inverse), de la génétique des érables et de la saison.</span>
      `;
    }

    tapsInput.addEventListener("input", compute);
    compute();
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupYieldCalc();
    setupBoilingCalc();
    setupProductCalc();
    setupTapsCalc();
  });
})();
