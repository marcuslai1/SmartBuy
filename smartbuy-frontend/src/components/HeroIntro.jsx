import { useEffect } from "react";
import { motion } from "framer-motion";

 // total visual time before continuing (seconds)
const DURATION = 3;

function HeroIntro({ onFinish }) {
  // trigger exit after the short intro completes
  useEffect(() => {
    const t = setTimeout(() => onFinish?.(), DURATION * 1000);
    return () => clearTimeout(t);
  }, [onFinish]);

  // shared fade-up variant for heading/tagline
  const fadeUp = (delay = 0) => ({
    initial: { y: 24, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.6, delay } },
    exit: { y: -12, opacity: 0, transition: { duration: 0.3 } },
  });

  return (
    <section className="relative min-h-screen flex items-center justify-center text-center text-white px-6
                        bg-gradient-to-b from-gray-900 via-black to-gray-900">
      <div className="max-w-2xl">
        {/* title */}
        <motion.h1
          {...fadeUp(0.1)}
          className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-4"
        >
          Welcome to <span className="text-blue-400">SmartBuy</span>
        </motion.h1>

        {/* tagline */}
        <motion.p
          {...fadeUp(0.25)}
          className="text-lg sm:text-2xl text-gray-200"
        >
          Your guide to finding the perfect phone; at the best price.
        </motion.p>

        {/* progress bar */}
        <div className="mt-8 h-1 w-48 mx-auto bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-400"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: DURATION, ease: "easeInOut" }}
          />
        </div>
      </div>
    </section>
  );
}

export default HeroIntro;
