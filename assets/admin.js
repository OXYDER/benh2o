(function () {
  const DRAFT_KEY = "bl_zones_draft_v1";
  const tree = document.getElementById("admin-tree");
  const filterInput = document.getElementById("admin-filter");
  const statsEl = document.getElementById("admin-stats");

  let data = { regions: [] };

  /* ---------- Chargement ---------- */
  function loadDraftOrFetch() {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        data = JSON.parse(draft);
        render();
        return;
      } catch (e) {
        /* brouillon corrompu, on retombe sur zones.json */
      }
    }
    fetchFresh();
  }

  function fetchFresh() {
    fetch("assets/zones.json")
      .then((res) => res.json())
      .then((json) => {
        data = json;
        render();
      })
      .catch(() => {
        tree.innerHTML = '<p style="color:#B3403A">Impossible de charger assets/zones.json — vérifie que cette page est bien servie par le site (pas ouverte en fichier local).</p>';
      });
  }

  function saveDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    updateStats();
  }

  /* ---------- Stats ---------- */
  function updateStats() {
    const nbRegions = data.regions.length;
    const nbMrc = data.regions.reduce((acc, r) => acc + r.mrcs.length, 0);
    const nbMuni = data.regions.reduce((acc, r) => acc + r.mrcs.reduce((a, m) => a + m.municipalities.length, 0), 0);
    statsEl.innerHTML = `
      <div><strong>${nbRegions}</strong>région${nbRegions > 1 ? "s" : ""}</div>
      <div><strong>${nbMrc}</strong>MRC</div>
      <div><strong>${nbMuni}</strong>municipalité${nbMuni > 1 ? "s" : ""}</div>
    `;
  }

  /* ---------- Rendu ---------- */
  function render() {
    const filter = normalize(filterInput.value);
    tree.innerHTML = "";

    data.regions.forEach((region, ri) => {
      const regionMatches = !filter || normalize(region.name).includes(filter);
      const visibleMrcs = region.mrcs
        .map((mrc, mi) => ({ mrc, mi }))
        .filter(({ mrc }) => {
          if (!filter) return true;
          if (normalize(mrc.name).includes(filter)) return true;
          return mrc.municipalities.some((m) => normalize(m).includes(filter));
        });

      if (filter && !regionMatches && visibleMrcs.length === 0) return;

      const card = document.createElement("div");
      card.className = "region-card";

      const head = document.createElement("div");
      head.className = "region-head";
      head.innerHTML = `
        <input class="region-code" value="${escapeAttr(region.code || "")}" placeholder="Code" data-ri="${ri}">
        <input class="region-name" value="${escapeAttr(region.name)}" data-ri="${ri}">
        <button class="icon-btn add-region-remove" title="Supprimer la région" data-ri="${ri}">✕</button>
      `;
      card.appendChild(head);

      const mrcsToShow = filter ? visibleMrcs : region.mrcs.map((mrc, mi) => ({ mrc, mi }));
      mrcsToShow.forEach(({ mrc, mi }) => {
        card.appendChild(renderMrc(region, ri, mrc, mi, filter));
      });

      const addMrcBtn = document.createElement("button");
      addMrcBtn.className = "add-mrc-btn";
      addMrcBtn.textContent = "+ Ajouter une MRC";
      addMrcBtn.addEventListener("click", () => {
        region.mrcs.push({ name: "Nouvelle MRC", municipalities: [] });
        saveDraft();
        render();
      });
      card.appendChild(addMrcBtn);

      tree.appendChild(card);
    });

    // bind région inputs
    tree.querySelectorAll(".region-name").forEach((el) => {
      el.addEventListener("input", (e) => {
        data.regions[e.target.dataset.ri].name = e.target.value;
        saveDraft();
      });
    });
    tree.querySelectorAll(".region-code").forEach((el) => {
      el.addEventListener("input", (e) => {
        data.regions[e.target.dataset.ri].code = e.target.value;
        saveDraft();
      });
    });
    tree.querySelectorAll(".add-region-remove").forEach((el) => {
      el.addEventListener("click", (e) => {
        const ri = Number(e.target.dataset.ri);
        if (confirm(`Supprimer la région "${data.regions[ri].name}" et tout son contenu ?`)) {
          data.regions.splice(ri, 1);
          saveDraft();
          render();
        }
      });
    });

    updateStats();
  }

  function renderMrc(region, ri, mrc, mi, filter) {
    const block = document.createElement("div");
    block.className = "mrc-block";

    const head = document.createElement("div");
    head.className = "mrc-head";
    head.innerHTML = `
      <span class="mrc-label">MRC</span>
      <input class="mrc-name" value="${escapeAttr(mrc.name)}">
      <button class="icon-btn danger mrc-remove" title="Supprimer la MRC">✕</button>
    `;
    head.querySelector(".mrc-name").addEventListener("input", (e) => {
      mrc.name = e.target.value;
      saveDraft();
    });
    head.querySelector(".mrc-remove").addEventListener("click", () => {
      if (confirm(`Supprimer la MRC "${mrc.name}" et ses municipalités ?`)) {
        region.mrcs.splice(mi, 1);
        saveDraft();
        render();
      }
    });
    block.appendChild(head);

    const list = document.createElement("div");
    list.className = "muni-list";
    const muniIndexes = mrc.municipalities
      .map((m, idx) => idx)
      .filter((idx) => !filter || normalize(mrc.municipalities[idx]).includes(filter) || normalize(mrc.name).includes(filter));

    muniIndexes.forEach((idx) => {
      const chip = document.createElement("span");
      chip.className = "muni-chip";
      chip.innerHTML = `<input value="${escapeAttr(mrc.municipalities[idx])}"><button class="icon-btn muni-remove" title="Retirer">✕</button>`;
      chip.querySelector("input").addEventListener("input", (e) => {
        mrc.municipalities[idx] = e.target.value;
        saveDraft();
      });
      chip.querySelector(".muni-remove").addEventListener("click", () => {
        mrc.municipalities.splice(idx, 1);
        saveDraft();
        render();
      });
      list.appendChild(chip);
    });
    block.appendChild(list);

    const addRow = document.createElement("div");
    addRow.className = "add-muni-row";
    addRow.innerHTML = `<input type="text" placeholder="+ Ajouter une municipalité et appuyer sur Entrée">`;
    const addInput = addRow.querySelector("input");
    addInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && addInput.value.trim()) {
        mrc.municipalities.push(addInput.value.trim());
        saveDraft();
        render();
      }
    });
    block.appendChild(addRow);

    return block;
  }

  /* ---------- Utilitaires ---------- */
  function normalize(str) {
    return (str || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }
  function escapeAttr(str) {
    return (str || "").toString().replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  /* ---------- Actions globales ---------- */
  document.getElementById("admin-add-region").addEventListener("click", () => {
    data.regions.push({ name: "Nouvelle région", code: "", mrcs: [] });
    saveDraft();
    render();
  });

  document.getElementById("admin-reload").addEventListener("click", () => {
    if (confirm("Recharger zones.json effacera ton brouillon local non téléchargé. Continuer ?")) {
      localStorage.removeItem(DRAFT_KEY);
      fetchFresh();
    }
  });

  document.getElementById("admin-download").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zones.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById("admin-copy").addEventListener("click", async () => {
    const text = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      const btn = document.getElementById("admin-copy");
      const original = btn.textContent;
      btn.textContent = "Copié !";
      setTimeout(() => (btn.textContent = original), 1500);
    } catch (e) {
      alert("Impossible de copier automatiquement — sélectionne et copie le JSON manuellement depuis la console (F12).");
      console.log(text);
    }
  });

  filterInput.addEventListener("input", render);

  loadDraftOrFetch();
})();
