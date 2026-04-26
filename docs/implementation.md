# 테스트와 검증 구현 안내

## 이 도메인이 필요한 이유

05 시퀀스까지 오면 기능은 이미 꽤 많아져 있습니다.
이제 중요한 것은 새 기능을 더 붙이는 것만이 아니라,
기존 기능이 계속 맞게 동작하는지 확인할 수 있는 기준을 갖는 것입니다.

그래서 이번 실습은 Service 단위 테스트를 손으로 직접 작성하면서,
테스트가 기능 확인 도구이자 회귀 방지 장치라는 점을 익히는 단계입니다.

## 오늘 학생이 완성할 최종 흐름

1. fixture로 테스트 입력값을 준비합니다.
2. mock으로 Service 의존성을 원하는 상황으로 만듭니다.
3. `PostService` 정상 케이스 테스트를 작성합니다.
4. `PostService` 예외 케이스 테스트를 작성합니다.
5. `AuthService` 인증 성공 테스트를 작성합니다.
6. `AuthService` 인증 실패 테스트를 작성합니다.
7. 테스트를 다시 실행하며 결과를 확인합니다.

## 학생이 직접 구현할 순서

1. `TestFixtureFactory.kt`를 열고 어떤 데이터를 재사용할지 확인합니다.
2. `PostServiceTest.kt`에서 게시글 생성 정상 테스트를 완성합니다.
3. 같은 파일에서 없는 게시글 조회 예외 테스트를 완성합니다.
4. `AuthServiceTest.kt`에서 로그인 성공 테스트를 완성합니다.
5. 같은 파일에서 로그인 실패 테스트를 완성합니다.
6. `./gradlew test`로 결과를 확인합니다.

## TODO를 넣을 파일

- `src/test/kotlin/com/andi/rest_crud/support/TestFixtureFactory.kt`
- `src/test/kotlin/com/andi/rest_crud/service/PostServiceTest.kt`
- `src/test/kotlin/com/andi/rest_crud/service/AuthServiceTest.kt`

## 각 파일의 역할

### `TestFixtureFactory.kt`

- 반복해서 쓸 요청 DTO와 Entity, User를 준비하는 곳입니다.
- 테스트 본문이 fixture 생성 코드로 너무 길어지지 않게 도와줍니다.

### `PostServiceTest.kt`

- CRUD 중 가장 익숙한 `create`, `getById` 흐름을 테스트합니다.
- 정상 케이스와 예외 케이스를 비교해보기 좋습니다.

### `AuthServiceTest.kt`

- 인증 성공과 인증 실패를 테스트합니다.
- Service 테스트가 단순 CRUD를 넘어서 인증 흐름까지 확장될 수 있다는 점을 보여줍니다.

## 단계별 구현 안내

### 1. fixture 흐름 먼저 읽기

`TestFixtureFactory.kt`에서 어떤 값이 기본으로 준비되는지 먼저 읽습니다.
이번 실습에서는 테스트 본문에서 모든 값을 다 만들지 않고,
fixture로 입력값을 빠르게 준비하는 방식에 익숙해지는 것이 중요합니다.

### 2. 게시글 생성 정상 테스트 작성

`PostServiceTest.kt`의 첫 번째 테스트에서 아래 순서만 지키면 됩니다.

1. given: 요청 DTO와 저장 결과 Entity를 준비합니다.
2. given: `postRepository.save(...)`가 저장 결과를 돌려주게 mock을 설정합니다.
3. when: `postService.create(request)`를 호출합니다.
4. then: id, title, content, author가 기대값과 같은지 검증합니다.

### 3. 게시글 조회 예외 테스트 작성

두 번째 테스트에서는 실패 상황을 만들어봅니다.

1. given: `postRepository.findById(...)`가 빈 결과를 돌려주게 설정합니다.
2. when/then: `assertThrows`로 `PostNotFoundException` 발생을 검증합니다.

### 4. 로그인 성공 테스트 작성

`AuthServiceTest.kt`의 첫 번째 테스트에서 아래 순서로 작성합니다.

1. given: `loginRequest`를 준비합니다.
2. given: 비밀번호를 인코딩한 `user` fixture를 준비합니다.
3. given: `userRepository.findByEmail(...)`이 사용자를 돌려주게 설정합니다.
4. when: `authService.login(request)`를 호출합니다.
5. then: 토큰이 비어 있지 않은지, 토큰 안 email이 기대값과 같은지 확인합니다.

### 5. 로그인 실패 테스트 작성

두 번째 테스트에서는 잘못된 비밀번호 상황을 만듭니다.

1. given: 저장된 사용자와 잘못된 비밀번호 요청을 준비합니다.
2. given: repository는 사용자를 찾지만, 요청 비밀번호는 다르게 둡니다.
3. when/then: `assertThrows`로 `InvalidCredentialsException` 발생을 확인합니다.

## 미리 제공할 것

- `05-answer` 기준 서비스 코드
- Spring Boot Test와 Mockito 의존성
- `PasswordEncoder`, `JwtTokenProvider` 사용 가능한 테스트 환경
- 기본 fixture 메서드 이름
- 테스트 클래스 기본 구조와 패키지 구조

## 실행 확인 방법

```bash
./gradlew test
```

실패하면 given, mock 설정, 기대값을 다시 확인한 뒤 다시 실행합니다.

## 학생 체크 질문

- 지금 작성한 테스트는 어떤 Service 동작을 검증하나요?
- 정상 케이스와 실패 케이스는 무엇이 다르게 준비되나요?
- fixture를 안 쓰면 테스트가 어떻게 더 복잡해질까요?
- 이 테스트가 있으면 다음 변경 때 어떤 점이 더 안심되나요?

## 강사 / PPT 체크 포인트

- given -> when -> then 흐름이 슬라이드나 판서로 보이는가
- `assertEquals`와 `assertThrows`를 각각 어디서 보여줄지 정했는가
- mock을 왜 쓰는지 한 문장으로 설명할 준비가 되었는가
- "테스트는 이미 만든 기능을 다시 믿게 해주는 도구"라는 메시지가 분명한가

## 다음 도메인 연결 포인트

다음 시퀀스에서 캐시나 성능 최적화가 들어오면,
변경 전후를 빠르게 검증하는 습관이 더 중요해집니다.
이번 실습은 그 다음 확장을 위한 기본 안전장치를 만드는 단계입니다.
