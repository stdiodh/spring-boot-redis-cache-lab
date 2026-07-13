# 체크리스트

## 1. 기능 확인

- [ ] `./gradlew test`가 통과합니다.
- [ ] `docker compose up -d`로 MySQL과 Redis를 실행할 수 있습니다.
- [ ] 같은 `GET /posts/{id}` 요청을 두 번 호출해 hit/miss 차이를 확인합니다.
- [ ] TTL이 지난 뒤 다시 miss가 일어날 수 있음을 설명합니다.

## 2. 코드 구조 확인

- [ ] `RedisConfig`는 Redis 템플릿 연결을 담당합니다.
- [ ] `PostCacheService`는 key, JSON 변환, TTL 책임을 담당합니다.
- [ ] `PostQueryService`는 cache-aside 흐름을 담당합니다.
- [ ] 기존 `PostService`는 DB 기준 조회 책임을 유지합니다.

## 3. 실패 케이스 확인

- [ ] Redis에 값이 없을 때 예외가 아니라 miss로 처리합니다.
- [ ] 캐시 값이 파싱되지 않을 때 어떤 위험이 있는지 설명합니다.
- [ ] 게시글 수정/삭제 성공 후 해당 캐시가 제거되는지 확인합니다.

## 4. 설명할 수 있어야 하는 것

- [ ] DB와 캐시의 차이
- [ ] cache hit와 cache miss의 차이
- [ ] TTL과 즉시 실행하는 evict의 차이
- [ ] Cache-aside 흐름
- [ ] 조회 속도와 최신성의 균형

## 5. 남은 한계와 다음 시퀀스 연결

이번 시퀀스는 Redis 조회 캐시 입문만 다룹니다.
pub/sub, stream, distributed lock, 세션 저장, 토큰 블랙리스트는 다루지 않습니다.

<details>
<summary>멘토용 리뷰 기준</summary>

- 통과 기준: 멘티가 게시글 조회 흐름에서 hit, miss, TTL, stale data를 설명합니다.
- 보완 필요 기준: 캐시를 DB 대체 저장소처럼 설명하거나 TTL이 최신성을 완전히 보장한다고 이해하면 다시 짚습니다.
- 질문 예시: "수정 직후 캐시를 지우지 않으면 DB와 Redis 중 어떤 값이 응답될 수 있나요?"
- answer 브랜치 비교 포인트: `RedisConfig`, `PostCacheService`, `PostQueryService`, `PostController`를 비교합니다.

</details>
