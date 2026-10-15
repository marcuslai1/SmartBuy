package io.github.marcuslai1.smartbuy.api;

/**
 * One rung of a preset's price ladder. vsTypical is how many points the phone scores
 * above (or below) the typical phone at its price.
 */
public record BestBuy(String id, String name, double typicalPriceSgd, double specScore, double vsTypical) {
}
