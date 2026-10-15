package io.github.marcuslai1.smartbuy.api;

/** A phone in the list: enough to pick one and ask for its details. */
public record PhoneSummary(String id, String name, double typicalPriceSgd) {
}
