package io.github.marcuslai1.smartbuy.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * The HTTP layer on its own: URLs, status codes, JSON shape and error responses. The
 * service is replaced by a Mockito mock, so these tests don't depend on any data file.
 */
@WebMvcTest({PresetController.class, PhoneController.class})
class ControllerTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    CatalogService catalog;

    @Test
    void listsThePresets() throws Exception {
        when(catalog.presets()).thenReturn(List.of(new PresetView("balanced", "Balanced", Map.of("camera", 1.0))));

        mvc.perform(get("/api/presets"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$[0].key").value("balanced"))
                .andExpect(jsonPath("$[0].label").value("Balanced"))
                .andExpect(jsonPath("$[0].weights.camera").value(1.0));
    }

    @Test
    void returnsAPresetsBestBuys() throws Exception {
        when(catalog.bestBuys("camera", null)).thenReturn(List.of(new BestBuy("a", "Phone A", 300.0, 4.5, 0.25)));

        mvc.perform(get("/api/presets/camera/best-buys"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("a"))
                .andExpect(jsonPath("$[0].name").value("Phone A"))
                .andExpect(jsonPath("$[0].typicalPriceSgd").value(300.0))
                .andExpect(jsonPath("$[0].specScore").value(4.5))
                .andExpect(jsonPath("$[0].vsTypical").value(0.25));
    }

    @Test
    void passesMaxPriceThrough() throws Exception {
        when(catalog.bestBuys("camera", 950.0)).thenReturn(List.of());

        mvc.perform(get("/api/presets/camera/best-buys").param("maxPrice", "950"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
        verify(catalog).bestBuys("camera", 950.0);
    }

    @Test
    void anEmptyMaxPriceMeansNoLimit() throws Exception {
        when(catalog.bestBuys("camera", null)).thenReturn(List.of());

        mvc.perform(get("/api/presets/camera/best-buys").param("maxPrice", ""))
                .andExpect(status().isOk());
        verify(catalog).bestBuys("camera", null);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-5", "NaN"})
    void rejectsAMaxPriceThatIsNotAboveZero(String maxPrice) throws Exception {
        mvc.perform(get("/api/presets/camera/best-buys").param("maxPrice", maxPrice))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("maxPrice must be greater than 0"));
        verify(catalog, never()).bestBuys(any(), any());
    }

    @Test
    void rejectsAMaxPriceThatIsNotANumber() throws Exception {
        mvc.perform(get("/api/presets/camera/best-buys").param("maxPrice", "cheap"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Failed to convert 'maxPrice' with value: 'cheap'"));
        verify(catalog, never()).bestBuys(any(), any());
    }

    @Test
    void anUnknownPresetIsA404WithAProblemBody() throws Exception {
        when(catalog.bestBuys("gaming", null)).thenThrow(new NotFoundException("preset", "gaming"));

        mvc.perform(get("/api/presets/gaming/best-buys"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.title").value("Not Found"))
                .andExpect(jsonPath("$.detail").value("No preset 'gaming'"));
    }

    @Test
    void listsThePhones() throws Exception {
        when(catalog.phones()).thenReturn(List.of(new PhoneSummary("a", "Phone A", 300.0)));

        mvc.perform(get("/api/phones"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("a"))
                .andExpect(jsonPath("$[0].typicalPriceSgd").value(300.0));
    }

    @Test
    void returnsOnePhone() throws Exception {
        when(catalog.phone("a")).thenReturn(new PhoneDetail("a", "Phone A", 300.0, Map.of("camera", 4.0)));

        mvc.perform(get("/api/phones/a"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Phone A"))
                .andExpect(jsonPath("$.categories.camera").value(4.0));
    }

    @Test
    void anUnknownPhoneIsA404WithAProblemBody() throws Exception {
        when(catalog.phone("zz")).thenThrow(new NotFoundException("phone", "zz"));

        mvc.perform(get("/api/phones/zz"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("No phone 'zz'"));
    }
}
