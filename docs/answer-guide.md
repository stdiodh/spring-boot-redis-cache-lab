# 캐시와 Redis 정답 가이드

## 정답을 보기 전에 먼저 확인할 것

- `StringRedisTemplate` Bean이 준비되어 있는가
- `PostCacheService.get(...)`가 miss일 때 `null`을 반환하는가
- `PostCacheService.set(...)`가 TTL과 함께 값을 저장하는가
- `PostQueryService.getPost(...)`가 hit/miss 분기를 올바르게 연결하는가

## 1. Redis 연결 정답 포인트

- 이번 시퀀스는 `StringRedisTemplate` 하나로 충분합니다.
- 복잡한 자료구조보다 문자열 저장/조회 흐름이 잘 보이는 것이 중요합니다.

예시 형태:

```kotlin
@Bean
fun stringRedisTemplate(connectionFactory: RedisConnectionFactory): StringRedisTemplate {
    return StringRedisTemplate(connectionFactory)
}
```

## 2. 캐시 조회 정답 포인트

정답 흐름은 아래 순서입니다.

1. `postId`로 키를 만듭니다.
2. Redis에서 문자열 값을 조회합니다.
3. 값이 없으면 `null`을 반환합니다.
4. 값이 있으면 `PostResponse`로 되돌립니다.

예시 핵심:

```kotlin
val value = stringRedisTemplate.opsForValue().get(key(postId)) ?: return null
return objectMapper.readValue(value, PostResponse::class.java)
```

## 3. miss -> DB 조회 -> 캐시 저장 정답 포인트

정답 흐름은 아래 순서입니다.

1. `postCacheService.get(id)`를 먼저 호출합니다.
2. 값이 있으면 바로 반환합니다.
3. 값이 없으면 `postService.getById(id)`로 DB를 조회합니다.
4. 조회 결과를 `postCacheService.set(id, response)`로 저장합니다.
5. 마지막에 응답을 반환합니다.

예시 핵심:

```kotlin
val cached = postCacheService.get(id)
if (cached != null) {
    return cached
}

val response = postService.getById(id)
postCacheService.set(id, response)
return response
```

## 4. TTL 설정 정답 포인트

- TTL은 `cache.post-ttl-seconds` 설정값으로 관리합니다.
- 저장 시 `opsForValue().set(key, value, ttl())` 형태로 연결하면 됩니다.

예시 핵심:

```kotlin
stringRedisTemplate.opsForValue().set(key(postId), value, ttl())
```

## 5. hit/miss 확인 방법

1. 게시글을 생성합니다.
2. 처음 `GET /posts/{id}`를 호출합니다.
   - 보통 miss -> DB 조회 -> 캐시 저장입니다.
3. 같은 요청을 다시 호출합니다.
   - 보통 hit -> 캐시 응답입니다.
4. TTL이 지난 뒤 다시 호출하면 miss가 다시 일어날 수 있습니다.

## 6. 강사용 빠른 비교 포인트

- miss를 예외로 처리하지 않았는지
- key 생성이 단순하고 읽기 쉬운지
- TTL이 설정과 코드에서 함께 보이는지
- `PostQueryService`에서 cache-aside 흐름이 짧고 선명하게 보이는지

## 7. answer 기준 완성 형태

`07-answer`에서는 아래 파일이 완성되어 있습니다.

- `src/main/kotlin/com/andi/rest_crud/config/RedisConfig.kt`
- `src/main/kotlin/com/andi/rest_crud/service/PostCacheService.kt`
- `src/main/kotlin/com/andi/rest_crud/service/PostQueryService.kt`
- `src/main/kotlin/com/andi/rest_crud/controller/PostController.kt`

핵심은 Redis 기능을 많이 넣는 것이 아니라,
조회 1개 흐름에 cache-aside를 가장 단순하게 붙여보는 것입니다.
