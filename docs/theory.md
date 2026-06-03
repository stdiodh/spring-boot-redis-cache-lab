# 이론 정리

## 1. 왜 이 개념이 필요한가

기능이 늘어나면 저장만큼 조회 부담도 중요해집니다.
같은 데이터를 자주 읽는 상황에서 매번 DB를 조회하면 응답 속도와 DB 부하가 모두 부담이 될 수 있습니다.

이번 시퀀스는 게시글 단건 조회 앞에 Redis 캐시를 두고, cache hit, cache miss, TTL, stale data를 함께 이해하는 단계입니다.

## 2. 기존 방식의 한계

DB는 기준 데이터 저장소입니다.
하지만 반복 조회까지 모두 DB가 처리하면 같은 데이터를 계속 읽는 비용이 커질 수 있습니다.

캐시는 조회를 빠르게 만들 수 있지만 최신성을 자동으로 보장하지 않습니다.
수정 후 캐시를 정리하지 않으면 DB와 Redis가 서로 다른 값을 가질 수 있습니다.

## 3. 이번 시퀀스에서 선택한 접근

- Redis 캐시에서 먼저 게시글을 찾습니다.
- cache hit면 바로 응답합니다.
- cache miss면 DB를 조회합니다.
- DB 조회 결과를 Redis에 저장하고 TTL을 둡니다.
- 수정/삭제 이후에는 evict 필요성을 함께 봅니다.

## 4. 핵심 개념

### Cache

자주 다시 쓰는 데이터를 더 빠르게 꺼내기 위해 잠깐 보관하는 보조 저장소입니다.

### Redis

메모리 기반으로 값을 빠르게 저장하고 조회할 수 있는 저장소입니다.
이번 시퀀스에서는 문자열 기반 조회 캐시로 사용합니다.

### Cache-aside

먼저 캐시를 보고, 값이 없으면 DB를 조회한 뒤 다시 캐시에 저장하는 패턴입니다.

### Cache hit / miss

hit는 캐시에 값이 있어 바로 응답하는 상황입니다.
miss는 캐시에 값이 없어 DB 조회로 이어지는 상황이며 실패가 아닙니다.

### TTL과 evict

TTL은 캐시 값의 만료 시간을 정합니다.
evict는 수정/삭제 직후 오래된 값을 명시적으로 치우는 방식입니다.

## 5. 짧은 예제와 해설

```kotlin
val cached = postCacheService.get(id)
if (cached != null) {
    return cached
}

val response = postService.getById(id)
postCacheService.set(id, response)
return response
```

이 흐름은 cache-aside의 핵심입니다.
캐시에 있으면 바로 응답하고, 없으면 DB 조회 후 캐시에 저장합니다.

```kotlin
stringRedisTemplate.opsForValue().set(key(postId), value, ttl())
```

캐시에 저장할 때 TTL을 함께 두면 캐시가 영구 저장소처럼 남는 것을 막을 수 있습니다.

## 6. 다음 구현으로 연결되는 지점

다음 실시간 통신 시퀀스에서는 사용자가 더 빠른 반응을 기대하는 흐름을 다룹니다.
이번 캐시 실습은 빠른 조회와 최신성 사이의 균형을 먼저 이해하는 기반입니다.

<details>
<summary>멘토용 설명 포인트</summary>

- miss를 오류가 아니라 DB 조회로 이어지는 정상 흐름으로 설명합니다.
- TTL과 evict는 서로 대체 관계가 아니라 해결하는 시점이 다른 장치로 설명합니다.
- answer 브랜치 비교 시 Redis 세부 기능보다 `PostQueryService` 흐름을 중심으로 봅니다.

</details>
