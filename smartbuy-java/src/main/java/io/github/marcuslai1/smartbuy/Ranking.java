package io.github.marcuslai1.smartbuy;

import java.util.ArrayList;
import java.util.List;

/**
 * Every phone scored under one preset: its spec score, the typical score at its price,
 * and whether it's a best buy. This is the reference block pipeline/build.py writes
 * into phones.json for each preset at any storage.
 */
public final class Ranking {

    /** One phone's result. */
    public record Row(Phone phone, double spec, double expected, boolean bestBuy) {

        /** Points above (or below) the typical phone at this price. */
        public double value() {
            return spec - expected;
        }
    }

    private final Preset preset;
    private final ValueCurve curve;
    private final List<Row> rows;
    private final List<Row> ladder;

    private Ranking(Preset preset, ValueCurve curve, List<Row> rows, List<Row> ladder) {
        this.preset = preset;
        this.curve = curve;
        this.rows = rows;
        this.ladder = ladder;
    }

    public static Ranking of(List<Phone> phones, Preset preset) {
        int n = phones.size();
        double[] prices = new double[n];
        double[] specs = new double[n];
        for (int i = 0; i < n; i++) {
            prices[i] = phones.get(i).typicalPrice();
            specs[i] = preset.specScore(phones.get(i).categories());
        }
        ValueCurve curve = ValueCurve.fit(prices, specs);
        List<Integer> rungs = PriceLadder.rungs(prices, specs);
        boolean[] onLadder = new boolean[n];
        for (int i : rungs) {
            onLadder[i] = true;
        }
        List<Row> rows = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            rows.add(new Row(phones.get(i), specs[i], curve.expected(prices[i]), onLadder[i]));
        }
        List<Row> ladder = rungs.stream().map(rows::get).toList();
        return new Ranking(preset, curve, List.copyOf(rows), ladder);
    }

    public Preset preset() {
        return preset;
    }

    public ValueCurve curve() {
        return curve;
    }

    /** Every phone, in the order given. */
    public List<Row> rows() {
        return rows;
    }

    /** The best buys, cheapest first. */
    public List<Row> ladder() {
        return ladder;
    }
}
