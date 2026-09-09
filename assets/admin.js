(function () {
  /* =========================================================
     AUTHENTIFICATION
     ========================================================= */
  const loginGate = document.getElementById("login-gate");
  const adminApp = document.getElementById("admin-app");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const loginSubmit = document.getElementById("login-submit");
  const userEmailEl = document.getElementById("admin-user-email");

  function showApp(email) {
    loginGate.hidden = true;
    adminApp.hidden = false;
    userEmailEl.textContent = email || "";
    initApp();
  }

  function showLogin() {
    loginGate.hidden = false;
    adminApp.hidden = true;
  }

  async function checkSession() {
    try {
      const res = await fetch("/api/session");
      const data = await res.json();
      if (data.authenticated) {
        showApp(data.email);
      } else {
        showLogin();
      }
    } catch (e) {
      showLogin();
    }
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.style.display = "none";
    loginSubmit.disabled = true;
    loginSubmit.textContent = "Connexion…";

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showApp(data.email);
      } else {
        loginError.textContent = data.error || "Identifiants invalides.";
        loginError.style.display = "block";
      }
    } catch (e) {
      loginError.textContent = "Impossible de contacter le serveur.";
      loginError.style.display = "block";
    } finally {
      loginSubmit.disabled = false;
      loginSubmit.textContent = "Se connecter";
    }
  });

  document.getElementById("logout-btn").addEventListener("click", async () => {
    if (dirty.contact || dirty.zones) {
      if (!confirm("Tu as des changements non enregistrés. Te déconnecter quand même ?")) return;
    }
    await fetch("/api/logout", { method: "POST" });
    showLogin();
  });

  checkSession();

  /* =========================================================
     ONGLETS
     ========================================================= */
  function setupTabs() {
    const tabs = document.querySelectorAll(".admin-tab");
    const panels = document.querySelectorAll(".admin-panel");
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

  /* =========================================================
     Utilitaires communs
     ========================================================= */
  function normalize(str) {
    return (str || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }
  function escapeAttr(str) {
    return (str || "").toString().replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }
  function flashStatus(el, message, isError) {
    el.textContent = message;
    el.classList.toggle("error", !!isError);
    el.classList.add("show");
    if (!isError) {
      setTimeout(() => el.classList.remove("show"), 2500);
    }
    // les messages d'erreur restent affichés jusqu'à la prochaine tentative
  }

  /* ---------- Avertit avant de quitter s'il y a des changements non enregistrés ---------- */
  const dirty = { contact: false, zones: false };
  const dirtyEls = { contact: null, zones: null };
  function registerDirtyIndicator(key, el) {
    dirtyEls[key] = el;
  }
  function markDirty(key) {
    dirty[key] = true;
    const el = dirtyEls[key];
    if (el) {
      el.textContent = "Changements non enregistrés";
      el.classList.remove("error");
      el.classList.add("show");
    }
  }
  function clearDirty(key) {
    dirty[key] = false;
  }
  window.addEventListener("beforeunload", (e) => {
    if (dirty.contact || dirty.zones) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  let appInitialized = false;
  function initApp() {
    if (appInitialized) return;
    appInitialized = true;
    setupTabs();
    setupContactEditor();
    setupZonesEditor();
  }

  /* =========================================================
     ONGLET : MES INFORMATIONS DE CONTACT
     ========================================================= */
  function setupContactEditor() {
    const form = document.getElementById("contact-form-admin");
    const saveBtn = document.getElementById("contact-save");
    const statusEl = document.getElementById("contact-save-status");
    let contactData = {};

    function getPath(obj, path) {
      return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
    }
    function setPath(obj, path, value) {
      const keys = path.split(".");
      let cur = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        if (typeof cur[keys[i]] !== "object" || cur[keys[i]] === null) cur[keys[i]] = {};
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
    }

    function populateForm() {
      form.querySelectorAll("[data-key]").forEach((el) => {
        const val = getPath(contactData, el.dataset.key);
        if (el.type === "checkbox") {
          el.checked = !!val;
        } else {
          el.value = val === undefined || val === null ? "" : val;
        }
      });
    }

    function bindForm() {
      form.querySelectorAll("[data-key]").forEach((el) => {
        const evt = el.type === "checkbox" ? "change" : "input";
        el.addEventListener(evt, () => {
          const value = el.type === "checkbox" ? el.checked : el.value;
          setPath(contactData, el.dataset.key, value);
          markDirty("contact");
        });
      });
    }

    async function load() {
      try {
        const res = await fetch("/api/contact");
        contactData = await res.json();
        populateForm();
      } catch (e) {
        flashStatus(statusEl, "Impossible de charger les données.", true);
      }
    }

    async function save() {
      saveBtn.disabled = true;
      saveBtn.textContent = "Enregistrement…";
      try {
        const res = await fetch("/api/contact", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contactData),
        });
        if (res.ok) {
          flashStatus(statusEl, "Enregistré ✓", false);
          clearDirty("contact");
        } else {
          const data = await res.json().catch(() => ({}));
          flashStatus(statusEl, data.error || "Échec de l'enregistrement.", true);
        }
      } catch (e) {
        flashStatus(statusEl, "Impossible de contacter le serveur.", true);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Enregistrer";
      }
    }

    bindForm();
    registerDirtyIndicator("contact", statusEl);
    saveBtn.addEventListener("click", save);
    load();
  }

  /* =========================================================
     ONGLET : ZONES DE COUVERTURE (Région > MRC > Municipalité)
     ========================================================= */
  function setupZonesEditor() {
    const tree = document.getElementById("admin-tree");
    const filterInput = document.getElementById("admin-filter");
    const statsEl = document.getElementById("admin-stats");
    const saveBtn = document.getElementById("zones-save");
    const statusEl = document.getElementById("zones-save-status");

    let data = { regions: [] };

    async function load() {
      try {
        const res = await fetch("/api/zones");
        data = await res.json();
        if (!Array.isArray(data.regions)) data.regions = [];
        render();
      } catch (e) {
        tree.innerHTML = '<p style="color:#B3403A">Impossible de charger les zones.</p>';
      }
    }

    async function save() {
      saveBtn.disabled = true;
      saveBtn.textContent = "Enregistrement…";
      try {
        const res = await fetch("/api/zones", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          flashStatus(statusEl, "Enregistré ✓", false);
          clearDirty("zones");
        } else {
          const d = await res.json().catch(() => ({}));
          flashStatus(statusEl, d.error || "Échec de l'enregistrement.", true);
        }
      } catch (e) {
        flashStatus(statusEl, "Impossible de contacter le serveur.", true);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Enregistrer";
      }
    }

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
          markDirty("zones");
          render();
        });
        card.appendChild(addMrcBtn);

        tree.appendChild(card);
      });

      tree.querySelectorAll(".region-name").forEach((el) => {
        el.addEventListener("input", (e) => {
          data.regions[e.target.dataset.ri].name = e.target.value;
          markDirty("zones");
        });
      });
      tree.querySelectorAll(".region-code").forEach((el) => {
        el.addEventListener("input", (e) => {
          data.regions[e.target.dataset.ri].code = e.target.value;
          markDirty("zones");
        });
      });
      tree.querySelectorAll(".add-region-remove").forEach((el) => {
        el.addEventListener("click", (e) => {
          const ri = Number(e.target.dataset.ri);
          if (confirm(`Supprimer la région "${data.regions[ri].name}" et tout son contenu ?`)) {
            data.regions.splice(ri, 1);
            markDirty("zones");
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
        markDirty("zones");
      });
      head.querySelector(".mrc-remove").addEventListener("click", () => {
        if (confirm(`Supprimer la MRC "${mrc.name}" et ses municipalités ?`)) {
          region.mrcs.splice(mi, 1);
          markDirty("zones");
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
          markDirty("zones");
        });
        chip.querySelector(".muni-remove").addEventListener("click", () => {
          mrc.municipalities.splice(idx, 1);
          markDirty("zones");
          render();
        });
        list.appendChild(chip);
      });
      block.appendChild(list);

      const addRow = document.createElement("div");
      addRow.className = "add-muni-row";
      addRow.innerHTML = `
        <input type="text" placeholder="Nom de la municipalité…">
        <button type="button" class="add-muni-btn" title="Ajouter">+ Ajouter</button>
      `;
      const addInput = addRow.querySelector("input");
      const addBtn = addRow.querySelector(".add-muni-btn");
      function confirmAdd() {
        if (addInput.value.trim()) {
          mrc.municipalities.push(addInput.value.trim());
          markDirty("zones");
          render();
        }
      }
      addInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") confirmAdd();
      });
      addBtn.addEventListener("click", confirmAdd);
      block.appendChild(addRow);

      return block;
    }

    document.getElementById("admin-add-region").addEventListener("click", () => {
      data.regions.push({ name: "Nouvelle région", code: "", mrcs: [] });
      markDirty("zones");
      render();
    });

    filterInput.addEventListener("input", render);
    saveBtn.addEventListener("click", save);
    registerDirtyIndicator("zones", statusEl);

    load();
  }
})();
