package com.andi.rest_crud.service

import com.andi.rest_crud.dto.PostResponse
import tools.jackson.module.kotlin.jacksonObjectMapper
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import java.time.Duration

@Service
class PostCacheService(
    private val stringRedisTemplate: StringRedisTemplate,
    @Value("\${cache.post-ttl-seconds}") private val postTtlSeconds: Long
) {
    private val objectMapper = jacksonObjectMapper()


    // TODO 1. 먼저 캐시에서 postId에 해당하는 문자열 값을 조회하세요.
    // TODO 2. 값이 있으면 PostResponse로 되돌리세요.
    // TODO 3. 값이 없으면 miss 흐름이 이어지도록 null을 반환하세요.
    fun get(postId: Long): PostResponse? {
        TODO("Redis 캐시 조회 흐름을 완성하세요.")
    }

    // TODO 4. DB 조회 결과를 문자열로 바꿔 Redis에 저장하세요.
    // TODO 5. TTL을 함께 설정해 캐시가 영구 저장소가 아님을 드러내세요.
    fun set(postId: Long, response: PostResponse) {
        TODO("Redis 캐시 저장 흐름을 완성하세요.")
    }

    fun key(postId: Long): String = "post:$postId"

    fun ttl(): Duration = Duration.ofSeconds(postTtlSeconds)
}
