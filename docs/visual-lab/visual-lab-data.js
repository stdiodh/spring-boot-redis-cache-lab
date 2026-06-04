window.visualLabData = {
  "kind": "hub",
  "sequence": "07",
  "title": "Redis Cache Visual Lab",
  "description": "게시글 단건 조회에 cache-aside 흐름을 붙이고 cache hit, miss, DB fallback, stale data 위험을 구분합니다.",
  "repo": {
    "name": "spring-boot-redis-cache-lab",
    "path": "spring-boot-redis-cache-lab"
  },
  "visualLabPath": "docs/visual-lab/index.html",
  "visualLabHubPath": "docs/visual-lab/index.html",
  "flow": [
    {
      "id": "cache-aside",
      "label": "Cache-aside 조회",
      "problem": "매번 DB만 조회하면 자주 읽는 데이터에서도 같은 비용을 반복합니다.",
      "concept": "Cache lookup, hit, miss, TTL",
      "action": "캐시를 먼저 조회하고 miss일 때 DB fallback 후 캐시에 저장합니다.",
      "check": "첫 조회와 두 번째 조회의 hit/miss 흐름을 구분합니다."
    }
  ],
  "sequences": [
    {
      "sequence": "07",
      "id": "07",
      "title": "Redis Cache",
      "topic": "Caching and Redis",
      "href": "./sequences/07/index.html",
      "summary": "같은 게시글을 반복 조회할 때 왜 매번 DB까지 가면 안 될까?"
    }
  ]
};
