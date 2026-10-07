package io.github.marcuslai1.smartbuy;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

/**
 * The price ladder: the phones that nothing costing the same or less outscores
 * (pipeline/value.py: best_buys). Each rung costs more and scores higher than the one
 * below it, and a budget picks the rung.
 *
 * <p>One sort by (price ascending, score descending), then a single pass that keeps a
 * running best score: a phone is a rung if it beats every phone before it in that order.
 * O(n log n) for the sort and O(n) for the pass, instead of comparing every pair.
 */
public final class PriceLadder {

    /** Scores this close count as equal, so floating-point noise can't decide a rung. */
    static final double TIE = 1e-9;

    private PriceLadder() {
    }

    /**
     * Indexes of the phones on the ladder, cheapest first. At equal prices the higher
     * score wins; an exact tie (same price and score) keeps both.
     */
    public static List<Integer> rungs(double[] prices, double[] scores) {
        if (prices.length != scores.length) {
            throw new IllegalArgumentException(prices.length + " prices but " + scores.length + " scores");
        }
        Integer[] order = new Integer[prices.length];
        for (int i = 0; i < order.length; i++) {
            order[i] = i;
        }
        // Stable sort, so exact twins keep their input order (as in the pipeline)
        Arrays.sort(order, Comparator.<Integer>comparingDouble(i -> prices[i]).thenComparingDouble(i -> -scores[i]));

        List<Integer> rungs = new ArrayList<>();
        double best = Double.NEGATIVE_INFINITY;
        double bestPrice = Double.NaN;
        for (int i : order) {
            if (scores[i] > best + TIE) {
                best = scores[i];
                bestPrice = prices[i];
                rungs.add(i);
            } else if (Math.abs(scores[i] - best) <= TIE && prices[i] == bestPrice) {
                rungs.add(i); // the current rung's exact twin
            }
        }
        return rungs;
    }
}
