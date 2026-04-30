# 캐시와 Redis 이론 정리

> 자주 조회되는 데이터를 DB보다 더 빠르게 다시 가져오기 위해 캐시를 앞에 두는 흐름을 익히는 문서입니다.

> 이번 주차 한 줄 요약  
> 게시글 조회 앞에 Redis 캐시를 붙여 `cache hit`, `cache miss`, TTL, 그리고 `stale data`까지 함께 이해하는 단계입니다.

## 먼저 이것만 기억해도 됩니다

- DB와 캐시는 역할이 다릅니다.
- `cache miss`는 실패가 아니라 정상 흐름입니다.
- TTL이 있어도 수정 직후에는 오래된 값이 남을 수 있습니다.

## 이 주제를 왜 배우는가

기능이 늘어나면 저장만 중요한 것이 아니라 조회 속도도 신경 쓰이기 시작합니다.
특히 같은 데이터를 자주 읽는 상황에서는 매번 DB만 보는 구조가 점점 부담이 될 수 있습니다.

그래서 이번 실습에서는 Redis를 이용해
"먼저 캐시를 보고, 없으면 DB를 보고, 다시 캐시에 저장하는" 가장 단순한 흐름을 붙여봅니다.
이 감각을 잡아야 나중에 실시간 통신이나 더 큰 트래픽 주제에서도
"어디서 병목이 생길 수 있는가"를 자연스럽게 떠올릴 수 있습니다.

## 기초 개념 먼저 잡기

### cache

- 무엇인가요  
  자주 다시 쓰는 데이터를 더 빠르게 꺼내기 위해 잠깐 보관해두는 보조 저장소입니다.
- 왜 필요한가요  
  매번 DB까지 가지 않아도 되는 상황을 만들 수 있기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `PostCacheService`

### Redis

- 무엇인가요  
  메모리 기반으로 빠르게 값을 저장하고 조회할 수 있는 저장소입니다.
- 왜 필요한가요  
  이번 시퀀스에서는 가장 단순한 조회 캐시를 구현하는 도구로 쓰기 좋기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `StringRedisTemplate`, `spring.data.redis.*`

### cache-aside

- 무엇인가요  
  먼저 캐시를 보고, 값이 없으면 DB를 조회한 뒤 다시 캐시에 저장하는 패턴입니다.
- 왜 필요한가요  
  기존 DB 조회 코드를 완전히 바꾸지 않고도 캐시를 앞에 붙일 수 있기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `PostQueryService.getPost(...)`

### cache hit

- 무엇인가요  
  캐시에 이미 값이 있어서 DB를 보지 않고 바로 응답하는 상황입니다.
- 왜 필요한가요  
  캐시를 붙이는 이유가 가장 잘 드러나는 순간이기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `if (cached != null)` 분기

### cache miss

- 무엇인가요  
  캐시에 값이 없어서 DB 조회로 이어지는 상황입니다.
- 왜 필요한가요  
  miss를 실패로 오해하지 않아야 cache-aside 흐름이 자연스럽게 보이기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `postService.getById(id)`로 넘어가는 분기

### TTL

- 무엇인가요  
  캐시 데이터가 얼마나 오래 살아 있을지를 정하는 시간입니다.
- 왜 필요한가요  
  캐시를 영구 저장소처럼 오해하지 않게 도와주기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  `cache.post-ttl-seconds`, `ttl()`

### stale data

- 무엇인가요  
  DB는 바뀌었는데 캐시에는 예전 값이 남아 있는 상태입니다.
- 왜 필요한가요  
  캐시는 빠르지만 최신성을 해칠 수 있다는 사실을 이해해야 하기 때문입니다.
- 이번 코드에서는 어디에 보이나요  
  조회 캐시는 있지만 수정/삭제 후 정리를 하지 않을 때 생길 수 있는 위험으로 연결됩니다.

## 이번 실습 흐름을 먼저 한눈에 보기

1. 클라이언트가 `GET /posts/{id}` 요청을 보냅니다.
2. `PostQueryService`가 먼저 Redis 캐시를 조회합니다.
3. 캐시에 있으면 바로 응답합니다.
4. 캐시에 없으면 `PostService`로 DB를 조회합니다.
5. 조회 결과를 Redis에 저장합니다.
6. 다음 같은 요청에서는 `cache hit`가 일어납니다.

짧게 말하면 이번 실습은  
요청 -> 캐시 조회 -> miss면 DB 조회 -> 캐시 저장 -> 응답 흐름을 익히는 과정입니다.

> 한 줄로 다시 보기  
> DB 앞에 빠른 보조 저장소를 하나 두고 조회 흐름을 가볍게 만드는 입문 실습입니다.

