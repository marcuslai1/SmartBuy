// src/App.jsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HeroIntro      from "./components/HeroIntro";
import ModeSelector   from "./components/ModeSelector";
import BrandSelector  from "./components/BrandSelector";
import FilterBar      from "./components/FilterBar";
import PhoneCard      from "./components/Phonecard"; 
import { addRanks }   from "./utils/rank";

function App() {
  // UI flow states
  const [showIntro, setShowIntro] = useState(true);
  const [mode,  setMode]  = useState(null);
  const [brand, setBrand] = useState(null);

  // filter values
  const [minRam,   setMinRam]   = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // results + status
  const [phones,   setPhones]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // fetch recommendations from API
  const handleSearch = async () => {
    setLoading(true);
    setError("");

    try {
      // build query params
      const params = new URLSearchParams({
        mode,
        ...(brand     && { brand }),
        ...(minRam    && { min_ram: minRam }),
        ...(maxPrice  && { max_price: maxPrice }),
      });

      const res = await fetch(`/api/recommendations?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // parse and rank results
      const data = await res.json();
      setPhones(addRanks(data));
    } catch {
      setError("Failed to fetch recommendations.");
      setPhones([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-zinc-100 bg-transparent">
      <AnimatePresence mode="wait">
        {/* intro screen */}
        {showIntro && (
          <HeroIntro key="hero" onFinish={() => setShowIntro(false)} />
        )}

        {/* mode selection */}
        {!showIntro && !mode && (
          <motion.div
            key="mode"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto px-4"
          >
            <ModeSelector
              mode={mode}
              setMode={(m) => {
                setMode(m);
                setBrand(null);
                setPhones([]); // reset results on mode change
              }}
            />
          </motion.div>
        )}

        {/* brand selection */}
        {!showIntro && mode && brand === null && (
          <motion.div
            key="brand"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className="max-w-5xl mx-auto px-4"
          >
            <BrandSelector brand={brand} setBrand={setBrand} />
          </motion.div>
        )}

        {/* filters and results */}
        {!showIntro && mode && brand !== null && (
          <motion.main
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="mx-[calc(50%-50vw)] w-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 px-6 py-8"
          >
            {/* filters */}
            <FilterBar
              mode={mode}         setMode={setMode}
              brand={brand}       setBrand={setBrand}
              maxPrice={maxPrice} setMaxPrice={setMaxPrice}
              onSearch={handleSearch}
            />

            {/* loading and error states */}
            {loading && (
              <p className="mt-6 text-zinc-300">Loading…</p>
            )}
            {error && (
              <p className="mt-6 text-red-400">{error}</p>
            )}

            {/* phone results */}
            <div className="mt-10 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {phones.map((p, idx) => (
                <PhoneCard key={p.slug} phone={p} isTopPick={idx === 0} />
              ))}
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
