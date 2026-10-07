package io.github.marcuslai1.smartbuy;

import java.util.Map;

/**
 * A priced phone as the ranking sees it: its typical price (the median over recent
 * crawls, so a one-day sale doesn't move it) and its 0-10 category scores.
 */
public record Phone(String id, String shortName, double typicalPrice, Map<String, Double> categories) {

    public Phone {
        // log(price) feeds the value curve, so a missing or zero price must fail here, not as NaN later
        if (!(typicalPrice > 0)) {
            throw new IllegalArgumentException(id + ": typical price must be positive, got " + typicalPrice);
        }
        categories = Map.copyOf(categories);
    }
}
