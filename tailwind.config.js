/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",                // main entry (if using for testing)
        "./public/**/*.html",          // ✅ matches popup.html, options.html, etc.
        "./src/**/*.{js,jsx,ts,tsx}",  // React + script files
    ],
    theme: {
        extend: {
            colors: {
                safegreen: "#16a34a",
                safedark: "#0f172a",
            },
            boxShadow: {
                popup: "0 0 15px rgba(0, 0, 0, 0.3)",
            },
        },
    },
    plugins: [],
};
