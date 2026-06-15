# Redis Cache 체크리스트

## 수업 전 확인

- [ ] `07-implementation` 브랜치에서 시작했습니다.
- [ ] `docker compose up -d`로 Redis를 실행했습니다.
- [ ] `./gradlew test`를 실행했습니다.

## 구현 확인

- [ ] cache miss 때 DB를 조회합니다.
- [ ] cache miss 뒤 Redis에 값을 저장합니다.
- [ ] cache hit 때 Redis 값을 반환합니다.
- [ ] 게시글 수정 뒤 관련 cache key를 지웁니다.
- [ ] 게시글 삭제 뒤 관련 cache key를 지웁니다.

## 마무리 확인

- [ ] hit/miss/invalidation 테스트 이름을 읽었습니다.
- [ ] `07-implementation..07-answer` diff를 비교했습니다.
- [ ] Redis 캐시가 원본 저장소가 아니라는 한계를 설명할 수 있습니다.
