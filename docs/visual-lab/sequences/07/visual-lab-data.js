window.visualLabData = {
  "kind": "sequence",
  "sequence": "07",
  "title": "Redis Cache",
  "subtitle": "Caching and Redis",
  "goal": "Cache-aside 패턴에서 cache hit와 miss, DB fallback, TTL, invalidation 판단 기준을 함께 이해합니다.",
  "problem": "자주 조회되는 데이터도 매번 DB에서만 읽으면 같은 요청이 같은 비용을 반복하게 됩니다.",
  "repo": {
    "name": "spring-boot-redis-cache-lab",
    "path": "spring-boot-redis-cache-lab"
  },
  "defaultSequence": "07",
  "workbench": {
    "kind": "cache",
    "title": "Cache State Inspector",
    "instruction": "조회 또는 쓰기 조건을 선택해 Redis와 DB 경계, 그리고 다음 요청의 상태가 어떻게 달라지는지 비교하세요.",
    "nodes": {
      "client": {
        "label": "Client",
        "icon": "client",
        "kind": "client",
        "role": "단건 조회나 수정 요청을 보내고 PostResponse를 받습니다.",
        "boundary": "클라이언트"
      },
      "postController": {
        "label": "PostController",
        "icon": "api",
        "kind": "api",
        "role": "HTTP 요청을 조회 Service 또는 쓰기 Service로 전달하고 성공한 쓰기 뒤 cache evict를 요청합니다.",
        "boundary": "HTTP API"
      },
      "postQueryService": {
        "label": "PostQueryService",
        "icon": "service",
        "kind": "service",
        "role": "cache hit와 miss를 나누고 miss이면 DB 원본 조회와 refill을 조립합니다.",
        "boundary": "조회 정책",
        "codePointIds": [
          "cache-aside-query"
        ]
      },
      "postCacheService": {
        "label": "PostCacheService",
        "icon": "cache",
        "kind": "cache",
        "role": "Redis key, JSON 변환, TTL, get/set/evict 책임을 모읍니다.",
        "boundary": "캐시 어댑터",
        "codePointIds": [
          "redis-ttl"
        ]
      },
      "redis": {
        "label": "Redis",
        "icon": "cache",
        "kind": "cache",
        "role": "PostResponse의 직렬화된 복사본을 제한된 시간 동안 저장합니다.",
        "boundary": "파생 데이터 저장소"
      },
      "postService": {
        "label": "PostService",
        "icon": "service",
        "kind": "service",
        "role": "DB 원본 게시글을 조회하고 수정하는 비즈니스 흐름을 담당합니다.",
        "boundary": "원본 데이터 정책"
      },
      "postRepository": {
        "label": "PostRepository",
        "icon": "repository",
        "kind": "repository",
        "role": "PostEntity를 MySQL의 원본 데이터와 연결합니다.",
        "boundary": "영속성"
      },
      "mysql": {
        "label": "MySQL",
        "icon": "database",
        "kind": "database",
        "role": "게시글의 source of truth를 저장합니다.",
        "boundary": "원본 저장소"
      }
    },
    "scenarios": [
      {
        "id": "cold-cache-miss",
        "label": "첫 조회 · cache miss",
        "flowId": "lookup-flow",
        "tone": "signal",
        "prompt": "Redis에 해당 게시글 key가 없을 때 단건 조회가 어디까지 내려가는지 확인합니다.",
        "diagram": {
          "caption": "cache miss 구현 경로입니다. PostQueryServiceTest는 DB 조회 Service와 cache set 호출을 단위 수준에서 확인하며, 실제 Redis 명령과 로그는 수동 실행 증거입니다.",
          "lanes": [
            {
              "id": "cache-lookup",
              "label": "Cache lookup",
              "description": "단건 조회는 DB보다 먼저 해당 게시글 key의 캐시 복사본을 확인합니다.",
              "steps": [
                {
                  "from": "client",
                  "to": "postController",
                  "verb": "단건 조회",
                  "payload": "GET /posts/{id}",
                  "kind": "request"
                },
                {
                  "from": "postController",
                  "to": "postQueryService",
                  "verb": "조회 정책 실행",
                  "payload": "getPost(id)",
                  "kind": "call",
                  "codePointIds": [
                    "cache-aside-query"
                  ]
                },
                {
                  "from": "postQueryService",
                  "to": "postCacheService",
                  "verb": "캐시 조회",
                  "payload": "get(id) · key post:{id}",
                  "kind": "call",
                  "concept": "Cache-aside"
                },
                {
                  "from": "postCacheService",
                  "to": "redis",
                  "verb": "key 조회",
                  "payload": "GET post:{id}",
                  "kind": "call"
                }
              ]
            },
            {
              "id": "db-fallback",
              "label": "MISS → DB fallback",
              "description": "key가 없으면 miss를 오류가 아닌 원본 조회 분기로 해석합니다.",
              "steps": [
                {
                  "from": "redis",
                  "to": "postCacheService",
                  "verb": "MISS",
                  "payload": "null",
                  "kind": "response",
                  "concept": "Cache miss"
                },
                {
                  "from": "postCacheService",
                  "to": "postQueryService",
                  "verb": "캐시 없음 반환",
                  "payload": "null",
                  "kind": "response"
                },
                {
                  "from": "postQueryService",
                  "to": "postService",
                  "verb": "원본 조회",
                  "payload": "getById(id)",
                  "kind": "call"
                },
                {
                  "from": "postService",
                  "to": "postRepository",
                  "verb": "Entity 조회",
                  "payload": "findById(id)",
                  "kind": "call"
                },
                {
                  "from": "postRepository",
                  "to": "mysql",
                  "verb": "원본 SELECT",
                  "payload": "post id",
                  "kind": "call"
                },
                {
                  "from": "mysql",
                  "to": "postRepository",
                  "verb": "원본 row 반환",
                  "payload": "post data",
                  "kind": "response"
                },
                {
                  "from": "postRepository",
                  "to": "postService",
                  "verb": "Entity 반환",
                  "payload": "PostEntity",
                  "kind": "response"
                }
              ]
            },
            {
              "id": "cache-refill",
              "label": "Response + refill",
              "description": "DB 원본 응답을 반환하면서 다음 동일 조회를 위해 TTL이 있는 캐시 복사본을 만듭니다.",
              "steps": [
                {
                  "from": "postService",
                  "to": "postQueryService",
                  "verb": "원본 응답 반환",
                  "payload": "PostResponse",
                  "kind": "response"
                },
                {
                  "from": "postQueryService",
                  "to": "postCacheService",
                  "verb": "캐시 채우기",
                  "payload": "set(id, PostResponse)",
                  "kind": "call",
                  "codePointIds": [
                    "redis-ttl"
                  ]
                },
                {
                  "from": "postCacheService",
                  "to": "redis",
                  "verb": "복사본 저장",
                  "payload": "SET post:{id} · JSON + TTL",
                  "kind": "persist",
                  "concept": "TTL"
                },
                {
                  "from": "postQueryService",
                  "to": "postController",
                  "verb": "조회 결과 반환",
                  "payload": "PostResponse",
                  "kind": "response"
                },
                {
                  "from": "postController",
                  "to": "client",
                  "verb": "단건 응답",
                  "payload": "200 + PostResponse JSON",
                  "kind": "response"
                }
              ]
            }
          ]
        },
        "route": [
          "Client",
          "PostController",
          "PostQueryService",
          "PostCacheService",
          "Redis miss",
          "PostQueryService",
          "PostService",
          "PostRepository",
          "DB",
          "PostQueryService",
          "PostCacheService",
          "Redis write",
          "PostController",
          "Client"
        ],
        "snapshot": [
          {
            "label": "Cache lookup",
            "value": "miss",
            "tone": "warning"
          },
          {
            "label": "DB lookup",
            "value": "findById(id)",
            "tone": "signal"
          },
          {
            "label": "Cache write",
            "value": "PostResponse + TTL",
            "tone": "recovered"
          }
        ],
        "evidence": "cache miss 로그 뒤 Repository 조회와 Redis 저장이 이어지는지 확인합니다.",
        "outcome": "DB 원본을 응답하고 같은 key의 다음 조회가 cache hit가 될 수 있도록 준비합니다."
      },
      {
        "id": "warm-cache-hit",
        "label": "반복 조회 · cache hit",
        "flowId": "lookup-flow",
        "tone": "recovered",
        "prompt": "같은 게시글이 Redis에 남아 있을 때 DB를 건너뛰는 경계를 확인합니다.",
        "diagram": {
          "caption": "cache hit 단위 테스트는 PostService.getById가 호출되지 않음을 verify합니다. 실제 Redis hit와 직렬화 왕복은 실행 로그와 key 확인이 필요한 별도 증거입니다.",
          "lanes": [
            {
              "id": "warm-lookup",
              "label": "Warm cache lookup",
              "description": "같은 key의 캐시 복사본을 먼저 조회합니다.",
              "steps": [
                {
                  "from": "client",
                  "to": "postController",
                  "verb": "반복 단건 조회",
                  "payload": "GET /posts/{id}",
                  "kind": "request"
                },
                {
                  "from": "postController",
                  "to": "postQueryService",
                  "verb": "조회 정책 실행",
                  "payload": "getPost(id)",
                  "kind": "call"
                },
                {
                  "from": "postQueryService",
                  "to": "postCacheService",
                  "verb": "캐시 조회",
                  "payload": "get(id) · key post:{id}",
                  "kind": "call",
                  "codePointIds": [
                    "cache-aside-query"
                  ]
                },
                {
                  "from": "postCacheService",
                  "to": "redis",
                  "verb": "key 조회",
                  "payload": "GET post:{id}",
                  "kind": "call"
                }
              ]
            },
            {
              "id": "hit-response",
              "label": "HIT → immediate response",
              "description": "Redis 복사본을 PostResponse로 읽어 DB 원본 경계를 건너뛰고 반환합니다.",
              "steps": [
                {
                  "from": "redis",
                  "to": "postCacheService",
                  "verb": "HIT",
                  "payload": "cached JSON",
                  "kind": "response",
                  "concept": "Cache hit"
                },
                {
                  "from": "postCacheService",
                  "to": "postQueryService",
                  "verb": "캐시 값 역직렬화",
                  "payload": "Cached PostResponse",
                  "kind": "transform"
                },
                {
                  "from": "postQueryService",
                  "to": "postController",
                  "verb": "캐시 응답 반환",
                  "payload": "PostResponse",
                  "kind": "response"
                },
                {
                  "from": "postController",
                  "to": "client",
                  "verb": "단건 응답",
                  "payload": "200 + PostResponse JSON",
                  "kind": "response",
                  "check": "단위 테스트는 PostService가 호출되지 않음을 확인합니다."
                }
              ]
            }
          ],
          "notReached": [
            {
              "label": "PostService · PostRepository · MySQL",
              "reason": "cache hit이면 원본 조회 경계를 호출하지 않습니다."
            }
          ]
        },
        "route": [
          "Client",
          "PostController",
          "PostQueryService",
          "PostCacheService",
          "Redis hit",
          "PostQueryService",
          "PostController",
          "Client"
        ],
        "snapshot": [
          {
            "label": "Cache lookup",
            "value": "hit",
            "tone": "recovered"
          },
          {
            "label": "Returned value",
            "value": "Cached PostResponse",
            "tone": "signal"
          },
          {
            "label": "DB lookup",
            "value": "호출하지 않음",
            "tone": "recovered"
          }
        ],
        "evidence": "cache hit 로그와 함께 Repository 조회가 생략되는지 테스트 또는 호출 횟수로 확인합니다.",
        "outcome": "Redis의 응답을 바로 반환해 같은 단건 조회의 DB 비용을 줄입니다."
      },
      {
        "id": "ttl-expired-refill",
        "label": "TTL 만료 · 다시 채우기",
        "flowId": "lookup-flow",
        "tone": "warning",
        "prompt": "TTL이 지난 key가 다시 조회될 때 miss를 오류가 아닌 정상 refill 흐름으로 해석합니다.",
        "diagram": {
          "caption": "TTL 만료는 Redis에서 key가 없는 것처럼 관찰되어 miss와 같은 DB fallback으로 이어집니다. 현재 테스트는 실제 시간 경과와 만료 왕복을 자동 검증하지 않습니다.",
          "lanes": [
            {
              "id": "expired-lookup",
              "label": "Expired key lookup",
              "description": "PostCacheService가 같은 key를 조회하지만 TTL이 지난 값은 반환되지 않습니다.",
              "steps": [
                {
                  "from": "client",
                  "to": "postController",
                  "verb": "만료 뒤 단건 조회",
                  "payload": "GET /posts/{id}",
                  "kind": "request"
                },
                {
                  "from": "postController",
                  "to": "postQueryService",
                  "verb": "조회 정책 실행",
                  "payload": "getPost(id)",
                  "kind": "call"
                },
                {
                  "from": "postQueryService",
                  "to": "postCacheService",
                  "verb": "캐시 조회",
                  "payload": "get(id) · key post:{id}",
                  "kind": "call"
                },
                {
                  "from": "postCacheService",
                  "to": "redis",
                  "verb": "만료 key 조회",
                  "payload": "GET post:{id}",
                  "kind": "call",
                  "codePointIds": [
                    "redis-ttl"
                  ]
                }
              ]
            },
            {
              "id": "expired-fallback",
              "label": "Expired → DB fallback",
              "description": "만료된 key는 miss로 처리되어 source of truth를 다시 읽습니다.",
              "steps": [
                {
                  "from": "redis",
                  "to": "postCacheService",
                  "verb": "만료 결과",
                  "payload": "MISS · null",
                  "kind": "response",
                  "concept": "TTL expiry"
                },
                {
                  "from": "postCacheService",
                  "to": "postQueryService",
                  "verb": "캐시 없음 반환",
                  "payload": "null",
                  "kind": "response"
                },
                {
                  "from": "postQueryService",
                  "to": "postService",
                  "verb": "원본 조회",
                  "payload": "getById(id)",
                  "kind": "call"
                },
                {
                  "from": "postService",
                  "to": "postRepository",
                  "verb": "Entity 조회",
                  "payload": "findById(id)",
                  "kind": "call"
                },
                {
                  "from": "postRepository",
                  "to": "mysql",
                  "verb": "원본 SELECT",
                  "payload": "post id",
                  "kind": "call"
                },
                {
                  "from": "mysql",
                  "to": "postRepository",
                  "verb": "최신 row 반환",
                  "payload": "post data",
                  "kind": "response"
                },
                {
                  "from": "postRepository",
                  "to": "postService",
                  "verb": "Entity 반환",
                  "payload": "PostEntity",
                  "kind": "response"
                }
              ]
            },
            {
              "id": "ttl-refill",
              "label": "TTL restart",
              "description": "최신 DB 응답을 같은 key에 새 TTL과 함께 저장하고 클라이언트에 반환합니다.",
              "steps": [
                {
                  "from": "postService",
                  "to": "postQueryService",
                  "verb": "최신 응답 반환",
                  "payload": "PostResponse",
                  "kind": "response"
                },
                {
                  "from": "postQueryService",
                  "to": "postCacheService",
                  "verb": "캐시 다시 채우기",
                  "payload": "set(id, PostResponse)",
                  "kind": "call"
                },
                {
                  "from": "postCacheService",
                  "to": "redis",
                  "verb": "TTL 재설정",
                  "payload": "SET post:{id} · JSON + new TTL",
                  "kind": "persist",
                  "concept": "TTL"
                },
                {
                  "from": "postQueryService",
                  "to": "postController",
                  "verb": "조회 결과 반환",
                  "payload": "PostResponse",
                  "kind": "response"
                },
                {
                  "from": "postController",
                  "to": "client",
                  "verb": "단건 응답",
                  "payload": "200 + PostResponse JSON",
                  "kind": "response",
                  "check": "실제 만료는 Redis TTL과 시간 경과를 수동 확인해야 합니다."
                }
              ]
            }
          ]
        },
        "route": [
          "Client",
          "PostController",
          "PostQueryService",
          "PostCacheService",
          "Expired Redis key",
          "PostQueryService",
          "PostService",
          "PostRepository",
          "DB",
          "PostCacheService",
          "Redis write with TTL",
          "Client"
        ],
        "snapshot": [
          {
            "label": "TTL state",
            "value": "만료",
            "tone": "warning"
          },
          {
            "label": "Cache lookup",
            "value": "miss",
            "tone": "signal"
          },
          {
            "label": "Refill",
            "value": "DB 조회 후 TTL 재설정",
            "tone": "recovered"
          }
        ],
        "evidence": "key 만료 뒤 같은 GET에서 DB fallback과 Redis 재저장이 이어지는지 확인합니다.",
        "outcome": "만료된 값 대신 DB 원본으로 응답하고 캐시의 유효 기간을 다시 시작합니다."
      },
      {
        "id": "write-then-evict",
        "label": "수정 성공 · 즉시 evict",
        "flowId": "stale-data",
        "tone": "recovered",
        "prompt": "게시글 수정이 성공한 뒤 캐시를 제거하고 다음 조회가 최신 원본으로 돌아가는 순서를 확인합니다.",
        "diagram": {
          "caption": "Request A의 성공한 수정 경로 뒤 cache key를 제거하고 Request B의 다음 GET이 최신 원본을 다시 채우는 개념 흐름입니다. 현재 invalidation 단위 테스트는 evict 호출을 확인하지만 실제 DB write와 호출 순서를 직접 증명하지 않습니다.",
          "lanes": [
            {
              "id": "write-request",
              "label": "Request A · DB write",
              "description": "수정 요청은 Redis가 아니라 source of truth인 MySQL의 게시글을 먼저 변경합니다.",
              "steps": [
                {
                  "from": "client",
                  "to": "postController",
                  "verb": "게시글 수정",
                  "payload": "PUT /posts/{id} + PostUpdateRequest",
                  "kind": "request"
                },
                {
                  "from": "postController",
                  "to": "postService",
                  "verb": "수정 정책 실행",
                  "payload": "update(id, request, currentUserEmail)",
                  "kind": "call"
                },
                {
                  "from": "postService",
                  "to": "postRepository",
                  "verb": "현재 Entity 조회",
                  "payload": "findById(id)",
                  "kind": "call"
                },
                {
                  "from": "postRepository",
                  "to": "mysql",
                  "verb": "원본 SELECT",
                  "payload": "post id",
                  "kind": "call"
                },
                {
                  "from": "mysql",
                  "to": "postRepository",
                  "verb": "현재 row 반환",
                  "payload": "post data",
                  "kind": "response"
                }
              ]
            },
            {
              "id": "write-success-evict",
              "label": "Write success → evict",
              "description": "transaction이 성공한 경로에서 Controller가 TTL을 기다리지 않고 해당 key 삭제를 요청합니다.",
              "steps": [
                {
                  "from": "postRepository",
                  "to": "postService",
                  "verb": "관리 Entity 반환",
                  "payload": "PostEntity",
                  "kind": "response"
                },
                {
                  "from": "postService",
                  "to": "postRepository",
                  "verb": "수정 상태 영속화",
                  "payload": "updated managed PostEntity",
                  "kind": "persist"
                },
                {
                  "from": "postRepository",
                  "to": "mysql",
                  "verb": "transaction commit",
                  "payload": "UPDATE post",
                  "kind": "persist"
                },
                {
                  "from": "mysql",
                  "to": "postRepository",
                  "verb": "쓰기 성공",
                  "payload": "commit success",
                  "kind": "response"
                },
                {
                  "from": "postService",
                  "to": "postController",
                  "verb": "수정 결과 반환",
                  "payload": "PostResponse",
                  "kind": "response"
                },
                {
                  "from": "postController",
                  "to": "postCacheService",
                  "verb": "캐시 제거 요청",
                  "payload": "evict(id)",
                  "kind": "call",
                  "concept": "Cache invalidation",
                  "codePointIds": [
                    "redis-ttl"
                  ]
                },
                {
                  "from": "postCacheService",
                  "to": "redis",
                  "verb": "key 삭제",
                  "payload": "DEL post:{id}",
                  "kind": "persist",
                  "check": "단위 테스트는 성공 경로의 evict 호출만 확인하며 DB와 실행 순서를 직접 검증하지 않습니다."
                }
              ]
            },
            {
              "id": "next-get-miss",
              "label": "Request B · next GET",
              "description": "수정 응답 뒤 별도의 다음 GET이 삭제된 key를 조회해 miss가 됩니다.",
              "steps": [
                {
                  "from": "postController",
                  "to": "client",
                  "verb": "수정 응답",
                  "payload": "200 + updated PostResponse",
                  "kind": "response"
                },
                {
                  "from": "client",
                  "to": "postController",
                  "verb": "다음 단건 조회",
                  "payload": "GET /posts/{id}",
                  "kind": "request"
                },
                {
                  "from": "postController",
                  "to": "postQueryService",
                  "verb": "조회 정책 실행",
                  "payload": "getPost(id)",
                  "kind": "call"
                },
                {
                  "from": "postQueryService",
                  "to": "postCacheService",
                  "verb": "삭제된 key 조회",
                  "payload": "get(id)",
                  "kind": "call"
                },
                {
                  "from": "postCacheService",
                  "to": "redis",
                  "verb": "key 조회",
                  "payload": "GET post:{id}",
                  "kind": "call"
                },
                {
                  "from": "redis",
                  "to": "postCacheService",
                  "verb": "MISS",
                  "payload": "null",
                  "kind": "response"
                },
                {
                  "from": "postCacheService",
                  "to": "postQueryService",
                  "verb": "캐시 없음 반환",
                  "payload": "null",
                  "kind": "response"
                }
              ]
            },
            {
              "id": "latest-refill",
              "label": "Latest value refill",
              "description": "DB의 최신 값을 읽어 삭제된 cache copy를 새 TTL로 다시 만듭니다.",
              "steps": [
                {
                  "from": "postQueryService",
                  "to": "postService",
                  "verb": "최신 원본 조회",
                  "payload": "getById(id)",
                  "kind": "call"
                },
                {
                  "from": "postService",
                  "to": "postQueryService",
                  "verb": "최신 응답 반환",
                  "payload": "latest PostResponse",
                  "kind": "response"
                },
                {
                  "from": "postQueryService",
                  "to": "postCacheService",
                  "verb": "최신 복사본 저장 요청",
                  "payload": "set(id, latest PostResponse)",
                  "kind": "call"
                },
                {
                  "from": "postCacheService",
                  "to": "redis",
                  "verb": "캐시 다시 채우기",
                  "payload": "SET post:{id} · JSON + TTL",
                  "kind": "persist"
                },
                {
                  "from": "postQueryService",
                  "to": "postController",
                  "verb": "최신 조회 결과",
                  "payload": "PostResponse",
                  "kind": "response"
                },
                {
                  "from": "postController",
                  "to": "client",
                  "verb": "단건 응답",
                  "payload": "200 + latest PostResponse JSON",
                  "kind": "response"
                }
              ]
            }
          ]
        },
        "route": [
          "Client",
          "PUT /posts/{id}",
          "PostController",
          "PostService",
          "PostRepository",
          "DB write success",
          "PostController",
          "PostCacheService",
          "Redis evict",
          "Next GET",
          "PostQueryService",
          "Redis miss",
          "DB latest value",
          "PostQueryService",
          "PostCacheService",
          "Redis write",
          "Client"
        ],
        "snapshot": [
          {
            "label": "DB write",
            "value": "성공",
            "tone": "recovered"
          },
          {
            "label": "Cache key",
            "value": "evicted",
            "tone": "signal"
          },
          {
            "label": "Next GET",
            "value": "miss → 최신 DB 값",
            "tone": "recovered"
          }
        ],
        "evidence": "PostControllerCacheInvalidationTest에서 DB 쓰기 뒤 해당 key가 제거되는 호출 순서를 확인합니다.",
        "outcome": "TTL을 기다리지 않고 오래된 응답 가능성을 줄인 뒤 다음 조회에서 최신 값을 다시 채웁니다."
      }
    ]
  },
  "actors": [
    {
      "id": "client",
      "label": "Client",
      "kind": "client"
    },
    {
      "id": "query",
      "label": "PostQueryService",
      "kind": "logic"
    },
    {
      "id": "cache",
      "label": "Redis Cache",
      "kind": "cache"
    },
    {
      "id": "service",
      "label": "PostService",
      "kind": "logic"
    },
    {
      "id": "db",
      "label": "DB",
      "kind": "db"
    }
  ],
  "flows": [
    {
      "id": "lookup-flow",
      "title": "Cache-aside 단건 조회",
      "summary": "조회 요청은 Redis를 먼저 확인하고, miss이면 DB 조회 후 결과를 캐시에 저장합니다.",
      "mermaid": "sequenceDiagram\n  actor Client\n  participant Controller as PostController\n  participant Query as PostQueryService\n  participant Cache as PostCacheService\n  participant Redis as Redis\n  participant DB as Database\n  Client->>Controller: GET /posts/{id}\n  Controller->>Query: getPost(id)\n  Query->>Cache: get(id)\n  Cache->>Redis: cache lookup\n  alt hit\n    Redis-->>Cache: cached response\n    Cache-->>Query: cached response\n  else miss\n    Redis-->>Cache: empty\n    Query->>DB: findById(id)\n    DB-->>Query: post data\n    Query->>Cache: put(response, ttl)\n  end\n  Query-->>Controller: PostResponse\n  Controller-->>Client: JSON response",
      "steps": [
        {
          "order": 1,
          "actor": "Client",
          "input": "GET /posts/{id}",
          "owner": "PostController",
          "action": "단건 조회 요청을 Query Service로 넘깁니다.",
          "output": "id",
          "note": "Controller는 캐시와 DB 선택을 직접 판단하지 않습니다.",
          "id": "lookup-flow-step-1",
          "from": "Client",
          "to": "PostController",
          "message": "단건 조회 요청을 Query Service로 넘깁니다.",
          "messageKind": "request",
          "problem": "GET /posts/{id}",
          "concept": "PostController",
          "check": "id",
          "codePointIds": [
            "cache-aside-query",
            "redis-ttl"
          ]
        },
        {
          "order": 2,
          "actor": "PostQueryService",
          "input": "id",
          "owner": "PostCacheService",
          "action": "Redis key로 캐시를 먼저 조회합니다.",
          "output": "hit or miss",
          "note": "캐시는 DB 앞에 놓인 빠른 조회 후보입니다.",
          "id": "lookup-flow-step-2",
          "from": "PostQueryService",
          "to": "PostCacheService",
          "message": "Redis key로 캐시를 먼저 조회합니다.",
          "messageKind": "request",
          "problem": "id",
          "concept": "PostCacheService",
          "check": "hit or miss",
          "codePointIds": [
            "redis-ttl",
            "cache-aside-query"
          ]
        },
        {
          "order": 3,
          "actor": "PostCacheService",
          "input": "cache hit",
          "owner": "Redis",
          "action": "캐시된 응답을 바로 돌려줍니다.",
          "output": "Cached PostResponse",
          "note": "hit이면 DB 조회 비용을 줄입니다.",
          "id": "lookup-flow-step-3",
          "from": "PostCacheService",
          "to": "Redis",
          "message": "캐시된 응답을 바로 돌려줍니다.",
          "messageKind": "request",
          "problem": "cache hit",
          "concept": "Redis",
          "check": "Cached PostResponse",
          "codePointIds": [
            "cache-aside-query",
            "redis-ttl"
          ]
        },
        {
          "order": 4,
          "actor": "PostCacheService",
          "input": "cache miss",
          "owner": "PostQueryService",
          "action": "DB 조회로 fallback합니다.",
          "output": "DB lookup",
          "note": "miss는 오류가 아니라 정상적인 첫 조회 또는 TTL 만료 흐름입니다.",
          "id": "lookup-flow-step-4",
          "from": "PostCacheService",
          "to": "PostQueryService",
          "message": "DB 조회로 fallback합니다.",
          "messageKind": "request",
          "problem": "cache miss",
          "concept": "PostQueryService",
          "check": "DB lookup",
          "codePointIds": [
            "redis-ttl",
            "cache-aside-query"
          ]
        },
        {
          "order": 5,
          "actor": "PostQueryService",
          "input": "DB result",
          "owner": "PostCacheService",
          "action": "응답을 TTL과 함께 캐시에 저장합니다.",
          "output": "Cache write",
          "note": "다음 같은 요청이 hit로 바뀔 수 있습니다.",
          "id": "lookup-flow-step-5",
          "from": "PostQueryService",
          "to": "PostCacheService",
          "message": "응답을 TTL과 함께 캐시에 저장합니다.",
          "messageKind": "response",
          "problem": "DB result",
          "concept": "PostCacheService",
          "check": "Cache write",
          "codePointIds": [
            "cache-aside-query",
            "redis-ttl"
          ]
        }
      ],
      "bandKind": "scenario"
    },
    {
      "id": "stale-data",
      "title": "수정/삭제 성공 후 evict",
      "summary": "DB 쓰기가 성공한 뒤 해당 게시글 key를 즉시 제거해 stale data 구간을 줄입니다.",
      "steps": [
        {
          "order": 1,
          "actor": "Client",
          "input": "PUT or DELETE /posts/{id}",
          "owner": "PostController / PostService",
          "action": "DB 데이터를 수정하거나 삭제합니다.",
          "output": "Changed data",
          "note": "실패한 쓰기 때문에 정상 캐시를 먼저 지우지 않도록 DB 성공을 먼저 확인합니다.",
          "id": "stale-data-step-1",
          "from": "Client",
          "to": "PostController / PostService",
          "message": "DB 데이터를 수정하거나 삭제합니다.",
          "messageKind": "request",
          "problem": "PUT or DELETE /posts/{id}",
          "concept": "PostController / PostService",
          "check": "Changed data",
          "codePointIds": [
            "cache-aside-query",
            "redis-ttl"
          ]
        },
        {
          "order": 2,
          "actor": "PostController",
          "input": "Changed data",
          "owner": "PostCacheService",
          "action": "postCacheService.evict(id)로 해당 key를 제거합니다.",
          "output": "Evicted post:{id}",
          "note": "TTL은 자동 만료이고 evict는 쓰기 직후 정리입니다.",
          "id": "stale-data-step-2",
          "from": "PostController",
          "to": "PostCacheService",
          "message": "DB 쓰기 성공 후 해당 id의 캐시를 제거합니다.",
          "messageKind": "request",
          "problem": "Changed data",
          "concept": "PostCacheService",
          "check": "Evicted post:{id}",
          "codePointIds": [
            "redis-ttl",
            "cache-aside-query"
          ]
        },
        {
          "order": 3,
          "actor": "Client",
          "input": "GET after update/delete",
          "owner": "Cache Lookup",
          "action": "cache miss 뒤 DB에서 최신 응답을 다시 읽습니다.",
          "output": "Fresh response",
          "note": "수정/삭제 후 evict 호출은 자동 테스트로도 확인합니다.",
          "id": "stale-data-step-3",
          "from": "Client",
          "to": "Cache Lookup",
          "message": "cache miss 뒤 최신 원본을 조회합니다.",
          "messageKind": "response",
          "problem": "GET after update/delete",
          "concept": "Cache Lookup",
          "check": "Fresh response",
          "codePointIds": [
            "cache-aside-query",
            "redis-ttl"
          ]
        },
        {
          "id": "stale-data-check-4",
          "order": 4,
          "actor": "Cache Lookup",
          "owner": "확인 지점",
          "from": "Cache Lookup",
          "to": "확인 지점",
          "message": "결과와 실패 지점을 확인합니다.",
          "messageKind": "response",
          "problem": "구현 후 실제로 어느 지점이 통과했는지 확인해야 합니다.",
          "concept": "Verification",
          "action": "문서의 확인 명령이나 화면에서 결과를 검증합니다.",
          "check": "성공 흐름과 실패 흐름을 말로 설명합니다.",
          "note": "Visual Lab은 코드를 대신 완성하지 않고 확인 지점을 고정합니다.",
          "codePointIds": [
            "redis-ttl"
          ]
        }
      ],
      "bandKind": "scenario"
    }
  ],
  "flow": [
    {
      "id": "lookup-flow-step-1",
      "label": "PostController",
      "problem": "GET /posts/{id}",
      "concept": "PostController",
      "action": "단건 조회 요청을 Query Service로 넘깁니다.",
      "check": "id",
      "codePointIds": [
        "cache-aside-query",
        "redis-ttl"
      ]
    },
    {
      "id": "lookup-flow-step-2",
      "label": "PostCacheService",
      "problem": "id",
      "concept": "PostCacheService",
      "action": "Redis key로 캐시를 먼저 조회합니다.",
      "check": "hit or miss",
      "codePointIds": [
        "redis-ttl",
        "cache-aside-query"
      ]
    },
    {
      "id": "lookup-flow-step-3",
      "label": "Redis",
      "problem": "cache hit",
      "concept": "Redis",
      "action": "캐시된 응답을 바로 돌려줍니다.",
      "check": "Cached PostResponse",
      "codePointIds": [
        "cache-aside-query",
        "redis-ttl"
      ]
    },
    {
      "id": "lookup-flow-step-4",
      "label": "PostQueryService",
      "problem": "cache miss",
      "concept": "PostQueryService",
      "action": "DB 조회로 fallback합니다.",
      "check": "DB lookup",
      "codePointIds": [
        "redis-ttl",
        "cache-aside-query"
      ]
    },
    {
      "id": "lookup-flow-step-5",
      "label": "PostCacheService",
      "problem": "DB result",
      "concept": "PostCacheService",
      "action": "응답을 TTL과 함께 캐시에 저장합니다.",
      "check": "Cache write",
      "codePointIds": [
        "cache-aside-query",
        "redis-ttl"
      ]
    }
  ],
  "codePoints": [
    {
      "id": "cache-aside-query",
      "title": "cache-aside는 캐시를 먼저 보고 없으면 DB로 내려갑니다",
      "file": "src/main/kotlin/com/andi/rest_crud/service/PostQueryService.kt",
      "language": "kotlin",
      "snippet": "fun getPost(id: Long): PostResponse {\n    val cached = postCacheService.get(id)\n    if (cached != null) {\n        logger.info(\"cache hit for post {}\", id)\n        return cached\n    }\n\n    logger.info(\"cache miss for post {}\", id)\n    val response = postService.getById(id)\n    postCacheService.set(id, response)\n    return response\n}",
      "explanation": "이 파일은 `07-implementation` 브랜치 기준 경로입니다. 조회 흐름에서 cache hit와 miss의 갈림길을 코드로 확인합니다.",
      "check": "같은 id 조회가 두 번째부터 캐시를 타는지 로그로 확인합니다."
    },
    {
      "id": "redis-ttl",
      "title": "Redis 저장은 key와 TTL을 함께 봅니다",
      "file": "src/main/kotlin/com/andi/rest_crud/service/PostCacheService.kt",
      "language": "kotlin",
      "snippet": "fun set(postId: Long, response: PostResponse) {\n    val value = objectMapper.writeValueAsString(response)\n    stringRedisTemplate.opsForValue().set(key(postId), value, ttl())\n}\n\nfun evict(postId: Long) {\n    stringRedisTemplate.delete(key(postId))\n}",
      "explanation": "이 파일은 `07-implementation` 브랜치 기준 경로입니다. 캐시는 DB를 대체하지 않고 조회 결과를 제한된 시간 동안 저장합니다.",
      "check": "수정/삭제가 성공한 뒤 해당 게시글 key를 evict하는지 확인합니다."
    }
  ],
  "concepts": [
    {
      "title": "Cache-aside",
      "body": "애플리케이션이 캐시를 먼저 보고 없으면 DB를 조회한 뒤 캐시에 채웁니다."
    },
    {
      "title": "Cache hit",
      "body": "캐시에 데이터가 있어 DB를 건너뛰는 조회 흐름입니다."
    },
    {
      "title": "Cache miss",
      "body": "캐시에 데이터가 없어 DB로 fallback하는 정상 흐름입니다."
    },
    {
      "title": "TTL",
      "body": "캐시 데이터가 일정 시간이 지나면 자연스럽게 만료되도록 하는 기준입니다."
    }
  ],
  "practice": [
    "첫 조회와 두 번째 조회가 각각 miss/hit로 나뉘는 이유를 설명할 수 있나요?",
    "cache-aside에서 DB fallback이 언제 일어나는지 말할 수 있나요?",
    "TTL과 캐시 무효화가 필요한 이유를 설명할 수 있나요?",
    "게시글 수정 직후 캐시를 지우지 않으면 어떤 응답이 나갈 수 있나요?"
  ],
  "mentorHints": [],
  "relatedDocs": [
    {
      "label": "이론 정리",
      "href": "../../../theory.md"
    },
    {
      "label": "구현 안내",
      "href": "../../../implementation.md"
    },
    {
      "label": "체크리스트",
      "href": "../../../checklist.md"
    }
  ],
  "relatedCode": [],
  "topic": "Caching and Redis",
  "question": "같은 게시글을 반복 조회할 때 왜 매번 DB까지 가면 안 될까?",
  "sourceDocs": [
    {
      "label": "이론 정리",
      "href": "../../../theory.md"
    },
    {
      "label": "구현 안내",
      "href": "../../../implementation.md"
    },
    {
      "label": "체크리스트",
      "href": "../../../checklist.md"
    }
  ],
  "why": {
    "problem": "자주 조회되는 데이터도 매번 DB에서만 읽으면 같은 요청이 같은 비용을 반복하게 됩니다.",
    "limits": [
      "캐시를 붙여도 언제 DB를 읽고 언제 캐시를 쓰는지 모르면 장애 원인을 찾기 어렵습니다.",
      "miss를 오류로 보면 첫 조회와 TTL 만료 후 조회를 잘못 해석합니다.",
      "수정/삭제 후 캐시를 정리하지 않으면 오래된 응답이 나갈 수 있습니다."
    ],
    "choice": "게시글 단건 조회 앞에 cache-aside 흐름을 붙여 캐시 조회, DB fallback, 캐시 저장 책임을 분리합니다."
  },
  "overview": [
    "Request",
    "PostQueryService",
    "Cache Lookup",
    "Hit or Miss",
    "DB Fallback",
    "Cache Write",
    "Response"
  ],
  "responsibilities": [
    {
      "name": "PostController",
      "role": "조회 요청의 HTTP 경계를 담당합니다.",
      "caution": "캐시 hit/miss 판단을 직접 맡지 않습니다."
    },
    {
      "name": "PostQueryService",
      "role": "캐시 조회와 DB fallback 흐름을 조립합니다.",
      "caution": "캐시 저장 세부 구현을 직접 흩뿌리지 않습니다."
    },
    {
      "name": "PostCacheService",
      "role": "Redis key, JSON 변환, TTL을 모읍니다.",
      "caution": "비즈니스 조회 정책까지 모두 떠안지 않습니다."
    },
    {
      "name": "Redis",
      "role": "빠른 key-value 조회와 TTL 기반 만료를 제공합니다.",
      "caution": "DB의 영속 저장 책임을 대체하지 않습니다."
    }
  ],
  "glossary": [
    {
      "term": "Cache",
      "meaning": "자주 읽는 데이터를 빠르게 찾기 위한 임시 저장소입니다.",
      "caution": "영구 저장소가 아니며 DB와 역할이 다릅니다."
    },
    {
      "term": "Redis",
      "meaning": "메모리 기반 key-value 저장소로 캐시에 자주 사용됩니다.",
      "caution": "빠르지만 데이터 일관성 정책을 함께 설계해야 합니다."
    },
    {
      "term": "Cache-aside",
      "meaning": "캐시 조회 후 miss이면 DB 조회와 캐시 저장을 애플리케이션이 처리하는 패턴입니다.",
      "caution": "캐시와 DB의 역할을 동시에 이해해야 합니다."
    },
    {
      "term": "Hit / Miss",
      "meaning": "hit는 캐시에 있음, miss는 캐시에 없어 DB로 내려감을 뜻합니다.",
      "caution": "miss는 실패가 아닙니다."
    },
    {
      "term": "Stale data",
      "meaning": "DB는 바뀌었지만 캐시에 남아 있는 오래된 데이터입니다.",
      "caution": "수정/삭제 이후 캐시 정책을 확인해야 합니다."
    }
  ],
  "practical": [
    {
      "title": "miss는 정상 흐름입니다",
      "body": "첫 조회나 TTL 만료 후 miss가 발생하고, 이때 DB fallback이 이어져야 합니다."
    },
    {
      "title": "캐시는 성능만의 문제가 아닙니다",
      "body": "수정/삭제 이후 오래된 응답을 막는 일관성 정책이 함께 필요합니다."
    },
    {
      "title": "Redis 장애를 DB 장애처럼 보지 않습니다",
      "body": "캐시 장애와 DB 장애는 fallback 가능성과 사용자 영향이 다릅니다."
    }
  ],
  "checks": [
    "첫 조회와 두 번째 조회가 각각 miss/hit로 나뉘는 이유를 설명할 수 있나요?",
    "cache-aside에서 DB fallback이 언제 일어나는지 말할 수 있나요?",
    "TTL과 캐시 무효화가 필요한 이유를 설명할 수 있나요?",
    "게시글 수정 직후 캐시를 지우지 않으면 어떤 응답이 나갈 수 있나요?"
  ],
  "next": {
    "id": "08",
    "title": "Realtime WebSocket",
    "reason": "캐시로 읽기 흐름을 최적화했다면, 다음에는 HTTP 요청/응답을 넘어 서버가 연결된 클라이언트에게 다시 메시지를 보내는 실시간 흐름을 봅니다."
  }
};
