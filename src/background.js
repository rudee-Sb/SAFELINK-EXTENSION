
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ safelinkBlurEnabled: false });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "TOGGLE_BLUR") {
        const enabled = !!msg.enabled;
        // persist setting
        chrome.storage.sync.set({ safelinkBlurEnabled: enabled });
        // forward to active tab(s)
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || !tabs.length) return;
            chrome.tabs.sendMessage(tabs[0].id, { type: "APPLY_BLUR", enabled });
        });
        sendResponse({ status: "ok", enabled });
    } else if (msg?.type === "REQUEST_STATUS") {
        chrome.storage.sync.get("safelinkBlurEnabled", (data) => {
            sendResponse({ enabled: !!data.safelinkBlurEnabled });
        });
        // telling chrome the response asynchronous
        return true;
    }
});