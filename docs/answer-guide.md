# 테스트와 검증 정답 가이드

## 정답을 보기 전에 먼저 확인할 것

- `TestFixtureFactory`에서 요청 DTO와 Entity, User를 재사용할 수 있게 준비했는가
- `PostServiceTest`에서 정상 케이스와 예외 케이스를 나눴는가
- `AuthServiceTest`에서 인증 성공과 실패를 각각 검증했는가
- `./gradlew test`가 실제로 통과하는가

## 1. fixture 정답 포인트

- 게시글 요청과 저장 결과 Entity를 빠르게 만들 수 있어야 합니다.
- 로그인 요청과 사용자 fixture를 빠르게 만들 수 있어야 합니다.
- fixture는 복잡한 로직이 아니라 테스트 가독성을 위한 준비 도구에 가깝습니다.

예시 형태:

```kotlin
fun postEntity(
    id: Long = 1L,
    title: String = "테스트 제목",
    content: String = "테스트 내용",
    author: String = "tester"
): PostEntity = PostEntity(
    id = id,
    title = title,
    content = content,
    author = author
)
```

## 2. `PostServiceTest` 정답 포인트

### 정상 케이스

정답 흐름은 아래 순서입니다.

1. `postCreateRequest()`로 요청을 준비합니다.
2. `postEntity(...)`로 저장 결과를 준비합니다.
3. `postRepository.save(...)` mock을 설정합니다.
4. `postService.create(request)`를 호출합니다.
5. `id`, `title`, `content`, `author`를 검증합니다.

예시 핵심:

```kotlin
`when`(postRepository.save(any(PostEntity::class.java))).thenReturn(savedPost)

val result = postService.create(request)

assertEquals(1L, result.id)
assertEquals(request.title, result.title)
```

### 예외 케이스

정답 흐름은 아래 순서입니다.

1. `findById(999L)`가 빈 결과를 돌려주게 합니다.
2. `assertThrows`로 `PostNotFoundException` 발생을 확인합니다.

예시 핵심:

```kotlin
`when`(postRepository.findById(999L)).thenReturn(Optional.empty())

assertThrows(PostNotFoundException::class.java) {
    postService.getById(999L)
}
```

## 3. `AuthServiceTest` 정답 포인트

### 인증 성공 테스트

1. `loginRequest()`를 준비합니다.
2. `passwordEncoder.encode(...)`로 저장된 사용자 비밀번호를 만듭니다.
3. `userRepository.findByEmail(...)`이 사용자를 돌려주게 설정합니다.
4. `authService.login(request)`를 호출합니다.
5. 토큰이 비어 있지 않은지, 토큰 안 email이 기대값과 같은지 확인합니다.

예시 핵심:

```kotlin
val encodedPassword = requireNotNull(passwordEncoder.encode(request.password))
val user = TestFixtureFactory.user(email = request.email, password = encodedPassword)
`when`(userRepository.findByEmail(request.email)).thenReturn(Optional.of(user))

val result = authService.login(request)

assertFalse(result.accessToken.isBlank())
assertEquals(request.email, jwtTokenProvider.getEmail(result.accessToken))
```

### 인증 실패 테스트

1. 저장된 사용자 비밀번호는 정상 비밀번호를 인코딩해서 둡니다.
2. 요청 비밀번호는 다른 값으로 준비합니다.
3. `assertThrows`로 `InvalidCredentialsException` 발생을 확인합니다.

예시 핵심:

```kotlin
val wrongPasswordRequest = TestFixtureFactory.loginRequest(
    email = "tester@example.com",
    password = "wrong-password"
)

assertThrows(InvalidCredentialsException::class.java) {
    authService.login(wrongPasswordRequest)
}
```

## 4. 강사용 빠른 비교 포인트

- fixture는 재사용용 준비 코드인지
- 테스트 이름만 읽어도 무엇을 검증하는지 드러나는지
- 정상/실패 흐름이 각각 한 테스트에 한 동작만 담고 있는지
- `assertEquals`, `assertFalse`, `assertThrows`가 역할에 맞게 쓰였는지

## 5. answer 기준 완성 형태

`06-answer`에서는 아래 세 파일이 완성되어 있습니다.

- `src/test/kotlin/com/andi/rest_crud/support/TestFixtureFactory.kt`
- `src/test/kotlin/com/andi/rest_crud/service/PostServiceTest.kt`
- `src/test/kotlin/com/andi/rest_crud/service/AuthServiceTest.kt`

핵심은 테스트 개수를 늘리는 것이 아니라,
정상 케이스 1개, 예외 케이스 1개, 인증 흐름 2개 정도로
Service 테스트의 감각을 분명하게 잡는 것입니다.
