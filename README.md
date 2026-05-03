# Spring Boot Redis Cache Lab

Redis를 이용해 가장 단순한 조회 캐시 흐름을 붙여보는 실습 레포입니다.

## 이 시퀀스에서 무엇을 배우나요

이번 실습은 `06-answer`까지 만든 조회 흐름 위에
Redis 기반 cache-aside 패턴을 붙이는 단계입니다.

이번 레포에서는 아래 흐름에 집중합니다.

1. 먼저 캐시를 조회합니다.
2. 캐시에 없으면 DB를 조회합니다.
3. DB 조회 결과를 캐시에 저장합니다.
4. 다음 조회에서 cache hit가 일어나는지 확인합니다.
5. TTL로 캐시가 영구 저장소가 아니라는 점을 이해합니다.
6. 수정 후 캐시를 지우지 않으면 왜 예전 값이 남을 수 있는지 이해합니다.

## 브랜치 사용 방법

- `main`: 이 레포의 주제, 문서, 브랜치 구조를 안내하는 대표 브랜치
- `07-implementation`: 학생 실습용 starter 브랜치
- `07-answer`: 비교용 정답 브랜치

학생은 반드시 `07-implementation`에서 시작합니다.

```bash
git clone -b 07-implementation https://github.com/stdiodh/spring-boot-redis-cache-lab.git
cd spring-boot-redis-cache-lab
git checkout -b feat/<이름>
```

정답 비교가 필요할 때는 아래 흐름을 사용합니다.

```bash
git fetch origin
git diff origin/07-implementation..origin/07-answer
```

## 문서 안내

- [이론 문서](./docs/theory.md)
- [구현 안내](./docs/implementation.md)
- [정답 가이드](./docs/answer-guide.md)
- [체크리스트](./docs/checklist.md)
- [제공 자료 안내](./docs/assets.md)

## 파일을 어떻게 보면 좋나요

1. `docs/theory.md`에서 왜 DB 앞에 캐시를 두는지와 왜 stale data가 생길 수 있는지 읽습니다.
2. `docs/implementation.md`에서 오늘 손으로 칠 순서를 확인합니다.
3. 아래 핵심 파일을 순서대로 엽니다.

- `src/main/kotlin/com/andi/rest_crud/config/RedisConfig.kt`
- `src/main/kotlin/com/andi/rest_crud/service/PostCacheService.kt`
- `src/main/kotlin/com/andi/rest_crud/service/PostQueryService.kt`
- `src/main/kotlin/com/andi/rest_crud/controller/PostController.kt`

`07-implementation`에서는 TODO를 채우며 실습하고,
완료 후에는 `07-answer`나 `docs/answer-guide.md`로 비교하면 됩니다.

## 미리 제공되는 것

- `06-answer` 기준 CRUD, Validation, JWT, OAuth2, SMTP 계정 복구 코드
- Redis 의존성 설정
- MySQL + Redis 실행용 `compose.yaml`
- Redis host/port, TTL 설정 자리
- `PostController`와 `PostService` 기본 조회 구조

학생은 캐시 조회와 저장의 핵심 흐름만 직접 구현합니다.
실무 확장 개념으로는 `캐시 무효화 전략`을 문서에서 함께 이해합니다.

## 실행 방법

먼저 MySQL과 Redis를 준비합니다.

```bash
docker compose up -d
```

애플리케이션 실행:

```bash
./gradlew bootRun
```

Swagger UI:

```text
http://localhost:8080/swagger
```

테스트 실행:

```bash
./gradlew test
```

## 이번 실습에서 직접 구현할 범위

- Redis 연결용 `StringRedisTemplate` Bean 확인
- `postId` 기준 캐시 조회
- cache miss 시 DB 조회 연결
- DB 조회 결과 캐시 저장
- TTL 설정
- 같은 조회를 두 번 호출하며 hit/miss 차이 확인
- 왜 TTL만으로는 충분하지 않을 수 있는지 이해

이번 시퀀스에서는 pub/sub, stream, distributed lock, 세션 저장, 토큰 블랙리스트, 복잡한 캐시 무효화 전략까지 확장하지 않습니다.
