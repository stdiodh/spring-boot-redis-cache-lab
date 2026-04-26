package com.andi.rest_crud.service

import com.andi.rest_crud.dto.PostResponse
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class PostQueryService(
    private val postService: PostService,
    private val postCacheService: PostCacheService
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    // TODO 1. 먼저 postCacheService.get(id)로 cache hit를 확인하세요.
    // TODO 2. hit면 바로 반환하고, miss면 DB 조회로 넘어가세요.
    // TODO 3. DB 조회 결과를 postCacheService.set(id, response)로 저장하세요.
    // TODO 4. miss를 실패로 처리하지 마세요. miss는 정상적인 첫 조회 흐름입니다.
    fun getPost(id: Long): PostResponse {
        logger.info("checking cache for post {}", id)
        TODO("cache-aside 조회 흐름을 완성하세요.")
    }
}
