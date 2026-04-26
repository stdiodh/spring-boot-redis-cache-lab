# 캐시와 Redis 이론 정리

> 자주 조회되는 데이터를 DB보다 더 빠르게 다시 가져오기 위해 캐시를 앞에 두는 흐름을 익히는 문서입니다.

> 이번 주차 한 줄 요약  
> 게시글 조회 앞에 Redis 캐시를 붙여서 cache hit와 miss, TTL의 의미를 직접 확인하는 단계입니다.

## 먼저 이것만 기억해도 됩니다

- DB와 캐시는 역할이 다릅니다.
- cache miss는 실패가 아니라 정상 흐름입니다.
- TTL이 있어야 캐시를 영구 저장소처럼 오해하지 않게 됩니다.

## 이 주제를 왜 배우는가

기능이 늘어나면 저장만 중요한 것이 아니라 조회 속도도 신경 쓰이기 시작합니다.
특히 같은 데이터를 자주 읽는 상황에서는 매번 DB만 보는 구조가 점점 부담이 될 수 있습니다.

그래서 이번 실습에서는 Redis를 이용해
"먼저 캐시를 보고, 없으면 DB를 보고, 다시 캐시에 저장하는" 가장 단순한 흐름을 붙여봅니다.
이 감각을 잡아야 나중에 실시간 통신이나 더 큰 트래픽 주제에서도
"어디서 병목이 생길 수 있는가"를 자연스럽게 떠올릴 수 있습니다.

## 이번 실습 흐름을 먼저 한눈에 보기

1. 클라이언트가 `GET /posts/{id}` 요청을 보냅니다.
2. `PostQueryService`가 먼저 Redis 캐시를 조회합니다.
3. 캐시에 있으면 바로 응답합니다.
4. 캐시에 없으면 `PostService`로 DB를 조회합니다.
5. 조회 결과를 Redis에 저장합니다.
6. 다음 같은 요청에서는 cache hit가 일어납니다.

짧게 말하면 이번 실습은  
**요청 -> 캐시 조회 -> miss면 DB 조회 -> 캐시 저장 -> 응답** 흐름을 익히는 과정입니다.

> 한 줄로 다시 보기  
> DB 앞에 빠른 보조 저장소를 하나 두고 조회 흐름을 가볍게 만드는 입문 실습입니다.

## 오늘 꼭 잡아야 할 질문

- 왜 자주 조회되는 데이터에 캐시를 붙이나요?
- cache hit와 miss는 무엇이 다른가요?
- TTL은 왜 필요한가요?
- 이번 코드에서 캐시 흐름이 가장 잘 보이는 클래스는 무엇인가요?
- 다음 주제로 넘어가기 전에 어떤 차이를 설명할 수 있어야 하나요?

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

- 이 코드는 **cache-aside 흐름의 핵심**을 보여줍니다.
- 여기서는 특히 hit 분기와 miss 뒤 저장 흐름을 먼저 보세요.
- 학생이 기억해야 할 핵심은 **"miss는 DB 조회로 자연스럽게 이어진다"**는 점입니다.
- 파일: `src/main/kotlin/com/andi/rest_crud/service/PostQueryService.kt`

### 2. 캐시에 저장할 때 TTL을 함께 두는 코드

```kotlin
fun set(postId: Long, response: PostResponse) {
    val value = objectMapper.writeValueAsString(response)
    stringRedisTemplate.opsForValue().set(key(postId), value, ttl())
}
```

- 이 코드는 **캐시 저장과 TTL 설정**을 보여줍니다.
- 학생이 기억해야 할 핵심은 **"캐시는 저장만이 아니라 만료 시간도 같이 생각해야 한다"**는 점입니다.
- 파일: `src/main/kotlin/com/andi/rest_crud/service/PostCacheService.kt`

### 3. Redis 연결 Bean을 준비하는 코드

```kotlin
@Bean
fun stringRedisTemplate(connectionFactory: RedisConnectionFactory): StringRedisTemplate {
    return StringRedisTemplate(connectionFactory)
}
```

- 이 코드는 **애플리케이션과 Redis가 만나는 시작점**을 보여줍니다.
- 학생이 기억해야 할 핵심은 **"이번 시퀀스는 복잡한 Redis 자료구조보다 조회 캐시 흐름이 중심"**이라는 점입니다.
- 파일: `src/main/kotlin/com/andi/rest_crud/config/RedisConfig.kt`

## 핵심 용어를 쉬운 말로 정리하기

### 캐시

- **뜻**  
  자주 다시 쓰는 데이터를 더 빠르게 꺼내기 위해 잠깐 보관해두는 저장소입니다.
- **왜 중요한가**  
  매번 DB까지 가지 않아도 되는 상황을 만들 수 있습니다.
- **이번 코드에서는 어디에 보이는가**  
  `PostCacheService`에서 볼 수 있습니다.
- **짧은 상황 예시**  
  같은 게시글 상세 조회를 연속으로 요청할 때 두 번째 조회를 더 가볍게 만들 수 있습니다.

### DB와 캐시 차이

