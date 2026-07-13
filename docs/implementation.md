# 구현 가이드

이 문서는 `07-answer` 브랜치의 참고 구현을 기준으로 설명합니다.
starter 브랜치에서 먼저 구현한 뒤, cache-aside 흐름과 stale data 대응 기준을 비교할 때 사용합니다.

## 1. 구현 전에 확인할 문제

자주 조회되는 게시글을 매번 DB에서만 읽으면 같은 데이터를 반복해서 조회하게 됩니다.
캐시를 붙이면 조회 부담은 줄일 수 있지만, 최신성 문제도 함께 봐야 합니다.

## 2. 구현 순서

1. Redis 연결용 `StringRedisTemplate` Bean을 확인합니다.
2. `PostCacheService`에서 key, 조회, 저장, TTL 흐름을 확인합니다.
3. `PostQueryService`에서 hit/miss 분기를 확인합니다.
4. 같은 게시글을 두 번 조회해 hit/miss 차이를 확인합니다.
5. 수정 후 stale data가 생길 수 있는 이유를 설명합니다.

## 3. Step 1. Redis 템플릿

### 해야 할 일

```kotlin
@Bean
fun stringRedisTemplate(connectionFactory: RedisConnectionFactory): StringRedisTemplate {
    return StringRedisTemplate(connectionFactory)
}
```

### 왜 이 작업을 하는가

이번 시퀀스는 Redis 자료구조를 깊게 다루지 않습니다.
문자열 기반 캐시만으로 조회 캐시의 흐름을 충분히 확인할 수 있습니다.

### 확인 방법

애플리케이션이 Redis 설정을 읽고 실행되는지 확인합니다.

## 4. Step 2. 캐시 조회와 저장

### 해야 할 일

```kotlin
val value = stringRedisTemplate.opsForValue().get(key(postId)) ?: return null
return objectMapper.readValue(value, PostResponse::class.java)
```

```kotlin
stringRedisTemplate.opsForValue().set(key(postId), value, ttl())
```

### 왜 이 작업을 하는가

`PostCacheService`가 key, JSON 변환, TTL 책임을 모으면 조회 흐름은 `PostQueryService`에서 더 선명해집니다.

### 확인 방법

값이 없을 때 `null`을 반환해 miss로 이어지는지, 저장 시 TTL이 적용되는지 확인합니다.

## 5. Step 3. Cache-aside 연결

### 해야 할 일

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

### 왜 이 작업을 하는가

기존 DB 조회 흐름을 완전히 바꾸지 않고도 조회 앞에 캐시를 붙일 수 있습니다.
hit는 빠른 응답, miss는 DB 조회로 이어지는 정상 흐름입니다.

### 확인 방법

같은 `GET /posts/{id}` 요청을 두 번 호출해 로그 차이를 확인합니다.

## 6. Step 4. Stale data와 evict 확장

### 해야 할 일

```kotlin
fun updatePost(id: Long, request: PostUpdateRequest): PostResponse {
    val updated = postService.update(id, request)
    postCacheService.evict(id)
    return updated
}
```

### 왜 이 작업을 하는가

DB가 바뀐 뒤 캐시를 그대로 두면 오래된 응답이 나갈 수 있습니다.
아래 evict 연결은 현재 답안에 포함되지 않은 확장 예시입니다. 현재 코드는 TTL 전까지 stale data가 남을 수 있습니다.

### 확인 방법

TTL과 evict가 각각 자동 만료와 즉시 정리라는 다른 문제를 다룬다는 점을 설명합니다.

## 마지막 확인

```bash
docker compose up -d
./gradlew test
./gradlew bootRun
```

Swagger에서 같은 게시글을 두 번 조회하고 hit/miss 로그를 확인합니다.

<details>
<summary>멘토용 진행 포인트</summary>

- 코드 비교 전 cache-aside 흐름을 말로 먼저 설명하게 합니다.
- key, TTL, JSON 변환이 `PostCacheService`에 모인 이유를 질문합니다.
- stale data 질문은 수정 직후 사용자에게 어떤 값이 보이는지로 연결합니다.

</details>
