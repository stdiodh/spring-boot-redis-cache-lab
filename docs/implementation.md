# 캐시와 Redis 구현 안내

## 이 도메인이 필요한 이유

지금까지는 저장과 검증, 인증, 테스트까지 흐름을 만들었습니다.
다음으로는 같은 데이터를 자주 조회할 때
매번 DB만 보는 구조가 어떤 한계를 가질 수 있는지 생각해볼 차례입니다.

그래서 이번 실습은 기존 게시글 조회 앞에 Redis 캐시를 얹어 보면서,
가장 단순한 cache-aside 흐름을 손으로 직접 연결하는 단계입니다.

## 오늘 학생이 완성할 최종 흐름

1. `GET /posts/{id}` 요청이 들어옵니다.
2. `PostQueryService`가 먼저 Redis를 조회합니다.
3. 캐시에 값이 있으면 바로 응답합니다.
4. 캐시에 값이 없으면 DB에서 게시글을 조회합니다.
5. 조회 결과를 Redis에 저장합니다.
6. TTL이 지나면 다시 miss가 일어날 수 있음을 이해합니다.

## 학생이 직접 구현할 순서

1. `RedisConfig.kt`에서 Redis 템플릿 Bean을 확인합니다.
2. `PostCacheService.kt`에서 캐시 조회 메서드를 완성합니다.
3. 같은 파일에서 캐시 저장 메서드와 TTL 연결을 완성합니다.
4. `PostQueryService.kt`에서 miss -> DB 조회 -> 캐시 저장 흐름을 완성합니다.
5. `GET /posts/{id}`를 두 번 호출하며 hit/miss 차이를 확인합니다.

## TODO를 넣을 파일

- `src/main/kotlin/com/andi/rest_crud/config/RedisConfig.kt`
- `src/main/kotlin/com/andi/rest_crud/service/PostCacheService.kt`
- `src/main/kotlin/com/andi/rest_crud/service/PostQueryService.kt`

핵심 TODO는 `RedisConfig.kt`, `PostCacheService.kt`에 집중되어 있고,
조회 흐름 연결은 `PostQueryService.kt`에서 마무리합니다.

## 각 파일의 역할

### `RedisConfig.kt`

- Spring과 Redis를 연결하는 `StringRedisTemplate` Bean을 준비하는 곳입니다.
- 이번 시퀀스에서는 가장 단순한 문자열 캐시만 다룹니다.

### `PostCacheService.kt`

- Redis에서 게시글 캐시를 읽고 쓰는 역할을 맡습니다.
- key, TTL, 문자열 변환 흐름이 여기서 보입니다.

### `PostQueryService.kt`

- 먼저 캐시를 보고, miss면 DB를 보는 cache-aside 흐름을 모읍니다.
- 이번 시퀀스에서 hit/miss가 가장 잘 보이는 파일입니다.

## 단계별 구현 안내

### 1. Redis 템플릿 준비 확인

`RedisConfig.kt`에서 `StringRedisTemplate` Bean을 먼저 봅니다.
이번 실습은 Redis 자료구조를 깊게 다루지 않으므로,
문자열 기반 캐시만 써도 흐름을 충분히 이해할 수 있습니다.

### 2. 캐시 조회 메서드 완성

`PostCacheService.kt`의 `get(postId)`에서 아래 순서로 구현합니다.

1. `key(postId)`로 캐시 키를 만듭니다.
2. `opsForValue().get(...)`로 문자열 값을 조회합니다.
3. 값이 있으면 `PostResponse`로 되돌립니다.
4. 값이 없으면 `null`을 반환합니다.

여기서 중요한 점은 miss를 실패로 처리하지 않는 것입니다.

### 3. 캐시 저장 메서드와 TTL 연결

같은 파일의 `set(postId, response)`에서는 아래 순서로 구현합니다.

1. `PostResponse`를 문자열로 바꿉니다.
2. `opsForValue().set(...)`으로 Redis에 저장합니다.
3. `ttl()`을 함께 넣어 만료 시간을 연결합니다.

### 4. 조회 흐름에 cache-aside 연결

`PostQueryService.kt`에서는 아래 순서만 지키면 됩니다.

1. 먼저 `postCacheService.get(id)`를 호출합니다.
2. 값이 있으면 바로 반환합니다.
3. 값이 없으면 `postService.getById(id)`로 DB 조회를 합니다.
4. 조회 결과를 `postCacheService.set(id, response)`로 저장합니다.
5. 마지막에 응답을 반환합니다.

### 5. hit/miss 차이 확인

앱을 실행한 뒤 게시글을 하나 만든 다음,
같은 `GET /posts/{id}` 요청을 두 번 보내보면 됩니다.

1. 첫 번째 요청은 보통 miss -> DB 조회 -> 캐시 저장 흐름입니다.
2. 두 번째 요청은 hit -> 바로 응답 흐름입니다.

## 미리 제공할 것

- `06-answer` 기준 게시글 CRUD와 인증 관련 코드
- Redis 의존성 추가 자리
- Redis host/port와 TTL 설정 자리
- MySQL + Redis `compose.yaml`
- `PostController`와 `PostService` 기본 구조

## 실행 확인 방법

1. 먼저 MySQL과 Redis를 띄웁니다.

```bash
docker compose up -d
```

2. 애플리케이션을 실행합니다.

```bash
./gradlew bootRun
```

3. Swagger에서 게시글을 하나 생성합니다.
4. 같은 `GET /posts/{id}` 요청을 두 번 호출합니다.
5. 로그와 Redis 데이터를 보며 hit/miss 흐름을 확인합니다.

테스트는 아래처럼 실행합니다.

```bash
./gradlew test
```

## 학생 체크 질문

- miss가 왜 실패가 아니라 정상 흐름인가요?
- 캐시를 먼저 보고 DB를 나중에 보는 이유는 무엇인가요?
- TTL이 없으면 캐시를 어떻게 오해하기 쉬울까요?
- 이번 코드에서 hit가 일어나는 지점은 어디인가요?

## 강사 / PPT 체크 포인트

- DB와 캐시 역할 차이를 그림으로 보여줄 수 있는가
- hit와 miss를 같은 슬라이드에서 비교할 수 있는가
- TTL을 왜 넣는지 한 문장으로 설명할 준비가 되어 있는가
- `PostQueryService` 한 파일로 cache-aside 흐름을 시연할 수 있는가

## 다음 도메인 연결 포인트

다음 시퀀스에서 실시간 통신으로 가면,
사용자는 더 빠른 반응과 더 즉각적인 흐름을 기대하게 됩니다.
이번 실습은 그런 흐름 앞에서 "조회 부담을 어떻게 줄일 것인가"를 생각하는 시작점입니다.