- **뜻**  
  DB는 기준 데이터 저장소이고, 캐시는 빠른 재조회용 보조 저장소입니다.
- **왜 중요한가**  
  둘을 같은 것으로 생각하면 TTL이나 miss 흐름을 이해하기 어렵습니다.
- **이번 코드에서는 어디에 보이는가**  
  `PostService.getById(...)`는 DB 조회, `PostCacheService.get(...)`는 캐시 조회입니다.
- **짧은 상황 예시**  
  캐시에 없으면 다시 DB로 가는 이유가 바로 이 차이 때문입니다.

### cache hit

- **뜻**  
  캐시에 이미 값이 있어서 DB를 보지 않고 바로 응답하는 상황입니다.
- **왜 중요한가**  
  캐시를 붙이는 이유가 가장 잘 드러나는 순간입니다.
- **이번 코드에서는 어디에 보이는가**  
  `cached != null` 분기에서 볼 수 있습니다.
- **짧은 상황 예시**  
  같은 게시글을 두 번째 조회했을 때 Redis에서 바로 값을 꺼내는 상황입니다.

### cache miss

- **뜻**  
  캐시에 값이 없어서 DB 조회로 이어지는 상황입니다.
- **왜 중요한가**  
  miss를 실패로 오해하지 않아야 cache-aside 흐름이 자연스럽게 보입니다.
- **이번 코드에서는 어디에 보이는가**  
  `PostQueryService.getPost(...)`에서 `postService.getById(...)`로 이어지는 분기입니다.
- **짧은 상황 예시**  
  처음 게시글을 조회할 때 캐시에 값이 없어서 DB를 보는 상황입니다.

### TTL

- **뜻**  
  캐시 데이터가 얼마나 오래 살아 있을지를 정하는 시간입니다.
- **왜 중요한가**  
  캐시를 영구 저장소처럼 쓰지 않게 도와줍니다.
- **이번 코드에서는 어디에 보이는가**  
  `cache.post-ttl-seconds` 설정과 `ttl()` 메서드에서 볼 수 있습니다.
- **짧은 상황 예시**  
  TTL이 지나면 다시 miss가 일어나고 DB 조회가 다시 필요할 수 있습니다.

### Redis

- **뜻**  
  메모리 기반으로 빠르게 데이터를 저장하고 조회할 수 있는 저장소입니다.
- **왜 중요한가**  
  이번 시퀀스에서는 캐시를 구현하는 가장 단순한 도구로 사용합니다.
- **이번 코드에서는 어디에 보이는가**  
  `StringRedisTemplate`, `spring.data.redis.*` 설정에서 볼 수 있습니다.
- **짧은 상황 예시**  
  게시글 상세 조회 결과를 문자열로 Redis에 잠깐 저장해 둡니다.

## 이번 실습에서 꼭 보면 좋은 포인트

- `PostController`가 단건 조회를 `PostQueryService`로 넘기는 이유
- miss일 때 예외가 아니라 자연스럽게 DB 조회로 이어지는 분기
- 캐시에 `PostResponse`를 그대로 두지 않고 문자열로 저장하는 이유
- TTL 값을 너무 길게 잡지 않고 짧게 두는 이유

## 자주 헷갈리는 포인트

- 캐시는 DB를 대체하는 것이 아닙니다.
- cache miss는 오류가 아니라 정상적인 첫 조회 흐름입니다.
- 이번 시퀀스는 Redis 전체 기능을 배우는 단계가 아닙니다.
- TTL이 없으면 캐시를 영구 저장처럼 오해하기 쉽습니다.

## 직접 말해보기

- 왜 자주 조회되는 데이터에 캐시를 붙이면 좋을까요?
- cache hit와 miss는 각각 어떤 상황인가요?
- DB와 캐시는 역할이 어떻게 다른가요?
- TTL이 없으면 어떤 오해나 문제가 생길 수 있나요?

## 복습 체크리스트

- [ ] DB와 캐시의 차이를 설명할 수 있습니다.
- [ ] cache hit와 miss를 각각 말할 수 있습니다.
- [ ] 캐시에 없으면 DB 조회로 이어진다는 흐름을 설명할 수 있습니다.
- [ ] TTL이 왜 필요한지 설명할 수 있습니다.
- [ ] 이번 실습에서 Redis가 어떤 역할을 맡는지 설명할 수 있습니다.

## 오늘 꼭 기억할 것

이번 시퀀스의 핵심은 Redis 기능을 많이 배우는 것이 아닙니다.
대신 "자주 조회되는 데이터를 더 빠르게 다시 꺼내기 위해 캐시를 어떻게 앞에 두는가"를
가장 단순한 흐름으로 이해하는 것입니다.

## 다음 실습과 연결하기

다음 시퀀스에서 실시간 통신으로 넘어가면,
데이터가 더 자주 오가고 응답 흐름이 더 즉각적으로 느껴져야 하는 순간이 많아집니다.
그래서 이번 캐시 시퀀스는 "속도와 흐름을 어떻게 보조할 것인가"를 생각하기 시작하는 첫 단계입니다.
