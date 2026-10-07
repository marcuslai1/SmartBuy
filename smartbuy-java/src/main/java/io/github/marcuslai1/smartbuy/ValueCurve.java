package io.github.marcuslai1.smartbuy;

/**
 * The typical spec score at a price: expected = a + b*x + c*x^2 with x = ln(price),
 * least-squares fitted across all priced phones (pipeline/value.py: fit, expected).
 *
 * <p>Spec scores top out at 10, so each extra dollar buys less at the top end, which is
 * why the curve bends. Past its turning point the expected score is held flat, so paying
 * more never lowers the bar. A phone's value is how far its spec score sits above or
 * below this curve.
 */
public record ValueCurve(double a, double b, double c) {

    public static ValueCurve fit(double[] prices, double[] scores) {
        if (prices.length != scores.length) {
            throw new IllegalArgumentException(prices.length + " prices but " + scores.length + " scores");
        }
        int n = prices.length;
        if (n < 3) {
            throw new IllegalArgumentException("a quadratic needs at least 3 phones, got " + n);
        }
        double[] xs = new double[n];
        double mx = 0;
        for (int i = 0; i < n; i++) {
            xs[i] = Math.log(prices[i]);
            mx += xs[i];
        }
        mx /= n;
        // Centre x first (u = x - mean) so the normal equations are well conditioned:
        // sums of u^0..u^4 on the left, sums of y*u^0..u^2 on the right.
        double[] powerSums = new double[5];
        double[] rhs = new double[3];
        for (int i = 0; i < n; i++) {
            double u = xs[i] - mx;
            double p = 1;
            for (int k = 0; k < 5; k++) {
                powerSums[k] += p;
                if (k < 3) {
                    rhs[k] += scores[i] * p;
                }
                p *= u;
            }
        }
        double[][] m = new double[3][3];
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                m[i][j] = powerSums[i + j];
            }
        }
        double[] k = solve3(m, rhs);
        // Expand k0 + k1*(x - mx) + k2*(x - mx)^2 into a + b*x + c*x^2
        return new ValueCurve(k[0] - k[1] * mx + k[2] * mx * mx, k[1] - 2 * k[2] * mx, k[2]);
    }

    public double expected(double price) {
        double x = Math.log(price);
        if (c != 0) {
            double peak = -b / (2 * c);
            x = c < 0 ? Math.min(x, peak) : Math.max(x, peak);
        }
        return a + b * x + c * x * x;
    }

    /** Gaussian elimination with partial pivoting. The system is always 3x3, so nothing fancier is needed. */
    private static double[] solve3(double[][] m, double[] v) {
        double[][] a = new double[3][4];
        for (int i = 0; i < 3; i++) {
            System.arraycopy(m[i], 0, a[i], 0, 3);
            a[i][3] = v[i];
        }
        for (int i = 0; i < 3; i++) {
            int pivot = i;
            for (int r = i + 1; r < 3; r++) {
                if (Math.abs(a[r][i]) > Math.abs(a[pivot][i])) {
                    pivot = r;
                }
            }
            double[] swap = a[i];
            a[i] = a[pivot];
            a[pivot] = swap;
            if (a[i][i] == 0) {
                throw new IllegalArgumentException("need at least 3 different prices to fit a curve");
            }
            for (int r = i + 1; r < 3; r++) {
                double f = a[r][i] / a[i][i];
                for (int j = i; j < 4; j++) {
                    a[r][j] -= f * a[i][j];
                }
            }
        }
        double[] out = new double[3];
        for (int i = 2; i >= 0; i--) {
            double s = a[i][3];
            for (int j = i + 1; j < 3; j++) {
                s -= a[i][j] * out[j];
            }
            out[i] = s / a[i][i];
        }
        return out;
    }
}
