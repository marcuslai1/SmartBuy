import { motion } from "framer-motion";
import { Wallet, Gauge, Crown } from "lucide-react";

const CONFIG = [
  { id: "budget",   title: "Budget",   desc: "Best value for money",        Icon: Wallet },
  { id: "midrange", title: "Mid-Range",desc: "Balanced specs and value",    Icon: Gauge  },
  { id: "flagship", title: "Flagship", desc: "Top-tier features",           Icon: Crown  },
];

function ModeSelector({ mode, setMode }) {
  const container = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const item = {
    hidden: { y: 14, opacity: 0 },
    show:   { y: 0,  opacity: 1, transition: { duration: 0.5 } },
  };

  return (
    <section
      aria-labelledby="mode-heading"
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
        <motion.div variants={item} className="text-center mb-10">
          <h2
            id="mode-heading"
            className="text-5xl sm:text-6xl font-extrabold text-white"
          >
            Choose your <span className="text-blue-400">Mode</span>
          </h2>
          <p className="text-gray-300 mt-2">
            Tailor recommendations for budget hunters, balanced buyers, or spec chasers.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          role="radiogroup"
          aria-label="Recommendation Mode"
          className="grid grid-cols-1 sm:grid-cols-3 gap-5"
          variants={container}
        >
          {CONFIG.map(({ id, title, desc, Icon }) => {
            const selected = mode === id;
            return (
              <motion.button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMode(id)}
                variants={item}
                className={[
                  "group relative rounded-2xl p-5 text-left transition-all",
                  "border border-white/10 bg-white/5 backdrop-blur",
                  "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/10",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 focus:ring-offset-black",
                  selected ? "ring-2 ring-blue-400 shadow-lg shadow-blue-500/20" : "ring-0",
                ].join(" ")}
              >
                <div
                  aria-hidden="true"
                  className={[
                    "absolute inset-0 rounded-2xl opacity-0 transition-opacity",
                    selected ? "opacity-100 bg-blue-500/10" : "group-hover:opacity-100 group-hover:bg-blue-500/5",
                  ].join(" ")}
                />
                <div className="relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        "inline-flex h-11 w-11 items-center justify-center rounded-xl",
                        selected ? "bg-blue-500 text-white" : "bg-white/10 text-blue-200",
                      ].join(" ")}
                    >
                      <Icon size={22} />
                    </div>
                    <div>
                      <div className="text-white font-bold text-xl">{title}</div>
                      <div className="text-gray-300 text-sm">{desc}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-gray-400">
                    {id === "budget"   && "Prioritises price-to-performance."}
                    {id === "midrange" && "Balances raw score and value evenly."}
                    {id === "flagship" && "Weights raw performance/features most."}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Helper note */}
        <motion.p variants={item} className="text-center text-gray-400 text-xs mt-6">
          You can change mode anytime in the filters.
        </motion.p>
      </motion.div>
    </section>
  );
}

export default ModeSelector;
