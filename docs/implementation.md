# Redis Cache 구현 안내

## 1. 해결할 문제

게시글 단건 조회가 반복될 때마다 DB를 읽으면 조회 비용이 커집니다.
Redis 캐시는 자주 읽는 결과를 잠시 보관해 반복 조회 비용을 줄입니다.

## 2. 구현 흐름

1. `compose.yaml`로 Redis를 실행합니다.
2. `RedisConfig.kt`에서 Redis 연결과 직렬화 기준을 맞춥니다.
3. `PostCacheService.kt`에서 get, put, evict 책임을 분리합니다.
4. `PostQueryService.kt`에서 cache miss와 cache hit를 나눕니다.
5. `PostService.kt`에서 수정/삭제 뒤 cache invalidation을 연결합니다.

위 파일 경로는 `07-implementation`, `07-answer` 브랜치 기준입니다.

## 3. 핵심 코드

왜 이 코드를 보는지 먼저 정리합니다.
cache-aside는 캐시를 먼저 보고, 없을 때만 DB를 읽어야 합니다.

```kotlin
val cachedPost = postCacheService.get(id)
if (cachedPost != null) {
    return cachedPost
}
```

이 코드는 cache hit 때 DB 조회를 건너뛰는 문제를 해결합니다.
cache miss에서는 Repository로 원본을 읽고 `postCacheService.put(...)`으로 다음 조회를 준비합니다.

## 4. 실행/테스트

```bash
docker compose up -d
./gradlew test
./gradlew bootRun
```

Swagger에서 같은 게시글을 두 번 조회하고, 수정/삭제 뒤 다시 조회해 캐시가 지워졌는지 확인합니다.

## 5. 한계와 다음 개선 방향

캐시는 원본 저장소가 아니므로 DB와 값이 어긋나지 않게 지우는 기준이 필요합니다.
다음 개선은 TTL, key 설계, 장애 시 DB fallback 기준을 더 명확히 하는 것입니다.