## 현재 코드 흐름에서 어디를 보면 되는가

이번 시퀀스는 기존 조회 흐름 앞에 캐시 레이어를 얹는 단계입니다.

1. `PostController.kt`
   단건 조회 요청을 어디로 넘기는지 보는 시작점입니다.
2. `PostQueryService.kt`
   hit / miss와 cache-aside 흐름이 가장 잘 보이는 파일입니다.
3. `PostCacheService.kt`
   Redis key, TTL, 문자열 저장/조회 흐름을 모아둔 파일입니다.
4. `RedisConfig.kt`
   Spring과 Redis가 만나는 연결 지점입니다.
5. `PostService.kt`
   miss 이후 실제 DB 조회가 이어지는 기존 서비스입니다.

## 오늘 꼭 잡아야 할 질문

- 왜 자주 조회되는 데이터에 캐시를 붙이나요?
- `cache hit`와 `cache miss`는 무엇이 다른가요?
- TTL은 왜 필요한가요?
- 수정 후 캐시를 안 지우면 어떤 값이 남을 수 있나요?
- 이번 코드에서 캐시 흐름이 가장 잘 보이는 클래스는 무엇인가요?

## 중요한 코드 먼저 보기

### 1. 캐시를 먼저 보는 코드

```kotlin
fun getPost(id: Long): PostResponse {
    val cached = postCacheService.get(id)
    if (cached != null) {
        logger.info("cache hit for post {}", id)
        return cached
    }

    logger.info("cache miss for post {}", id)
    val response = postService.getById(id)
    postCacheService.set(id, response)
    return response
}
```

- 이 코드는 cache-aside 흐름의 핵심을 보여줍니다.
- 여기서는 특히 `cache hit` 분기와 `miss` 뒤 저장 흐름을 먼저 보세요.
- 학생이 기억해야 할 핵심은 "miss는 DB 조회로 자연스럽게 이어진다"는 점입니다.
- 파일: `src/main/kotlin/com/andi/rest_crud/service/PostQueryService.kt`

### 2. 캐시에 저장할 때 TTL을 함께 두는 코드

```kotlin
fun set(postId: Long, response: PostResponse) {
    val value = objectMapper.writeValueAsString(response)
    stringRedisTemplate.opsForValue().set(key(postId), value, ttl())
}
```

- 이 코드는 캐시 저장과 TTL 설정을 보여줍니다.
- 학생이 기억해야 할 핵심은 "캐시는 저장만이 아니라 만료 시간도 같이 생각해야 한다"는 점입니다.
- 파일: `src/main/kotlin/com/andi/rest_crud/service/PostCacheService.kt`

### 3. 수정 이후 캐시를 비우지 않는 문제 코드

```kotlin
fun updatePost(id: Long, request: PostUpdateRequest): PostResponse {
    return postService.update(id, request)
}
```

- 이 코드는 처음 보면 자연스럽지만, stale data 위험을 그대로 남깁니다.
- DB는 바뀌어도 캐시에 예전 값이 남아 있으면 다음 조회에서 오래된 응답을 줄 수 있습니다.

### 4. 수정 이후 캐시를 정리하는 해결 코드

```kotlin
fun updatePost(id: Long, request: PostUpdateRequest): PostResponse {
    val updated = postService.update(id, request)
    postCacheService.evict(id)
    return updated
}
```

- 이 코드는 명시적 캐시 무효화의 가장 단순한 예시입니다.
- 학생이 기억해야 할 핵심은 "캐시를 붙였으면 정리 시점도 같이 설계해야 한다"는 점입니다.

## 핵심 개념 설명

### 1. 캐시는 DB를 대체하지 않습니다

DB는 기준 데이터 저장소입니다.
캐시는 그 데이터를 더 빠르게 다시 읽기 위한 보조 저장소입니다.
그래서 캐시에 값이 없으면 DB로 다시 가는 흐름이 자연스럽습니다.

### 2. miss는 실패가 아니라 정상 흐름입니다

첫 조회에서는 캐시에 값이 없을 수 있습니다.
이때 miss를 오류처럼 다루면 cache-aside를 이상하게 이해하게 됩니다.
이번 시퀀스에서는 miss를 "DB 조회로 이어지는 시작점"으로 이해하는 것이 중요합니다.

### 3. TTL은 최신성을 완전히 보장하지 않습니다

TTL이 있으면 캐시가 영원히 남지 않게 할 수 있습니다.
하지만 TTL이 끝나기 전까지는 예전 값이 남아 있을 수 있습니다.
즉, TTL은 무효화 전략 전체를 대신하지 않습니다.

