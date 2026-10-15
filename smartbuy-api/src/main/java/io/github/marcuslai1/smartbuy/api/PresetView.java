package io.github.marcuslai1.smartbuy.api;

import java.util.Map;

/** A scoring preset as the API returns it: how much each category counts. */
public record PresetView(String key, String label, Map<String, Double> weights) {
}
