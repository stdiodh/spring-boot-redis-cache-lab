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
      "title": "수정/삭제 이후 stale data 검토",
      "summary": "조회 캐시를 붙이면 쓰기 작업 이후 캐시를 언제 지울지 함께 판단해야 합니다.",
      "steps": [
        {
          "order": 1,
          "actor": "Client",
          "input": "PUT or DELETE /posts/{id}",
          "owner": "PostService",
          "action": "DB 데이터를 수정하거나 삭제합니다.",
          "output": "Changed data",
          "note": "DB는 바뀌었지만 캐시가 그대로 남을 수 있습니다.",
          "id": "stale-data-step-1",
          "from": "Client",
          "to": "PostService",
          "message": "DB 데이터를 수정하거나 삭제합니다.",
          "messageKind": "request",
          "problem": "PUT or DELETE /posts/{id}",
          "concept": "PostService",
          "check": "Changed data",
          "codePointIds": [
            "cache-aside-query",
            "redis-ttl"
          ]
        },
        {
          "order": 2,
          "actor": "PostService",
          "input": "Changed data",
          "owner": "Cache policy",
          "action": "해당 id의 캐시 삭제 또는 갱신 필요성을 판단합니다.",
          "output": "Invalidate candidate",
          "note": "캐시 무효화는 성능보다 일관성 질문에 가깝습니다.",
          "id": "stale-data-step-2",
          "from": "PostService",
          "to": "Cache policy",
          "message": "해당 id의 캐시 삭제 또는 갱신 필요성을 판단합니다.",
          "messageKind": "request",
          "problem": "Changed data",
          "concept": "Cache policy",
          "check": "Invalidate candidate",
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
          "action": "남은 캐시가 오래된 응답을 내보내는지 확인합니다.",
          "output": "Fresh or stale response",
          "note": "stale data는 캐시를 붙인 뒤 반드시 리뷰해야 할 위험입니다.",
          "id": "stale-data-step-3",
          "from": "Client",
          "to": "Cache Lookup",
          "message": "남은 캐시가 오래된 응답을 내보내는지 확인합니다.",
          "messageKind": "response",
          "problem": "GET after update/delete",
          "concept": "Cache Lookup",
          "check": "Fresh or stale response",
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
      "snippet": "fun set(postId: Long, response: PostResponse) {\n    val value = objectMapper.writeValueAsString(response)\n    stringRedisTemplate.opsForValue().set(key(postId), value, ttl())\n}\n\nfun key(postId: Long): String = \"post:$postId\"\n\nfun ttl(): Duration = Duration.ofSeconds(postTtlSeconds)",
      "explanation": "이 파일은 `07-implementation` 브랜치 기준 경로입니다. 캐시는 DB를 대체하지 않고 조회 결과를 제한된 시간 동안 저장합니다.",
      "check": "현재 답안에는 evict가 없으므로 수정/삭제 후 stale data가 생길 수 있는 지점을 찾습니다."
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
      "label": "레포 가이드",
      "href": "../../../repo-guide.md"
    },
    {
      "label": "시퀀스 맵",
      "href": "../../../sequence-map.md"
    },
    {
      "label": "브랜치 가이드",
      "href": "../../../branch-guide.md"
    }
  ],
  "relatedCode": [],
  "sequences": [
    {
      "id": "07",
      "title": "Redis Cache",
      "topic": "Caching and Redis",
      "question": "같은 게시글을 반복 조회할 때 왜 매번 DB까지 가면 안 될까?",
      "goal": "Cache-aside 패턴에서 cache hit와 miss, DB fallback, TTL, invalidation 판단 기준을 함께 이해합니다.",
      "sourceDocs": [
        {
          "label": "레포 가이드",
          "href": "../../../repo-guide.md"
        },
        {
          "label": "시퀀스 맵",
          "href": "../../../sequence-map.md"
        },
        {
          "label": "브랜치 가이드",
          "href": "../../../branch-guide.md"
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
          "title": "수정/삭제 이후 stale data 검토",
          "summary": "조회 캐시를 붙이면 쓰기 작업 이후 캐시를 언제 지울지 함께 판단해야 합니다.",
          "steps": [
            {
              "order": 1,
              "actor": "Client",
              "input": "PUT or DELETE /posts/{id}",
              "owner": "PostService",
              "action": "DB 데이터를 수정하거나 삭제합니다.",
              "output": "Changed data",
              "note": "DB는 바뀌었지만 캐시가 그대로 남을 수 있습니다.",
              "id": "stale-data-step-1",
              "from": "Client",
              "to": "PostService",
              "message": "DB 데이터를 수정하거나 삭제합니다.",
              "messageKind": "request",
              "problem": "PUT or DELETE /posts/{id}",
              "concept": "PostService",
              "check": "Changed data",
              "codePointIds": [
                "cache-aside-query",
                "redis-ttl"
              ]
            },
            {
              "order": 2,
              "actor": "PostService",
              "input": "Changed data",
              "owner": "Cache policy",
              "action": "해당 id의 캐시 삭제 또는 갱신 필요성을 판단합니다.",
              "output": "Invalidate candidate",
              "note": "캐시 무효화는 성능보다 일관성 질문에 가깝습니다.",
              "id": "stale-data-step-2",
              "from": "PostService",
              "to": "Cache policy",
              "message": "해당 id의 캐시 삭제 또는 갱신 필요성을 판단합니다.",
              "messageKind": "request",
              "problem": "Changed data",
              "concept": "Cache policy",
              "check": "Invalidate candidate",
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
              "action": "남은 캐시가 오래된 응답을 내보내는지 확인합니다.",
              "output": "Fresh or stale response",
              "note": "stale data는 캐시를 붙인 뒤 반드시 리뷰해야 할 위험입니다.",
              "id": "stale-data-step-3",
              "from": "Client",
              "to": "Cache Lookup",
              "message": "남은 캐시가 오래된 응답을 내보내는지 확인합니다.",
              "messageKind": "response",
              "problem": "GET after update/delete",
              "concept": "Cache Lookup",
              "check": "Fresh or stale response",
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
          "snippet": "fun set(postId: Long, response: PostResponse) {\n    val value = objectMapper.writeValueAsString(response)\n    stringRedisTemplate.opsForValue().set(key(postId), value, ttl())\n}\n\nfun key(postId: Long): String = \"post:$postId\"\n\nfun ttl(): Duration = Duration.ofSeconds(postTtlSeconds)",
          "explanation": "이 파일은 `07-implementation` 브랜치 기준 경로입니다. 캐시는 DB를 대체하지 않고 조회 결과를 제한된 시간 동안 저장합니다.",
          "check": "현재 답안에는 evict가 없으므로 수정/삭제 후 stale data가 생길 수 있는 지점을 찾습니다."
        }
      ],
      "problem": "자주 조회되는 데이터도 매번 DB에서만 읽으면 같은 요청이 같은 비용을 반복하게 됩니다."
    }
  ]
};
