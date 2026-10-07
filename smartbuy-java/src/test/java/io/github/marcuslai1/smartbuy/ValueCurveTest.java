package io.github.marcuslai1.smartbuy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

class ValueCurveTest {

    // Bends down, turning point at x = 8.75 (about S$6,300), well above any phone's price
    private static final ValueCurve BENDS_DOWN = new ValueCurve(-20, 7, -0.4);

    @Test
    void recoversAnExactQuadratic() {
        double[] prices = {150, 250, 400, 600, 900, 1300, 1800, 2400};
        double[] scores = Arrays.stream(prices).map(BENDS_DOWN::expected).toArray();
        ValueCurve fitted = ValueCurve.fit(prices, scores);
        assertEquals(BENDS_DOWN.a(), fitted.a(), 1e-7);
        assertEquals(BENDS_DOWN.b(), fitted.b(), 1e-7);
        assertEquals(BENDS_DOWN.c(), fitted.c(), 1e-7);
    }

    @Test
    void heldFlatPastItsTurningPoint() {
        double atPeak = BENDS_DOWN.expected(Math.exp(8.75));
        assertEquals(atPeak, BENDS_DOWN.expected(Math.exp(9)), 1e-12);
        assertEquals(atPeak, BENDS_DOWN.expected(Math.exp(12)), 1e-12);
    }

    @Test
    void payingMoreNeverLowersTheBar() {
        ValueCurve bendsUp = new ValueCurve(30, -8, 0.6); // turning point (its minimum) near S$790
        for (ValueCurve curve : new ValueCurve[] {BENDS_DOWN, bendsUp}) {
            double previous = Double.NEGATIVE_INFINITY;
            for (double price = 50; price < 50_000; price *= 1.05) {
                double e = curve.expected(price);
                assertTrue(e >= previous - 1e-12, curve + " falls at S$" + price);
                previous = e;
            }
        }
    }

    @Test
    void aStraightLineHasNoTurningPoint() {
        assertEquals(4.0, new ValueCurve(1, 1, 0).expected(Math.exp(3)), 1e-12);
    }

    @Test
    void tooFewOrIdenticalPricesAreRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> ValueCurve.fit(new double[] {100, 200}, new double[] {1, 2}));
        assertThrows(IllegalArgumentException.class,
                () -> ValueCurve.fit(new double[] {500, 500, 500}, new double[] {1, 2, 3}));
    }
}
