chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveHtml",
    title: "Save Selected HTML",
    contexts: ["selection"]
  });
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveHtml") {
    saveSelectedHtml(tab, info.selectionText);
  }
});
function saveSelectedHtml(tab, selectedHtml) {
  const timestamp = new Date().toLocaleString();
  const item = {
    title: tab.title,
    url: tab.url,
    content: selectedHtml,
    timestamp: timestamp
  };
  chrome.storage.local.get({ newItems: [] }, (data) => {
    const newItems = data.newItems;
    newItems.push(item);
    chrome.storage.local.set({ newItems });
  });
}

