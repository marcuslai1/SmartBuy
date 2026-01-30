/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom animation for skeleton loading
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite linear",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
      },
      // Consistent border radius tokens
      borderRadius: {
        "card": "1rem",      // 16px - for cards
        "modal": "1.25rem",  // 20px - for modals/panels
        "pill": "9999px",    // for badges/pills
      },
      // Backdrop blur extension
      backdropBlur: {
        xs: "2px",
      },
      // Box shadow for glass cards
      boxShadow: {
        "glass": "0 4px 30px rgba(0, 0, 0, 0.1)",
        "glass-hover": "0 8px 40px rgba(59, 130, 246, 0.1)",
      },
    },
  },
  plugins: [],
}
