package com.ssafy.tripservice.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoAdmin;
import org.springframework.data.mongodb.core.MongoTemplate;

@Configuration
public class MongoDBConfig {

    @Bean
    public MongoClient mongoClient() {
        return MongoClients.create("mongodb://mongo:27017");
    }

    @Bean
    public MongoTemplate mongoTripTemplate() {
        return new MongoTemplate(mongoClient(), "narang-trip");
    }
}