## 실무에서 한 번 더 보기

이번 시퀀스의 실무 확장 개념은 `캐시 무효화 전략`입니다.

### 문제 상황 1. 조회는 빨라졌는데 수정 후 예전 값이 보인다

조회에만 캐시를 붙이고 수정/삭제 시점에 아무 작업도 하지 않으면,
DB와 캐시가 서로 다른 값을 가질 수 있습니다.
이것이 `stale data` 문제의 시작입니다.

### 문제 코드

```kotlin
fun updatePost(id: Long, request: PostUpdateRequest): PostResponse {
    return postService.update(id, request)
}
```

이 코드는 DB 갱신만 하고 캐시는 그대로 둡니다.
그 결과 TTL이 끝나기 전까지는 이전 응답이 계속 나갈 수 있습니다.

### 왜 실제로 문제가 되는가

- 사용자는 수정 직후에도 예전 제목을 볼 수 있습니다.
- API 응답이 환경에 따라 다르게 보일 수 있습니다.
- "저장은 됐는데 왜 화면은 안 바뀌지?" 같은 혼란이 생깁니다.

### 해결 코드 예시

```kotlin
fun updatePost(id: Long, request: PostUpdateRequest): PostResponse {
    val updated = postService.update(id, request)
    postCacheService.evict(id)
    return updated
}
```

또는 삭제 시점에도 같은 방식으로 캐시를 비울 수 있습니다.

```kotlin
fun deletePost(id: Long) {
    postService.delete(id)
    postCacheService.evict(id)
}
```

### TTL과 evict는 어떻게 다른가

- TTL: 캐시가 너무 오래 남지 않게 하는 안전장치
- evict: 수정/삭제 직후 오래된 값을 바로 치우는 장치

실무에서는 둘 중 하나만 쓰는 것이 아니라,
"얼마나 빨리 최신성이 필요하냐"에 따라 함께 씁니다.

## 이번 실습에서 꼭 보면 좋은 포인트

- `PostController`가 단건 조회를 `PostQueryService`로 넘기는 이유
- miss일 때 예외가 아니라 자연스럽게 DB 조회로 이어지는 분기
- 캐시에 `PostResponse`를 그대로 두지 않고 문자열로 저장하는 이유
- TTL 값을 너무 길게 잡지 않고 짧게 두는 이유
- 조회 캐시를 붙였으면 수정/삭제 이후 정리도 필요하다는 점

## 자주 헷갈리는 포인트

- 캐시는 DB를 대체하는 것이 아닙니다.
- `cache miss`는 오류가 아니라 정상적인 첫 조회 흐름입니다.
- TTL이 있다고 해서 stale data 문제가 완전히 사라지는 것은 아닙니다.
- 이번 시퀀스는 Redis 전체 기능을 배우는 단계가 아닙니다.

## 직접 말해보기

- 왜 자주 조회되는 데이터에 캐시를 붙이면 좋을까요?
- `cache hit`와 `cache miss`는 각각 어떤 상황인가요?
- DB와 캐시는 역할이 어떻게 다른가요?
- 수정 후 캐시를 안 지우면 어떤 일이 생길 수 있나요?
- TTL과 evict는 어떤 차이가 있나요?

## 복습 체크리스트

- [ ] DB와 캐시의 차이를 설명할 수 있습니다.
- [ ] `cache hit`와 `cache miss`를 각각 말할 수 있습니다.
- [ ] 캐시에 없으면 DB 조회로 이어진다는 흐름을 설명할 수 있습니다.
- [ ] TTL이 왜 필요한지 설명할 수 있습니다.
- [ ] stale data가 왜 생길 수 있는지 설명할 수 있습니다.
- [ ] TTL과 evict의 역할 차이를 설명할 수 있습니다.

## 오늘 꼭 기억할 것

이번 시퀀스의 핵심은 Redis 기능을 많이 배우는 것이 아닙니다.
대신 "자주 조회되는 데이터를 더 빠르게 다시 꺼내기 위해 캐시를 어떻게 앞에 두는가"와
"그 캐시를 어떻게 안전하게 정리할 것인가"를 가장 단순한 흐름으로 이해하는 것입니다.

## 다음 실습과 연결하기

다음 시퀀스에서 실시간 통신으로 넘어가면,
데이터가 더 자주 오가고 응답 흐름이 더 즉각적으로 느껴져야 하는 순간이 많아집니다.
그래서 이번 캐시 시퀀스는 "조회 부담을 어떻게 줄일 것인가"와
"빠름과 최신성 사이의 균형을 어떻게 볼 것인가"를 생각하기 시작하는 첫 단계입니다.
