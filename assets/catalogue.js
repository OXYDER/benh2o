(function () {
  "use strict";

  const PDFJS_VERSION = "3.11.174";
  const PDFJS_BASE = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + PDFJS_VERSION + "/";

  let pdfDoc = null;
  let currentPage = 1;
  let totalPages = 0;
  let scale = 1;
  let pdfUrl = null;
  let libLoadingPromise = null;
  let renderTaskId = 0; // pour ignorer les rendus obsolètes si on change vite de page
  let viewMode = "scroll"; // "page" ou "scroll" — choix libre sur ordinateur (défilement par défaut), toujours "scroll" sur mobile
  let resizeTimer = null;

  function loadPdfLib() {
    if (window.pdfjsLib) return Promise.resolve();
    if (libLoadingPromise) return libLoadingPromise;
    libLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PDFJS_BASE + "pdf.min.js";
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + "pdf.worker.min.js";
        resolve();
      };
      script.onerror = () => reject(new Error("Impossible de charger le lecteur PDF."));
      document.head.appendChild(script);
    });
    return libLoadingPromise;
  }

  function isMobile() {
    return window.innerWidth < 900;
  }

  async function renderPageToCanvas(page, canvas, targetScale) {
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: targetScale });
    const ctx = canvas.getContext("2d");
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = Math.floor(viewport.width) + "px";
    canvas.style.height = Math.floor(viewport.height) + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    await page.render({ canvasContext: ctx, viewport }).promise;
  }

  async function renderPageMode(num) {
    const canvas = document.getElementById("catalogue-canvas");
    const body = document.getElementById("catalogue-viewer-body");
    if (!canvas || !pdfDoc) return;
    const myTask = ++renderTaskId;
    const page = await pdfDoc.getPage(num);
    if (myTask !== renderTaskId) return;
    const containerWidth = Math.min(body.clientWidth - 48, 900);
    const baseViewport = page.getViewport({ scale: 1 });
    const fitScale = (containerWidth / baseViewport.width) * scale;
    await renderPageToCanvas(page, canvas, fitScale);
    if (myTask !== renderTaskId) return;
    const infoEl = document.getElementById("catalogue-page-info");
    if (infoEl) infoEl.textContent = "Page " + num + " / " + totalPages;
    const prevBtn = document.getElementById("catalogue-prev");
    const nextBtn = document.getElementById("catalogue-next");
    if (prevBtn) prevBtn.disabled = num <= 1;
    if (nextBtn) nextBtn.disabled = num >= totalPages;
    highlightThumb(num);
  }

  function setupScrollMode(container) {
    container.innerHTML = "";
    const wraps = [];
    for (let i = 1; i <= totalPages; i++) {
      const wrap = document.createElement("div");
      wrap.className = "catalogue-mobile-page";
      wrap.dataset.pageNum = String(i);
      const canvas = document.createElement("canvas");
      wrap.appendChild(canvas);
      const label = document.createElement("span");
      label.className = "catalogue-mobile-page-label";
      label.textContent = i + " / " + totalPages;
      wrap.appendChild(label);
      container.appendChild(wrap);
      wraps.push(wrap);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const wrap = entry.target;
          if (wrap.dataset.rendered) return;
          wrap.dataset.rendered = "1";
          const num = parseInt(wrap.dataset.pageNum, 10);
          pdfDoc.getPage(num).then((page) => {
            const canvas = wrap.querySelector("canvas");
            const containerWidth = container.clientWidth - 24;
            const baseViewport = page.getViewport({ scale: 1 });
            const fitScale = containerWidth / baseViewport.width;
            renderPageToCanvas(page, canvas, fitScale);
          });
        });
      },
      { root: container, rootMargin: "1000px 0px" }
    );
    wraps.forEach((w) => observer.observe(w));
  }

  function setupThumbnails() {
    const panel = document.getElementById("catalogue-thumbnails");
    if (!panel || panel.dataset.built) return;
    panel.dataset.built = "1";
    panel.innerHTML = "";
    const thumbs = [];
    for (let i = 1; i <= totalPages; i++) {
      const thumb = document.createElement("div");
      thumb.className = "catalogue-thumb";
      thumb.dataset.pageNum = String(i);
      const canvas = document.createElement("canvas");
      thumb.appendChild(canvas);
      const label = document.createElement("span");
      label.textContent = String(i);
      thumb.appendChild(label);
      thumb.addEventListener("click", () => goToPage(i));
      panel.appendChild(thumb);
      thumbs.push(thumb);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const thumb = entry.target;
          if (thumb.dataset.rendered) return;
          thumb.dataset.rendered = "1";
          const num = parseInt(thumb.dataset.pageNum, 10);
          pdfDoc.getPage(num).then((page) => {
            const canvas = thumb.querySelector("canvas");
            const baseViewport = page.getViewport({ scale: 1 });
            const fitScale = 116 / baseViewport.width;
            renderPageToCanvas(page, canvas, fitScale);
          });
        });
      },
      { root: panel, rootMargin: "600px 0px" }
    );
    thumbs.forEach((t) => observer.observe(t));
  }

  function highlightThumb(num) {
    const panel = document.getElementById("catalogue-thumbnails");
    if (!panel) return;
    panel.querySelectorAll(".catalogue-thumb").forEach((t) => {
      t.classList.toggle("active", parseInt(t.dataset.pageNum, 10) === num);
    });
  }

  function goToPage(num) {
    currentPage = num;
    highlightThumb(num);
    if (isMobile() || viewMode === "scroll") {
      const wrap = document.querySelector('.catalogue-mobile-page[data-page-num="' + num + '"]');
      if (wrap) wrap.scrollIntoView({ block: "start" });
    } else {
      renderPageMode(num);
    }
  }

  function renderCurrentMode() {
    const body = document.getElementById("catalogue-viewer-body");
    const controls = document.getElementById("catalogue-viewer-controls");
    const pageControls = ["catalogue-prev", "catalogue-next", "catalogue-page-info"];
    const modeToggle = document.getElementById("catalogue-mode-toggle");
    const thumbsToggle = document.getElementById("catalogue-thumbnails-toggle");
    const mobile = isMobile();
    const useScroll = mobile || viewMode === "scroll";

    if (controls) controls.hidden = false;
    pageControls.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = useScroll ? "none" : "";
    });
    if (modeToggle) {
      modeToggle.hidden = mobile; // le choix de mode n'a de sens que sur ordinateur
      modeToggle.textContent = viewMode === "page" ? "☰ Défilement" : "▤ Page";
    }
    if (thumbsToggle) thumbsToggle.hidden = mobile;

    if (useScroll) {
      body.innerHTML = '<div class="catalogue-mobile-scroll" id="catalogue-mobile-scroll"></div>';
      setupScrollMode(document.getElementById("catalogue-mobile-scroll"));
    } else {
      body.innerHTML = '<canvas id="catalogue-canvas"></canvas>';
      renderPageMode(currentPage);
    }
    if (!mobile) setupThumbnails();
  }

  async function openViewer() {
    const viewer = document.getElementById("catalogue-viewer");
    const body = document.getElementById("catalogue-viewer-body");
    if (!viewer || !pdfUrl) return;
    viewer.hidden = false;
    document.body.classList.add("gate-open");

    try {
      if (!pdfDoc) {
        body.innerHTML = '<p class="catalogue-loading">Chargement du catalogue…</p>';
        await loadPdfLib();
        pdfDoc = await window.pdfjsLib.getDocument(pdfUrl).promise;
        totalPages = pdfDoc.numPages;
      }
      currentPage = 1;
      scale = 1;
      renderCurrentMode();
    } catch (e) {
      body.innerHTML = '<p class="catalogue-loading">Impossible de charger le catalogue pour le moment. Réessayez plus tard.</p>';
    }
  }

  function closeViewer() {
    const viewer = document.getElementById("catalogue-viewer");
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (viewer) viewer.hidden = true;
    document.body.classList.remove("gate-open");
  }

  function toggleFullscreen() {
    const card = document.querySelector(".catalogue-viewer-card");
    if (!card) return;
    if (!document.fullscreenElement) {
      const req = card.requestFullscreen || card.webkitRequestFullscreen;
      if (req) req.call(card).catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  function setupCatalogue() {
    const tabWrap = document.getElementById("catalogue-tab-wrap");
    const tab = document.getElementById("catalogue-tab");
    const closeBtn = document.getElementById("catalogue-viewer-close");
    const prevBtn = document.getElementById("catalogue-prev");
    const nextBtn = document.getElementById("catalogue-next");
    const zoomInBtn = document.getElementById("catalogue-zoom-in");
    const zoomOutBtn = document.getElementById("catalogue-zoom-out");
    const fullscreenBtn = document.getElementById("catalogue-fullscreen");
    const modeToggle = document.getElementById("catalogue-mode-toggle");
    const thumbsToggle = document.getElementById("catalogue-thumbnails-toggle");
    const overlay = document.getElementById("catalogue-viewer");
    if (!tabWrap || !tab) return;

    fetch("/api/catalogue")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.url) {
          pdfUrl = data.url;
          tabWrap.hidden = false;
        }
      })
      .catch(() => {});

    tab.addEventListener("click", openViewer);
    if (closeBtn) closeBtn.addEventListener("click", closeViewer);
    if (thumbsToggle) {
      thumbsToggle.addEventListener("click", () => {
        const panel = document.getElementById("catalogue-thumbnails");
        if (!panel) return;
        panel.hidden = !panel.hidden;
        thumbsToggle.classList.toggle("active", !panel.hidden);
      });
    }
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeViewer();
      });
    }
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage--;
          renderPageMode(currentPage);
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderPageMode(currentPage);
        }
      });
    }
    if (zoomInBtn) {
      zoomInBtn.addEventListener("click", () => {
        scale = Math.min(scale + 0.15, 2.2);
        renderPageMode(currentPage);
      });
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener("click", () => {
        scale = Math.max(scale - 0.15, 0.5);
        renderPageMode(currentPage);
      });
    }
    if (fullscreenBtn) fullscreenBtn.addEventListener("click", toggleFullscreen);
    if (modeToggle) {
      modeToggle.addEventListener("click", () => {
        viewMode = viewMode === "page" ? "scroll" : "page";
        renderCurrentMode();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (!overlay || overlay.hidden) return;
      if (e.key === "Escape") closeViewer();
      if (!isMobile() && viewMode === "page") {
        if (e.key === "ArrowRight") nextBtn && nextBtn.click();
        if (e.key === "ArrowLeft") prevBtn && prevBtn.click();
      }
    });

    window.addEventListener("resize", () => {
      if (!overlay || overlay.hidden) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderCurrentMode, 300);
    });
  }

  document.addEventListener("DOMContentLoaded", setupCatalogue);
})();
