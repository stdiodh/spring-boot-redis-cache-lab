package com.andi.rest_crud.controller

import com.andi.rest_crud.dto.PostResponse
import com.andi.rest_crud.dto.PostUpdateRequest
import com.andi.rest_crud.service.PostCacheService
import com.andi.rest_crud.service.PostQueryService
import com.andi.rest_crud.service.PostService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.security.Principal

class PostControllerCacheInvalidationTest {
    private val postService = mock(PostService::class.java)
    private val postQueryService = mock(PostQueryService::class.java)
    private val postCacheService = mock(PostCacheService::class.java)
    private val controller = PostController(postService, postQueryService, postCacheService)
    private val principal = Principal { "owner@example.com" }

    @Test
    fun `게시글 수정 성공 후 단건 캐시를 제거한다`() {
        val request = PostUpdateRequest("수정 제목", "수정 내용")
        val response = PostResponse(1L, request.title, request.content, principal.name)
        `when`(postService.update(1L, request, principal.name)).thenReturn(response)

        val result = controller.update(1L, request, principal)

        assertEquals(response, result)
        verify(postCacheService).evict(1L)
    }

    @Test
    fun `게시글 삭제 성공 후 단건 캐시를 제거한다`() {
        controller.delete(1L, principal)

        verify(postService).delete(1L, principal.name)
        verify(postCacheService).evict(1L)
    }
}
