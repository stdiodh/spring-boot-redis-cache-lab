window.visualLabData = {
  "kind": "sequence",
  "sequence": "07",
  "title": "Redis Cache",
  "subtitle": "Cache state lifecycle",
  "goal": "MySQL 원본과 Redis 파생 복사본을 구분하고, 입력 조건만 보고 다음 조회·무효화 경로를 예측합니다.",
  "problem": "같은 게시글을 자주 읽을 때 매번 DB까지 내려가면 같은 원본 조회 비용을 반복합니다.",
  "repo": {
    "name": "spring-boot-redis-cache-lab",
    "path": "spring-boot-redis-cache-lab"
  },
  "workbench": {
    "kind": "cache",
    "title": "캐시가 채워지고 비워지는 과정",
    "instruction": "캐시의 초기 조건을 읽고 DB 조회, Redis 반환, TTL 만료, 쓰기 후 삭제 중 어느 경로가 이어질지 먼저 예측하세요.",
    "story": {
      "invariant": "MySQL은 원본을 보관하고 Redis는 조회 결과의 파생 복사본만 잠시 보관합니다.",
      "scope": "이 화면은 문서에 정의된 목표 경로를 설명합니다. 단위 테스트의 mock 호출, 실제 Redis key·TTL, 애플리케이션 로그는 서로 다른 증거입니다. Redis 장애 fallback은 현재 구현 범위가 아닙니다."
    },
    "terms": [
      {
        "term": "원본 · source of truth",
        "meaning": "수정과 삭제의 기준이 되는 MySQL 데이터입니다. Redis 값이 없어져도 원본 책임은 DB에 남습니다."
      },
      {
        "term": "파생 복사본 · cache entry",
        "meaning": "post:{id} key에 직렬화되어 저장되는 PostResponse 복사본입니다. 원본과 자동으로 동기화되지 않습니다."
      },
      {
        "term": "TTL",
        "meaning": "entry가 Redis에 남을 수 있는 시간입니다. 만료는 자동 새로고침이 아니며 다음 조회가 다시 채웁니다."
      },
      {
        "term": "MISS와 장애",
        "meaning": "MISS는 정상 응답으로 key가 없다는 뜻입니다. Redis 연결 오류는 별도 장애 정책이 필요한 다른 사건입니다."
      }
    ],
    "visual": {
      "src": "../../assets/diagrams/07-cache-state-cycle.svg",
      "alt": "MySQL 원본과 Redis 파생 복사본 사이에서 EMPTY, WARM, EXPIRED, EVICTED, REFILL 상태가 바뀌는 캐시 수명주기. WARM에서는 DB를 건너뛰고, EXPIRED 또는 EVICTED 뒤 다음 조회는 MySQL을 읽어 Redis에 TTL과 함께 다시 저장한다.",
      "caption": "캐시의 핵심은 속도 수치가 아니라 어떤 조건에서 원본을 읽고, 언제 파생 복사본을 버리며, 다음 요청이 무엇을 다시 채우는지 설명하는 것입니다."
    },
    "comparison": {
      "label": "원본과 파생 복사본의 책임은 바뀌지 않습니다",
      "left": {
        "title": "MySQL · 원본",
        "body": "게시글 수정·삭제의 기준입니다. cache miss 또는 만료 뒤 다시 읽는 데이터이며 Redis entry와 수명이 다릅니다."
      },
      "right": {
        "title": "Redis · 파생 복사본",
        "body": "반복 조회를 줄이기 위한 직렬화 응답입니다. TTL이 지나거나 쓰기 성공 뒤 evict되며 스스로 원본을 갱신하지 않습니다."
      }
    },
    "nodes": {
      "client": {
        "label": "Client",
        "icon": "client",
        "kind": "HTTP client",
        "role": "게시글 단건 조회 또는 수정 요청을 보냅니다.",
        "systemLayer": "outside",
        "boundary": "Client"
      },
      "postController": {
        "label": "PostController",
        "icon": "api",
        "kind": "request handler",
        "role": "HTTP 요청을 조회·쓰기 책임으로 전달합니다.",
        "systemLayer": "interface",
        "boundary": "Web",
        "codePointIds": ["controller-write-boundary"]
      },
      "postQueryService": {
        "label": "조회 정책",
        "icon": "service",
        "kind": "cache-aside policy",
        "role": "캐시를 먼저 확인하고 값이 없을 때만 원본 조회를 선택합니다.",
        "systemLayer": "application",
        "boundary": "Application"
      },
      "postCacheService": {
        "label": "캐시 어댑터",
        "icon": "cache",
        "kind": "cache adapter",
        "role": "post:{id} key, JSON 변환, TTL, get·set·evict 책임을 가집니다.",
        "systemLayer": "resource",
        "boundary": "Cache"
      },
      "redis": {
        "label": "Redis",
        "icon": "cache",
        "kind": "derived store",
        "role": "PostResponse의 직렬화 복사본을 TTL 동안 저장합니다.",
        "systemLayer": "resource",
        "boundary": "Derived data"
      },
      "postService": {
        "label": "PostService",
        "icon": "service",
        "kind": "source service",
        "role": "Repository를 통해 DB 원본 게시글을 읽고 수정합니다.",
        "systemLayer": "application",
        "boundary": "Domain",
        "codePointIds": ["source-read-boundary"]
      },
      "mysql": {
        "label": "MySQL",
        "icon": "database",
        "kind": "persistent store",
        "role": "게시글의 원본 row를 보관합니다.",
        "systemLayer": "resource",
        "boundary": "Source of truth"
      }
    },
    "scenarios": [
      {
        "id": "key-absent",
        "label": "post:1 key 없음",
        "flowId": "lookup-flow",
        "tone": "signal",
        "prompt": "같은 id를 처음 조회하지만 Redis에는 post:1 entry가 없습니다.",
        "observationTitle": "원본 조회 뒤 파생 복사본을 준비하는 경로",
        "theoryRef": "../../../theory.md#seq-07",
        "prediction": {
          "prompt": "Redis가 정상 응답했지만 post:1 key가 없다면 다음 경로는 무엇일까요?",
          "options": [
            { "id": "source-refill", "label": "MySQL 원본을 읽고 post:1을 TTL과 함께 저장한다" },
            { "id": "empty-response", "label": "빈 응답을 바로 반환하고 DB는 읽지 않는다" },
            { "id": "outage-fallback", "label": "Redis 장애로 간주하고 장애 fallback을 실행한다" }
          ],
          "answer": "source-refill",
          "explanation": "정상적인 key 부재는 cache miss입니다. 오류가 아니라 cache-aside의 원본 조회 분기입니다."
        },
        "diagram": {
          "caption": "PostCacheService가 Redis의 key 부재를 조회 정책에 반환하면, 조회 정책은 PostService의 MySQL 결과를 받은 뒤 같은 캐시 어댑터를 통해 TTL과 함께 저장합니다.",
          "lanes": [
            {
              "id": "absent-key-lookup",
              "label": "Redis 조회 → MISS 반환",
              "description": "조회 정책이 Redis를 직접 호출하지 않고 PostCacheService를 왕복하는 네 전이입니다.",
              "steps": [
                { "from": "postQueryService", "to": "postCacheService", "verb": "캐시 먼저 조회", "payload": "get(1) · key post:1", "kind": "call", "concept": "Cache-aside", "effect": {"kind":"transfer","subject":"`post:1` 조회 상태","before":"조회 정책은 `post:1` entry 존재 여부와 TTL을 모름","after":"PostCacheService에 `get(1)`이 전달되어 cache-aside 조회가 시작됨"}, "evidenceScope": "code" },
                { "from": "postCacheService", "to": "redis", "verb": "key 조회", "payload": "GET post:1", "kind": "call", "check": "실제 실행에서는 Redis key와 애플리케이션 로그를 함께 확인합니다.", "effect": {"kind":"transfer","subject":"`post:1` key","before":"PostCacheService가 id 1을 `post:1` key로 계산함","after":"Redis가 `GET post:1` 명령을 실행함"}, "evidenceScope": "manual" },
                { "from": "redis", "to": "postCacheService", "verb": "entry 없음", "payload": "null · 정상 key 부재", "kind": "response", "concept": "MISS는 장애가 아닙니다.", "effect": {"kind":"return","subject":"`post:1` entry","before":"Redis에 `post:1` key가 존재하지 않음","after":"PostCacheService의 조회 값이 정상적인 `null`이 됨"}, "evidenceScope": "manual" },
                { "from": "postCacheService", "to": "postQueryService", "verb": "MISS 반환", "payload": "null", "kind": "response", "concept": "원본 조회 분기를 선택합니다.", "effect": {"kind":"return","subject":"cache miss","before":"PostCacheService가 key 부재를 `null`로 해석함","after":"조회 정책이 MySQL 원본 조회를 선택하는 MISS 상태가 됨"}, "evidenceScope": "test" }
              ]
            },
            {
              "id": "absent-key-source-refill",
              "label": "원본 조회 → 캐시 채우기",
              "description": "원본 응답이 Service와 조회 정책으로 돌아온 뒤 캐시 어댑터를 통해 저장되는 여섯 전이입니다.",
              "steps": [
                { "from": "postQueryService", "to": "postService", "verb": "원본 조회 선택", "payload": "getById(1)", "kind": "call", "codePointIds": ["source-read-boundary"], "effect": {"kind":"gate","subject":"원본 조회 분기","before":"MISS가 확인됐지만 DB 조회는 시작되지 않음","after":"PostService의 `getById(1)` 경로가 열림"}, "evidenceScope": "test" },
                { "from": "postService", "to": "mysql", "verb": "원본 row 조회", "payload": "PostRepository.findById(1)", "kind": "call", "concept": "Source of truth", "effect": {"kind":"transfer","subject":"게시글 원본 row","before":"PostService에는 id 1만 있고 게시글 원본은 없음","after":"MySQL이 `PostRepository.findById(1)`을 실행함"}, "evidenceScope": "runtime" },
                { "from": "mysql", "to": "postService", "verb": "원본 row 반환", "payload": "PostEntity", "kind": "response", "effect": {"kind":"return","subject":"`PostEntity`","before":"MySQL이 id 1의 게시글 row를 찾음","after":"PostService에 원본 `PostEntity`가 전달됨"}, "evidenceScope": "runtime" },
                { "from": "postService", "to": "postQueryService", "verb": "조회 결과 반환", "payload": "PostResponse", "kind": "response", "effect": {"kind":"return","subject":"원본 `PostResponse`","before":"PostService가 DB row를 `PostResponse`로 변환함","after":"조회 정책에 cache refill용 응답이 전달됨"}, "evidenceScope": "test" },
                { "from": "postQueryService", "to": "postCacheService", "verb": "파생 복사본 저장 요청", "payload": "set(1, PostResponse)", "kind": "call", "effect": {"kind":"transfer","subject":"`PostResponse` 복사본","before":"조회 정책에 DB에서 만든 `PostResponse`만 있음","after":"PostCacheService에 `set(1, PostResponse)`가 전달됨"}, "evidenceScope": "test" },
                { "from": "postCacheService", "to": "redis", "verb": "entry와 수명 저장", "payload": "SET post:1 · PostResponse JSON · TTL", "kind": "persist", "concept": "다음 동일 조회를 준비합니다.", "check": "단위 테스트는 cache set 호출, 수동 실행은 실제 key와 TTL을 각각 확인해야 합니다.", "effect": {"kind":"persist","subject":"`post:1` entry","before":"Redis에 id 1의 cache entry가 없음","after":"Redis에 `PostResponse` JSON과 TTL이 함께 저장됨"}, "evidenceScope": "manual" }
              ]
            }
          ]
        },
        "route": ["조회 정책", "캐시 어댑터", "Redis", "캐시 어댑터", "조회 정책", "PostService", "MySQL", "PostService", "조회 정책", "캐시 어댑터", "Redis"],
        "snapshot": [
          { "label": "초기 Redis 상태", "value": "post:1 없음", "tone": "warning" },
          { "label": "원본 조회", "value": "MySQL까지 도달", "tone": "signal" },
          { "label": "다음 상태", "value": "post:1 + TTL", "tone": "recovered" }
        ],
        "evidenceType": "문서 기반 목표 모델 · 테스트/Redis 수동 확인 분리",
        "evidence": "구현 뒤에는 cache get이 null일 때 원본 Service가 호출되고 cache set이 요청되는지 단위 테스트로 확인합니다. 실제 Redis 저장과 TTL은 실행 중 key로 별도 확인합니다.",
        "outcome": "MISS는 실패가 아니라 원본을 읽어 파생 복사본을 준비하는 정상 분기입니다.",
        "reflection": {
          "prompt": "MISS와 Redis 장애를 구분하는 인과 규칙을 한 문장으로 적어보세요.",
          "hint": "`null` 반환과 Redis 연결 실패를 같은 사건으로 쓰지 마세요."
        }
      },
      {
        "id": "key-warm",
        "label": "post:1 key 있음 · TTL 남음",
        "flowId": "lookup-flow",
        "tone": "recovered",
        "prompt": "동일한 key가 Redis에 있고 TTL이 아직 남아 있습니다.",
        "observationTitle": "Redis 복사본을 반환하고 원본 경계를 건너뛰는 경로",
        "theoryRef": "../../../theory.md#seq-07",
        "prediction": {
          "prompt": "post:1 entry가 존재하고 TTL이 남았다면 MySQL 조회는 어떻게 될까요?",
          "options": [
            { "id": "cache-only", "label": "Redis 복사본을 반환하고 MySQL은 호출하지 않는다" },
            { "id": "compare-both", "label": "Redis와 MySQL을 모두 읽어 값이 같은지 비교한다" },
            { "id": "refresh-ttl", "label": "매 조회마다 MySQL을 읽고 TTL을 새로 시작한다" }
          ],
          "answer": "cache-only",
          "explanation": "cache hit의 이점은 원본 조회를 생략하는 데 있습니다. TTL이 남았다는 사실이 원본과 자동 비교한다는 뜻은 아닙니다."
        },
        "diagram": {
          "caption": "post:1 entry가 존재하면 Redis의 직렬화 응답을 반환하고 PostService와 MySQL 원본 조회에는 도달하지 않습니다.",
          "lanes": [
            {
              "id": "warm-key-path",
              "label": "남은 TTL → 캐시 응답",
              "description": "캐시 어댑터의 조회와 반환 경계를 모두 거쳐 응답하는 여섯 전이입니다.",
              "steps": [
                { "from": "postQueryService", "to": "postCacheService", "verb": "같은 key 조회", "payload": "get(1) · post:1", "kind": "call", "effect": {"kind":"transfer","subject":"warm `post:1` entry","before":"조회 정책은 같은 id의 Redis 상태를 아직 읽지 않음","after":"PostCacheService가 다시 `get(1)`을 실행함"}, "evidenceScope": "code" },
                { "from": "postCacheService", "to": "redis", "verb": "entry 읽기", "payload": "GET post:1", "kind": "call", "effect": {"kind":"transfer","subject":"warm `post:1` entry","before":"Redis에 TTL이 남은 `post:1` JSON이 있음","after":"Redis가 `GET post:1`로 저장된 JSON을 읽음"}, "evidenceScope": "manual" },
                { "from": "redis", "to": "postCacheService", "verb": "직렬화 entry 반환", "payload": "PostResponse JSON", "kind": "response", "effect": {"kind":"return","subject":"`PostResponse` JSON","before":"Redis가 TTL이 남은 `post:1` JSON을 찾음","after":"PostCacheService에 직렬화된 JSON이 전달됨"}, "evidenceScope": "manual" },
                { "from": "postCacheService", "to": "postQueryService", "verb": "복사본 반환", "payload": "PostResponse", "kind": "transform", "concept": "Cache hit", "effect": {"kind":"transform","subject":"`PostResponse`","before":"PostCacheService에 Redis JSON 문자열이 있음","after":"JSON이 `PostResponse` 객체로 역직렬화되어 조회 정책에 전달됨"}, "evidenceScope": "test" },
                { "from": "postQueryService", "to": "postController", "verb": "조회 결과 반환", "payload": "PostResponse", "kind": "response", "effect": {"kind":"return","subject":"cache hit `PostResponse`","before":"조회 정책이 Redis 복사본을 최종 응답으로 선택함","after":"PostController에 DB 조회 없는 응답이 전달됨"}, "evidenceScope": "test" },
                { "from": "postController", "to": "client", "verb": "캐시 응답", "payload": "200 · PostResponse", "kind": "response", "check": "단위 테스트는 원본 Service가 호출되지 않음을 확인할 수 있습니다. 실제 Redis 왕복은 별도 실행 증거입니다.", "effect": {"kind":"return","subject":"HTTP cache 응답","before":"PostController에 DB를 거치지 않은 `PostResponse`가 있음","after":"Client에 `200 · PostResponse`가 반환됨"}, "evidenceScope": "manual" }
              ]
            }
          ],
          "notReached": [
            { "label": "PostService · MySQL", "reason": "entry가 존재하고 역직렬화에 성공했으므로 원본 조회 분기를 실행하지 않습니다." }
          ]
        },
        "route": ["조회 정책", "캐시 어댑터", "Redis", "캐시 어댑터", "조회 정책", "PostController", "Client"],
        "snapshot": [
          { "label": "초기 Redis 상태", "value": "post:1 있음", "tone": "recovered" },
          { "label": "반환 값", "value": "직렬화 복사본", "tone": "signal" },
          { "label": "MySQL", "value": "도달하지 않음", "tone": "recovered" }
        ],
        "evidenceType": "단위 호출 검증과 live Redis 증거를 구분",
        "evidence": "단위 테스트는 캐시 값이 있을 때 원본 Service를 호출하지 않는 정책을 확인할 수 있습니다. 실제 hit 로그와 JSON 역직렬화는 실행 환경에서 따로 확인합니다.",
        "outcome": "같은 요청이라는 사실만으로 hit가 되지 않습니다. 같은 key가 존재하고 TTL이 남고 중간 evict가 없어야 합니다.",
        "reflection": {
          "prompt": "어떤 세 가지 조건이 유지되어야 DB를 건너뛸 수 있는지 적어보세요.",
          "hint": "같은 key, 남은 TTL, 중간 evict 없음의 세 조건을 함께 적으세요."
        }
      },
      {
        "id": "ttl-elapsed",
        "label": "post:1 TTL 경과",
        "flowId": "lookup-flow",
        "tone": "warning",
        "prompt": "Redis에 저장했던 post:1의 TTL이 지난 뒤 다음 조회가 들어옵니다.",
        "observationTitle": "만료 entry를 없는 값처럼 처리하고 다시 채우는 경로",
        "theoryRef": "../../../theory.md#seq-07",
        "prediction": {
          "prompt": "TTL이 지나면 Redis가 원본을 자동으로 읽어 entry를 갱신할까요?",
          "options": [
            { "id": "request-refill", "label": "entry는 사라지고 다음 조회가 MySQL을 읽어 다시 채운다" },
            { "id": "auto-refresh", "label": "Redis가 MySQL을 자동 조회해 같은 key를 갱신한다" },
            { "id": "stale-forever", "label": "entry는 남고 오래된 값이 계속 반환된다" }
          ],
          "answer": "request-refill",
          "explanation": "TTL은 entry 수명을 제한할 뿐 원본 조회를 실행하지 않습니다. 다음 cache-aside 요청이 refill을 수행합니다."
        },
        "diagram": {
          "caption": "TTL이 지난 entry는 PostCacheService 왕복에서 값이 없는 것으로 반환되고, 다음 요청이 MySQL 원본 응답을 받은 뒤 같은 캐시 어댑터로 새 TTL을 저장합니다.",
          "lanes": [
            {
              "id": "expired-key-lookup",
              "label": "만료 확인 → MISS 반환",
              "description": "만료 entry가 캐시 어댑터를 거쳐 조회 정책에 null로 돌아오는 네 전이입니다.",
              "steps": [
                { "from": "postQueryService", "to": "postCacheService", "verb": "만료 key 조회", "payload": "get(1) · post:1", "kind": "call", "effect": {"kind":"transfer","subject":"만료된 `post:1`","before":"조회 정책은 `post:1` TTL 경과 여부를 모름","after":"PostCacheService가 만료 뒤 첫 `get(1)`을 실행함"}, "evidenceScope": "code" },
                { "from": "postCacheService", "to": "redis", "verb": "entry 확인", "payload": "GET post:1 after TTL", "kind": "call", "effect": {"kind":"verify","subject":"`post:1` TTL","before":"Redis에서 `post:1` TTL이 이미 0 이하가 됨","after":"`GET post:1`이 key 부재를 반환해 만료 상태가 드러남"}, "evidenceScope": "manual" },
                { "from": "redis", "to": "postCacheService", "verb": "만료 entry 없음", "payload": "null", "kind": "response", "concept": "TTL은 refresh가 아닙니다.", "effect": {"kind":"return","subject":"expired cache entry","before":"Redis가 만료된 `post:1`을 제거한 상태","after":"PostCacheService의 조회 값이 `null`이 됨"}, "evidenceScope": "manual" },
                { "from": "postCacheService", "to": "postQueryService", "verb": "MISS 반환", "payload": "null", "kind": "response", "effect": {"kind":"return","subject":"cache miss","before":"PostCacheService가 key 부재를 `null`로 해석함","after":"조회 정책이 MySQL 원본 조회를 선택하는 MISS 상태가 됨"}, "evidenceScope": "test" }
              ]
            },
            {
              "id": "expired-key-source-refill",
              "label": "원본 재조회 → 새 TTL",
              "description": "다음 요청이 원본 응답을 받은 뒤 캐시 어댑터를 통해 새 수명을 저장하는 여섯 전이입니다.",
              "steps": [
                { "from": "postQueryService", "to": "postService", "verb": "원본 다시 읽기", "payload": "getById(1)", "kind": "call", "codePointIds": ["source-read-boundary"], "effect": {"kind":"gate","subject":"refill 분기","before":"만료된 entry가 제거되어 cache가 비어 있음","after":"PostService의 최신 원본 조회가 시작됨"}, "evidenceScope": "code" },
                { "from": "postService", "to": "mysql", "verb": "원본 row 조회", "payload": "PostRepository.findById(1)", "kind": "call", "concept": "다음 요청이 원본을 읽습니다.", "effect": {"kind":"transfer","subject":"게시글 원본 row","before":"PostService에는 id 1만 있고 게시글 원본은 없음","after":"MySQL이 `PostRepository.findById(1)`을 실행함"}, "evidenceScope": "runtime" },
                { "from": "mysql", "to": "postService", "verb": "최신 원본 row 반환", "payload": "PostEntity", "kind": "response", "effect": {"kind":"return","subject":"최신 `PostEntity`","before":"MySQL에 현재 게시글 원본 row가 있음","after":"PostService에 최신 `PostEntity`가 전달됨"}, "evidenceScope": "runtime" },
                { "from": "postService", "to": "postQueryService", "verb": "최신 조회 결과 반환", "payload": "PostResponse", "kind": "response", "effect": {"kind":"return","subject":"최신 `PostResponse`","before":"PostService가 최신 row를 `PostResponse`로 변환함","after":"조회 정책에 refill할 최신 응답이 전달됨"}, "evidenceScope": "test" },
                { "from": "postQueryService", "to": "postCacheService", "verb": "새 복사본 저장 요청", "payload": "set(1, PostResponse)", "kind": "call", "effect": {"kind":"transfer","subject":"refill 응답","before":"조회 정책에 최신 `PostResponse`가 있고 Redis는 비어 있음","after":"PostCacheService에 새 `set(1, PostResponse)`가 전달됨"}, "evidenceScope": "code" },
                { "from": "postCacheService", "to": "redis", "verb": "새 수명 시작", "payload": "SET post:1 · latest PostResponse · new TTL", "kind": "persist", "check": "실제 시간 경과와 TTL 재설정은 Redis에서 수동 확인해야 합니다.", "effect": {"kind":"persist","subject":"새 `post:1` entry","before":"이전 `post:1` entry와 TTL이 사라진 상태","after":"Redis에 최신 JSON과 새 TTL이 저장됨"}, "evidenceScope": "manual" }
              ]
            }
          ]
        },
        "route": ["조회 정책", "캐시 어댑터", "Redis", "캐시 어댑터", "조회 정책", "PostService", "MySQL", "PostService", "조회 정책", "캐시 어댑터", "Redis"],
        "snapshot": [
          { "label": "TTL", "value": "경과", "tone": "warning" },
          { "label": "Redis 조회", "value": "값 없음", "tone": "warning" },
          { "label": "Refill 주체", "value": "다음 애플리케이션 요청", "tone": "recovered" }
        ],
        "evidenceType": "수동 Redis TTL 관찰 필요",
        "evidence": "현재 문서는 TTL 설정 책임을 정의하지만 실제 시간 경과와 만료 왕복은 Redis TTL·key 상태와 애플리케이션 로그를 수동으로 확인해야 합니다.",
        "outcome": "TTL은 오래된 entry가 무기한 남는 것을 제한하지만 수정 직후 최신성을 보장하거나 자동으로 원본을 새로 읽지 않습니다.",
        "reflection": {
          "prompt": "TTL 만료와 refill의 실행 주체를 구분해 적어보세요.",
          "hint": "entry 만료 주체는 Redis이고 refill 주체는 다음 애플리케이션 요청입니다."
        }
      },
      {
        "id": "write-succeeded",
        "label": "DB 수정 성공 · 기존 key 있음",
        "flowId": "write-flow",
        "tone": "recovered",
        "prompt": "post:1 entry가 남아 있는 상태에서 게시글 수정이 DB에서 성공했습니다.",
        "observationTitle": "원본 쓰기 성공 뒤 파생 복사본을 제거하는 경로",
        "theoryRef": "../../../theory.md#seq-07",
        "prediction": {
          "prompt": "DB 수정이 성공한 직후 post:1 entry는 어떻게 처리해야 할까요?",
          "options": [
            { "id": "evict-after", "label": "성공한 쓰기 뒤 post:1을 삭제하고 다음 조회가 다시 채우게 한다" },
            { "id": "wait-ttl", "label": "TTL이 끝날 때까지 기존 entry를 그대로 반환한다" },
            { "id": "evict-before", "label": "DB 수정 결과와 관계없이 요청 진입 즉시 entry를 삭제한다" }
          ],
          "answer": "evict-after",
          "explanation": "원본 변경이 성공한 뒤 파생 복사본을 제거해야 stale 응답 구간을 줄이고 실패한 쓰기가 정상 cache를 불필요하게 지우지 않습니다."
        },
        "diagram": {
          "caption": "PostService가 managed entity를 변경해 응답을 만들고 transaction flush·commit까지 성공한 뒤에만 Controller가 cache evict를 요청하는 목표 호출 순서입니다.",
          "lanes": [
            {
              "id": "successful-write-path",
              "label": "원본 쓰기 성공 → 캐시 비우기",
              "description": "managed entity 변경, transaction 성공, 파생 복사본 삭제의 순서를 분리합니다.",
              "steps": [
                { "from": "client", "to": "postController", "verb": "수정 요청", "payload": "PUT /posts/1 · PostUpdateRequest", "kind": "request", "codePointIds": ["controller-write-boundary"], "effect": {"kind":"transfer","subject":"`PostUpdateRequest`","before":"Client가 게시글 1의 변경 값을 보유함","after":"PostController에 `PUT /posts/1` 요청이 도착함"}, "evidenceScope": "code" },
                { "from": "postController", "to": "postService", "verb": "원본 수정 위임", "payload": "update(1, request, user)", "kind": "call", "effect": {"kind":"transfer","subject":"게시글 수정 명령","before":"PostController가 id·request·사용자 이메일을 구성함","after":"PostService에 `update(1, request, user)`가 전달됨"}, "evidenceScope": "code" },
                { "from": "postService", "to": "postService", "verb": "managed entity 변경", "payload": "post.update(...) + PostResponse.from(post)", "kind": "transform", "codePointIds": ["service-update-boundary"], "effect": {"kind":"transform","subject":"managed `PostEntity`와 응답","before":"transaction 안의 entity에 수정 전 제목과 본문이 있음","after":"entity field가 변경되고 그 값을 담은 `PostResponse`가 구성됨"}, "evidenceScope": "code" },
                { "from": "postService", "to": "mysql", "verb": "transaction flush·commit", "payload": "dirty checking · SQL UPDATE", "kind": "persist", "effect": {"kind":"persist","subject":"MySQL 게시글 row","before":"managed entity만 변경됐고 transaction commit은 끝나지 않음","after":"transaction interceptor의 flush·commit이 성공해 MySQL row에 변경이 반영됨"}, "evidenceScope": "runtime" },
                { "from": "postService", "to": "postController", "verb": "commit 뒤 결과 반환", "payload": "PostResponse", "kind": "response", "concept": "성공 경계", "effect": {"kind":"return","subject":"수정 `PostResponse`","before":"transaction interceptor가 flush·commit 결과를 기다리고 응답 객체를 보유함","after":"commit 성공 뒤에만 PostController가 `PostResponse`를 받아 다음 evict 문으로 진행함"}, "evidenceScope": "code" },
                { "from": "postController", "to": "postCacheService", "verb": "파생본 제거 요청", "payload": "evict(1)", "kind": "call", "concept": "TTL을 기다리지 않는 invalidation", "effect": {"kind":"gate","subject":"cache invalidation","before":"DB 쓰기는 성공했지만 이전 `post:1`이 남아 있을 수 있음","after":"쓰기 성공 조건 뒤에만 `evict(1)`이 실행됨"}, "evidenceScope": "test" },
                { "from": "postCacheService", "to": "redis", "verb": "key 삭제", "payload": "DEL post:1", "kind": "persist", "check": "구현 뒤 단위 테스트는 evict 호출을 확인하고 실제 key 삭제는 Redis에서 별도 확인합니다.", "effect": {"kind":"persist","subject":"`post:1` invalidation","before":"Redis에 수정 전 파생 복사본이 남아 있을 수 있음","after":"`DEL post:1` 뒤 cache entry가 EVICTED 상태가 됨"}, "evidenceScope": "manual" }
              ]
            }
          ]
        },
        "route": ["Client", "PostController", "PostService", "MySQL", "PostController", "캐시 어댑터", "Redis"],
        "snapshot": [
          { "label": "원본 쓰기", "value": "성공", "tone": "recovered" },
          { "label": "기존 entry", "value": "post:1 삭제 대상", "tone": "signal" },
          { "label": "다음 GET", "value": "MISS 뒤 최신 원본 refill", "tone": "recovered" }
        ],
        "evidenceType": "구현 문서의 목표 순서 · mock 호출과 live Redis 분리",
        "evidence": "실습 시작 Controller는 Service 정상 반환 뒤 evict를 호출합니다. managed entity 변경, transaction commit, mock evict 호출, 실제 Redis DEL 성공은 서로 다른 증거입니다.",
        "outcome": "TTL은 최대 수명 제한이고 evict는 성공한 쓰기 직후 stale entry를 제거하는 별도 정책입니다.",
        "reflection": {
          "prompt": "쓰기 성공과 cache evict 사이의 순서를 조건문처럼 적어보세요.",
          "hint": "PostService의 DB 변경 성공 뒤에만 evict가 호출됩니다."
        }
      }
    ]
  },
  "actors": [
    { "id": "client", "label": "Client", "kind": "client" },
    { "id": "query", "label": "조회 정책", "kind": "logic" },
    { "id": "redis", "label": "Redis", "kind": "cache" },
    { "id": "service", "label": "PostService", "kind": "logic" },
    { "id": "mysql", "label": "MySQL", "kind": "db" }
  ],
  "flows": [
    {
      "id": "lookup-flow",
      "title": "조건에 따른 cache-aside 조회",
      "summary": "key와 TTL 상태가 Redis 반환 또는 MySQL 원본 조회를 결정합니다.",
      "steps": [
        { "id": "lookup-1", "from": "Client", "to": "조회 정책", "problem": "같은 id 조회가 들어옵니다.", "concept": "입력 조건", "action": "post:{id} key를 만듭니다.", "check": "조회·저장·삭제에서 같은 key 규칙을 쓰는지 확인합니다.", "codePointIds": ["controller-write-boundary"] },
        { "id": "lookup-2", "from": "조회 정책", "to": "Redis", "problem": "원본보다 먼저 파생 복사본을 확인합니다.", "concept": "Cache-aside", "action": "Redis get을 호출합니다.", "check": "HIT 또는 정상 MISS를 구분합니다." },
        { "id": "lookup-3", "from": "Redis", "to": "조회 정책", "problem": "entry 유무와 TTL이 경로를 나눕니다.", "concept": "HIT / MISS", "action": "값이 있으면 반환하고 없으면 원본을 선택합니다.", "check": "MISS와 Redis 오류를 같은 사건으로 보지 않습니다." },
        { "id": "lookup-4", "from": "조회 정책", "to": "PostService", "problem": "MISS이면 원본이 필요합니다.", "concept": "Source of truth", "action": "PostService.getById를 호출합니다.", "check": "Repository가 MySQL row를 읽는지 확인합니다.", "codePointIds": ["source-read-boundary"] },
        { "id": "lookup-5", "from": "조회 정책", "to": "Redis", "problem": "다음 같은 조회를 준비합니다.", "concept": "TTL", "action": "PostResponse 복사본을 TTL과 함께 저장합니다.", "check": "단위 호출과 실제 Redis key·TTL을 분리해 확인합니다." }
      ]
    },
    {
      "id": "write-flow",
      "title": "원본 쓰기 뒤 cache invalidation",
      "summary": "수정·삭제가 성공한 뒤 관련 key를 제거해 다음 조회가 최신 원본을 다시 읽게 합니다.",
      "steps": [
        { "id": "write-1", "from": "Client", "to": "PostController", "problem": "원본 변경 요청이 들어옵니다.", "concept": "HTTP write boundary", "action": "수정·삭제를 Service에 위임합니다.", "check": "요청 진입 시점에는 아직 원본 성공이 아닙니다.", "codePointIds": ["controller-write-boundary"] },
        { "id": "write-2", "from": "PostController", "to": "PostService", "problem": "권한과 원본 변경이 먼저 성공해야 합니다.", "concept": "Source write", "action": "managed entity를 변경하고 transaction을 commit합니다.", "check": "실패 시 이후 단계가 실행되지 않는지 봅니다.", "codePointIds": ["service-update-boundary"] },
        { "id": "write-3", "from": "PostService", "to": "PostController", "problem": "성공한 결과가 돌아옵니다.", "concept": "Success boundary", "action": "PostResponse 또는 정상 종료를 반환합니다.", "check": "성공과 예외를 구분합니다." },
        { "id": "write-4", "from": "PostController", "to": "Redis", "problem": "기존 파생본은 stale할 수 있습니다.", "concept": "Eviction", "action": "관련 post:{id}를 삭제합니다.", "check": "mock evict 호출과 실제 Redis DEL을 따로 확인합니다." },
        { "id": "write-5", "from": "Client", "to": "조회 정책", "problem": "다음 조회에는 entry가 없습니다.", "concept": "Refill", "action": "MISS 뒤 최신 원본을 읽어 다시 채웁니다.", "check": "TTL을 기다리지 않고 최신 원본 경로로 전환되는지 설명합니다." }
      ]
    }
  ],
  "codePoints": [
    {
      "id": "source-read-boundary",
      "title": "PostService가 MySQL 원본 조회 책임을 가집니다",
      "file": "src/main/kotlin/com/andi/rest_crud/service/PostService.kt",
      "language": "kotlin",
      "snippet": "fun getById(id: Long): PostResponse {\n    return PostResponse.from(findPostById(id))\n}",
      "explanation": "현재 main 가이드 코드에서 PostService는 Repository를 통해 DB 원본을 읽습니다. 이 코드만으로 Redis hit·miss나 live Redis 성공을 증명하지는 않습니다.",
      "check": "cache miss 목표 흐름이 이 원본 조회 경계로 이어지는지 확인합니다."
    },
    {
      "id": "service-update-boundary",
      "title": "Service 본문은 managed entity를 바꾸고 응답을 구성합니다",
      "file": "src/main/kotlin/com/andi/rest_crud/service/PostService.kt",
      "language": "kotlin",
      "snippet": "@Transactional\nfun update(id: Long, request: PostUpdateRequest, currentUserEmail: String): PostResponse {\n    val post = findPostById(id)\n    validateAuthor(post, currentUserEmail)\n    post.update(request.title, request.content)\n\n    return PostResponse.from(post)\n}",
      "explanation": "본문은 managed entity를 변경하고 응답을 만들며 SQL UPDATE는 transaction interceptor의 flush·commit에서 확정됩니다.",
      "check": "응답 객체 생성과 transaction commit 성공을 같은 순간으로 합치지 않습니다."
    },
    {
      "id": "controller-write-boundary",
      "title": "Controller는 원본 쓰기의 성공 결과를 받은 뒤 다음 책임을 이어갑니다",
      "file": "src/main/kotlin/com/andi/rest_crud/controller/PostController.kt",
      "language": "kotlin",
      "snippet": "@PutMapping(\"/{id}\")\nfun update(\n    @PathVariable id: Long,\n    @Valid @RequestBody request: PostUpdateRequest,\n    principal: Principal\n): PostResponse {\n    val response = postService.update(id, request, principal.name)\n    postCacheService.evict(id)\n    return response\n}",
      "explanation": "실습 시작 Controller는 Service 호출이 transaction commit까지 정상 반환된 뒤 evict를 호출합니다. mock 호출과 실제 Redis DEL은 별도로 확인합니다.",
      "check": "실패한 Service 호출 뒤에는 cache 정리 단계로 진행하지 않는 호출 순서를 설계합니다."
    }
  ],
  "concepts": [
    { "title": "Cache-aside", "body": "애플리케이션이 entry를 먼저 보고 없을 때 원본을 읽어 캐시에 채우는 정책입니다." },
    { "title": "Stale data", "body": "MySQL 원본은 바뀌었지만 Redis에 이전 응답 복사본이 남은 상태입니다." }
  ],
  "responsibilities": [
    { "name": "조회 정책", "role": "Redis 결과를 해석해 원본 조회 여부를 결정합니다.", "caution": "MISS와 Redis 장애를 같은 분기로 단정하지 않습니다." },
    { "name": "PostService", "role": "Repository를 통해 MySQL 원본을 읽고 변경합니다.", "caution": "Redis 파생본을 원본으로 취급하지 않습니다." }
  ],
  "glossary": [
    { "term": "HIT", "meaning": "요청한 key의 entry가 있어 파생 복사본을 반환할 수 있는 상태입니다.", "caution": "같은 요청이라는 사실만으로 HIT가 되지 않습니다." },
    { "term": "MISS", "meaning": "정상 조회 결과로 entry가 없음을 확인한 상태입니다.", "caution": "Redis 연결 오류와 다릅니다." },
    { "term": "Evict", "meaning": "원본 변경 뒤 관련 entry를 명시적으로 삭제하는 동작입니다.", "caution": "TTL 만료와 시점·주체가 다릅니다." }
  ],
  "practical": [
    { "title": "증거 범위를 나눕니다", "body": "mock 호출은 정책의 호출 관계를, live Redis key와 TTL은 실제 저장소 상태를 각각 확인합니다." },
    { "title": "장애 fallback은 다음 설계입니다", "body": "현재 cache miss 경로만으로 Redis 연결 오류까지 DB로 우회한다고 주장하지 않습니다." }
  ],
  "checks": [
    "MySQL 원본과 Redis 파생 복사본의 책임 차이를 설명할 수 있나요?",
    "TTL 만료가 자동 refresh가 아닌 이유를 설명할 수 있나요?",
    "정상 MISS와 Redis 장애가 다른 사건인 이유를 설명할 수 있나요?",
    "쓰기 성공 뒤 evict해야 하는 순서와 실패 시 도달하지 않아야 할 경로를 설명할 수 있나요?"
  ],
  "source": {
    "theory": "../../../theory.md",
    "implementation": "../../../implementation.md",
    "checklist": "../../../checklist.md"
  },
  "question": "Redis entry의 상태만 보고 다음 요청이 MySQL까지 갈지 예측할 수 있을까?",
  "next": {
    "id": "08",
    "title": "Realtime WebSocket",
    "reason": "파생 복사본의 수명주기를 추적했다면, 다음에는 유지된 연결 위에서 어떤 session이 실제 메시지 수신자가 되는지 추적합니다."
  }
};
