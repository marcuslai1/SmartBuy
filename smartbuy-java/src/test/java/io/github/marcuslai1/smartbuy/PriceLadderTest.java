package io.github.marcuslai1.smartbuy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class PriceLadderTest {

    @Test
    void nothingCheaperOutscoresARung() {
        double[] prices = {200, 300, 300, 450, 500, 900, 900};
        double[] scores = {4.0, 5.0, 4.5, 4.9, 6.0, 6.0, 7.0};
        assertEquals(List.of(0, 1, 4, 6), PriceLadder.rungs(prices, scores));
    }

    @Test
    void exactTwinsBothStay() {
        assertEquals(List.of(0, 1), PriceLadder.rungs(new double[] {300, 300}, new double[] {5, 5}));
    }

    @Test
    void aCheaperPhoneWithTheSameScoreBlocksTheDearerOne() {
        assertEquals(List.of(0), PriceLadder.rungs(new double[] {300, 400}, new double[] {5, 5}));
    }

    @Test
    void floatingPointNoiseCountsAsATie() {
        // 0.1 + 0.2 != 0.3 in binary; the two phones are still twins
        assertEquals(List.of(1, 0), PriceLadder.rungs(new double[] {300, 300}, new double[] {0.3, 0.1 + 0.2}));
    }

    @Test
    void emptyAndSingleInputs() {
        assertEquals(List.of(), PriceLadder.rungs(new double[0], new double[0]));
        assertEquals(List.of(0), PriceLadder.rungs(new double[] {999}, new double[] {7}));
    }

    @Test
    void mismatchedInputsAreRejected() {
        assertThrows(IllegalArgumentException.class, () -> PriceLadder.rungs(new double[2], new double[3]));
    }

    /**
     * The sort-and-sweep must agree with the definition checked pair by pair: a phone is a
     * rung unless something costing the same or less scores higher, or something cheaper
     * scores the same. Prices and scores are drawn from coarse grids so ties are common.
     */
    @Test
    void agreesWithThePairByPairDefinition() {
        Random rnd = new Random(20261007);
        for (int trial = 0; trial < 5000; trial++) {
            int n = rnd.nextInt(25);
            double[] prices = new double[n];
            double[] scores = new double[n];
            for (int i = 0; i < n; i++) {
                prices[i] = 100 + 50 * rnd.nextInt(12);
                scores[i] = 0.5 * rnd.nextInt(20);
            }
            List<Integer> expected = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                boolean beaten = false;
                for (int j = 0; j < n && !beaten; j++) {
                    beaten = j != i && ((prices[j] <= prices[i] && scores[j] > scores[i])
                            || (prices[j] < prices[i] && scores[j] == scores[i]));
                }
                if (!beaten) {
                    expected.add(i);
                }
            }
            List<Integer> rungs = PriceLadder.rungs(prices, scores);
            assertEquals(expected, rungs.stream().sorted().toList(), "trial " + trial);
            for (int k = 1; k < rungs.size(); k++) {
                assertTrue(prices[rungs.get(k - 1)] <= prices[rungs.get(k)], "cheapest first, trial " + trial);
            }
        }
    }
}
