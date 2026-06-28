function renderItems() {
  chrome.storage.local.get({ newItems: [] }, (data) => {
    const container = document.getElementById("savedItems");
    container.innerHTML = "";
    const items = data.newItems;

    items.toReversed().forEach((item, reversedIndex) => {
      const originalIndex = items.length - 1 - reversedIndex;
      const div = document.createElement("div");
      div.classList.add("saved-item");

      const plainTextContent = (item.content || "").replace(/<\/?[^>]+(>|$)/g, "");
      div.innerHTML = `
        <p><strong>${item.title}</strong></p>
        <div class="content">${plainTextContent}</div>
      `;

      if (item.images && item.images.length) {
        const row = document.createElement("div");
        row.className = "image-row";
        item.images.forEach((img) => {
          if (!img.thumbnail) return;
          const thumb = document.createElement("img");
          thumb.src = img.thumbnail;
          thumb.className = "thumb";
          thumb.title = img.src || "";
          thumb.addEventListener("click", () => {
            if (img.src) window.open(img.src, "_blank");
          });
          row.appendChild(thumb);
        });
        if (row.childNodes.length) div.appendChild(row);
      }

      const remarkInput = document.createElement("input");
      remarkInput.type = "text";
      remarkInput.className = "remark-input";
      remarkInput.placeholder = "Add a remark...";
      remarkInput.value = item.remark || "";
      remarkInput.addEventListener("blur", () => {
        updateRemark(originalIndex, remarkInput.value);
      });
      div.appendChild(remarkInput);

      container.appendChild(div);
    });
  });
}

function updateRemark(index, value) {
  chrome.storage.local.get({ newItems: [] }, (data) => {
    const items = data.newItems;
    if (items[index] && items[index].remark !== value) {
      items[index].remark = value;
      chrome.storage.local.set({ newItems: items });
    }
  });
}

renderItems();

function formatTimestampUTC9(date = new Date()) {
  const t = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return (
    String(t.getUTCFullYear()).slice(-2) +
    p(t.getUTCMonth() + 1) +
    p(t.getUTCDate()) +
    "_" +
    p(t.getUTCHours()) +
    p(t.getUTCMinutes()) +
    p(t.getUTCSeconds())
  );
}

document.getElementById("downloadJson").addEventListener("click", function () {
  chrome.storage.local.get({ newItems: [] }, (data) => {
    const jsonContent = JSON.stringify(data.newItems, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `saved_items_${formatTimestampUTC9()}.json`;
    link.click();

    chrome.storage.local.clear(() => {
      console.log("Local storage cleared!");
      window.close();
    });
  });
});

document.getElementById("exportClipboard").addEventListener("click", function () {
  chrome.storage.local.get({ newItems: [] }, (data) => {
    const markdownText = data.newItems
      .map((item) => {
        let md = `# [${item.title}](${item.url})\n`;
        if (item.remark) md += `*Comment: ${item.remark}*\n\n`;
        const quoted = (item.content || "")
          .split("\n")
          .map((line) => (line ? `> ${line}` : ">"))
          .join("\n");
        md += quoted;
        (item.images || []).forEach((img) => {
          if (img.src) md += `\n\n![image](${img.src})`;
        });
        return md;
      })
      .join("\n\n");

    navigator.clipboard
      .writeText(markdownText)
      .then(() => {
        const btn = document.getElementById("exportClipboard");
        const originalText = btn.innerText;
        btn.innerText = "Copied!";
        setTimeout(() => {
          btn.innerText = originalText;
        }, 1500);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  });
});
