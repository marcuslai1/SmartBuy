package io.github.marcuslai1.smartbuy;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * A named set of category weights ("balanced", "camera", ...). A phone's spec score
 * under a preset is the weighted mean of its category scores (pipeline/scoring.py:
 * spec_score).
 */
public record Preset(String key, String label, Map<String, Double> weights) {

    public Preset {
        // Kept in file order so the weighted sum adds up in the same order as the pipeline's
        weights = Collections.unmodifiableMap(new LinkedHashMap<>(weights));
        double total = weights.values().stream().mapToDouble(Double::doubleValue).sum();
        if (!(total > 0)) {
            throw new IllegalArgumentException(key + ": weights must add up to more than zero");
        }
    }

    public double specScore(Map<String, Double> categories) {
        double sum = 0;
        double total = 0;
        for (Map.Entry<String, Double> w : weights.entrySet()) {
            Double score = categories.get(w.getKey());
            if (score == null) {
                throw new IllegalArgumentException(key + ": no " + w.getKey() + " score");
            }
            sum += score * w.getValue();
            total += w.getValue();
        }
        return sum / total;
    }
}
