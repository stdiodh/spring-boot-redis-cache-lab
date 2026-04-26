package com.andi.rest_crud.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.redis.connection.RedisConnectionFactory
import org.springframework.data.redis.core.StringRedisTemplate

@Configuration
class RedisConfig {

    // TODO 1. Redis와 통신할 StringRedisTemplate Bean을 확인하세요.
    // TODO 2. 이번 시퀀스는 가장 단순한 문자열 기반 캐시 흐름만 다룹니다.
    @Bean
    fun stringRedisTemplate(connectionFactory: RedisConnectionFactory): StringRedisTemplate {
        return StringRedisTemplate(connectionFactory)
    }
}
