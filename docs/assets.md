# 캐시와 Redis 제공 자료 안내

## 미리 제공하는 것

- `06-answer` 기준 CRUD, Validation, JWT, OAuth2, SMTP 계정 복구 코드
- Redis 의존성 추가 자리
- Redis host/port, TTL 설정 자리
- MySQL + Redis 실행용 `compose.yaml`
- `PostController`와 `PostService` 기본 구조
- Swagger와 테스트 실행 환경
- 캐시 무효화 전략을 설명할 문서 구조

## 왜 미리 제공하는가

- 이번 시퀀스의 핵심은 기존 조회 흐름 위에 캐시 레이어를 얹는 것입니다.
- Redis 설치나 복잡한 설정 설명보다 cache-aside 흐름 자체를 손으로 연결하는 편이 학습 효과가 큽니다.
- 학생이 hit/miss와 TTL에 집중할 수 있게 실행 환경은 미리 맞춰둡니다.
- 조회 캐시 자체는 단순하게 유지하고, stale data와 evict는 문서에서 함께 이해하게 만듭니다.

## 학생이 직접 작성하는 것

- Redis 템플릿 Bean 흐름 확인
- 캐시 조회 메서드 완성
- 캐시 저장 메서드와 TTL 연결
- miss -> DB 조회 -> 캐시 저장 흐름 연결
- 같은 요청을 두 번 보내며 hit/miss 확인
- 캐시 무효화 전략 설명 읽기

## 이번 시퀀스에서 직접 작성하지 않는 범위

- pub/sub
- stream
- distributed lock
- 세션 저장
- 토큰 블랙리스트
- 복잡한 캐시 무효화 전략
