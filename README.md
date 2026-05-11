# Spring Boot Redis Cache Lab

이 레포는 A&I 백엔드 커리큘럼의 `07. 캐시와 Redis` 시퀀스를 담는 토픽 레포입니다.
`main`은 가이드 브랜치이고, 학생 실습은 `07-implementation`에서 시작합니다.

## 이 레포에서 배우는 것

- Redis 기반 cache-aside 조회 캐시
- DB와 캐시의 역할 차이
- cache hit / miss 흐름
- TTL과 캐시 만료 감각
- stale data와 캐시 무효화 전략 입문

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
- 데이터 수정 또는 삭제 후 cache invalidation이 일어나는지 확인합니다.

실패하면 먼저 볼 것:

- 캐시 key가 저장/조회/삭제에서 같은 규칙을 쓰는지 확인합니다.
- DB 조회 횟수나 로그로 hit/miss 판단 기준이 분명한지 봅니다.

완료 기준:

- cache miss, cache hit, invalidation 테스트가 통과합니다.

## 정답과 비교하는 방법

실습 중 막혔거나 완료 후 확인이 필요할 때만 참고 정답 브랜치와 비교합니다.

```bash
git fetch origin
git diff 07-implementation..07-answer
```

## Visual Lab

현재 `main` 가이드 브랜치에는 Visual Lab 진입점이 없습니다.
Visual Lab을 구현할 경우 이 레포의 아래 위치를 사용합니다.

```text
docs/visual-lab/index.html
```

## 문서 안내

- [레포 가이드](./docs/repo-guide.md)
- [브랜치 가이드](./docs/branch-guide.md)
- [시퀀스 맵](./docs/sequence-map.md)
