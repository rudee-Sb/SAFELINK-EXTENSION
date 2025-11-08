// background.js - resilient forwarder
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "TOGGLE_BLUR") {
        const enabled = !!msg.enabled;
        chrome.storage.sync.set({ safelinkBlurEnabled: enabled }, () => { });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || !tabs.length) {
                sendResponse({ status: "no_tab" });
                return;
            }
            const tab = tabs[0];
            const url = tab.url || "";

            // disallow internal pages
            if (url.startsWith("chrome://") || url.startsWith("about:") || url.startsWith("chrome-extension://")) {
                sendResponse({ status: "not_allowed" });
                return;
            }

            // Try to message the content script
            chrome.tabs.sendMessage(tab.id, { type: "APPLY_BLUR", enabled }, (resp) => {
                if (!chrome.runtime.lastError) {
                    sendResponse({ status: "ok" });
                } else {
                    // message failed (no listener). Try injecting content.js and then re-send.
                    console.warn("sendMessage failed:", chrome.runtime.lastError.message);

                    chrome.scripting.executeScript(
                        { target: { tabId: tab.id }, files: ["content.js"] },
                        (injectionResults) => {
                            if (chrome.runtime.lastError) {
                                console.error("Injection failed:", chrome.runtime.lastError.message);
                                sendResponse({ status: "failed", error: chrome.runtime.lastError.message });
                                return;
                            }
                            // after injection, attempt to message again
                            chrome.tabs.sendMessage(tab.id, { type: "APPLY_BLUR", enabled }, (resp2) => {
                                if (chrome.runtime.lastError) {
                                    console.error("sendMessage after injection failed:", chrome.runtime.lastError.message);
                                    sendResponse({ status: "failed", error: chrome.runtime.lastError.message });
                                } else {
                                    sendResponse({ status: "ok_injected" });
                                }
                            });
                        }
                    );
                }
            });
        });

        // we will respond asynchronously
        return true;
    }
});
