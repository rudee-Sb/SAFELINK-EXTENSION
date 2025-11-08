import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./popup.css";

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
        chrome.storage.sync.set({ safelinkBlurEnabled: newState });

        chrome.runtime.sendMessage({ type: "TOGGLE_BLUR", enabled: newState }, (resp) => {
            if (chrome.runtime.lastError) {
                console.warn("Background message error:", chrome.runtime.lastError.message);
            } else if (resp?.status === "not_allowed") {
                alert("SafeLink can't cloak chrome:// realms. Step into the mortal web.");
            } else if (resp?.status === "failed") {
                alert("The veil did not fall — " + (resp.error || "unknown reason."));
            }
        });
    };

    if (loading) {
        return (
            <div className="loading">
                Loading…
            </div>
        );
    }

    return (
        <div className="popup-container">
            <h2 className="popup-title">SafeLink</h2>

            <button
                onClick={toggleBlur}
                className={`toggle-btn ${enabled ? "toggle-on" : "toggle-off"}`}
            >
                {enabled ? "Privacy Mode: ON" : "Privacy Mode: OFF"}
            </button>

            <p className="popup-text">
                {enabled
                    ? "Sensitive information is now softly obscured."
                    : "Activate to subtly mask private details."}
            </p>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Popup />);
