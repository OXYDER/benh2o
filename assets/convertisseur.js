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

  /* ---------- Concentration sève / concentré / sirop ----------
     Formule exacte extraite de l'application (convertConcentration) : bilan de
     matière sur 3 étapes (sève -> concentré à l'osmose -> sirop fini), avec taux
     de séparation de la membrane et pertes de procédé. Calcul fait ici en volume
     (litres) directement — équivalent à l'original pour des unités de volume. */
  function setupConcentrationCalc() {
    const sapVolInput = document.getElementById("conv-conc-sap-vol");
    const sapUnitSelect = document.getElementById("conv-conc-sap-unit");
    const sapBrixInput = document.getElementById("conv-conc-sap-brix");
    const osmBrixInput = document.getElementById("conv-conc-osm-brix");
    const syrupBrixInput = document.getElementById("conv-conc-syrup-brix");
    const lossInput = document.getElementById("conv-conc-loss");
    const resultEl = document.getElementById("conv-conc-result");
    if (!sapVolInput || !resultEl) return;

    const unitLabel = { L: "litres", galUS: "gallons US", galImp: "gallons can." };

    function compute() {
      const sapVol = parseFloat(sapVolInput.value);
      const unit = unitLabel[sapUnitSelect.value];
      const sapBrix = parseFloat(sapBrixInput.value);
      const osmBrix = parseFloat(osmBrixInput.value);
      const syrupBrix = parseFloat(syrupBrixInput.value);
      const loss = parseFloat(lossInput.value) || 0;
      if (!sapVol || !sapBrix || !osmBrix || !syrupBrix) {
        resultEl.innerHTML = "";
        return;
      }
      // Le calcul est un bilan de proportions (ratios de °Brix) — le résultat sort
      // naturellement dans la même unité que la quantité de sève entrée, peu importe
      // laquelle (litres, gallons US ou gallons canadiens).
      const osmoseQty = (sapVol * sapBrix) / osmBrix;
      const separationRate = (1 - osmoseQty / sapVol) * 100;
      const syrupRaw = (sapVol * sapBrix) / syrupBrix;
      const syrupFinal = syrupRaw * (1 - loss / 100);

      resultEl.innerHTML = `
        Concentré obtenu à l'osmose : <strong>${fmt(osmoseQty, 1)} ${unit}</strong> à ${fmt(osmBrix, 1)}° Brix
        (taux de séparation ≈ ${fmt(separationRate, 1)} %).<br>
        Sirop fini au final : <strong>${fmt(syrupFinal, 2)} ${unit}</strong> à ${fmt(syrupBrix, 1)}° Brix
        (pertes de ${fmt(loss, 1)} % déjà déduites).
      `;
    }
    [sapVolInput, sapUnitSelect, sapBrixInput, osmBrixInput, syrupBrixInput, lossInput].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ---------- 2) Point d'ébullition selon l'altitude ----------
     Formules exactes extraites de l'application Convertisseur Acéricole (Centre ACER) :
     - boilingPointByAltitude : polynôme direct altitude -> température d'ébullition de l'eau
     - offsetTemperature : polynôme donnant l'écart (°C) au-dessus du point d'ébullition
       de l'eau selon le ° Brix cible (fonctionne pour n'importe quel Brix, pas seulement 66). */
  function boilingPointC(altitudeM) {
    return 100 - 0.0035529 * altitudeM + 4.2994e-8 * altitudeM * altitudeM;
  }
  function offsetTemperature(brix) {
    return (
      0.028749926 * brix -
      0.00204687 * brix ** 2 +
      0.00010678 * brix ** 3 -
      1.9777e-6 * brix ** 4 +
      1.41996e-8 * brix ** 5
    );
  }

  function setupBoilingCalc() {
    const altInput = document.getElementById("conv-alt");
    const brixInput = document.getElementById("conv-alt-brix");
    const resultEl = document.getElementById("conv-alt-result");
    const tableEl = document.getElementById("conv-alt-table");
    if (!altInput || !resultEl) return;

    // Écarts (au-dessus du point de finition du sirop à 66° Brix) pour les autres produits —
    // repères relatifs de Centre ACER, à valider au thermomètre.
    const PRODUITS_CUISSON = [
      { nom: "Beurre d'érable", offsetC: 8.1 },
      { nom: "Tire d'érable sur neige", offsetC: 9.9 },
      { nom: "Tire en pot / sucre mou", offsetC: 10.5 },
      { nom: "Sucre dur", offsetC: 13.8 },
      { nom: "Sucre granulé", offsetC: 20.0 },
    ];

    function compute() {
      const alt = parseFloat(altInput.value);
      const brix = parseFloat(brixInput.value);
      if (isNaN(alt) || alt < 0 || !brix) {
        resultEl.innerHTML = "";
        tableEl.innerHTML = "";
        return;
      }
      const tEau = boilingPointC(alt);
      const tEauF = tEau * 9/5 + 32;
      const offset = offsetTemperature(brix);
      const tSirop = tEau + offset;
      const tSiropF = tSirop * 9/5 + 32;

      resultEl.innerHTML = `
        À ${fmt(alt, 0)} m d'altitude, l'eau bout à <strong>${fmt(tEau, 1)} °C (${fmt(tEauF, 1)} °F)</strong>.<br>
        Ton sirop sera à ${fmt(brix, 1)}° Brix lorsqu'il atteindra <strong>${fmt(tSirop, 1)} °C (${fmt(tSiropF, 1)} °F)</strong>
        — soit ${fmt(offset, 2)} °C de plus que le point d'ébullition de l'eau ce jour-là.
      `;

      const tSirop66 = tEau + offsetTemperature(66);
      tableEl.innerHTML =
        "<tbody>" +
        `<tr><td>Sirop d'érable (66° Brix)</td><td>${fmt(tSirop66, 1)} °C</td><td>${fmt(tSirop66 * 9/5 + 32, 1)} °F</td></tr>` +
        PRODUITS_CUISSON.map((p) => {
          const tc = tSirop66 + p.offsetC;
          const tf = tc * 9/5 + 32;
          return `<tr><td>${p.nom}</td><td>${fmt(tc, 1)} °C</td><td>${fmt(tf, 1)} °F</td></tr>`;
        }).join("") +
        "</tbody>";
    }

    [altInput, brixInput].forEach((el) => el.addEventListener("input", compute));
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
    // Bascule de mode : Calculateurs <-> Convertisseurs
    const modeButtons = document.querySelectorAll(".conv-mode-btn");
    const modePanels = document.querySelectorAll(".conv-mode-panel");
    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        modeButtons.forEach((b) => b.classList.toggle("active", b === btn));
        modePanels.forEach((p) => {
          p.hidden = p.dataset.mode !== btn.dataset.mode;
        });
        window.scrollTo({ top: document.getElementById("conv-mode-switch").offsetTop - 20, behavior: "smooth" });
      });
    });

    // Liens de sous-catégories : défilement doux vers la section, avec léger surlignage
    document.querySelectorAll(".conv-tabs .conv-tab").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute("href"));
        if (!target) return;
        const headerOffset = 90;
        const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top, behavior: "smooth" });
        target.classList.add("conv-panel-highlight");
        setTimeout(() => target.classList.remove("conv-panel-highlight"), 1500);
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
     Table officielle exacte (36 points, extraite de l'application Convertisseur
     Acéricole de Centre ACER), avec interpolation linéaire entre les points —
     exactement la même méthode que l'application originale. */
  const BRIX_SG_TABLE = [
    { brix: 0, value: 1 }, { brix: 0.1, value: 1.00038 }, { brix: 0.2, value: 1.00076 },
    { brix: 0.3, value: 1.00114 }, { brix: 0.4, value: 1.00152 }, { brix: 0.5, value: 1.0019 },
    { brix: 0.6, value: 1.0023 }, { brix: 0.7, value: 1.0027 }, { brix: 0.8, value: 1.0031 },
    { brix: 0.9, value: 1.0035 }, { brix: 1, value: 1.0039 }, { brix: 2, value: 1.0078 },
    { brix: 3, value: 1.0117 }, { brix: 4, value: 1.0156 }, { brix: 5, value: 1.0196 },
    { brix: 6, value: 1.0236 }, { brix: 7, value: 1.0277 }, { brix: 8, value: 1.0317 },
    { brix: 9, value: 1.0358 }, { brix: 10, value: 1.04 }, { brix: 15, value: 1.061 },
    { brix: 20, value: 1.0829 }, { brix: 25, value: 1.10555 }, { brix: 30, value: 1.129 },
    { brix: 35, value: 1.15335 }, { brix: 40, value: 1.1785 }, { brix: 45, value: 1.2047 },
    { brix: 50, value: 1.2317 }, { brix: 55, value: 1.2597 }, { brix: 60, value: 1.2887 },
    { brix: 65, value: 1.3187 }, { brix: 66, value: 1.3248 }, { brix: 67, value: 1.33095 },
    { brix: 68, value: 1.3371 }, { brix: 69, value: 1.34335 }, { brix: 70, value: 1.3496 },
  ];
  function sgFromBrix(brix) {
    const exact = BRIX_SG_TABLE.find((p) => p.brix === brix);
    if (exact) return exact.value;
    const below = BRIX_SG_TABLE.filter((p) => p.brix < brix).pop();
    const above = BRIX_SG_TABLE.find((p) => p.brix > brix);
    if (!below || !above) return null;
    const ratio = (brix - below.brix) / (above.brix - below.brix);
    return below.value + ratio * (above.value - below.value);
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
      if (sg === null) {
        resultEl.innerHTML = "Valeur hors de la table (0 à 70° Brix).";
        return;
      }
      const kgPerL = sg * 0.9982; // eau à 20°C ≈ 0.9982 kg/L
      resultEl.innerHTML = `
        À ${fmt(brix, 1)}° Brix (20 °C) : gravité spécifique = <strong>${sg.toFixed(5)}</strong>,
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

  /* ---------- Osmose — PEP (perméabilité à l'eau pure) ----------
     Formule exacte extraite de l'application Convertisseur Acéricole (Centre ACER),
     basée sur le facteur de correction Filmtec (Reverse Osmosis Membranes Technical
     Manual, Doc. No. 45-D01504, version 7, février 2021). */
  function filmtecCorrectionFactor(tempC) {
    const k = tempC < 25 ? 3020 : 2640;
    return Math.exp(k * (1 / (tempC + 273) - 1 / 298));
  }
  function setupOsmosisCalc() {
    const startDebitInput = document.getElementById("conv-osm-start-debit");
    const startTempInput = document.getElementById("conv-osm-start-temp");
    const nowDebitInput = document.getElementById("conv-osm-now-debit");
    const nowTempInput = document.getElementById("conv-osm-now-temp");
    const resultEl = document.getElementById("conv-osm-result");
    if (!startDebitInput || !resultEl) return;

    function compute() {
      const d0 = parseFloat(startDebitInput.value);
      const t0 = parseFloat(startTempInput.value);
      const d1 = parseFloat(nowDebitInput.value);
      const t1 = parseFloat(nowTempInput.value);
      if (!d0 || isNaN(t0) || !d1 || isNaN(t1)) {
        resultEl.innerHTML = "";
        return;
      }
      const d0corr = d0 * filmtecCorrectionFactor(t0);
      const d1corr = d1 * filmtecCorrectionFactor(t1);
      const pep = (d1corr / d0corr) * 100;
      resultEl.innerHTML = `
        PEP actuel (normalisé à 25 °C) : <strong>${fmt(pep, 1)} %</strong> du débit de départ.<br>
        <span class="conv-result-sub">Débit de départ corrigé : ${fmt(d0corr, 3)} · débit actuel corrigé : ${fmt(d1corr, 3)}</span>
      `;
    }
    [startDebitInput, startTempInput, nowDebitInput, nowTempInput].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ---------- Solution de lavage — dilution ---------- */
  function setupCleaningCalc() {
    const volInput = document.getElementById("conv-clean-vol");
    const activeInput = document.getElementById("conv-clean-active");
    const targetInput = document.getElementById("conv-clean-target");
    const resultEl = document.getElementById("conv-clean-result");
    if (!volInput || !resultEl) return;

    function compute() {
      const vol = parseFloat(volInput.value);
      const active = parseFloat(activeInput.value);
      const target = parseFloat(targetInput.value);
      if (!vol || !active || !target || target >= active) {
        resultEl.innerHTML = target >= active && target && active
          ? "La concentration voulue doit être plus basse que la concentration active du produit."
          : "";
        return;
      }
      const eau = vol * (active / target - 1);
      resultEl.innerHTML = `
        Ajoute environ <strong>${fmt(eau, 2)} litres d'eau</strong> à tes ${fmt(vol, 1)} L de produit concentré
        pour obtenir une solution à ${fmt(target, 1)} % (volume final ≈ ${fmt(vol + eau, 2)} L).
      `;
    }
    [volInput, activeInput, targetInput].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ---------- Surface d'une presse à terre diatomée ----------
     Formules exactes extraites de l'application (surface totale de filtration,
     les deux côtés de chaque plaque comptent). */
  function setupDiatomaceousCalc() {
    const shapeSelect = document.getElementById("conv-de-shape");
    const squareFields = document.getElementById("conv-de-square-fields");
    const cylFields = document.getElementById("conv-de-cyl-fields");
    const plateDimInput = document.getElementById("conv-de-plate-dim");
    const plateCountInput = document.getElementById("conv-de-plate-count");
    const heightInput = document.getElementById("conv-de-height");
    const resultEl = document.getElementById("conv-de-result");
    if (!shapeSelect || !resultEl) return;

    function compute() {
      const isSquare = shapeSelect.value === "square";
      squareFields.hidden = !isSquare;
      cylFields.hidden = isSquare;
      let areaFt2;
      if (isSquare) {
        const dim = parseFloat(plateDimInput.value);
        const count = parseFloat(plateCountInput.value);
        if (!dim || !count) {
          resultEl.innerHTML = "";
          return;
        }
        areaFt2 = ((dim * dim) / 144) * count * 2;
      } else {
        const height = parseFloat(heightInput.value);
        if (!height) {
          resultEl.innerHTML = "";
          return;
        }
        areaFt2 = ((18 * height) / 144) * 2;
      }
      resultEl.innerHTML = `Surface de filtration totale : <strong>${fmt(areaFt2, 2)} pi²</strong> (${fmt(areaFt2 * 0.0929, 2)} m²).`;
    }
    [shapeSelect, plateDimInput, plateCountInput, heightInput].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ---------- Transmittance d'un mélange ----------
     Moyenne pondérée logarithmique (pas une simple moyenne) — formule exacte
     extraite de l'application, cohérente avec la loi de Beer-Lambert pour
     la transmittance optique d'un mélange. */
  const log10 = (x) => Math.log(x) / Math.LN10;

  function setupTransmittanceCalc() {
    const qtyAInput = document.getElementById("conv-trans-qtyA");
    const transAInput = document.getElementById("conv-trans-transA");
    const qtyBInput = document.getElementById("conv-trans-qtyB");
    const transBInput = document.getElementById("conv-trans-transB");
    const resultEl = document.getElementById("conv-trans-result");
    if (!qtyAInput || !resultEl) return;

    function compute() {
      const qA = parseFloat(qtyAInput.value);
      const tA = parseFloat(transAInput.value);
      const qB = parseFloat(qtyBInput.value);
      const tB = parseFloat(transBInput.value);
      if (!qA || !tA || !qB || !tB) {
        resultEl.innerHTML = "";
        return;
      }
      const total = qA + qB;
      const weightedLog = (qA * log10(100 / tA) + qB * log10(100 / tB)) / total;
      const resultTrans = 100 / Math.pow(10, weightedLog);
      resultEl.innerHTML = `
        Mélange de ${fmt(total, 1)} L : transmittance résultante ≈ <strong>${fmt(resultTrans, 1)} %</strong>.
      `;
    }
    [qtyAInput, transAInput, qtyBInput, transBInput].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ---------- Volume à mélanger pour une transmittance cible ----------
     Même formule que ci-dessus, résolue pour la quantité de sirop B inconnue. */
  function setupVolumeForTransmittanceCalc() {
    const qtyAInput = document.getElementById("conv-transv-qtyA");
    const transAInput = document.getElementById("conv-transv-transA");
    const transBInput = document.getElementById("conv-transv-transB");
    const targetInput = document.getElementById("conv-transv-target");
    const resultEl = document.getElementById("conv-transv-result");
    if (!qtyAInput || !resultEl) return;

    function compute() {
      const qA = parseFloat(qtyAInput.value);
      const tA = parseFloat(transAInput.value);
      const tB = parseFloat(transBInput.value);
      const target = parseFloat(targetInput.value);
      if (!qA || !tA || !tB || !target) {
        resultEl.innerHTML = "";
        return;
      }
      // weightedLog = target_log ; qA*logA + qB*logB = (qA+qB)*target_log
      // qB*(logB - target_log) = qA*(target_log - logA)
      const logA = log10(100 / tA);
      const logB = log10(100 / tB);
      const targetLog = log10(100 / target);
      const denom = logB - targetLog;
      if (denom === 0 || (qA * (targetLog - logA)) / denom < 0) {
        resultEl.innerHTML = "Cette cible n'est pas atteignable avec ces deux sirops — vérifie que la transmittance visée se situe bien entre celle du sirop A et celle du sirop B.";
        return;
      }
      const qB = (qA * (targetLog - logA)) / denom;
      resultEl.innerHTML = `
        Ajoute environ <strong>${fmt(qB, 2)} litres</strong> de sirop B (${fmt(tB, 1)} %)
        à tes ${fmt(qA, 1)} L de sirop A (${fmt(tA, 1)} %)
        pour obtenir ${fmt(qA + qB, 2)} L à ${fmt(target, 1)} % de transmittance.
      `;
    }
    [qtyAInput, transAInput, transBInput, targetInput].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ---------- Débit d'une pompe à vide ----------
     Correction pression/température selon la loi des gaz combinée, formule exacte
     extraite de l'application (conditions de référence standard : 29,92126 po Hg,
     519,67 °R = 60 °F). */
  function celsiusToRankine(c) {
    return c * 1.8 + 491.67;
  }
  function setupPumpFlowCalc() {
    const pressureInput = document.getElementById("conv-pump-pressure");
    const tempInput = document.getElementById("conv-pump-temp");
    const volumeInput = document.getElementById("conv-pump-volume");
    const condPressureInput = document.getElementById("conv-pump-cond-pressure");
    const condTempInput = document.getElementById("conv-pump-cond-temp");
    const resultEl = document.getElementById("conv-pump-result");
    if (!pressureInput || !resultEl) return;

    const STD_INHG = 29.92125984;
    const STD_RANKINE = 519.67;

    function compute() {
      const pressure = parseFloat(pressureInput.value);
      const temp = parseFloat(tempInput.value);
      const volume = parseFloat(volumeInput.value);
      const condPressure = parseFloat(condPressureInput.value);
      const condTemp = parseFloat(condTempInput.value);
      if (isNaN(pressure) || isNaN(temp) || !volume || isNaN(condPressure) || isNaN(condTemp)) {
        resultEl.innerHTML = "";
        return;
      }
      const absPressure = STD_INHG - pressure;
      const tRankine = celsiusToRankine(temp);
      if (absPressure <= 0) {
        resultEl.innerHTML = "Pression hors plage (doit être inférieure à 29,92 po Hg).";
        return;
      }
      const normalizedFlow = (absPressure * volume * STD_RANKINE) / (STD_INHG * tRankine);

      const condAbsPressure = STD_INHG - condPressure;
      const condTRankine = celsiusToRankine(condTemp);
      if (condAbsPressure <= 0) {
        resultEl.innerHTML = "Pression cible hors plage.";
        return;
      }
      const condVolume = (normalizedFlow * STD_INHG * condTRankine) / (condAbsPressure * STD_RANKINE);

      resultEl.innerHTML = `
        Dans la condition visée, le débit équivalent est d'environ <strong>${fmt(condVolume, 2)}</strong> (même unité que le débit mesuré).
      `;
    }
    [pressureInput, tempInput, volumeInput, condPressureInput, condTempInput].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ---------- Débit d'évaporation — version simplifiée (bilan global) ---------- */
  function setupEvaporationCalc() {
    const consumptionInput = document.getElementById("conv-evap-consumption");
    const inBrixInput = document.getElementById("conv-evap-inbrix");
    const outBrixInput = document.getElementById("conv-evap-outbrix");
    const areaInput = document.getElementById("conv-evap-area");
    const resultEl = document.getElementById("conv-evap-result");
    if (!consumptionInput || !resultEl) return;

    function compute() {
      const consumption = parseFloat(consumptionInput.value);
      const inBrix = parseFloat(inBrixInput.value);
      const outBrix = parseFloat(outBrixInput.value);
      const area = parseFloat(areaInput.value);
      if (!consumption || !inBrix || !outBrix || !area || outBrix <= inBrix) {
        resultEl.innerHTML = "";
        return;
      }
      const syrupOut = (consumption * inBrix) / outBrix;
      const waterEvap = consumption - syrupOut;
      const ratePerFt2 = waterEvap / area;
      resultEl.innerHTML = `
        Eau évaporée : <strong>${fmt(waterEvap, 1)} litres/heure</strong>
        (≈ ${fmt(ratePerFt2, 2)} L/h par pi² de surface).<br>
        <span class="conv-result-sub">Sirop produit ≈ ${fmt(syrupOut, 2)} L/h à ${fmt(outBrix, 1)}° Brix</span>
      `;
    }
    [consumptionInput, inBrixInput, outBrixInput, areaInput].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ============================================================
     CONVERTISSEURS — conversions générales d'unités
     ============================================================ */

  /* ---------- Moteur générique (facteur linéaire vers une unité de base) ---------- */
  const UNIT_CATEGORIES = {
    poids: {
      base: "kg",
      units: [
        { id: "mg", label: "milligrammes", factor: 1e-6 },
        { id: "g", label: "grammes", factor: 0.001 },
        { id: "kg", label: "kilogrammes", factor: 1 },
        { id: "t", label: "tonnes métriques", factor: 1000 },
        { id: "oz", label: "onces", factor: 0.028349523125 },
        { id: "lb", label: "livres", factor: 0.45359237 },
        { id: "ton_us", label: "tonnes courtes (US)", factor: 907.18474 },
      ],
    },
    pression: {
      base: "kPa",
      units: [
        { id: "Pa", label: "pascals", factor: 0.001 },
        { id: "kPa", label: "kilopascals", factor: 1 },
        { id: "bar", label: "bar", factor: 100 },
        { id: "atm", label: "atmosphères", factor: 101.325 },
        { id: "psi", label: "psi (lb/po²)", factor: 6.894757293168 },
        { id: "mmHg", label: "mm Hg (torr)", factor: 0.13332239 },
        { id: "inHg", label: "po Hg", factor: 3.386389 },
      ],
    },
    distance: {
      base: "m",
      units: [
        { id: "mm", label: "millimètres", factor: 0.001 },
        { id: "cm", label: "centimètres", factor: 0.01 },
        { id: "m", label: "mètres", factor: 1 },
        { id: "km", label: "kilomètres", factor: 1000 },
        { id: "in", label: "pouces", factor: 0.0254 },
        { id: "ft", label: "pieds", factor: 0.3048 },
        { id: "yd", label: "verges", factor: 0.9144 },
        { id: "mi", label: "milles", factor: 1609.344 },
      ],
    },
    surface: {
      base: "m2",
      units: [
        { id: "cm2", label: "centimètres carrés", factor: 0.0001 },
        { id: "m2", label: "mètres carrés", factor: 1 },
        { id: "km2", label: "kilomètres carrés", factor: 1000000 },
        { id: "in2", label: "pouces carrés", factor: 0.00064516 },
        { id: "ft2", label: "pieds carrés", factor: 0.09290304 },
        { id: "acre", label: "acres", factor: 4046.8564224 },
        { id: "ha", label: "hectares", factor: 10000 },
      ],
    },
    volume: {
      base: "L",
      units: [
        { id: "mL", label: "millilitres", factor: 0.001 },
        { id: "L", label: "litres", factor: 1 },
        { id: "m3", label: "mètres cubes", factor: 1000 },
        { id: "in3", label: "pouces cubes", factor: 0.0163871 },
        { id: "ft3", label: "pieds cubes", factor: 28.316846592 },
        { id: "galUS", label: "gallons US", factor: 3.785411784 },
        { id: "galImp", label: "gallons canadiens", factor: 4.54609 },
      ],
    },
    vitesse: {
      base: "m/s",
      units: [
        { id: "ms", label: "mètres/seconde", factor: 1 },
        { id: "kmh", label: "km/h", factor: 0.277778 },
        { id: "mph", label: "mi/h", factor: 0.44704 },
        { id: "noeud", label: "nœuds", factor: 0.514444 },
        { id: "fts", label: "pieds/seconde", factor: 0.3048 },
      ],
    },
    force: {
      base: "N",
      units: [
        { id: "N", label: "newtons", factor: 1 },
        { id: "kN", label: "kilonewtons", factor: 1000 },
        { id: "lbf", label: "livres-force", factor: 4.4482216153 },
        { id: "kgf", label: "kilogrammes-force", factor: 9.80665 },
      ],
    },
    energie: {
      base: "J",
      units: [
        { id: "J", label: "joules", factor: 1 },
        { id: "kJ", label: "kilojoules", factor: 1000 },
        { id: "cal", label: "calories", factor: 4.184 },
        { id: "kcal", label: "kilocalories", factor: 4184 },
        { id: "Wh", label: "watt-heures", factor: 3600 },
        { id: "kWh", label: "kilowatt-heures", factor: 3600000 },
        { id: "BTU", label: "BTU", factor: 1055.05585262 },
      ],
    },
    puissance: {
      base: "W",
      units: [
        { id: "W", label: "watts", factor: 1 },
        { id: "kW", label: "kilowatts", factor: 1000 },
        { id: "hp", label: "chevaux-vapeur (hp)", factor: 745.699872 },
        { id: "BTUh", label: "BTU/heure", factor: 0.29307107 },
      ],
    },
  };

  function setupGenericConverters() {
    document.querySelectorAll(".conv-generic").forEach((container) => {
      const category = UNIT_CATEGORIES[container.dataset.category];
      if (!category) return;
      const valueInput = container.querySelector(".conv-generic-value");
      const unitSelect = container.querySelector(".conv-generic-unit");
      const resultEl = container.querySelector(".conv-generic-result");

      unitSelect.innerHTML = category.units.map((u) => `<option value="${u.id}">${u.label}</option>`).join("");

      function compute() {
        const value = parseFloat(valueInput.value);
        const fromUnit = category.units.find((u) => u.id === unitSelect.value);
        if (isNaN(value) || !fromUnit) {
          resultEl.innerHTML = "";
          return;
        }
        const baseValue = value * fromUnit.factor;
        resultEl.innerHTML = category.units
          .map((u) => `<div><strong>${fmt(baseValue / u.factor, 4)}</strong>${u.label}</div>`)
          .join("");
      }
      [valueInput, unitSelect].forEach((el) => el.addEventListener("input", compute));
      compute();
    });
  }

  /* ---------- Concentration : ° Brix ↔ gravité spécifique ↔ ° Baumé ----------
     Réutilise la table officielle Brix->SG (interpolation), et sa version inverse
     SG->Brix (même table, interpolation dans l'autre sens). Formule Baumé standard
     pour liquides plus denses que l'eau : °Bé = 145 - 145/SG. */
  function brixFromSG(sg) {
    const exact = BRIX_SG_TABLE.find((p) => p.value === sg);
    if (exact) return exact.brix;
    const below = BRIX_SG_TABLE.filter((p) => p.value < sg).pop();
    const above = BRIX_SG_TABLE.find((p) => p.value > sg);
    if (!below || !above) return null;
    const ratio = (sg - below.value) / (above.value - below.value);
    return below.brix + ratio * (above.brix - below.brix);
  }
  function setupConcentrationConverter() {
    const valueInput = document.getElementById("conv-conc-value");
    const unitSelect = document.getElementById("conv-conc-unit");
    const resultEl = document.getElementById("conv-conc-result");
    if (!valueInput || !resultEl) return;

    function compute() {
      const value = parseFloat(valueInput.value);
      if (isNaN(value)) {
        resultEl.innerHTML = "";
        return;
      }
      let sg, brix, baume;
      if (unitSelect.value === "brix") {
        brix = value;
        sg = sgFromBrix(brix);
      } else if (unitSelect.value === "sg") {
        sg = value;
        brix = brixFromSG(sg);
      } else {
        baume = value;
        sg = 145 / (145 - baume);
        brix = brixFromSG(sg);
      }
      if (unitSelect.value !== "baume") baume = sg ? 145 - 145 / sg : null;

      resultEl.innerHTML = `
        <div><strong>${brix !== null ? fmt(brix, 2) : "—"}</strong>° Brix</div>
        <div><strong>${sg ? sg.toFixed(5) : "—"}</strong>gravité spécifique</div>
        <div><strong>${baume !== null && isFinite(baume) ? fmt(baume, 2) : "—"}</strong>° Baumé</div>
      `;
    }
    [valueInput, unitSelect].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  /* ---------- Température ---------- */
  function setupTemperatureConverter() {
    const valueInput = document.getElementById("conv-temp-value");
    const unitSelect = document.getElementById("conv-temp-unit");
    const resultEl = document.getElementById("conv-temp-result");
    if (!valueInput || !resultEl) return;

    function toCelsius(v, unit) {
      if (unit === "celsius") return v;
      if (unit === "fahrenheit") return ((v - 32) * 5) / 9;
      if (unit === "kelvin") return v - 273.15;
      if (unit === "rankine") return ((v - 491.67) * 5) / 9;
      return null;
    }
    function compute() {
      const value = parseFloat(valueInput.value);
      if (isNaN(value)) {
        resultEl.innerHTML = "";
        return;
      }
      const c = toCelsius(value, unitSelect.value);
      const f = (c * 9) / 5 + 32;
      const k = c + 273.15;
      const r = (c + 273.15) * 1.8;
      resultEl.innerHTML = `
        <div><strong>${fmt(c, 2)}</strong>Celsius (°C)</div>
        <div><strong>${fmt(f, 2)}</strong>Fahrenheit (°F)</div>
        <div><strong>${fmt(k, 2)}</strong>Kelvin (K)</div>
        <div><strong>${fmt(r, 2)}</strong>Rankine (°R)</div>
      `;
    }
    [valueInput, unitSelect].forEach((el) => el.addEventListener("input", compute));
    compute();
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupTabs();
    setupYieldCalc();
    setupBoilingCalc();
    setupConcentrationCalc();
    setupProductCalc();
    setupTapsCalc();
    setupTubeCalc();
    setupTankCalc();
    setupPanCalc();
    setupSGCalc();
    setupDiluteCalc();
    setupBlendCalc();
    setupPriceCalc();
    setupOsmosisCalc();
    setupCleaningCalc();
    setupDiatomaceousCalc();
    setupTransmittanceCalc();
    setupVolumeForTransmittanceCalc();
    setupPumpFlowCalc();
    setupEvaporationCalc();
    setupGenericConverters();
    setupConcentrationConverter();
    setupTemperatureConverter();
  });
})();
