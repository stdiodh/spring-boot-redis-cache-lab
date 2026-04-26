# 테스트와 검증 제공 자료 안내

## 미리 제공하는 것

- `05-answer` 기준 CRUD, Validation, JWT, OAuth2, SMTP 계정 복구 코드
- `spring-boot-starter-test` 기반 테스트 환경
- Mockito 사용 환경
- `PasswordConfig`, `JwtTokenProvider`를 활용할 수 있는 테스트 기본 구조
- 테스트 패키지와 클래스 뼈대
- MySQL 런타임 설정과 H2 테스트 설정

## 왜 미리 제공하는가

- 이번 시퀀스의 핵심은 새로운 기능 구현이 아니라 테스트 흐름 이해이기 때문입니다.
- 긴 설정 파일보다 fixture, mock, assert 흐름을 직접 작성하는 데 시간을 쓰는 편이 더 학습 효과가 큽니다.
- 학생이 서비스 로직 검증에 집중할 수 있게 테스트 환경은 미리 준비해둡니다.

## 학생이 직접 작성하는 것

- fixture를 테스트 흐름에 맞게 읽고 활용하기
- `PostService` 정상 케이스 테스트
- `PostService` 예외 케이스 테스트
- `AuthService` 인증 성공 테스트
- `AuthService` 인증 실패 테스트
- TODO를 완성한 뒤 테스트 재실행

## 이번 시퀀스에서 직접 작성하지 않는 범위

- controller 테스트
- repository 테스트
- 통합 테스트
- e2e 테스트
- TDD 이론 심화
