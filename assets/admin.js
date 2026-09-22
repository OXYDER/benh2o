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
    if (dirty.contact || dirty.zones || dirty.content || dirty.distributeurs || dirty.smtp || dirty.horaire) {
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

  const DEFAULT_NAV_MENU_ADMIN = [
    { type: "link", label: "Accueil", url: "#home" },
    { type: "link", label: "Territoire", url: "#zone" },
    { type: "link", label: "Carte", url: "#carte" },
    { type: "products", label: "Produits H2O" },
    { type: "link", label: "Nouvelles", url: "/nouvelles" },
    { type: "link", label: "Équipements usagés", url: "/equipements-usages" },
    { type: "link", label: "À propos", url: "#about" },
    {
      type: "dropdown",
      label: "Support & Contact",
      children: [
        { type: "separator", label: "Contact" },
        { type: "link", label: "Nous joindre", url: "#channels" },
        { type: "action", label: "Rendez-vous", action: "rdv" },
        { type: "link", label: "Formulaire de contact", url: "#contact" },
        { type: "separator", label: "Informations" },
        { type: "link", label: "Tutoriels", url: "/tutoriels" },
        { type: "link", label: "Manuels de l'utilisateur", url: "/manuels" },
        { type: "link", label: "Fiches Techniques", url: "/fiches-techniques" },
        { type: "link", label: "Convertisseur Acéricole", url: "/convertisseur" },
      ],
    },
    {
      type: "dropdown",
      label: "Outils",
      children: [
        { type: "link", label: "Calculateurs", url: "/convertisseur#mode-calculateurs" },
        { type: "link", label: "Convertisseurs", url: "/convertisseur#mode-convertisseurs" },
      ],
    },
  ];
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
  const dirty = { contact: false, zones: false, content: false, distributeurs: false, smtp: false, horaire: false };
  const dirtyEls = { contact: null, zones: null, content: null, distributeurs: null, smtp: null, horaire: null };
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
    if (dirty.contact || dirty.zones || dirty.content || dirty.distributeurs || dirty.smtp || dirty.horaire) {
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
    setupRendezVousAdmin();
    setupHoraireEditor();
    setupPostsAdmin();
    setupCategoriesAdmin();
    setupCatalogueAdmin();
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
        if (el.type === "checkbox") {
          el.checked = !!val;
        } else if (val === undefined || val === null) {
          if (el.type !== "range") el.value = ""; // les curseurs gardent leur valeur par défaut du HTML
        } else {
          el.value = val;
        }
      });
    }

    function bindForm() {
      panel.querySelectorAll("[data-key]").forEach((el) => {
        el.addEventListener("input", () => {
          let value;
          if (el.type === "checkbox") value = el.checked;
          else if (el.type === "range" || el.type === "number") value = parseFloat(el.value);
          else value = el.value;
          setPath(contentData, el.dataset.key, value);
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

    function renderEquipmentItems() {
      const listEl = document.getElementById("equipment-items-list");
      if (!listEl) return;
      if (!Array.isArray(contentData.about?.equipmentItems)) {
        setPath(contentData, "about.equipmentItems", []);
      }
      const items = contentData.about.equipmentItems;

      listEl.innerHTML = "";
      items.forEach((item, i) => {
        const row = document.createElement("div");
        row.className = "equipment-item-row";
        row.innerHTML = `
          <input type="text" class="eq-label" placeholder="Texte du badge" value="${escapeAttr(item.label || "")}">
          <input type="text" class="eq-url" placeholder="https://h2oinnovation.net/..." value="${escapeAttr(item.url || "")}">
          <button class="icon-btn danger eq-remove" type="button" title="Supprimer">✕</button>
        `;
        row.querySelector(".eq-label").addEventListener("input", (e) => {
          items[i].label = e.target.value;
          markDirty("content");
        });
        row.querySelector(".eq-url").addEventListener("input", (e) => {
          items[i].url = e.target.value;
          markDirty("content");
        });
        row.querySelector(".eq-remove").addEventListener("click", () => {
          items.splice(i, 1);
          markDirty("content");
          renderEquipmentItems();
        });
        listEl.appendChild(row);
      });
    }

    function renderOgImage() {
      const preview = document.getElementById("cc-og-image-preview");
      if (!preview) return;
      const url = contentData.site && contentData.site.ogImage;
      preview.innerHTML = url
        ? `<img src="${url}" alt="Aperçu de l'image de partage" style="max-width:280px; max-height:150px; border-radius:6px; display:block; border:1px solid rgba(32,27,20,0.15)">`
        : `<span style="color:var(--ink-600); font-size:0.85rem">Aucune image de partage définie pour le moment.</span>`;
    }

    function setupOgImageUpload() {
      const input = document.getElementById("cc-og-image-input");
      const btn = document.getElementById("cc-og-image-upload");
      if (!input || !btn || btn.dataset.wired) return;
      btn.dataset.wired = "1";
      btn.addEventListener("click", async () => {
        if (!input.files.length) return;
        const formData = new FormData();
        formData.append("file", input.files[0]);
        btn.disabled = true;
        btn.textContent = "Téléversement…";
        try {
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            if (!contentData.site) contentData.site = {};
            contentData.site.ogImage = data.url;
            markDirty("content");
            renderOgImage();
            input.value = "";
          } else {
            alert(data.error || "Échec du téléversement.");
          }
        } catch (e) {
          alert("Impossible de contacter le serveur.");
        } finally {
          btn.disabled = false;
          btn.textContent = "Téléverser une image";
        }
      });
    }

    /* ---------- Éditeur du menu principal (liens, sous-menus, séparateurs) ---------- */
    const NAV_TOP_TYPES = [
      ["link", "Lien"],
      ["dropdown", "Menu déroulant"],
      ["action", "Action (Rendez-vous / Urgence)"],
      ["products", "Produits H2O (spécial)"],
    ];
    const NAV_CHILD_TYPES = [
      ["link", "Lien"],
      ["action", "Action (Rendez-vous / Urgence)"],
      ["separator", "Séparateur (étiquette de groupe)"],
    ];

    function navMenuData() {
      if (!Array.isArray(contentData.navMenu) || !contentData.navMenu.length) {
        contentData.navMenu = JSON.parse(JSON.stringify(DEFAULT_NAV_MENU_ADMIN));
      }
      return contentData.navMenu;
    }

    function navTypeOptions(list, current) {
      return list.map(([val, label]) => `<option value="${val}" ${val === current ? "selected" : ""}>${label}</option>`).join("");
    }

    function renderNavChildRow(child, i, ci, total) {
      const isSep = child.type === "separator";
      const isAction = child.type === "action";
      const isLink = !isSep && !isAction;
      return `
        <div class="menu-child-row" data-idx="${i}" data-cidx="${ci}">
          <select class="menu-field" data-field="type">${navTypeOptions(NAV_CHILD_TYPES, child.type)}</select>
          <input class="menu-field" data-field="label" type="text" value="${escapeAttr(child.label || "")}" placeholder="Texte affiché">
          <input class="menu-field" data-field="url" type="text" value="${escapeAttr(child.url || "")}" placeholder="Lien (ex. : /tutoriels ou #contact)" ${isSep || isAction ? "hidden" : ""}>
          <select class="menu-field" data-field="action" ${isAction ? "" : "hidden"}>
            <option value="rdv" ${child.action === "rdv" ? "selected" : ""}>Ouvrir Rendez-vous</option>
            <option value="urgence" ${child.action === "urgence" ? "selected" : ""}>Ouvrir Urgence</option>
          </select>
          <label class="menu-newtab-label" ${isLink ? "" : "hidden"} title="Ouvrir dans un nouvel onglet">
            <input type="checkbox" class="menu-field" data-field="openInNewTab" ${child.openInNewTab ? "checked" : ""}> nouvel onglet
          </label>
          <div class="menu-item-actions">
            <button type="button" data-action="child-up" ${ci === 0 ? "disabled" : ""} aria-label="Monter">↑</button>
            <button type="button" data-action="child-down" ${ci === total - 1 ? "disabled" : ""} aria-label="Descendre">↓</button>
            <button type="button" data-action="child-delete" aria-label="Supprimer">✕</button>
          </div>
        </div>`;
    }

    function renderNavTopRow(item, i, total) {
      const isProducts = item.type === "products";
      const isDropdown = item.type === "dropdown";
      const isAction = item.type === "action";
      const isLink = !isProducts && !isDropdown && !isAction;
      const children = isDropdown ? (item.children || []) : [];
      return `
        <div class="menu-item" data-idx="${i}">
          <div class="menu-item-row">
            <select class="menu-field" data-field="type" ${isProducts ? "disabled" : ""}>${navTypeOptions(NAV_TOP_TYPES, item.type)}</select>
            <input class="menu-field" data-field="label" type="text" value="${escapeAttr(item.label || "")}" placeholder="Texte affiché">
            <input class="menu-field" data-field="url" type="text" value="${escapeAttr(item.url || "")}" placeholder="Lien (ex. : /nouvelles ou #zone)" ${isDropdown || isAction || isProducts ? "hidden" : ""}>
            <select class="menu-field" data-field="action" ${isAction ? "" : "hidden"}>
              <option value="rdv" ${item.action === "rdv" ? "selected" : ""}>Ouvrir Rendez-vous</option>
              <option value="urgence" ${item.action === "urgence" ? "selected" : ""}>Ouvrir Urgence</option>
            </select>
            <label class="menu-newtab-label" ${isLink ? "" : "hidden"} title="Ouvrir dans un nouvel onglet">
              <input type="checkbox" class="menu-field" data-field="openInNewTab" ${item.openInNewTab ? "checked" : ""}> nouvel onglet
            </label>
            <div class="menu-item-actions">
              <button type="button" data-action="up" ${i === 0 ? "disabled" : ""} aria-label="Monter">↑</button>
              <button type="button" data-action="down" ${i === total - 1 ? "disabled" : ""} aria-label="Descendre">↓</button>
              <button type="button" data-action="delete" aria-label="Supprimer">✕</button>
            </div>
          </div>
          ${
            isDropdown
              ? `<div class="menu-children">
                  ${children.map((c, ci) => renderNavChildRow(c, i, ci, children.length)).join("")}
                  <button type="button" class="btn btn-outline menu-add-child" data-action="add-child" style="margin-top:6px">+ Ajouter un sous-élément</button>
                </div>`
              : ""
          }
        </div>`;
    }

    function renderNavMenuEditor() {
      const container = document.getElementById("nav-menu-editor");
      if (!container) return;
      const items = navMenuData();
      container.innerHTML = items.map((item, i) => renderNavTopRow(item, i, items.length)).join("");
    }

    function setupHeroVideoOpacityDisplay() {
      const slider = document.getElementById("cc-hero-video-opacity");
      const display = document.getElementById("cc-hero-video-opacity-value");
      if (!slider || !display || slider.dataset.wired) return;
      slider.dataset.wired = "1";
      slider.addEventListener("input", () => {
        display.textContent = slider.value;
      });
    }

    function setupNavMenuEditor() {
      const container = document.getElementById("nav-menu-editor");
      const addTopBtn = document.getElementById("nav-menu-add-top");
      const saveBtn = document.getElementById("menu-save");
      const statusEl = document.getElementById("menu-save-status");
      if (!container || container.dataset.wired) return;
      container.dataset.wired = "1";

      function swap(arr, i, j) {
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }

      container.addEventListener("input", (e) => {
        const field = e.target.dataset.field;
        if (!field) return;
        const row = e.target.closest("[data-idx]");
        const idx = parseInt(row.dataset.idx, 10);
        const items = navMenuData();
        const isChildRow = row.classList.contains("menu-child-row");
        const target = isChildRow ? items[idx].children[parseInt(row.dataset.cidx, 10)] : items[idx];
        target[field] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        markDirty("content");
        if (field === "type") renderNavMenuEditor();
      });

      container.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        const topRow = btn.closest(".menu-item");
        const idx = parseInt(topRow.dataset.idx, 10);
        const items = navMenuData();

        if (action === "up" && idx > 0) swap(items, idx, idx - 1);
        else if (action === "down" && idx < items.length - 1) swap(items, idx, idx + 1);
        else if (action === "delete") {
          if (!confirm("Retirer cet élément du menu ?")) return;
          items.splice(idx, 1);
        } else if (action === "add-child") {
          if (!items[idx].children) items[idx].children = [];
          items[idx].children.push({ type: "link", label: "Nouveau lien", url: "" });
        } else if (action === "child-up" || action === "child-down" || action === "child-delete") {
          const childRow = btn.closest(".menu-child-row");
          const cidx = parseInt(childRow.dataset.cidx, 10);
          const children = items[idx].children;
          if (action === "child-up" && cidx > 0) swap(children, cidx, cidx - 1);
          else if (action === "child-down" && cidx < children.length - 1) swap(children, cidx, cidx + 1);
          else if (action === "child-delete") {
            if (!confirm("Retirer ce sous-élément ?")) return;
            children.splice(cidx, 1);
          }
        } else {
          return;
        }
        markDirty("content");
        renderNavMenuEditor();
      });

      if (addTopBtn) {
        addTopBtn.addEventListener("click", () => {
          navMenuData().push({ type: "link", label: "Nouveau lien", url: "" });
          markDirty("content");
          renderNavMenuEditor();
        });
      }
      if (saveBtn) {
        saveBtn.addEventListener("click", () => save(statusEl, saveBtn));
      }
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
        renderOgImage();
        setupOgImageUpload();
        setupHeroVideoOpacityDisplay();
        const opacitySlider = document.getElementById("cc-hero-video-opacity");
        const opacityDisplay = document.getElementById("cc-hero-video-opacity-value");
        if (opacitySlider && opacityDisplay) opacityDisplay.textContent = opacitySlider.value;
        renderNavMenuEditor();
        setupNavMenuEditor();
        renderEquipmentItems();
        const addBtn = document.getElementById("equipment-item-add");
        if (addBtn && !addBtn.dataset.wired) {
          addBtn.dataset.wired = "1";
          addBtn.addEventListener("click", () => {
            contentData.about.equipmentItems.push({ label: "Nouveau produit", url: "" });
            markDirty("content");
            renderEquipmentItems();
          });
        }
      } catch (e) {
        flashStatus(statusEl, "Impossible de charger les données.", true);
      }
    }

    async function save(targetStatusEl, targetSaveBtn) {
      const btn = targetSaveBtn || saveBtn;
      const status = targetStatusEl || statusEl;
      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = "Enregistrement…";
      try {
        const res = await fetch("/api/content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contentData),
        });
        if (res.ok) {
          flashStatus(status, "Enregistré ✓", false);
          clearDirty("content");
        } else {
          const data = await res.json().catch(() => ({}));
          flashStatus(status, data.error || "Échec de l'enregistrement.", true);
        }
      } catch (e) {
        flashStatus(status, "Impossible de contacter le serveur.", true);
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }

    bindForm();
    saveBtn.addEventListener("click", () => save());
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

  /* =========================================================
     ONGLET : RENDEZ-VOUS
     ========================================================= */
  function setupRendezVousAdmin() {
    const listEl = document.getElementById("rdv-admin-list");
    if (!listEl) return;

    const STATUT_LABELS = {
      en_attente: "En attente",
      confirme: "Confirmé",
      refuse: "Refusé",
    };

    function formatDate(d) {
      if (!d) return "";
      const [y, m, day] = d.toString().slice(0, 10).split("-").map(Number);
      const date = new Date(y, m - 1, day);
      return date.toLocaleDateString("fr-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }

    async function load() {
      try {
        const res = await fetch("/api/appointments");
        const appts = await res.json();
        render(appts);
      } catch (e) {
        listEl.innerHTML = '<p style="color:#B3403A">Impossible de charger les rendez-vous.</p>';
      }
    }

    function render(appts) {
      if (!appts.length) {
        listEl.innerHTML = "<p>Aucune demande de rendez-vous pour l'instant.</p>";
        return;
      }
      listEl.innerHTML = "";
      appts.forEach((a) => {
        const card = document.createElement("div");
        card.className = "rdv-card rdv-statut-" + a.statut;
        const lieuTxt = a.lieu === "bureau" ? "À ton bureau (Ham-Nord)" : "Chez le client";
        card.innerHTML = `
          <div class="rdv-card-head">
            <div>
              <strong>${escapeAttr(a.nom)}</strong>
              <span class="rdv-badge rdv-badge-${a.statut}">${STATUT_LABELS[a.statut] || a.statut}</span>
            </div>
            <div class="rdv-card-date">${formatDate(a.date_demandee)} à ${escapeAttr(a.heure_demandee)}</div>
          </div>
          <div class="rdv-card-details">
            ${a.erabliere ? `<div>Érablière : ${escapeAttr(a.erabliere)}</div>` : ""}
            ${a.nb_entailles ? `<div>Entailles : ${escapeAttr(a.nb_entailles)}</div>` : ""}
            <div>Adresse : ${escapeAttr(a.adresse || "—")}, ${escapeAttr(a.ville)}</div>
            <div>Déjà client H2O Innovation : ${a.deja_client ? "Oui" : "Non"}</div>
            <div>Lieu : ${lieuTxt}</div>
            <div>Contact : ${a.courriel ? escapeAttr(a.courriel) : ""}${a.courriel && a.telephone ? " · " : ""}${a.telephone ? escapeAttr(a.telephone) : ""}</div>
            ${a.date_alternative ? `<div>Date alternative proposée : ${formatDate(a.date_alternative)}${a.heure_alternative ? " à " + escapeAttr(a.heure_alternative) : ""}</div>` : ""}
            ${a.note_admin ? `<div>Note : ${escapeAttr(a.note_admin)}</div>` : ""}
          </div>
          ${a.statut === "en_attente" ? `
            <div class="rdv-card-actions">
              <button class="btn btn-primary rdv-confirm-btn" type="button">Confirmer</button>
              <button class="btn btn-outline rdv-refuse-toggle" type="button">Refuser…</button>
            </div>
            <div class="rdv-refuse-form" hidden>
              <div class="admin-field-row">
                <div class="admin-field">
                  <label>Nouvelle date à proposer (optionnel)</label>
                  <input type="date" class="rdv-alt-date">
                </div>
                <div class="admin-field">
                  <label>Nouvelle heure (optionnel)</label>
                  <input type="time" class="rdv-alt-heure">
                </div>
              </div>
              <div class="admin-field">
                <label>Note pour le client (optionnel)</label>
                <textarea class="rdv-note" rows="2"></textarea>
              </div>
              <button class="btn btn-primary rdv-refuse-confirm" type="button">Envoyer le refus</button>
            </div>
          ` : ""}
          <div class="rdv-card-status" hidden></div>
        `;

        const statusMsg = card.querySelector(".rdv-card-status");

        async function updateStatut(statut, extra) {
          statusMsg.hidden = false;
          statusMsg.textContent = "Enregistrement…";
          try {
            const res = await fetch(`/api/appointments/${a.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ statut, ...extra }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
              statusMsg.textContent = data.emailSent
                ? "Enregistré — le client a été avisé par courriel ✓"
                : "Enregistré — pense à aviser le client toi-même (SMTP non configuré ou pas de courriel).";
              await load();
            } else {
              statusMsg.textContent = data.error || "Échec de l'enregistrement.";
            }
          } catch (e) {
            statusMsg.textContent = "Impossible de contacter le serveur.";
          }
        }

        const confirmBtn = card.querySelector(".rdv-confirm-btn");
        if (confirmBtn) confirmBtn.addEventListener("click", () => updateStatut("confirme", {}));

        const refuseToggle = card.querySelector(".rdv-refuse-toggle");
        const refuseForm = card.querySelector(".rdv-refuse-form");
        if (refuseToggle && refuseForm) {
          refuseToggle.addEventListener("click", () => {
            refuseForm.hidden = !refuseForm.hidden;
          });
        }
        const refuseConfirmBtn = card.querySelector(".rdv-refuse-confirm");
        if (refuseConfirmBtn) {
          refuseConfirmBtn.addEventListener("click", () => {
            updateStatut("refuse", {
              dateAlternative: card.querySelector(".rdv-alt-date").value || null,
              heureAlternative: card.querySelector(".rdv-alt-heure").value || null,
              noteAdmin: card.querySelector(".rdv-note").value || null,
            });
          });
        }

        listEl.appendChild(card);
      });
    }

    load();
  }

  /* =========================================================
     ONGLET : Rendez-vous — horaire de travail et blocages
     ========================================================= */
  function setupHoraireEditor() {
    const joursEl = document.getElementById("horaire-jours");
    if (!joursEl) return;

    const JOURS = [
      ["lundi", "Lundi"], ["mardi", "Mardi"], ["mercredi", "Mercredi"], ["jeudi", "Jeudi"],
      ["vendredi", "Vendredi"], ["samedi", "Samedi"], ["dimanche", "Dimanche"],
    ];

    const dureeInput = document.getElementById("horaire-duree");
    const datesListEl = document.getElementById("horaire-dates-list");
    const creneauxListEl = document.getElementById("horaire-creneaux-list");
    const saveBtn = document.getElementById("horaire-save");
    const statusEl = document.getElementById("horaire-save-status");

    let horaire = { joursTravail: {}, dureeCreneauMinutes: 60, datesBloquees: [], creneauxBloques: [] };

    function renderJours() {
      joursEl.innerHTML = JOURS.map(([key, label]) => {
        const cfg = horaire.joursTravail[key] || { actif: false, debut: "08:00", fin: "17:00" };
        return `
          <div class="horaire-jour-row ${cfg.actif ? "" : "inactif"}" data-jour="${key}">
            <label class="horaire-jour-name">
              <input type="checkbox" class="jour-actif" ${cfg.actif ? "checked" : ""}> ${label}
            </label>
            <span></span>
            <input type="time" class="jour-debut" value="${cfg.debut || "08:00"}" ${cfg.actif ? "" : "disabled"}>
            <input type="time" class="jour-fin" value="${cfg.fin || "17:00"}" ${cfg.actif ? "" : "disabled"}>
          </div>
        `;
      }).join("");

      joursEl.querySelectorAll(".horaire-jour-row").forEach((row) => {
        const key = row.dataset.jour;
        const actifEl = row.querySelector(".jour-actif");
        const debutEl = row.querySelector(".jour-debut");
        const finEl = row.querySelector(".jour-fin");
        function sync() {
          horaire.joursTravail[key] = { actif: actifEl.checked, debut: debutEl.value, fin: finEl.value };
          row.classList.toggle("inactif", !actifEl.checked);
          debutEl.disabled = !actifEl.checked;
          finEl.disabled = !actifEl.checked;
          markDirty("horaire");
        }
        actifEl.addEventListener("change", sync);
        debutEl.addEventListener("input", sync);
        finEl.addEventListener("input", sync);
      });
    }

    function renderDates() {
      const dates = (horaire.datesBloquees || []).slice().sort();
      datesListEl.innerHTML = dates.map((d) => `
        <span class="horaire-chip" data-date="${d}">${d} <button type="button" title="Retirer">✕</button></span>
      `).join("") || '<span style="color:var(--ink-600); font-size:0.85rem;">Aucune date bloquée.</span>';
      datesListEl.querySelectorAll(".horaire-chip button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const d = btn.parentElement.dataset.date;
          horaire.datesBloquees = horaire.datesBloquees.filter((x) => x !== d);
          markDirty("horaire");
          renderDates();
        });
      });
    }

    function renderCreneaux() {
      const list = (horaire.creneauxBloques || []).slice().sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
      creneauxListEl.innerHTML = list.map((c, i) => `
        <span class="horaire-chip" data-idx="${i}">${c.date} à ${c.heure} <button type="button" title="Retirer">✕</button></span>
      `).join("") || '<span style="color:var(--ink-600); font-size:0.85rem;">Aucun créneau bloqué.</span>';
      creneauxListEl.querySelectorAll(".horaire-chip button").forEach((btn, i) => {
        btn.addEventListener("click", () => {
          const item = list[i];
          horaire.creneauxBloques = horaire.creneauxBloques.filter((c) => !(c.date === item.date && c.heure === item.heure));
          markDirty("horaire");
          renderCreneaux();
        });
      });
    }

    document.getElementById("horaire-add-date").addEventListener("click", () => {
      const input = document.getElementById("horaire-nouvelle-date");
      if (!input.value) return;
      if (!horaire.datesBloquees.includes(input.value)) {
        horaire.datesBloquees.push(input.value);
        markDirty("horaire");
        renderDates();
      }
      input.value = "";
    });

    document.getElementById("horaire-add-creneau").addEventListener("click", () => {
      const dateInput = document.getElementById("horaire-nouveau-creneau-date");
      const heureInput = document.getElementById("horaire-nouveau-creneau-heure");
      if (!dateInput.value || !heureInput.value) return;
      horaire.creneauxBloques.push({ date: dateInput.value, heure: heureInput.value });
      markDirty("horaire");
      renderCreneaux();
      dateInput.value = "";
      heureInput.value = "";
    });

    dureeInput.addEventListener("input", () => {
      horaire.dureeCreneauMinutes = Number(dureeInput.value) || 60;
      markDirty("horaire");
    });

    async function load() {
      try {
        const res = await fetch("/api/horaire");
        const data = await res.json();
        horaire = {
          joursTravail: data.joursTravail || {},
          dureeCreneauMinutes: data.dureeCreneauMinutes || 60,
          datesBloquees: data.datesBloquees || [],
          creneauxBloques: data.creneauxBloques || [],
        };
        dureeInput.value = horaire.dureeCreneauMinutes;
        renderJours();
        renderDates();
        renderCreneaux();
      } catch (e) {
        flashStatus(statusEl, "Impossible de charger l'horaire.", true);
      }
    }

    async function save() {
      saveBtn.disabled = true;
      saveBtn.textContent = "Enregistrement…";
      try {
        const res = await fetch("/api/horaire", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(horaire),
        });
        if (res.ok) {
          flashStatus(statusEl, "Enregistré ✓", false);
          clearDirty("horaire");
        } else {
          const data = await res.json().catch(() => ({}));
          flashStatus(statusEl, data.error || "Échec de l'enregistrement.", true);
        }
      } catch (e) {
        flashStatus(statusEl, "Impossible de contacter le serveur.", true);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Enregistrer l'horaire";
      }
    }

    saveBtn.addEventListener("click", save);
    registerDirtyIndicator("horaire", statusEl);
    load();
  }

  /* =========================================================
     ONGLET : PUBLICATIONS (Nouvelles / Tutoriels)
     ========================================================= */
  function setupPostsAdmin() {
    const listEl = document.getElementById("posts-admin-list");
    if (!listEl) return;
    const addBtn = document.getElementById("post-add");

    let posts = [];
    let categoriesByType = {};
    const expandedIds = new Set();

    function todayIso() {
      return new Date().toISOString().slice(0, 10);
    }

    function categoryOptions(type, selected) {
      const cats = categoriesByType[type] || [];
      return (
        `<option value="">Aucune</option>` +
        cats.map((c) => `<option value="${escapeAttr(c.nom)}" ${c.nom === selected ? "selected" : ""}>${escapeAttr(c.nom)}</option>`).join("")
      );
    }

    async function uploadFile(file) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Échec du téléversement.");
      return data;
    }

    async function load() {
      try {
        const [postsRes, catsRes] = await Promise.all([
          fetch("/api/posts/all"),
          fetch("/api/categories"),
        ]);
        posts = await postsRes.json();
        const allCats = await catsRes.json();
        categoriesByType = {};
        (allCats || []).forEach((c) => {
          if (!categoriesByType[c.type]) categoriesByType[c.type] = [];
          categoriesByType[c.type].push(c);
        });
        render();
      } catch (e) {
        listEl.innerHTML = '<p style="color:#B3403A">Impossible de charger les publications.</p>';
      }
    }

    function render() {
      if (window.tinymce) tinymce.remove(".p-contenu");
      if (!posts.length) {
        listEl.innerHTML = "<p>Aucune publication pour l'instant.</p>";
        return;
      }
      listEl.innerHTML = "";
      posts.forEach((p) => {
        const card = document.createElement("div");
        card.className = "post-admin-card";
        const isExpanded = expandedIds.has(p.id);
        const typeLabels = {
          nouvelle: "Nouvelle / Événement",
          tutoriel: "Tutoriel",
          manuel: "Manuel de l'utilisateur",
          fiche: "Fiche technique",
          equipement: "Équipement usagé",
        };
        card.innerHTML = `
          <button type="button" class="post-admin-card-header">
            <span class="post-admin-card-chevron">${isExpanded ? "▾" : "▸"}</span>
            <span class="post-admin-card-type-tag">${typeLabels[p.type] || p.type}</span>
            <span class="post-admin-card-titre">${escapeAttr(p.titre || "(sans titre)")}</span>
            <span class="post-admin-card-date">${(p.date_publication || "").toString().slice(0, 10)}</span>
            ${p.publie ? "" : '<span class="post-admin-card-draft">Brouillon</span>'}
          </button>
          <div class="post-admin-card-body" ${isExpanded ? "" : "hidden"}>
          <div class="admin-field-row">
            <div class="admin-field">
              <label>Type</label>
              <select class="p-type">
                <option value="nouvelle" ${p.type === "nouvelle" ? "selected" : ""}>Nouvelle / Événement</option>
                <option value="tutoriel" ${p.type === "tutoriel" ? "selected" : ""}>Tutoriel</option>
                <option value="manuel" ${p.type === "manuel" ? "selected" : ""}>Manuel de l'utilisateur</option>
                <option value="fiche" ${p.type === "fiche" ? "selected" : ""}>Fiche technique</option>
                <option value="equipement" ${p.type === "equipement" ? "selected" : ""}>Équipement usagé</option>
              </select>
            </div>
            <div class="admin-field">
              <label>Catégorie</label>
              <select class="p-categorie">${categoryOptions(p.type, p.categorie)}</select>
            </div>
          </div>
          <div class="admin-field">
            <label>Date de publication</label>
            <input type="date" class="p-date" value="${(p.date_publication || todayIso()).toString().slice(0, 10)}">
          </div>
          <div class="admin-field">
            <label>Titre</label>
            <input type="text" class="p-titre" value="${escapeAttr(p.titre || "")}">
          </div>
          <div class="admin-field-row p-equipement-fields" ${p.type === "equipement" ? "" : "hidden"}>
            <div class="admin-field">
              <label>Prix ($)</label>
              <input type="number" class="p-prix" step="0.01" min="0" value="${p.prix != null ? p.prix : ""}" placeholder="Ex. : 2500">
            </div>
            <div class="admin-field">
              <label>Année</label>
              <input type="number" class="p-annee" step="1" value="${p.annee != null ? p.annee : ""}" placeholder="Ex. : 2019">
            </div>
            <div class="admin-field">
              <label>Numéro de série</label>
              <input type="text" class="p-numero-serie" value="${escapeAttr(p.numero_serie || "")}">
            </div>
          </div>
          <div class="admin-field">
            <label>Résumé (affiché sur la carte)</label>
            <textarea class="p-resume" rows="2">${escapeAttr(p.resume || "")}</textarea>
          </div>
          <div class="admin-field">
            <label>Contenu complet (affiché en cliquant « Lire plus »)</label>
            <textarea class="p-contenu" id="p-contenu-${p.id}">${p.contenu || ""}</textarea>
          </div>
          <div class="admin-field">
            <label>Image (optionnel)</label>
            <div class="post-upload-row">
              <input type="text" class="p-image" value="${escapeAttr(p.image_url || "")}" placeholder="https://... ou téléverse une image">
              <button class="btn btn-outline p-image-upload-btn" type="button">Téléverser…</button>
              <input type="file" class="p-image-file-input" accept="image/*" hidden>
            </div>
          </div>
          <div class="admin-field">
            <label>Images supplémentaires (galerie, optionnel) — plusieurs à la fois</label>
            <div class="post-gallery-thumbs"></div>
            <button class="btn btn-outline p-gallery-upload-btn" type="button">+ Ajouter des images</button>
            <input type="file" class="p-gallery-file-input" accept="image/*" multiple hidden>
          </div>
          <div class="admin-field">
            <label>Fichier téléchargeable (optionnel) — PDF, Word, Excel</label>
            <div class="post-upload-row">
              <span class="p-fichier-label">${p.fichier_nom ? escapeAttr(p.fichier_nom) : "Aucun fichier"}</span>
              <button class="btn btn-outline p-fichier-upload-btn" type="button">Téléverser…</button>
              <button class="btn btn-outline p-fichier-remove-btn" type="button" ${p.fichier_url ? "" : "hidden"}>Retirer</button>
              <input type="file" class="p-fichier-file-input" accept=".pdf,.doc,.docx,.xls,.xlsx" hidden>
            </div>
            <input type="hidden" class="p-fichier-url" value="${escapeAttr(p.fichier_url || "")}">
            <input type="hidden" class="p-fichier-nom" value="${escapeAttr(p.fichier_nom || "")}">
          </div>
          <label class="admin-checkbox">
            <input type="checkbox" class="p-publie" ${p.publie ? "checked" : ""}>
            Publié (visible sur le site)
          </label>
          <div class="admin-save-row">
            <span class="admin-save-status post-status"></span>
            <button class="btn btn-outline post-delete" type="button">Supprimer</button>
            <button class="btn btn-primary post-save" type="button">Enregistrer</button>
          </div>
          </div>
        `;

        const headerBtn = card.querySelector(".post-admin-card-header");
        const bodyEl = card.querySelector(".post-admin-card-body");
        headerBtn.addEventListener("click", () => {
          const nowHidden = !bodyEl.hidden;
          bodyEl.hidden = nowHidden;
          headerBtn.querySelector(".post-admin-card-chevron").textContent = nowHidden ? "▸" : "▾";
          if (nowHidden) expandedIds.delete(p.id);
          else expandedIds.add(p.id);
        });

        const statusEl = card.querySelector(".post-status");
        const typeSelect = card.querySelector(".p-type");
        const catSelect = card.querySelector(".p-categorie");
        const equipementFields = card.querySelector(".p-equipement-fields");

        typeSelect.addEventListener("change", () => {
          catSelect.innerHTML = categoryOptions(typeSelect.value, "");
          equipementFields.hidden = typeSelect.value !== "equipement";
        });

        const imageInput = card.querySelector(".p-image");
        const imageUploadBtn = card.querySelector(".p-image-upload-btn");
        const imageFileInput = card.querySelector(".p-image-file-input");
        imageUploadBtn.addEventListener("click", () => imageFileInput.click());
        imageFileInput.addEventListener("change", async () => {
          const file = imageFileInput.files[0];
          if (!file) return;
          imageUploadBtn.textContent = "Envoi…";
          try {
            const data = await uploadFile(file);
            imageInput.value = data.url;
          } catch (e) {
            statusEl.textContent = e.message;
          } finally {
            imageUploadBtn.textContent = "Téléverser…";
            imageFileInput.value = "";
          }
        });

        let galleryImages = Array.isArray(p.images) ? p.images.slice() : [];
        const galleryThumbsEl = card.querySelector(".post-gallery-thumbs");
        const galleryUploadBtn = card.querySelector(".p-gallery-upload-btn");
        const galleryFileInput = card.querySelector(".p-gallery-file-input");

        function renderGalleryThumbs() {
          galleryThumbsEl.innerHTML = galleryImages
            .map(
              (url, i) => `
              <div class="post-gallery-thumb" data-idx="${i}">
                <img src="${url}" alt="">
                <button type="button" class="post-gallery-thumb-remove" title="Retirer">✕</button>
              </div>
            `
            )
            .join("");
          galleryThumbsEl.querySelectorAll(".post-gallery-thumb-remove").forEach((btn) => {
            btn.addEventListener("click", () => {
              const idx = Number(btn.parentElement.dataset.idx);
              galleryImages.splice(idx, 1);
              renderGalleryThumbs();
            });
          });
        }
        renderGalleryThumbs();

        galleryUploadBtn.addEventListener("click", () => galleryFileInput.click());
        galleryFileInput.addEventListener("change", async () => {
          const files = Array.from(galleryFileInput.files || []);
          if (!files.length) return;
          galleryUploadBtn.textContent = `Envoi de ${files.length} image(s)…`;
          try {
            const results = await Promise.all(files.map((f) => uploadFile(f)));
            results.forEach((r) => galleryImages.push(r.url));
            renderGalleryThumbs();
          } catch (e) {
            statusEl.textContent = e.message;
          } finally {
            galleryUploadBtn.textContent = "+ Ajouter des images";
            galleryFileInput.value = "";
          }
        });

        const fichierUrlInput = card.querySelector(".p-fichier-url");
        const fichierNomInput = card.querySelector(".p-fichier-nom");
        const fichierLabel = card.querySelector(".p-fichier-label");
        const fichierUploadBtn = card.querySelector(".p-fichier-upload-btn");
        const fichierRemoveBtn = card.querySelector(".p-fichier-remove-btn");
        const fichierFileInput = card.querySelector(".p-fichier-file-input");
        fichierUploadBtn.addEventListener("click", () => fichierFileInput.click());
        fichierFileInput.addEventListener("change", async () => {
          const file = fichierFileInput.files[0];
          if (!file) return;
          fichierUploadBtn.textContent = "Envoi…";
          try {
            const data = await uploadFile(file);
            fichierUrlInput.value = data.url;
            fichierNomInput.value = data.originalName;
            fichierLabel.textContent = data.originalName;
            fichierRemoveBtn.hidden = false;
          } catch (e) {
            statusEl.textContent = e.message;
          } finally {
            fichierUploadBtn.textContent = "Téléverser…";
            fichierFileInput.value = "";
          }
        });
        fichierRemoveBtn.addEventListener("click", () => {
          fichierUrlInput.value = "";
          fichierNomInput.value = "";
          fichierLabel.textContent = "Aucun fichier";
          fichierRemoveBtn.hidden = true;
        });

        card.querySelector(".post-save").addEventListener("click", async () => {
          const contenuEditor = window.tinymce ? tinymce.get("p-contenu-" + p.id) : null;
          const contenuValue = contenuEditor ? contenuEditor.getContent() : card.querySelector(".p-contenu").value.trim();
          const payload = {
            type: typeSelect.value,
            categorie: catSelect.value,
            titre: card.querySelector(".p-titre").value.trim(),
            resume: card.querySelector(".p-resume").value.trim(),
            contenu: contenuValue,
            imageUrl: imageInput.value.trim(),
            images: galleryImages,
            fichierUrl: fichierUrlInput.value.trim(),
            fichierNom: fichierNomInput.value.trim(),
            prix: card.querySelector(".p-prix").value ? parseFloat(card.querySelector(".p-prix").value) : null,
            annee: card.querySelector(".p-annee").value ? parseInt(card.querySelector(".p-annee").value, 10) : null,
            numeroSerie: card.querySelector(".p-numero-serie").value.trim(),
            datePublication: card.querySelector(".p-date").value,
            publie: card.querySelector(".p-publie").checked,
          };
          statusEl.textContent = "Enregistrement…";
          try {
            const res = await fetch(`/api/posts/${p.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (res.ok) {
              statusEl.textContent = "Enregistré ✓";
              await load();
            } else {
              const data = await res.json().catch(() => ({}));
              statusEl.textContent = data.error || "Échec.";
            }
          } catch (e) {
            statusEl.textContent = "Impossible de contacter le serveur.";
          }
        });

        card.querySelector(".post-delete").addEventListener("click", async () => {
          if (!confirm(`Supprimer « ${p.titre} » définitivement?`)) return;
          try {
            await fetch(`/api/posts/${p.id}`, { method: "DELETE" });
            await load();
          } catch (e) {
            statusEl.textContent = "Échec de la suppression.";
          }
        });

        listEl.appendChild(card);

        function initTinyMceForThis() {
          if (!window.tinymce || tinymce.get("p-contenu-" + p.id)) return;
          tinymce.init({
            selector: "#p-contenu-" + p.id,
            height: 320,
            menubar: false,
            plugins: "link image lists table",
            toolbar:
              "undo redo | bold italic underline | forecolor backcolor | " +
              "alignleft aligncenter alignright | bullist numlist | link image table | removeformat",
            branding: false,
            promotion: false,
            license_key: "gpl",
            images_upload_handler: (blobInfo) =>
              new Promise((resolve, reject) => {
                const formData = new FormData();
                formData.append("file", blobInfo.blob(), blobInfo.filename());
                fetch("/api/upload", { method: "POST", body: formData })
                  .then((r) => r.json())
                  .then((data) => {
                    if (data.url) resolve(data.url);
                    else reject(data.error || "Échec du téléversement.");
                  })
                  .catch(() => reject("Échec du téléversement."));
              }),
          });
        }
        // TinyMCE ne s'initialise pas correctement sur un champ caché (hauteur à
        // zéro) — on l'initialise seulement quand la fiche est dépliée, immédiatement
        // si elle l'est déjà, sinon au premier dépliage.
        if (isExpanded) initTinyMceForThis();
        headerBtn.addEventListener("click", () => {
          if (!bodyEl.hidden) initTinyMceForThis();
        });
      });
    }

    addBtn.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "nouvelle",
            titre: "Nouvelle publication",
            resume: "",
            contenu: "",
            imageUrl: "",
            datePublication: todayIso(),
            publie: false,
          }),
        });
        if (res.ok) {
          const created = await res.json().catch(() => null);
          if (created && created.id != null) expandedIds.add(created.id);
          await load();
        }
      } catch (e) {
        listEl.innerHTML = '<p style="color:#B3403A">Impossible de créer la publication.</p>';
      }
    });

    load();
  }

  /* =========================================================
     ONGLET : Publications — gestion des catégories
     ========================================================= */
  function setupCategoriesAdmin() {
    const typeSelect = document.getElementById("cat-type-select");
    if (!typeSelect) return;
    const nameInput = document.getElementById("cat-new-name");
    const addBtn = document.getElementById("cat-add");
    const listEl = document.getElementById("categories-list");

    async function load() {
      try {
        const res = await fetch("/api/categories?type=" + encodeURIComponent(typeSelect.value));
        const cats = await res.json();
        render(cats || []);
      } catch (e) {
        listEl.innerHTML = '<p style="color:#B3403A">Impossible de charger les catégories.</p>';
      }
    }

    function render(cats) {
      listEl.innerHTML =
        cats
          .map(
            (c) => `<span class="horaire-chip" data-id="${c.id}">${escapeAttr(c.nom)} <button type="button" title="Retirer">✕</button></span>`
          )
          .join("") || '<span style="color:var(--ink-600); font-size:0.85rem;">Aucune catégorie pour cette section.</span>';
      listEl.querySelectorAll(".horaire-chip button").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.parentElement.dataset.id;
          try {
            await fetch(`/api/categories/${id}`, { method: "DELETE" });
            await load();
          } catch (e) {}
        });
      });
    }

    typeSelect.addEventListener("change", load);

    addBtn.addEventListener("click", async () => {
      const nom = nameInput.value.trim();
      if (!nom) return;
      try {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: typeSelect.value, nom }),
        });
        if (res.ok) {
          nameInput.value = "";
          await load();
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error || "Échec de l'ajout.");
        }
      } catch (e) {
        alert("Impossible de contacter le serveur.");
      }
    });

    load();
  }

  function setupCatalogueAdmin() {
    const currentEl = document.getElementById("catalogue-current");
    const fileInput = document.getElementById("catalogue-file-input");
    const uploadBtn = document.getElementById("catalogue-upload-btn");
    const statusEl = document.getElementById("catalogue-upload-status");
    if (!currentEl || !fileInput || !uploadBtn) return;

    function renderCurrent(data) {
      if (data && data.url) {
        const date = data.uploadedAt ? new Date(data.uploadedAt).toLocaleDateString("fr-CA") : "";
        currentEl.innerHTML =
          `Catalogue actuel : <strong>${data.originalName || "catalogue.pdf"}</strong>` +
          (date ? ` — téléversé le ${date}` : "") +
          ` — <a href="${data.url}" target="_blank" rel="noopener">voir le fichier</a>`;
      } else {
        currentEl.textContent = "Aucun catalogue téléversé pour le moment.";
      }
    }

    fetch("/api/catalogue")
      .then((r) => r.json())
      .then(renderCurrent)
      .catch(() => renderCurrent(null));

    fileInput.addEventListener("change", () => {
      uploadBtn.disabled = !fileInput.files.length;
      statusEl.textContent = "";
    });

    uploadBtn.addEventListener("click", async () => {
      if (!fileInput.files.length) return;
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append("file", file);
      uploadBtn.disabled = true;
      statusEl.textContent = "Téléversement en cours… (peut prendre une minute pour un gros fichier)";
      statusEl.style.color = "var(--ink-600)";
      try {
        const res = await fetch("/api/catalogue/upload", { method: "POST", body: formData });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          statusEl.textContent = "Catalogue mis à jour avec succès.";
          statusEl.style.color = "#2E7D32";
          renderCurrent(data);
          fileInput.value = "";
        } else {
          statusEl.textContent = data.error || "Échec du téléversement.";
          statusEl.style.color = "#C8352E";
        }
      } catch (e) {
        statusEl.textContent = "Impossible de contacter le serveur.";
        statusEl.style.color = "#C8352E";
      } finally {
        uploadBtn.disabled = !fileInput.files.length;
      }
    });
  }
})();
