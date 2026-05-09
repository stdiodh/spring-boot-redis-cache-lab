# 캐시와 Redis 참고 구현 가이드

## 참고 구현을 보기 전에 먼저 확인할 것

- `StringRedisTemplate` Bean이 준비되어 있는가
- `PostCacheService.get(...)`가 miss일 때 `null`을 반환하는가
- `PostCacheService.set(...)`가 TTL과 함께 값을 저장하는가
- `PostQueryService.getPost(...)`가 hit/miss 분기를 올바르게 연결하는가

이번 answer는 "Redis를 붙였다"에서 끝나는 것이 아니라,
왜 조회 캐시 뒤에는 무효화 전략도 같이 따라와야 하는지까지 이해하는 기준입니다.

## 1. Redis 연결 참고 구현 포인트

- 이번 시퀀스는 `StringRedisTemplate` 하나로 충분합니다.
- 복잡한 자료구조보다 문자열 저장/조회 흐름이 잘 보이는 것이 중요합니다.

예시 형태:

```kotlin
@Bean
fun stringRedisTemplate(connectionFactory: RedisConnectionFactory): StringRedisTemplate {
    return StringRedisTemplate(connectionFactory)
}
```

## 2. 캐시 조회 참고 구현 포인트

참고 구현 흐름은 아래 순서입니다.

1. `postId`로 키를 만듭니다.
2. Redis에서 문자열 값을 조회합니다.
3. 값이 없으면 `null`을 반환합니다.
4. 값이 있으면 `PostResponse`로 되돌립니다.

예시 핵심:

```kotlin
val value = stringRedisTemplate.opsForValue().get(key(postId)) ?: return null
return objectMapper.readValue(value, PostResponse::class.java)
```

## 3. miss -> DB 조회 -> 캐시 저장 참고 구현 포인트

참고 구현 흐름은 아래 순서입니다.

1. `postCacheService.get(id)`를 먼저 호출합니다.
2. 값이 있으면 바로 반환합니다.
3. 값이 없으면 `postService.getById(id)`로 DB를 조회합니다.
4. 조회 결과를 `postCacheService.set(id, response)`로 저장합니다.
5. 마지막에 응답을 반환합니다.

예시 핵심:

```kotlin
val cached = postCacheService.get(id)
if (cached != null) {
    logger.info("cache hit for post {}", id)
    return cached
}

logger.info("cache miss for post {}", id)
val response = postService.getById(id)
postCacheService.set(id, response)
return response
```

## 4. TTL 설정 참고 구현 포인트

- TTL은 `cache.post-ttl-seconds` 설정값으로 관리합니다.
- 저장 시 `opsForValue().set(key, value, ttl())` 형태로 연결하면 됩니다.

예시 핵심:

```kotlin
stringRedisTemplate.opsForValue().set(key(postId), value, ttl())
```

## 5. 왜 stale data까지 같이 봐야 하는가

조회 캐시를 붙이면 읽기는 빨라질 수 있습니다.
하지만 수정 이후 캐시를 그대로 두면,
DB는 바뀌었는데 Redis는 예전 값을 들고 있을 수 있습니다.

문제 코드 예시:

```kotlin
fun updatePost(id: Long, request: PostUpdateRequest): PostResponse {
    return postService.update(id, request)
}
```

이 경우 TTL이 끝나기 전까지는 예전 응답이 남을 수 있습니다.

## 6. 캐시 무효화 예시 코드

이번 시퀀스의 메인 구현은 조회 캐시지만,
참고 구현 가이드에서는 수정/삭제 이후 어떤 방향으로 풀어야 하는지도 같이 이해해야 합니다.

예시 핵심:

```kotlin
fun updatePost(id: Long, request: PostUpdateRequest): PostResponse {
    val updated = postService.update(id, request)
    postCacheService.evict(id)
    return updated
}
```

```kotlin
fun deletePost(id: Long) {
    postService.delete(id)
    postCacheService.evict(id)
}
```

포인트는 아래입니다.

- TTL은 자동 만료용 안전장치입니다.
- evict는 수정/삭제 직후 오래된 값을 바로 치우는 장치입니다.
- 실무에서는 둘을 함께 설계하는 경우가 많습니다.

## 7. hit/miss 확인 방법

1. 게시글을 생성합니다.
2. 처음 `GET /posts/{id}`를 호출합니다.
   - 보통 `miss -> DB 조회 -> 캐시 저장`입니다.
3. 같은 요청을 다시 호출합니다.
   - 보통 `hit -> 캐시 응답`입니다.
4. 게시글을 수정한 뒤 캐시를 지우지 않으면 예전 값이 남을 수 있음을 문서로 함께 이해합니다.
5. TTL이 지난 뒤 다시 호출하면 miss가 다시 일어날 수 있습니다.

## 8. 리뷰용 빠른 비교 포인트

- miss를 예외로 처리하지 않았는지
- key 생성이 단순하고 읽기 쉬운지
- TTL이 설정과 코드에서 함께 보이는지
- `PostQueryService`에서 `cache-aside` 흐름이 짧고 선명하게 보이는지
- stale data와 evict 필요성을 설명할 수 있는지

## 9. answer 기준 완성 형태

`07-answer`에서는 아래 파일이 완성되어 있습니다.

- `src/main/kotlin/com/andi/rest_crud/config/RedisConfig.kt`
- `src/main/kotlin/com/andi/rest_crud/service/PostCacheService.kt`
- `src/main/kotlin/com/andi/rest_crud/service/PostQueryService.kt`
- `src/main/kotlin/com/andi/rest_crud/controller/PostController.kt`

핵심은 Redis 기능을 많이 넣는 것이 아니라,
조회 1개 흐름에 `cache-aside`를 가장 단순하게 붙여보고,
그 다음 질문으로 "그럼 오래된 값은 어떻게 정리할까?"까지 떠올릴 수 있게 만드는 것입니다.
