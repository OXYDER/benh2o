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

  /* ---------- Onglets ---------- */
  function setupTabs() {
    const tabs = document.querySelectorAll(".conv-tab");
    const panels = document.querySelectorAll(".conv-panel");
    if (!tabs.length) return;
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => {
          t.classList.remove("active");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
        panels.forEach((p) => {
          p.hidden = p.dataset.panel !== tab.dataset.tab;
        });
      });
    });
  }

  /* ---------- Volume d'un tube ---------- */
  function setupTubeCalc() {
    const diamSelect = document.getElementById("conv-tube-diam");
    const customWrap = document.getElementById("conv-tube-diam-custom-wrap");
    const customInput = document.getElementById("conv-tube-diam-custom");
    const lengthInput = document.getElementById("conv-tube-length");
    const resultEl = document.getElementById("conv-tube-result");
    if (!diamSelect || !resultEl) return;

    function compute() {
      customWrap.hidden = diamSelect.value !== "autre";
      const diamMm = diamSelect.value === "autre" ? parseFloat(customInput.value) : parseFloat(diamSelect.value);
      const lengthM = parseFloat(lengthInput.value);
      if (!diamMm || diamMm <= 0 || !lengthM || lengthM < 0) {
        resultEl.innerHTML = "";
        return;
      }
      const rM = diamMm / 1000 / 2;
      const volumeL = Math.PI * rM * rM * lengthM * 1000;
      resultEl.innerHTML = `
        Ce tube contient environ <strong>${fmt(volumeL, 2)} litres</strong>
        (≈ ${fmt(volumeL / L_PER_GAL_IMP, 2)} gallons canadiens).
      `;
    }
    [diamSelect, customInput, lengthInput].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ---------- Volume d'un réservoir ---------- */
  function setupTankCalc() {
    const shapeSelect = document.getElementById("conv-tank-shape");
    const cylFields = document.getElementById("conv-tank-cyl-fields");
    const rectFields = document.getElementById("conv-tank-rect-fields");
    const resultEl = document.getElementById("conv-tank-result");
    if (!shapeSelect || !resultEl) return;

    const diamInput = document.getElementById("conv-tank-diam");
    const heightInput = document.getElementById("conv-tank-height");
    const lInput = document.getElementById("conv-tank-l");
    const wInput = document.getElementById("conv-tank-w");
    const hInput = document.getElementById("conv-tank-h");

    function compute() {
      const isCyl = shapeSelect.value === "cyl";
      cylFields.hidden = !isCyl;
      rectFields.hidden = isCyl;
      let volumeCm3 = 0;
      if (isCyl) {
        const d = parseFloat(diamInput.value);
        const h = parseFloat(heightInput.value);
        if (!d || !h) {
          resultEl.innerHTML = "";
          return;
        }
        volumeCm3 = Math.PI * (d / 2) * (d / 2) * h;
      } else {
        const l = parseFloat(lInput.value);
        const w = parseFloat(wInput.value);
        const h = parseFloat(hInput.value);
        if (!l || !w || !h) {
          resultEl.innerHTML = "";
          return;
        }
        volumeCm3 = l * w * h;
      }
      const volumeL = volumeCm3 / 1000;
      resultEl.innerHTML = `
        Volume : <strong>${fmt(volumeL, 1)} litres</strong>
        (≈ ${fmt(volumeL / L_PER_GAL_IMP, 1)} gallons can. / ${fmt(volumeL / L_PER_GAL_US, 1)} gallons US)
      `;
    }
    [shapeSelect, diamInput, heightInput, lInput, wInput, hInput].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ---------- Volume d'un évaporateur (casserole) ---------- */
  function setupPanCalc() {
    const lInput = document.getElementById("conv-pan-l");
    const wInput = document.getElementById("conv-pan-w");
    const depthInput = document.getElementById("conv-pan-depth");
    const resultEl = document.getElementById("conv-pan-result");
    if (!lInput || !resultEl) return;

    function compute() {
      const l = parseFloat(lInput.value);
      const w = parseFloat(wInput.value);
      const d = parseFloat(depthInput.value);
      if (!l || !w || !d) {
        resultEl.innerHTML = "";
        return;
      }
      const volumeInCube = l * w * d;
      const volumeL = volumeInCube * 0.0163871;
      resultEl.innerHTML = `
        Cette casserole contient environ <strong>${fmt(volumeL, 1)} litres</strong> à cette profondeur
        (≈ ${fmt(volumeL / L_PER_GAL_US, 1)} gallons US).
      `;
    }
    [lInput, wInput, depthInput].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ---------- Poids spécifique (densité) selon le ° Brix ----------
     Basé sur le polynôme standard ICUMSA/NIST reliant le °Brix à la gravité
     spécifique d'une solution de sucrose (brix = f(sg)), inversé numériquement
     (méthode de Newton) puisque la relation officielle va de SG vers Brix. */
  function brixFromSG(sg) {
    return 143.254 * sg ** 3 - 648.670 * sg ** 2 + 1125.805 * sg - 620.389;
  }
  function sgFromBrix(brix) {
    let sg = 1 + brix / 400; // estimation de départ
    for (let i = 0; i < 20; i++) {
      const f = brixFromSG(sg) - brix;
      const fPrime = 3 * 143.254 * sg ** 2 - 2 * 648.670 * sg + 1125.805;
      sg = sg - f / fPrime;
    }
    return sg;
  }

  function setupSGCalc() {
    const brixInput = document.getElementById("conv-sg-brix");
    const resultEl = document.getElementById("conv-sg-result");
    if (!brixInput || !resultEl) return;

    function compute() {
      const brix = parseFloat(brixInput.value);
      if (isNaN(brix) || brix < 0) {
        resultEl.innerHTML = "";
        return;
      }
      const sg = sgFromBrix(brix);
      const kgPerL = sg * 0.9982; // eau à 20°C ≈ 0.9982 kg/L
      resultEl.innerHTML = `
        À ${fmt(brix, 1)}° Brix (20 °C) : gravité spécifique ≈ <strong>${sg.toFixed(4)}</strong>,
        soit une masse d'environ <strong>${fmt(kgPerL, 3)} kg/litre</strong>
        (${fmt(kgPerL * LB_PAR_KG / L_PER_GAL_US, 2)} lb/gallon US).
      `;
    }
    brixInput.addEventListener("input", compute);
    compute();
  }

  /* ---------- Eau à ajouter pour réduire un sirop ---------- */
  function setupDiluteCalc() {
    const volInput = document.getElementById("conv-dilute-vol");
    const brixInput = document.getElementById("conv-dilute-brix");
    const targetInput = document.getElementById("conv-dilute-target");
    const resultEl = document.getElementById("conv-dilute-result");
    if (!volInput || !resultEl) return;

    function compute() {
      const vol = parseFloat(volInput.value);
      const brix = parseFloat(brixInput.value);
      const target = parseFloat(targetInput.value);
      if (!vol || !brix || !target || target <= 0 || target >= brix) {
        resultEl.innerHTML = target >= brix && target && brix
          ? "Le ° Brix désiré doit être plus bas que le ° Brix actuel."
          : "";
        return;
      }
      const eauAjouter = vol * (brix / target - 1);
      const volFinal = vol + eauAjouter;
      resultEl.innerHTML = `
        Ajoute environ <strong>${fmt(eauAjouter, 2)} litres d'eau</strong>
        pour faire passer ${fmt(vol, 1)} L de sirop de ${fmt(brix, 1)}° à ${fmt(target, 1)}° Brix
        (volume final ≈ ${fmt(volFinal, 2)} L).
      `;
    }
    [volInput, brixInput, targetInput].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ---------- Mélange de deux sirops ---------- */
  function setupBlendCalc() {
    const vol1Input = document.getElementById("conv-blend-vol1");
    const brix1Input = document.getElementById("conv-blend-brix1");
    const brix2Input = document.getElementById("conv-blend-brix2");
    const targetInput = document.getElementById("conv-blend-target");
    const resultEl = document.getElementById("conv-blend-result");
    if (!vol1Input || !resultEl) return;

    function compute() {
      const v1 = parseFloat(vol1Input.value);
      const b1 = parseFloat(brix1Input.value);
      const b2 = parseFloat(brix2Input.value);
      const target = parseFloat(targetInput.value);
      if (!v1 || isNaN(b1) || isNaN(b2) || !target) {
        resultEl.innerHTML = "";
        return;
      }
      // Bilan de matière : v1*b1 + v2*b2 = (v1+v2)*target  =>  v2 = v1*(b1-target)/(target-b2)
      const denom = target - b2;
      if (denom === 0 || (b1 - target) / denom < 0) {
        resultEl.innerHTML = "Ce mélange ne permet pas d'atteindre ce ° Brix cible — vérifie que le sirop B (ou l'eau) est bien moins concentré que la cible, et le sirop A plus concentré.";
        return;
      }
      const v2 = (v1 * (b1 - target)) / denom;
      resultEl.innerHTML = `
        Mélange environ <strong>${fmt(v2, 2)} litres</strong> de sirop B (${fmt(b2, 1)}° Brix)
        avec tes ${fmt(v1, 1)} L de sirop A (${fmt(b1, 1)}° Brix)
        pour obtenir ${fmt(v1 + v2, 2)} L à ${fmt(target, 1)}° Brix.
      `;
    }
    [vol1Input, brix1Input, brix2Input, targetInput].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ---------- Valeur de la production ---------- */
  function setupPriceCalc() {
    const qtyInput = document.getElementById("conv-price-qty");
    const qtyUnitSelect = document.getElementById("conv-price-unit");
    const rateInput = document.getElementById("conv-price-rate");
    const rateUnitSelect = document.getElementById("conv-price-rate-unit");
    const resultEl = document.getElementById("conv-price-result");
    if (!qtyInput || !resultEl) return;

    function toLitresSirop(qty, unit) {
      if (unit === "galUS") return qty * L_PER_GAL_US;
      if (unit === "galImp") return qty * L_PER_GAL_IMP;
      if (unit === "kg") return qty / KG_PAR_LITRE.sirop;
      if (unit === "lb") return qty / LB_PAR_KG / KG_PAR_LITRE.sirop;
      return qty;
    }

    function compute() {
      const qty = parseFloat(qtyInput.value);
      const rate = parseFloat(rateInput.value);
      if (!qty || !rate) {
        resultEl.innerHTML = "";
        return;
      }
      const litres = toLitresSirop(qty, qtyUnitSelect.value);
      const litresParUniteTarif = toLitresSirop(1, rateUnitSelect.value);
      const total = (litres / litresParUniteTarif) * rate;
      resultEl.innerHTML = `Valeur totale estimée : <strong>${total.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</strong>`;
    }
    [qtyInput, qtyUnitSelect, rateInput, rateUnitSelect].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupTabs();
    setupYieldCalc();
    setupBoilingCalc();
    setupProductCalc();
    setupTapsCalc();
    setupTubeCalc();
    setupTankCalc();
    setupPanCalc();
    setupSGCalc();
    setupDiluteCalc();
    setupBlendCalc();
    setupPriceCalc();
  });
})();
