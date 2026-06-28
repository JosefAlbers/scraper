chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveHtml",
    title: "Save Selected HTML",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "saveHtml" || !tab?.id) return;
  await captureAndSave(tab, info.selectionText);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "saveHtml") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) await captureAndSave(tab, "");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_SELECTION") {
    saveItem(message.payload);
    sendResponse({ ok: true });
  }
});

async function captureAndSave(tab, fallbackText) {
  let selectionData = null;
  try {
    selectionData = await chrome.tabs.sendMessage(tab.id, { type: "GET_SELECTION_DATA" });
  } catch (e) {
    selectionData = null;
  }

  if (selectionData && selectionData.content) {
    saveItem({
      title: tab.title,
      url: tab.url,
      content: selectionData.content,
      html: selectionData.html || null,
      images: selectionData.images || []
    });
  } else if (fallbackText) {
    saveItem({
      title: tab.title,
      url: tab.url,
      content: fallbackText,
      html: null,
      images: []
    });
  }
}

function saveItem(data) {
  const item = {
    title: data.title,
    url: data.url,
    content: data.content,
    html: data.html || null,
    images: data.images || [],
    remark: "",
    timestamp: new Date().toISOString()
  };
  chrome.storage.local.get({ newItems: [] }, (stored) => {
    const newItems = stored.newItems;
    newItems.push(item);
    chrome.storage.local.set({ newItems });
  });
}
