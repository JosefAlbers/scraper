(function () {
  console.log("[Save Selected HTML] content script loaded on", location.href);

  let btn = null;

  function createButton() {
    if (btn) return btn;
    btn = document.createElement("button");
    btn.id = "__scrapHtmlButton";
    btn.type = "button";
    btn.textContent = "🎯 Scrap";
    (document.body || document.documentElement).appendChild(btn);

    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleScrapClick();
    });
    return btn;
  }

  function hideButton() {
    if (btn) btn.style.display = "none";
  }

  function showButtonAt(rect) {
    const el = createButton();
    const top = window.scrollY + rect.top - 34;
    const left = window.scrollX + rect.right - 16;
    el.style.top = `${Math.max(top, window.scrollY + 4)}px`;
    el.style.left = `${Math.max(left, window.scrollX + 4)}px`;
    el.style.display = "flex";
    console.log("[Save Selected HTML] showing button at", el.style.top, el.style.left);
  }

  let debounceTimer = null;
  document.addEventListener("selectionchange", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.toString().trim().length === 0) {
        hideButton();
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        hideButton();
        return;
      }
      showButtonAt(rect);
    }, 150);
  });

  document.addEventListener("mousedown", (e) => {
    if (btn && e.target !== btn) hideButton();
  });

  function makeThumbnail(imgEl, maxDim = 120, quality = 0.5) {
    try {
      const w0 = imgEl.naturalWidth || imgEl.width;
      const h0 = imgEl.naturalHeight || imgEl.height;
      if (!w0 || !h0) return null;
      const scale = Math.min(1, maxDim / Math.max(w0, h0));
      const w = Math.max(1, Math.round(w0 * scale));
      const h = Math.max(1, Math.round(h0 * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(imgEl, 0, 0, w, h);
      return canvas.toDataURL("image/jpeg", quality);
    } catch (e) {
      return null;
    }
  }

  function extractImagesFromRange(range) {
    return Array.from(document.images)
      .filter((img) => {
        try {
          return range.intersectsNode(img);
        } catch (e) {
          return false;
        }
      })
      .map((img) => ({
        src: img.currentSrc || img.src,
        thumbnail: makeThumbnail(img)
      }))
      .filter((img) => img.src);
  }

  function captureCurrentSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.toString().trim().length === 0) {
      return null;
    }
    const range = sel.getRangeAt(0);
    const container = document.createElement("div");
    container.appendChild(range.cloneContents());
    return {
      content: container.textContent,
      html: container.innerHTML,
      images: extractImagesFromRange(range)
    };
  }

  function handleScrapClick() {
    const data = captureCurrentSelection();
    if (!data) return;
    chrome.runtime.sendMessage(
      {
        type: "SAVE_SELECTION",
        payload: { title: document.title, url: location.href, ...data }
      },
      () => flashSaved()
    );
  }

  function flashSaved() {
    if (!btn) return;
    btn.textContent = "✓ Saved";
    setTimeout(() => {
      hideButton();
      btn.textContent = "🎯 Scrap";
    }, 900);
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_SELECTION_DATA") {
      sendResponse(captureCurrentSelection());
    }
  });
})();
