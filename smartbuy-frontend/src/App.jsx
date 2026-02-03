/**
 * SmartBuy - Smart Phone Recommendation App
 *
 * Main application component that orchestrates the UI flow:
 * 1. Hero intro screen
 * 2. Mode selection (Budget/Midrange/Flagship)
 * 3. Brand selection
 * 4. Filter and results display with comparison feature
 *
 * Uses static pre-calculated data for GitHub Pages deployment.
 */
import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Components
import HeroIntro from "./components/HeroIntro";
import ModeSelector from "./components/ModeSelector";
import BrandSelector from "./components/BrandSelector";
import FilterBar from "./components/FilterBar";
import PhoneCard from "./components/Phonecard";
import SkeletonCard from "./components/SkeletonCard";
import EmptyState from "./components/EmptyState";
import CompareView from "./components/CompareView";

// Utilities
import { addRanks } from "./utils/rank";

function App() {
  // UI flow states
  const [showIntro, setShowIntro] = useState(true);
  const [mode, setMode] = useState(null);
  const [brand, setBrand] = useState(null);

  // Filter values
  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState(2400);

  // All phone data (loaded once)
  const [allPhones, setAllPhones] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");

  // Results + status
  const [hasSearched, setHasSearched] = useState(false);

  // Comparison state
  const [compareList, setCompareList] = useState([]);

  // Load static phone data on mount
  useEffect(() => {
    const loadPhoneData = async () => {
      try {
        setDataLoading(true);
        // Use Vite's base URL for GitHub Pages compatibility
        const baseUrl = import.meta.env.BASE_URL || "/";
        const res = await fetch(`${baseUrl}phones.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAllPhones(data);
      } catch (err) {
        console.error("Failed to load phone data:", err);
        setDataError("Failed to load phone data. Please refresh the page.");
      } finally {
        setDataLoading(false);
      }
    };
    loadPhoneData();
  }, []);

  // Filter phones based on current filters
  const filteredPhones = useMemo(() => {
    if (!hasSearched) return [];

    let result = [...allPhones];

    // Filter by mode (price category)
    if (mode) {
      const modeKey = mode.toLowerCase();
      result = result.filter((p) => p.mode_category === modeKey);
    }

    // Filter by brand
    if (brand) {
      const brandLower = brand.toLowerCase();
      result = result.filter(
        (p) => p.brand?.toLowerCase() === brandLower
      );
    }

    // Filter by max price
    if (maxPrice < 2400) {
      result = result.filter((p) => (p.price_sgd || 0) <= maxPrice);
    }

    // Filter by search term
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.model?.toLowerCase().includes(term) ||
          p.chipset?.toLowerCase().includes(term)
      );
    }

    // Sort by value_score descending (0-10 normalized within tier)
    result.sort((a, b) => (b.value_score ?? b.smartbuy_score ?? 0) - (a.value_score ?? a.smartbuy_score ?? 0));

    // Add ranks
    return addRanks(result);
  }, [allPhones, mode, brand, maxPrice, search, hasSearched]);

  // Handle search button click
  const handleSearch = () => {
    setHasSearched(true);
  };

  // Comparison handlers
  const handleAddToCompare = (phone) => {
    if (compareList.length >= 3) return;
    if (compareList.find((p) => p.slug === phone.slug)) return;
    setCompareList([...compareList, phone]);
  };

  const handleRemoveFromCompare = (slug) => {
    setCompareList(compareList.filter((p) => p.slug !== slug));
  };

  const handleCloseCompare = () => {
    setCompareList([]);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearch("");
    setBrand("");
    setMaxPrice(2400);
  };

  // Reset to start over
  const handleStartOver = () => {
    setMode(null);
    setBrand(null);
    setHasSearched(false);
    setCompareList([]);
    setSearch("");
  };

  // Show loading state while data loads
  const loading = dataLoading;
  const error = dataError;

  return (
    <div className="min-h-screen text-zinc-100 bg-transparent">
      <AnimatePresence mode="wait">
        {/* Intro screen */}
        {showIntro && (
          <HeroIntro key="hero" onFinish={() => setShowIntro(false)} />
        )}

        {/* Mode selection */}
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
                setHasSearched(false);
              }}
            />
          </motion.div>
        )}

        {/* Brand selection */}
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

        {/* Filters and results */}
        {!showIntro && mode && brand !== null && (
          <motion.main
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="mx-[calc(50%-50vw)] w-screen min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 px-4 sm:px-6 pb-32"
          >
            {/* Back button */}
            <div className="max-w-5xl mx-auto pt-4">
              <button
                onClick={handleStartOver}
                className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Start over
              </button>
            </div>

            {/* Filters */}
            <FilterBar
              mode={mode}
              setMode={setMode}
              brand={brand}
              setBrand={setBrand}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
              search={search}
              setSearch={setSearch}
              onSearch={handleSearch}
            />

            {/* Results section */}
            <div className="max-w-7xl mx-auto">
              {/* Loading state - skeleton cards */}
              {loading && (
                <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(8)].map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              )}

              {/* Error state */}
              {!loading && error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-center"
                >
                  {error}
                  <button
                    onClick={() => window.location.reload()}
                    className="ml-3 underline hover:no-underline"
                  >
                    Refresh page
                  </button>
                </motion.div>
              )}

              {/* Empty state - no results after search */}
              {!loading && !error && hasSearched && filteredPhones.length === 0 && (
                <EmptyState
                  title="No Phones Found"
                  message="No phones match your current filters. Try adjusting your price range or selecting a different brand."
                  onReset={handleResetFilters}
                  resetLabel="Reset Filters"
                />
              )}

              {/* Initial state - before first search */}
              {!loading && !error && !hasSearched && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-12 text-center"
                >
                  <p className="text-zinc-400 text-lg">
                    Click <span className="text-blue-400 font-medium">Search Phones</span> to find recommendations
                  </p>
                </motion.div>
              )}

              {/* Results grid */}
              {!loading && filteredPhones.length > 0 && (
                <>
                  {/* Results count */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6 mb-4 flex items-center justify-between"
                  >
                    <p className="text-zinc-400 text-sm">
                      Showing <span className="text-white font-medium">{filteredPhones.length}</span> phones
                      {search && (
                        <span className="text-zinc-500"> matching "{search}"</span>
                      )}
                    </p>
                    {compareList.length > 0 && (
                      <p className="text-sm text-emerald-400">
                        {compareList.length} phone{compareList.length > 1 ? "s" : ""} selected for comparison
                      </p>
                    )}
                  </motion.div>

                  {/* Phone cards */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  >
                    {filteredPhones.map((p, idx) => (
                      <PhoneCard
                        key={p.slug}
                        phone={p}
                        isTopPick={idx === 0}
                        mode={mode?.toLowerCase()}
                        onCompare={handleAddToCompare}
                        isComparing={compareList.some((cp) => cp.slug === p.slug)}
                      />
                    ))}
                  </motion.div>
                </>
              )}
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Comparison panel */}
      <AnimatePresence>
        {compareList.length > 0 && (
          <CompareView
            phones={compareList}
            onRemove={handleRemoveFromCompare}
            onClose={handleCloseCompare}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
