# Spring Boot Redis Cache Lab

이 레포는 A&I 백엔드 커리큘럼 중
`07. 캐시와 Redis` 시퀀스를 담는 토픽 레포입니다.

`main` 브랜치는 학생이 바로 실습하는 브랜치가 아니라,
이 레포가 어떤 주제를 담고 있고 어떤 브랜치에서 수업을 진행해야 하는지 안내하는 대표 브랜치입니다.

## 이 레포가 다루는 내용

- `07`: Redis 기반 cache-aside 조회 캐시
- DB와 캐시의 역할 차이
- cache hit / miss 흐름
- TTL과 캐시 만료 감각

즉 이 레포는 "기존 DB 조회 흐름 위에 캐시를 어떻게 얹는가"를
가장 단순한 입문 수준으로 다루는 실습 레포입니다.

## 브랜치 사용 방법

- `main`: 레포 소개와 브랜치 안내
- `07-implementation`, `07-answer`

학생은 항상 `07-implementation`에서 시작하고,
강사는 `07-answer`에서 비교합니다.

예:

```bash
git clone -b 07-implementation https://github.com/stdiodh/spring-boot-redis-cache-lab.git
cd spring-boot-redis-cache-lab
```

## 문서 안내

- [레포 가이드](./docs/repo-guide.md)
- [브랜치 가이드](./docs/branch-guide.md)
- [시퀀스 맵](./docs/sequence-map.md)

각 시퀀스의 실제 실습 문서는 해당 브랜치 안에서 확인합니다.

예:
- `07-implementation`의 `docs/theory.md`, `docs/implementation.md`
- `07-answer`의 `docs/answer-guide.md`

## 실행 기준

- 앱 런타임 DB: MySQL
- 캐시 저장소: Redis
- 테스트 DB: H2 in-memory
- Swagger UI 기본 경로: `http://localhost:8080/swagger`

MySQL과 Redis가 필요할 때는 각 시퀀스 브랜치의 `compose.yaml`을 사용합니다.

## 현재 정리 상태

| Sequence | Starter | Answer | Status |
| --- | --- | --- | --- |
| 07 | `07-implementation` | `07-answer` | Ready |

## 이 레포를 어떻게 보면 좋나요

1. 먼저 `main`에서 이 README와 `docs/branch-guide.md`를 읽습니다.
2. `07-implementation` 브랜치로 이동합니다.
3. 그 브랜치의 `README.md`, `docs/theory.md`, `docs/implementation.md` 순서로 봅니다.
4. 실습 후 `07-answer` 브랜치와 비교합니다.

## 운영 메모

- 이 레포는 `spring-boot-db-access-lab`의 `06-answer` 다음 단계에서 분리된 새 토픽 레포입니다.
- 이 레포의 `main` 브랜치는 실습 완료본이 아니라 안내 브랜치입니다.
- 시퀀스 문서는 각 브랜치 안에서 계속 바뀌어야 하며, 이전 시퀀스 문서를 그대로 재사용하면 안 됩니다.
