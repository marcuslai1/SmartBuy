package io.github.marcuslai1.smartbuy.api;

import java.util.Map;

/** One phone with its 0-10 score in each category. */
public record PhoneDetail(String id, String name, double typicalPriceSgd, Map<String, Double> categories) {
}
