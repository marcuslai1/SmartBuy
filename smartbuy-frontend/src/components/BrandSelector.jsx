import { motion } from "framer-motion";

const BRANDS = [
  "All",
  "Apple",
  "Samsung",
  "Google",
  "Xiaomi",
  "Realme",
  "Oppo",
  "Vivo",
  "Honor",
  "Nothing",
  "OnePlus",
];

function BrandSelector({ brand, setBrand }) {
  const current = brand || "All";

  const container = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.04 } },
  };

  const item = {
    hidden: { y: 8, opacity: 0 },
    show:   { y: 0, opacity: 1, transition: { duration: 0.35 } },
  };

  const handleSelect = (b) => setBrand(b === "All" ? "" : b);

  return (
    <section
      aria-labelledby="brand-heading"
      className="
        h-[100svh] w-screen mx-[calc(50%-50vw)]
        flex items-center justify-center px-6
        bg-gradient-to-b from-gray-900 via-black to-gray-900
      "
    >
      <motion.div
        className="w-full max-w-4xl mx-auto"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Heading */}
        <motion.div variants={item} className="text-center mb-8">
          <h2
            id="brand-heading"
            className="text-4xl sm:text-5xl font-extrabold text-white"
          >
            Pick a <span className="text-blue-400">Brand</span>
          </h2>
          <p className="text-gray-300 mt-2">
            Filter results by a specific brand or choose <span className="font-semibold">All</span>.
          </p>
        </motion.div>

        {/* Chips grid (wraps on desktop, scrolls on mobile) */}
        <motion.div
          role="radiogroup"
          aria-label="Brand filter"
          variants={container}
          className="
            flex gap-3 overflow-x-auto pb-1
            sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4 sm:overflow-visible
          "
        >
          {BRANDS.map((b) => {
            const selected = current === b;
            return (
              <motion.button
                key={b}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleSelect(b)}
                variants={item}
                className={[
                  "relative whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium",
                  "border border-white/10 bg-white/5 text-gray-200 backdrop-blur",
                  "transition-all hover:-translate-y-0.5 hover:shadow hover:shadow-blue-500/10",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 focus:ring-offset-black",
                  selected
                    ? "text-white bg-blue-600/90 border-blue-500 shadow-blue-500/20"
                    : "hover:bg-blue-500/10",
                ].join(" ")}
              >
                {b}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Hint */}
        <motion.p variants={item} className="text-center text-gray-400 text-xs mt-6">
          Tip: You can also filter by brand in the top filter bar.
        </motion.p>
      </motion.div>
    </section>
  );
}

export default BrandSelector;
