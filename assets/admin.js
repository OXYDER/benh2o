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
    if (dirty.contact || dirty.zones || dirty.content || dirty.distributeurs || dirty.smtp) {
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
    return (str || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u2010-\u2015\u2212]/g, "-")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim();
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
  const dirty = { contact: false, zones: false, content: false, distributeurs: false, smtp: false };
  const dirtyEls = { contact: null, zones: null, content: null, distributeurs: null, smtp: null };
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
    if (dirty.contact || dirty.zones || dirty.content || dirty.distributeurs || dirty.smtp) {
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
    setupContentEditor();
    setupDistributeursEditor();
    setupSmtpEditor();
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
    const statusEl = document.getElementById("zones-save-status");

    let data = { regions: [] };
    let saveTimer = null;

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
      statusEl.textContent = "Enregistrement…";
      statusEl.classList.remove("error");
      statusEl.classList.add("show");
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
      }
    }

    // Ajout/suppression : enregistre tout de suite.
    function saveNow() {
      markDirty("zones");
      clearTimeout(saveTimer);
      save();
    }

    // Frappe dans un champ texte : attend une courte pause avant d'enregistrer,
    // pour ne pas sauvegarder à chaque lettre tapée.
    function saveSoon() {
      markDirty("zones");
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 700);
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
          render();
          saveNow();
        });
        card.appendChild(addMrcBtn);

        tree.appendChild(card);
      });

      tree.querySelectorAll(".region-name").forEach((el) => {
        el.addEventListener("input", (e) => {
          data.regions[e.target.dataset.ri].name = e.target.value;
          saveSoon();
        });
      });
      tree.querySelectorAll(".region-code").forEach((el) => {
        el.addEventListener("input", (e) => {
          data.regions[e.target.dataset.ri].code = e.target.value;
          saveSoon();
        });
      });
      tree.querySelectorAll(".add-region-remove").forEach((el) => {
        el.addEventListener("click", (e) => {
          const ri = Number(e.target.dataset.ri);
          if (confirm(`Supprimer la région "${data.regions[ri].name}" et tout son contenu ?`)) {
            data.regions.splice(ri, 1);
            render();
            saveNow();
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
        saveSoon();
      });
      head.querySelector(".mrc-remove").addEventListener("click", () => {
        if (confirm(`Supprimer la MRC "${mrc.name}" et ses municipalités ?`)) {
          region.mrcs.splice(mi, 1);
          render();
          saveNow();
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
          saveSoon();
        });
        chip.querySelector(".muni-remove").addEventListener("click", () => {
          mrc.municipalities.splice(idx, 1);
          render();
          saveNow();
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
          render();
          saveNow();
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
      render();
      saveNow();
    });

    filterInput.addEventListener("input", render);
    registerDirtyIndicator("zones", statusEl);

    load();
  }

  /* =========================================================
     ONGLET : CONTENU DE LA PAGE (textes + thème)
     ========================================================= */
  function setupContentEditor() {
    const panel = document.querySelector('[data-panel="content"]');
    if (!panel) return;
    const saveBtn = document.getElementById("content-save");
    const statusEl = document.getElementById("content-save-status");
    const themePicker = document.getElementById("theme-picker");

    let contentData = {};
    let themes = [];

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
      panel.querySelectorAll("[data-key]").forEach((el) => {
        const val = getPath(contentData, el.dataset.key);
        el.value = val === undefined || val === null ? "" : val;
      });
    }

    function bindForm() {
      panel.querySelectorAll("[data-key]").forEach((el) => {
        el.addEventListener("input", () => {
          setPath(contentData, el.dataset.key, el.value);
          markDirty("content");
        });
      });
    }

    function renderThemePicker() {
      if (!themePicker) return;
      themePicker.innerHTML = themes
        .map((t) => {
          const swatches = ["--spruce-950", "--birch-100", "--amber-600", "--water-500"]
            .map((v) => `<span class="theme-swatch" style="background:${t.vars[v]}"></span>`)
            .join("");
          const active = t.id === contentData.activeTheme ? " active" : "";
          return `
            <button type="button" class="theme-card${active}" data-theme-id="${t.id}">
              <span class="theme-swatches">${swatches}</span>
              <span class="theme-name">${t.name}</span>
              <span class="theme-desc">${t.description || ""}</span>
            </button>
          `;
        })
        .join("");

      themePicker.querySelectorAll(".theme-card").forEach((card) => {
        card.addEventListener("click", () => {
          contentData.activeTheme = card.dataset.themeId;
          markDirty("content");
          themePicker.querySelectorAll(".theme-card").forEach((c) => c.classList.remove("active"));
          card.classList.add("active");
        });
      });
    }

    async function load() {
      try {
        const [contentRes, themesRes] = await Promise.all([
          fetch("/api/content"),
          fetch("assets/data/themes.json"),
        ]);
        contentData = await contentRes.json();
        const themeData = await themesRes.json();
        themes = themeData.themes || [];
        populateForm();
        renderThemePicker();
      } catch (e) {
        flashStatus(statusEl, "Impossible de charger les données.", true);
      }
    }

    async function save() {
      saveBtn.disabled = true;
      saveBtn.textContent = "Enregistrement…";
      try {
        const res = await fetch("/api/content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contentData),
        });
        if (res.ok) {
          flashStatus(statusEl, "Enregistré ✓", false);
          clearDirty("content");
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
    saveBtn.addEventListener("click", save);
    registerDirtyIndicator("content", statusEl);
    load();
  }

  /* =========================================================
     ONGLET : DISTRIBUTEURS (réseau H2O Innovation)
     ========================================================= */
  function setupDistributeursEditor() {
    const listEl = document.getElementById("distributeurs-list");
    if (!listEl) return;
    const addBtn = document.getElementById("dist-add");
    const saveBtn = document.getElementById("dist-save");
    const statusEl = document.getElementById("dist-save-status");

    let dists = [];

    function render() {
      listEl.innerHTML = "";
      dists.forEach((d, i) => {
        const card = document.createElement("div");
        card.className = "dist-card";
        card.innerHTML = `
          <div class="dist-card-head">
            <input type="text" class="dist-name" value="${escapeAttr(d.name)}" placeholder="Nom du distributeur">
            <button class="icon-btn danger dist-remove" title="Supprimer">✕</button>
          </div>
          <div class="dist-fields">
            <div class="full">
              <label>Adresse</label>
              <input type="text" class="f-address" value="${escapeAttr(d.address || "")}" placeholder="123 Rue Principale, Ville, QC">
            </div>
            <div>
              <label>Téléphone</label>
              <input type="text" class="f-phone" value="${escapeAttr(d.phone || "")}" placeholder="819-000-0000">
            </div>
            <div>
              <label>Courriel</label>
              <input type="email" class="f-email" value="${escapeAttr(d.email || "")}">
            </div>
            <div>
              <label>Latitude</label>
              <input type="text" class="f-lat" value="${d.lat ?? ""}" placeholder="45.5049">
            </div>
            <div>
              <label>Longitude</label>
              <input type="text" class="f-lon" value="${d.lon ?? ""}" placeholder="-72.3159">
            </div>
            <p class="dist-coords-hint">Pour trouver les coordonnées : cherche l'adresse sur <a href="https://www.google.com/maps" target="_blank" rel="noopener">Google Maps</a>, clic droit sur le point exact → clique les chiffres pour les copier.</p>
          </div>
        `;

        card.querySelector(".dist-name").addEventListener("input", (e) => {
          dists[i].name = e.target.value;
          markDirty("distributeurs");
        });
        card.querySelector(".f-address").addEventListener("input", (e) => {
          dists[i].address = e.target.value;
          markDirty("distributeurs");
        });
        card.querySelector(".f-phone").addEventListener("input", (e) => {
          dists[i].phone = e.target.value;
          markDirty("distributeurs");
        });
        card.querySelector(".f-email").addEventListener("input", (e) => {
          dists[i].email = e.target.value;
          markDirty("distributeurs");
        });
        card.querySelector(".f-lat").addEventListener("input", (e) => {
          dists[i].lat = parseFloat(e.target.value);
          markDirty("distributeurs");
        });
        card.querySelector(".f-lon").addEventListener("input", (e) => {
          dists[i].lon = parseFloat(e.target.value);
          markDirty("distributeurs");
        });
        card.querySelector(".dist-remove").addEventListener("click", () => {
          if (confirm(`Supprimer "${dists[i].name}" ?`)) {
            dists.splice(i, 1);
            markDirty("distributeurs");
            render();
          }
        });

        listEl.appendChild(card);
      });
    }

    async function load() {
      try {
        const res = await fetch("/api/distributeurs");
        dists = await res.json();
        if (!Array.isArray(dists)) dists = [];
        render();
      } catch (e) {
        listEl.innerHTML = '<p style="color:#B3403A">Impossible de charger les distributeurs.</p>';
      }
    }

    async function save() {
      saveBtn.disabled = true;
      saveBtn.textContent = "Enregistrement…";
      try {
        const res = await fetch("/api/distributeurs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dists),
        });
        if (res.ok) {
          flashStatus(statusEl, "Enregistré ✓", false);
          clearDirty("distributeurs");
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

    addBtn.addEventListener("click", () => {
      dists.push({ name: "Nouveau distributeur", address: "", phone: "", email: "", lat: 46.0, lon: -71.5 });
      markDirty("distributeurs");
      render();
    });

    saveBtn.addEventListener("click", save);
    registerDirtyIndicator("distributeurs", statusEl);
    load();
  }

  /* =========================================================
     ONGLET : Mes informations — section SMTP (formulaire de contact)
     ========================================================= */
  function setupSmtpEditor() {
    const section = document.getElementById("smtp-section");
    if (!section) return;
    const saveBtn = document.getElementById("smtp-save");
    const testBtn = document.getElementById("smtp-test");
    const statusEl = document.getElementById("smtp-save-status");
    const passwordHint = document.getElementById("smtp-password-hint");
    const passwordInput = document.getElementById("smtp-password");

    let smtpData = {};

    function populateForm() {
      section.querySelectorAll("[data-key]").forEach((el) => {
        const val = smtpData[el.dataset.key];
        if (el.type === "checkbox") {
          el.checked = !!val;
        } else if (el.type !== "password") {
          el.value = val === undefined || val === null ? "" : val;
        }
      });
      if (passwordHint) {
        passwordHint.textContent = smtpData.passwordSet
          ? "Un mot de passe est déjà enregistré — laisse ce champ vide pour le garder, ou tape-en un nouveau pour le remplacer."
          : "Aucun mot de passe enregistré pour l'instant.";
      }
    }

    function bindForm() {
      section.querySelectorAll("[data-key]").forEach((el) => {
        const evt = el.type === "checkbox" ? "change" : "input";
        el.addEventListener(evt, () => {
          smtpData[el.dataset.key] = el.type === "checkbox" ? el.checked : el.value;
          markDirty("smtp");
        });
      });
    }

    async function load() {
      try {
        const res = await fetch("/api/smtp");
        smtpData = await res.json();
        populateForm();
      } catch (e) {
        flashStatus(statusEl, "Impossible de charger la configuration SMTP.", true);
      }
    }

    async function save() {
      saveBtn.disabled = true;
      saveBtn.textContent = "Enregistrement…";
      try {
        const res = await fetch("/api/smtp", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(smtpData),
        });
        if (res.ok) {
          flashStatus(statusEl, "Enregistré ✓", false);
          clearDirty("smtp");
          if (passwordInput) passwordInput.value = "";
          await load();
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

    async function test() {
      testBtn.disabled = true;
      testBtn.textContent = "Test en cours…";
      try {
        const res = await fetch("/api/smtp/test", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          flashStatus(statusEl, data.message || "Connexion réussie ✓", false);
        } else {
          flashStatus(statusEl, data.error || "Échec du test.", true);
        }
      } catch (e) {
        flashStatus(statusEl, "Impossible de contacter le serveur.", true);
      } finally {
        testBtn.disabled = false;
        testBtn.textContent = "Tester la connexion";
      }
    }

    bindForm();
    saveBtn.addEventListener("click", save);
    testBtn.addEventListener("click", test);
    registerDirtyIndicator("smtp", statusEl);
    load();
  }
})();
