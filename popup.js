chrome.storage.local.get({ newItems: [] }, (data) => {
  const savedItemsContainer = document.getElementById("savedItems");
  data.newItems.toReversed().forEach(item => {
    const div = document.createElement("div");
    div.classList.add("saved-item");
    const plainTextContent = item.content.replace(/<\/?[^>]+(>|$)/g, "");
    div.innerHTML = `
        <p><strong>${item.title}</strong></p>
        <div class="content">${plainTextContent}</div>
      `;
    savedItemsContainer.appendChild(div);
  });
});

document.getElementById("downloadJson").addEventListener("click", function () {
  chrome.storage.local.get({ newItems: [] }, (data) => {
    const newItems = data.newItems;

    const jsonContent = JSON.stringify(newItems, null, 2);

    const blob = new Blob([jsonContent], { type: 'application/json' });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "saved_items.json"; // The filename for the downloaded file
    link.click();

    chrome.storage.local.clear(() => {
      console.log("Local storage cleared!");
      window.close();
    });
  });
});
