package io.github.marcuslai1.smartbuy.api;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Settings under "smartbuy." in application.properties. dataFile is the site's data file,
 * written by the Python pipeline (pipeline/build.py). Override it with the
 * SMARTBUY_DATAFILE environment variable, as the Docker image does.
 *
 * <p>It's a String, not a Path, on purpose: run from the packaged jar, Spring turns a
 * Path setting into a resource inside the jar, and "../smartbuy-frontend/..." fails there.
 */
@ConfigurationProperties("smartbuy")
public record SmartBuyProperties(String dataFile) {
}
