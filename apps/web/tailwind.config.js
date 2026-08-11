export default {
    darkMode: ["class", '[data-theme="dark"]'],
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                smeta: {
                    ink: "rgb(var(--smeta-ink) / <alpha-value>)",
                    mauve: "rgb(var(--smeta-muted) / <alpha-value>)",
                    rose: "rgb(var(--smeta-rose) / <alpha-value>)",
                    blush: "rgb(var(--smeta-blush) / <alpha-value>)",
                    clay: "rgb(var(--smeta-clay) / <alpha-value>)",
                    paper: "rgb(var(--smeta-paper) / <alpha-value>)",
                    soft: "rgb(var(--smeta-soft) / <alpha-value>)",
                    line: "rgb(var(--smeta-line) / <alpha-value>)",
                    surface: "rgb(var(--smeta-surface) / <alpha-value>)",
                    elevated: "rgb(var(--smeta-elevated) / <alpha-value>)",
                    deep: "#211729"
                }
            },
            boxShadow: {
                smeta: "0 18px 50px rgb(var(--smeta-shadow) / 0.14)",
                "smeta-soft": "0 10px 30px rgb(var(--smeta-shadow) / 0.10)"
            }
        }
    },
    plugins: []
};
