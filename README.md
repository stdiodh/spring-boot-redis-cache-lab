# 07 Redis Cache

이 브랜치는 `07-answer` 참고 구현 브랜치입니다.
게시글 단건 조회 앞에 Redis cache-aside 흐름을 붙이고, hit/miss, TTL, stale data를 비교합니다.

## 이 시퀀스에서 다루는 문제

같은 게시글을 반복 조회할 때 매번 DB만 보면 조회 비용이 계속 발생합니다.
Redis 캐시를 앞에 두면 조회 부담을 줄일 수 있지만, 수정 후 오래된 값이 남는 stale data 문제도 함께 고려해야 합니다.

## 학습 목표

- DB와 캐시의 역할 차이를 설명합니다.
- cache hit와 cache miss를 게시글 조회 흐름으로 설명합니다.
- `PostCacheService`와 `PostQueryService`의 책임을 구분합니다.
- TTL과 evict가 해결하는 문제가 어떻게 다른지 비교합니다.
- 조회 캐시가 최신성을 자동으로 보장하지 않는다는 점을 설명합니다.

## 멘티 시작 흐름

starter 브랜치에서 먼저 Redis 연결, 캐시 조회/저장, cache-aside 흐름을 직접 구현합니다.
이 브랜치는 실습 후 hit/miss 코드와 stale data 대응 방향을 비교할 때 사용합니다.

## 읽는 순서

1. [이론 정리](./docs/theory.md)
2. [구현 가이드](./docs/implementation.md)
3. [체크리스트](./docs/checklist.md)
4. [참고 구현 가이드](./docs/answer-guide.md)
5. [제공 자료 안내](./docs/assets.md)

## 실행 / 테스트 방법

```bash
docker compose up -d
./gradlew test
./gradlew bootRun
```

Swagger에서 게시글을 생성한 뒤 같은 단건 조회를 두 번 실행합니다.

```text
GET /posts/{id}
```

## 완료 기준

- 테스트가 통과합니다.
- 첫 조회와 두 번째 조회의 hit/miss 차이를 설명합니다.
- TTL이 자동 만료 장치이고 evict가 수정/삭제 직후 정리 장치라는 점을 설명합니다.
- 캐시가 DB를 대체하지 않는다는 점을 설명합니다.

<details>
<summary>멘토용 진행 포인트</summary>

## 수업 전 확인

- MySQL과 Redis 실행 환경을 확인합니다.
- answer 브랜치 코드는 starter 실습 후 비교 기준으로 사용합니다.

## 수업 중 질문

- miss가 왜 실패가 아닌 정상 흐름인지 질문합니다.
- 같은 게시글을 두 번 조회했을 때 어떤 로그가 달라지는지 확인하게 합니다.
- 수정 직후 캐시를 지우지 않으면 어떤 응답이 나갈 수 있는지 묻습니다.

## 리뷰 기준

- `PostCacheService`가 key, JSON 변환, TTL 책임을 모으는지 확인합니다.
- `PostQueryService`가 cache-aside 흐름을 짧게 드러내는지 확인합니다.
- stale data와 evict 필요성을 설명하는지 확인합니다.

</details>
