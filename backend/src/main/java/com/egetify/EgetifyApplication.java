package com.egetify;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class EgetifyApplication {

    public static void main(String[] args) {
        SpringApplication.run(EgetifyApplication.class, args);
    }
}
