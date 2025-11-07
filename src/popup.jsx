import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

const isExtension = typeof chrome !== "undefined" && chrome?.storage;

const safeChrome = isExtension
    ? chrome
    : {
        storage: {
            sync: {
                get: (_, cb) => cb({ safelinkBlurEnabled: false }),
                set: () => { },
            },
        },
        runtime: { sendMessage: () => { } },
    };

function Popup() {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        safeChrome.storage.sync.get("safelinkBlurEnabled", (data) => {
            setEnabled(!!data.safelinkBlurEnabled);
            setLoading(false);
        });
    }, []);

    const toggleBlur = () => {
        const newState = !enabled;
        setEnabled(newState);
        safeChrome.storage.sync.set({ safelinkBlurEnabled: newState });

        safeChrome.runtime.sendMessage({
            type: "TOGGLE_BLUR",
            enabled: newState,
        });
    };

    if (loading) {
        return (
            <div className="w-72 h-32 flex items-center justify-center text-gray-400 bg-gray-900 rounded-lg">
                Loading SafeLink...
            </div>
        );
    }

    return (
        <div className="w-72 p-5 bg-gray-900 rounded-xl text-white shadow-lg flex flex-col items-center justify-center">
            <h1 className="text-2xl font-semibold mb-3 tracking-wide">
                SafeLink 🛡️
            </h1>

            <button
                onClick={toggleBlur}
                className={`px-5 py-2 rounded-lg font-medium transition-all duration-300 ${enabled
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-gray-700 hover:bg-gray-600"
                    }`}
            >
                {enabled ? "Privacy Mode: ON" : "Privacy Mode: OFF"}
            </button>

            <p className="mt-3 text-sm text-gray-400 text-center">
                {enabled
                    ? "Sensitive data is now hidden across pages."
                    : "Click to activate privacy masking."}
            </p>
        </div>
    );
}

if (import.meta.hot) import.meta.hot.accept();

ReactDOM.createRoot(document.getElementById("root")).render(<Popup />);
