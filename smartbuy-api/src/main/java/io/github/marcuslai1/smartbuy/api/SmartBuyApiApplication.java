package io.github.marcuslai1.smartbuy.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/** Starts the API: java -jar target/smartbuy-api.jar, then open http://localhost:8080/api/presets. */
@SpringBootApplication
@ConfigurationPropertiesScan
public class SmartBuyApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmartBuyApiApplication.class, args);
    }
}
