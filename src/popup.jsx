import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

function Popup() {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        chrome.storage.sync.get("safelinkBlurEnabled", (data) => {
            setEnabled(!!data.safelinkBlurEnabled);
            setLoading(false);
        });
    }, []);

    const toggleBlur = () => {
        const newState = !enabled;
        setEnabled(newState);
        // persist locally
        chrome.storage.sync.set({ safelinkBlurEnabled: newState });

        // Tell background to toggle — background will forward to active tab and handle injection
        chrome.runtime.sendMessage({ type: "TOGGLE_BLUR", enabled: newState }, (resp) => {
            if (chrome.runtime.lastError) {
                console.warn("Background message error:", chrome.runtime.lastError.message);
            } else {
                console.log("Background response:", resp);
                if (resp && resp.status === "not_allowed") {
                    alert("SafeLink cannot run on internal browser pages (chrome://, about:). Open a normal webpage to test.");
                } else if (resp && resp.status === "failed") {
                    alert("Could not apply blur on this page: " + (resp.error || "unknown"));
                }
            }
        });
    };

    if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

    return (
        <div style={{ width: 320, padding: 16, fontFamily: "Inter, sans-serif" }}>
            <h2>SafeLink</h2>
            <button
                onClick={toggleBlur}
                style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: 8,
                    background: enabled ? "#16a34a" : "#374151",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                }}
            >
                {enabled ? "Privacy Mode: ON" : "Privacy Mode: OFF"}
            </button>
            <p style={{ marginTop: 8, color: "#9CA3AF" }}>
                {enabled ? "Masking enabled" : "Click to enable masking on the current page"}
            </p>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Popup />);
