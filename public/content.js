const PATTERNS = [
    // emails
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi,
    // phone numbers (international-ish)
    /(?:\+?\d{1,3}[-.\s]?)?(?:\d{2,4}[-.\s]?){2,5}\d{2,4}/g,
    // credit/debit card-like (13-19 digits, allowing spaces/dashes)
    /\b(?:\d[ -]*?){13,19}\b/g,
    // PAN (India)
    /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    // Aadhaar (India) 12 digits groups
    /\b\d{4}\s?\d{4}\s?\d{4}\b/g
];

// internal state
const maskClass = "safelink-mask--safelink-ext";
const styleId = "safelink-style";
let observer = null;
const replacedMap = new WeakMap();

// utility helpers
function escapeHtml(s) {
    return s.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function createStyle() {
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
                .${maskClass} {
                filter: blur(6px);
                -webkit-filter: blur(6px);
                transition: filter .2s ease;
                display: inline-block;
                white-space: pre-wrap;
                pointer-events: none;
                }
                .${maskClass} * { pointer-events: none; }
                `;
    (document.head || document.documentElement).appendChild(style);
}

function matchesAnyPattern(text) {
    for (const re of PATTERNS) {
        re.lastIndex = 0;
        if (re.test(text)) return true;
    }
    return false;
}

/* Replace a text node with an HTML element where matches are wrapped */
function replacedTextNode(node) {
    const text = node.nodeValue;
    if (!text || !matchesAnyPattern(text)) return null;

    // Build HTML by sequentially replacing matches (escape original text first)
    let html = escapeHtml(text);
    for (const re of PATTERNS) {
        re.lastIndex = 0;
        html = html.replace(re, (match) => {
            return `<span class=${maskClass}>${escapeHtml(match)}</span>`
        })
    }

    // create conntainer span and replace
    const container = document.createElement("span");
    container.style.display = "inline";
    container.innerHTML = html;

    const parent = node.parentNode;
    if (!parent) return null;

    parent.replaceChild(container, node);

    // record replacement so we can restore later
    let arr = replacedMap.get(parent);
    if (!arr) {
        arr = [];
        replacedMap.set(parent, arr);
    }
    arr.push({ originalNode: node, replacementNode: container });
    return container;
}

// scan a subtree and replace matchees
function scanSubtree(root) {
    if (!root) return;

    const forbidden_tags = (["SCRIPT", "STYLE", "NOSCRIPT", "OBJECT", "IFRAME", "CODE", "PRE", "TEXTAREA"]);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
            if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            const p = node.parentNode;
            if (!p || forbidden_tags.includes(p.nodeName)) return NodeFilter.FILTER_REJECT;
            // skip contenteditable areas (we don't want to mutate user inputs)
            if (p.closest && p.closest('[contenteditable="true"]')) return NodeFilter.FILTER_REJECT;
            // skip inputs
            return NodeFilter.FILTER_ACCEPT;
        }
    });
    const toReplace = [];
    let cur;
    while ((cur = walker.nextNode())) {
        toReplace.push(cur);
    }
    for (const textNode of toReplace) {
        replacedTextNode(textNode);
    }
}

// restore replaced nodes
function restoreAll() {
    const masks = document.querySelectorAll(`.${maskClass}`);
    const parents = new Set();
    masks.forEach(m => parents.add(m.parentNode));
    parents.forEach(parent => {
        // find original replacement record
        const arr = replacedMap.get(parent);
        if (arr && arr.length) {
            // replace each replacementNode with its originalNode
            for (const rec of arr) {
                if (rec.replacementNode && rec.replacementNode.parentNode) {
                    rec.replacementNode.parentNode.replaceChild(rec.originalNode, rec.replacementNode);
                }
            }
            replacedMap.delete(parent);
        } else {
            // replace each mask element with its innerText (unmasked). This will remove blur.
            const maskEls = parent.querySelectorAll(`.${maskClass}`);
            maskEls.forEach(maskEl => {
                const textNode = document.createTextNode(maskEl.textContent);
                maskEl.parentNode.replaceChild(textNode, maskEl);
            });
        }
    });
}

/* Mutation observer: scan newly added nodes */
function setupObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type === "childList") {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === node.TEXT_NODE) {
                        replacedTextNode(node);
                    } else if (node.nodeType === node.ELEMENT_NODE) {
                        scanSubtree(node);
                    }
                });
            } else if (m.type === "characterData") {
                const nd = m.target;
                if (nd.nodeType === Node.TEXT_NODE) replacedTextNode(nd);
            }
        }
    });
    observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

/* Stop observing */
function teardownObserver() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
}

/* Public toggles */
function enableBlur() {
    createStyle();
    scanSubtree(document.body);
    setupObserver();
}

function disableBlur() {
    teardownObserver();
    restoreAll();
}

// listen for messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "APPLY_BLUR") {
        if (msg.enabled) enableBlur();
        else disableBlur();

        sendResponse({ status: "ok" });
        return true; // <-- THIS LINE IS THE LIFEGIVER
    }

    if (msg?.type === "REQUEST_STATUS") {
        const any = !!document.querySelector(`.${maskClass}`);
        sendResponse({ enabled: any });
        return true; // <-- ALSO IMPORTANT
    }

    return true; // keep the message channel open
});
