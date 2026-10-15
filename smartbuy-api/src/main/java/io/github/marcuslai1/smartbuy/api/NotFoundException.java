package io.github.marcuslai1.smartbuy.api;

/** A preset or phone that isn't in the data. The API answers 404. */
public class NotFoundException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public NotFoundException(String what, String key) {
        super("No " + what + " '" + key + "'");
    }
}
