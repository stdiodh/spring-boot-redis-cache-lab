package com.andi.rest_crud.service

import com.andi.rest_crud.dto.PostResponse
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.mockito.Mockito.mock

class PostQueryServiceTest {
    private val postService = mock(PostService::class.java)
    private val postCacheService = mock(PostCacheService::class.java)
    private val postQueryService = PostQueryService(postService, postCacheService)
    private val response = PostResponse(1L, "제목", "내용", "owner@example.com")

    @Test
    fun `cache hit이면 DB 조회 없이 캐시 응답을 반환한다`() {
        `when`(postCacheService.get(1L)).thenReturn(response)

        val result = postQueryService.getPost(1L)

        assertEquals(response, result)
        verify(postService, never()).getById(1L)
    }

    @Test
    fun `cache miss이면 DB 조회 결과를 캐시에 저장한다`() {
        `when`(postCacheService.get(1L)).thenReturn(null)
        `when`(postService.getById(1L)).thenReturn(response)

        val result = postQueryService.getPost(1L)

        assertEquals(response, result)
        verify(postCacheService).set(1L, response)
    }
}
