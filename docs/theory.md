# Redis Cache 이론 정리

## 1. 같은 데이터를 계속 DB에서 읽어야 할까?

게시글 단건 조회처럼 자주 반복되는 요청은 매번 DB를 읽으면 비용이 쌓입니다.
DB는 원본 데이터를 보관하는 곳이지만, 모든 조회를 항상 DB가 직접 처리해야 하는 것은 아닙니다.

이번 시퀀스는 반복 조회 앞에 Redis 캐시를 두고 cache miss, cache hit, TTL을 구현하며 invalidation은 후속 판단 기준으로 다룹니다.

## 2. 배경: 캐시는 원본 저장소가 아닙니다

캐시는 빠르게 읽기 위한 보조 저장소입니다.
원본은 DB에 남아 있고, Redis에는 조회 결과를 일정 시간 저장합니다.

캐시가 비어 있으면 DB를 읽고 Redis에 저장합니다.
캐시에 값이 있으면 DB를 건너뛰고 Redis 값을 반환합니다.
게시글이 수정되거나 삭제되면 오래된 값을 쓰지 않도록 캐시를 지워야 합니다.

## 3. 선택한 방식: cache-aside

이번 실습은 cache-aside 흐름을 사용합니다.

```text
GET /posts/{id}
-> Redis 조회
-> miss면 DB 조회
-> Redis 저장
-> 응답
```

쓰기 요청에서는 DB를 먼저 바꾸고 관련 캐시를 지웁니다.
이 방식은 읽기 성능을 개선하지만, invalidation을 빠뜨리면 stale data가 생길 수 있습니다.

## 4. 핵심 코드로 연결하기

아래 경로는 `07-implementation`, `07-answer` 브랜치 기준 실제 코드 경로입니다.

- `src/main/kotlin/com/andi/rest_crud/config/RedisConfig.kt`: Redis 연결과 serializer 기준을 둡니다.
- `src/main/kotlin/com/andi/rest_crud/service/PostCacheService.kt`: cache get, put, key, TTL 책임을 둡니다.
- `src/main/kotlin/com/andi/rest_crud/service/PostQueryService.kt`: cache miss와 cache hit 흐름을 읽는 조회 서비스입니다.
- `src/main/kotlin/com/andi/rest_crud/service/PostService.kt`: 현재 답안에는 캐시 의존성이 없으며 수정/삭제 무효화는 확장 지점입니다.
- `src/main/kotlin/com/andi/rest_crud/repository/PostRepository.kt`: cache miss 때 최종 원본 데이터를 읽는 DB Repository입니다.
- `compose.yaml`: 로컬 Redis를 실행하는 서비스 정의입니다.

왜 이 코드를 보는지 먼저 정리합니다.
캐시 문제는 “빠르게 읽는가”보다 “언제 DB를 읽고 언제 캐시를 지우는가”가 핵심입니다.

```kotlin
val cachedPost = postCacheService.get(id)
if (cachedPost != null) {
    return cachedPost
}
```

이 코드는 cache hit 때 DB 조회를 줄이는 문제를 해결합니다.
값이 없을 때만 Repository를 읽고 캐시에 저장해야 cache miss 흐름이 완성됩니다.

## 5. 실행/테스트 결과로 확인할 것

```bash
docker compose up -d
./gradlew test
```

단위 테스트에서는 cache miss 때 DB를 읽는지, cache hit 때 DB 조회를 줄이는지 확인합니다. 수정/삭제 뒤 캐시 제거는 아직 테스트하지 않습니다.

## 6. 한계와 다음 개선 방향

캐시는 읽기 성능을 돕지만 원본 데이터의 책임을 대신하지 않습니다.
TTL, invalidation, 장애 시 fallback을 함께 고려해야 합니다.
다음 시퀀스에서는 요청/응답이 아니라 연결을 유지하는 WebSocket 흐름으로 넘어갑니다.
