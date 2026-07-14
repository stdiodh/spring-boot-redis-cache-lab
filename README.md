# Spring Boot Redis Cache Lab

이 레포는 A&I 백엔드 커리큘럼의 `07. 캐시와 Redis` 시퀀스를 담는 토픽 레포입니다.
`main`은 가이드 브랜치이고, 학생 실습은 `07-implementation`에서 시작합니다.

## 이 레포에서 배우는 것

- 같은 게시글을 반복 조회할 때 DB를 계속 읽는 문제
- Redis 기반 cache-aside 조회 캐시
- cache miss, cache hit, TTL 흐름과 쓰기 성공 후 evict
- TTL로 오래된 캐시를 제한하는 방식
- 캐시가 영구 저장소가 아니라는 한계

## 시작 방법

```bash
git clone https://github.com/stdiodh/spring-boot-redis-cache-lab.git
cd spring-boot-redis-cache-lab
git checkout 07-implementation
```

## 실습 브랜치

| 용도 | 브랜치 |
| --- | --- |
| 가이드 | `main` |
| 학생 시작 | `07-implementation` |
| 참고 정답 | `07-answer` |

## 실행 방법

```bash
docker compose up -d
./gradlew bootRun
```

Swagger UI 기본 경로:

```text
http://localhost:8080/swagger
```

## 테스트 방법

```bash
./gradlew test
```

테스트가 확인하는 것:

- cache miss 시 DB를 조회하고 Redis에 저장하는지 확인합니다.
- cache hit 시 캐시 값을 반환하는지 확인합니다.
- 현재 답안은 cache hit/miss, TTL 저장, 수정/삭제 성공 후 evict를 확인합니다.
- `PostControllerCacheInvalidationTest`는 DB 쓰기 뒤 해당 key가 제거되는지 검증합니다.

실패하면 먼저 볼 것:

- 캐시 key가 저장/조회/삭제에서 같은 규칙을 쓰는지 확인합니다.
- DB 조회 횟수나 로그로 hit/miss 판단 기준이 분명한지 봅니다.

완료 기준:

- cache miss, cache hit, 수정/삭제 후 evict 테스트가 통과합니다.
- TTL과 즉시 evict가 해결하는 시점의 차이를 설명할 수 있습니다.

## 정답과 비교하는 방법

실습 중 막혔거나 완료 후 확인이 필요할 때만 참고 정답 브랜치와 비교합니다.

```bash
git fetch origin
git diff 07-implementation..07-answer
```

## Visual Lab

`main` 가이드 브랜치에는 Redis cache-aside 흐름을 훑어보는 Visual Lab 진입점이 있습니다.
이 페이지는 정답 비교 페이지가 아니라 cache hit, cache miss, invalidation 흐름을 먼저 이해하기 위한 정적 학습 화면입니다.

```text
docs/visual-lab/index.html
```

## 문서 안내

- [이론 정리](./docs/theory.md)
- [구현 안내](./docs/implementation.md)
- [체크리스트](./docs/checklist.md)
- [Visual Lab](./docs/visual-lab/index.html)
