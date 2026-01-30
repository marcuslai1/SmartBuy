/**
 * SearchInput - Debounced search input component
 *
 * Features:
 * - Debounced onChange to prevent excessive API calls
 * - Clear button when input has value
 * - Smooth animations
 */
import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function SearchInput({
  value = "",
  onChange,
  placeholder = "Search phones...",
  debounceMs = 300,
  className = "",
}) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Handle input change with debounce
  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced callback
    timeoutRef.current = setTimeout(() => {
      onChange?.(newValue);
    }, debounceMs);
  };

  // Handle clear button click
  const handleClear = () => {
    setLocalValue("");
    onChange?.("");
    inputRef.current?.focus();
  };

  // Handle key events
  const handleKeyDown = (e) => {
    if (e.key === "Escape" && localValue) {
      handleClear();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Search icon */}
      <Search
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
        strokeWidth={2}
      />

      {/* Input field */}
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-white/10 bg-white/5
                   text-white placeholder:text-zinc-500 outline-none
                   focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 focus:bg-white/[0.07]
                   hover:bg-white/[0.07] hover:border-white/15
                   transition-all duration-200"
      />

      {/* Clear button */}
      <AnimatePresence>
        {localValue && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full
                       text-zinc-400 hover:text-white hover:bg-white/10
                       transition-colors duration-150"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SearchInput;
