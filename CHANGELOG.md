# CHANGELOG

<!-- version list -->

## v1.18.9-beta.2 (2026-06-10)

### Bug Fixes

- Migrate scripts attach to updateNodeInScene + add pathExists error-path tests
  ([#845](https://github.com/n24q02m/better-godot-mcp/pull/845),
  [`23d71c8`](https://github.com/n24q02m/better-godot-mcp/commit/23d71c8753c57d05901e5407200484de86ede5a4))

- **animation**: Refactor handleAnimation into modular handlers
  ([#838](https://github.com/n24q02m/better-godot-mcp/pull/838),
  [`b78431b`](https://github.com/n24q02m/better-godot-mcp/commit/b78431bee965c98be11c8df44782ec62af854063))

- **godot**: Improve robustness of execGodotAsync error handling
  ([#834](https://github.com/n24q02m/better-godot-mcp/pull/834),
  [`bb6899e`](https://github.com/n24q02m/better-godot-mcp/commit/bb6899e80dd32f73c8dcdfdc7e64f253cdf8e73a))

- **nodes**: Improve node path normalization
  ([#836](https://github.com/n24q02m/better-godot-mcp/pull/836),
  [`e295b6e`](https://github.com/n24q02m/better-godot-mcp/commit/e295b6edbdb879187767e8fc28a8cac300b607bc))

### Performance Improvements

- Avoid unnecessary Object.keys allocation in updateNodeInScene
  ([#835](https://github.com/n24q02m/better-godot-mcp/pull/835),
  [`955cc40`](https://github.com/n24q02m/better-godot-mcp/commit/955cc400a36d3bb68efc18b7f1afd2158d99c61f))

- Optimize O(N) lookups and fix CI issues
  ([#842](https://github.com/n24q02m/better-godot-mcp/pull/842),
  [`0226608`](https://github.com/n24q02m/better-godot-mcp/commit/0226608749f97e4e5e8a664d0fbf02fa4dc9ec8b))

- Optimize O(N) lookups and redundant parsing
  ([#842](https://github.com/n24q02m/better-godot-mcp/pull/842),
  [`0226608`](https://github.com/n24q02m/better-godot-mcp/commit/0226608749f97e4e5e8a664d0fbf02fa4dc9ec8b))

- Optimize serializeGodotObject property iteration
  ([#829](https://github.com/n24q02m/better-godot-mcp/pull/829),
  [`75ba46f`](https://github.com/n24q02m/better-godot-mcp/commit/75ba46f0db8677004dbd773e6ca774b05d4f172f))

- **audio**: Optimize string allocations in bus scanning
  ([#837](https://github.com/n24q02m/better-godot-mcp/pull/837),
  [`5f6b0a5`](https://github.com/n24q02m/better-godot-mcp/commit/5f6b0a52343bd5844a16a9d08955db7032e24217))

- **audio**: Replace pathExists with try-catch on readFile
  ([#825](https://github.com/n24q02m/better-godot-mcp/pull/825),
  [`6a2583c`](https://github.com/n24q02m/better-godot-mcp/commit/6a2583cb04a8a8b282aefc12d7f0f2159443f290))


## v1.18.9-beta.1 (2026-06-10)

### Bug Fixes

- Add Comparison section to README capability matrix
  ([#823](https://github.com/n24q02m/better-godot-mcp/pull/823),
  [`c8025cc`](https://github.com/n24q02m/better-godot-mcp/commit/c8025cc7615ab119a30879c67473c520808f953f))

- Correct docs drift (security email, dead links, commit-type list, tool count)
  ([#822](https://github.com/n24q02m/better-godot-mcp/pull/822),
  [`b9b9aca`](https://github.com/n24q02m/better-godot-mcp/commit/b9b9acad654f729f75e11bdaa4602c310ac82c5e))

### Chores

- **deps**: Lock file maintenance ([#820](https://github.com/n24q02m/better-godot-mcp/pull/820),
  [`7cc83b9`](https://github.com/n24q02m/better-godot-mcp/commit/7cc83b92f21dfa6ef866f3dd333ecd52cce52cc1))

- **deps**: Update step-security/harden-runner digest to 9af89fc
  ([#818](https://github.com/n24q02m/better-godot-mcp/pull/818),
  [`337e429`](https://github.com/n24q02m/better-godot-mcp/commit/337e42983316ed898ad5685b893936e8aec0a9cf))


## v1.18.8 (2026-06-09)


## v1.18.8-beta.1 (2026-06-09)

### Bug Fixes

- [SECURITY] Command Injection via pid in taskkill
  ([#810](https://github.com/n24q02m/better-godot-mcp/pull/810),
  [`4e2fcb6`](https://github.com/n24q02m/better-godot-mcp/commit/4e2fcb6ac5f95b2ad7c6e9c78b2d9201ae2f4d5b))

- Gitignore bot/merge junk artifacts (*.orig/*.rej/*.patch/*.diff/*.cover/*.bak)
  ([#785](https://github.com/n24q02m/better-godot-mcp/pull/785),
  [`9da9eab`](https://github.com/n24q02m/better-godot-mcp/commit/9da9eabee9e9e705982476fd0621491fac9c8843))

### Chores

- **deps**: Lock file maintenance ([#789](https://github.com/n24q02m/better-godot-mcp/pull/789),
  [`d360fbe`](https://github.com/n24q02m/better-godot-mcp/commit/d360fbedcd0979057db67f1f5fa10af689d9babd))

- **deps**: Update codecov/codecov-action action to v7
  ([#788](https://github.com/n24q02m/better-godot-mcp/pull/788),
  [`9d8db66`](https://github.com/n24q02m/better-godot-mcp/commit/9d8db666828606dda05ae7e86c47edaa6efdf1fc))

### Testing

- Add missing error path tests for execGodotAsync
  ([#806](https://github.com/n24q02m/better-godot-mcp/pull/806),
  [`24b08aa`](https://github.com/n24q02m/better-godot-mcp/commit/24b08aaff82e17a6830429a0c24b84abb621cc90))


## v1.18.7 (2026-06-07)

### Bug Fixes

- Bump @n24q02m/mcp-core to 1.17.3 ([#784](https://github.com/n24q02m/better-godot-mcp/pull/784),
  [`d6b5314`](https://github.com/n24q02m/better-godot-mcp/commit/d6b5314cccb90f584b24ff026ac24c435dd7f121))


## v1.18.6 (2026-06-07)


## v1.18.6-beta.1 (2026-06-07)

### Bug Fixes

- Confine caller project_path to trusted root across tool handlers
  ([#782](https://github.com/n24q02m/better-godot-mcp/pull/782),
  [`31c770a`](https://github.com/n24q02m/better-godot-mcp/commit/31c770a6a3bdb7a463e8e3a02f80013eedc7fdd8))

- **helpers**: Refactor prefix match in findClosestMatch
  ([#729](https://github.com/n24q02m/better-godot-mcp/pull/729),
  [`d9eaff8`](https://github.com/n24q02m/better-godot-mcp/commit/d9eaff832092d42643cde5225f6319933378f6e5))

- **registry**: Refactor long description strings for readability
  ([#780](https://github.com/n24q02m/better-godot-mcp/pull/780),
  [`6fee031`](https://github.com/n24q02m/better-godot-mcp/commit/6fee0316a1c8548e3c27bae22990fdbb13547355))

- **security**: Prevent command injection via pid in taskkill
  ([#774](https://github.com/n24q02m/better-godot-mcp/pull/774),
  [`c280b96`](https://github.com/n24q02m/better-godot-mcp/commit/c280b96e9900eeb0eb51f52b229de041a63d9965))

### Chores

- Implement centralized logger and replace direct console.error usage
  ([#763](https://github.com/n24q02m/better-godot-mcp/pull/763),
  [`c0d24d7`](https://github.com/n24q02m/better-godot-mcp/commit/c0d24d72dc671347d69f2f9d7c6258474459a3d9))

- **deps**: Update actions/checkout digest to df4cb1c
  ([#726](https://github.com/n24q02m/better-godot-mcp/pull/726),
  [`09b147b`](https://github.com/n24q02m/better-godot-mcp/commit/09b147b3e90339519b10b941db66447d1716ac75))

### Performance Improvements

- Optimize file read operations in scenes tool
  ([#767](https://github.com/n24q02m/better-godot-mcp/pull/767),
  [`af5a885`](https://github.com/n24q02m/better-godot-mcp/commit/af5a885cc48792ddfa85de2fd015a74ea5edbfee))

- Optimize scene node and signal connection lookups
  ([#736](https://github.com/n24q02m/better-godot-mcp/pull/736),
  [`3fe2135`](https://github.com/n24q02m/better-godot-mcp/commit/3fe2135d6ac0bdbadc271d6c4d02a7b5f5a5485d))

- Optimize sequential filesystem operations in resources tool
  ([#732](https://github.com/n24q02m/better-godot-mcp/pull/732),
  [`5369859`](https://github.com/n24q02m/better-godot-mcp/commit/5369859382f6d4772d4e1f1eb6df1541d6a3b0b1))

### Testing

- Add missing error path tests for execGodotAsync
  ([#775](https://github.com/n24q02m/better-godot-mcp/pull/775),
  [`8592d11`](https://github.com/n24q02m/better-godot-mcp/commit/8592d11992d0e923b64a354ab92476c932634847))

- **helpers**: Add error path test for pathExists and canonicalize
  ([#740](https://github.com/n24q02m/better-godot-mcp/pull/740),
  [`36552a6`](https://github.com/n24q02m/better-godot-mcp/commit/36552a6f6f27a7593fca04de2f2f68f6c9a7a1eb))


## v1.18.5 (2026-06-01)

### Bug Fixes

- Pin mcp-core 1.17.2 (stable)
  ([`9752293`](https://github.com/n24q02m/better-godot-mcp/commit/97522937660277989e4eb349b89181facc0e4687))


## v1.18.5-beta.1 (2026-06-01)

### Bug Fixes

- Bump mcp-core to 1.17.2-beta.1 for beta testing
  ([`11dd1f5`](https://github.com/n24q02m/better-godot-mcp/commit/11dd1f51df9428609a9ff392cea0692aaa61a7a0))

- Npm lock file maintenance ([#714](https://github.com/n24q02m/better-godot-mcp/pull/714),
  [`659c859`](https://github.com/n24q02m/better-godot-mcp/commit/659c859b47d17c26d773c349b3c29f1856bb3578))

- Repoint dead docs/setup-manual.md link to hosted setup guide
  ([#720](https://github.com/n24q02m/better-godot-mcp/pull/720),
  [`fd68e02`](https://github.com/n24q02m/better-godot-mcp/commit/fd68e02e9020d1c02047f8c68f99d88eeaa28a14))

- Sync docs to actual transport defaults and tool count
  ([#719](https://github.com/n24q02m/better-godot-mcp/pull/719),
  [`c267309`](https://github.com/n24q02m/better-godot-mcp/commit/c267309969293c084f50dc8417954a3a967968da))


## v1.18.4 (2026-05-29)

### Bug Fixes

- Pin mcp-core 1.17.1 (BearerMCPApp resource_metadata #260)
  ([`a3c102d`](https://github.com/n24q02m/better-godot-mcp/commit/a3c102d51d7b28a1d89ebd8a91418ac9aa3e674f))


## v1.18.3 (2026-05-29)

### Bug Fixes

- Canonicalize paths in safeResolve to block symlink traversal
  ([#708](https://github.com/n24q02m/better-godot-mcp/pull/708),
  [`a26ed8e`](https://github.com/n24q02m/better-godot-mcp/commit/a26ed8ea757f956e8c13f945f664e3924c9fcbb5))

- Pin mcp-core 1.17.0 (stable OAuth refresh_token)
  ([`9cb4708`](https://github.com/n24q02m/better-godot-mcp/commit/9cb4708c9822e3456b9b622d421f18ec47ddf900))


## v1.18.3-beta.1 (2026-05-29)

### Bug Fixes

- Add detector execFileSync error test
  ([#685](https://github.com/n24q02m/better-godot-mcp/pull/685),
  [`d46104c`](https://github.com/n24q02m/better-godot-mcp/commit/d46104c93c932e752bf0fb157fde5aaa2a4fb538))

- Add registerTools coverage tests ([#696](https://github.com/n24q02m/better-godot-mcp/pull/696),
  [`9a02cff`](https://github.com/n24q02m/better-godot-mcp/commit/9a02cff0c6efcb4c0047e8eddbdbd805bf308971))

- Bump mcp-core to 1.17.0-beta.1 for OAuth refresh_token
  ([`b92c257`](https://github.com/n24q02m/better-godot-mcp/commit/b92c257da5eab441015a0dc966969ea5ded0778b))

- Update package-lock dependencies ([#707](https://github.com/n24q02m/better-godot-mcp/pull/707),
  [`8fd7305`](https://github.com/n24q02m/better-godot-mcp/commit/8fd7305496ef121fbb9978fbb8503f3a6b1be000))


## v1.18.2 (2026-05-28)


## v1.18.2-beta.1 (2026-05-28)

### Bug Fixes

- Prevent XPIA scene injection in UI tool properties
  ([#682](https://github.com/n24q02m/better-godot-mcp/pull/682),
  [`c7c7a5d`](https://github.com/n24q02m/better-godot-mcp/commit/c7c7a5d1007a4a7192324dc383262b53e7f49421))

- **deps**: Refresh bun.lock to match pyproject after Wave 9 Renovate bumps
  ([`a5bbe44`](https://github.com/n24q02m/better-godot-mcp/commit/a5bbe447e8124e85c057e9572bcb990040ba74bd))

- **deps**: Update non-major dependencies
  ([#678](https://github.com/n24q02m/better-godot-mcp/pull/678),
  [`61f0ec3`](https://github.com/n24q02m/better-godot-mcp/commit/61f0ec3ab80a5b47e5547557448e92f910a8a5f1))

### Chores

- **deps**: Lock file maintenance ([#679](https://github.com/n24q02m/better-godot-mcp/pull/679),
  [`f29cf28`](https://github.com/n24q02m/better-godot-mcp/commit/f29cf2864e7a716f59e1c84b38e8434ef89a6122))

### Performance Improvements

- Optimize parseProjectGodot string parsing
  ([#680](https://github.com/n24q02m/better-godot-mcp/pull/680),
  [`943fc35`](https://github.com/n24q02m/better-godot-mcp/commit/943fc35b71a20e6d6735ba886e6fc0028e24fb4a))


## v1.18.1 (2026-05-26)

### Chores

- Log UX constraints in palette persona journal
  ([#676](https://github.com/n24q02m/better-godot-mcp/pull/676),
  [`5f48828`](https://github.com/n24q02m/better-godot-mcp/commit/5f488283d852ef3f09a987f2d9f7ba3fe304007e))

- **deps**: Lock file maintenance ([#674](https://github.com/n24q02m/better-godot-mcp/pull/674),
  [`75a56c1`](https://github.com/n24q02m/better-godot-mcp/commit/75a56c118201fdd4ba568b60674e49963283ae03))

### Performance Improvements

- **physics**: Replace regex with replaceAll for string replacements
  ([#675](https://github.com/n24q02m/better-godot-mcp/pull/675),
  [`342c4b3`](https://github.com/n24q02m/better-godot-mcp/commit/342c4b311c227fe4f541635de730fc46aab77ac1))


## v1.18.1-beta.1 (2026-05-24)

### Bug Fixes

- Biome format multi-line function call in scene-parser test
  ([`643f66d`](https://github.com/n24q02m/better-godot-mcp/commit/643f66dd4f3a08960a1cceb3c747f10508a353d7))

- **deps**: Regenerate bun.lock and sync biome schema ref
  ([#644](https://github.com/n24q02m/better-godot-mcp/pull/644),
  [`081100c`](https://github.com/n24q02m/better-godot-mcp/commit/081100c73dc781a239f06dd5942a0514935a087f))

- **security**: Block argument and scene file injection across tools
  ([#664](https://github.com/n24q02m/better-godot-mcp/pull/664),
  [`a53a196`](https://github.com/n24q02m/better-godot-mcp/commit/a53a196a4a6f481ab49b3abc69dd1311a5598510))

### Chores

- **deps**: Lock file maintenance ([#642](https://github.com/n24q02m/better-godot-mcp/pull/642),
  [`fce5737`](https://github.com/n24q02m/better-godot-mcp/commit/fce5737dec8e22f97b6eec31ec7ce26dc5fd39e1))

- **deps**: Update actions/create-github-app-token digest to bcd2ba4
  ([#649](https://github.com/n24q02m/better-godot-mcp/pull/649),
  [`39d7ac7`](https://github.com/n24q02m/better-godot-mcp/commit/39d7ac7cd5e267bcf33e5ffb3bc103ac70f0e9dc))

- **deps**: Update actions/dependency-review-action action to v5
  ([#641](https://github.com/n24q02m/better-godot-mcp/pull/641),
  [`0e41f4a`](https://github.com/n24q02m/better-godot-mcp/commit/0e41f4a349a93bdf49c9079a699ea354d88257b8))

- **deps**: Update codecov/codecov-action digest to e79a696
  ([#667](https://github.com/n24q02m/better-godot-mcp/pull/667),
  [`652365c`](https://github.com/n24q02m/better-godot-mcp/commit/652365cf3cdbd8b4df20a8dd8ab64f1d16395fde))

- **deps**: Update docker/build-push-action digest to f9f3042
  ([#668](https://github.com/n24q02m/better-godot-mcp/pull/668),
  [`ace59f1`](https://github.com/n24q02m/better-godot-mcp/commit/ace59f151bbc867a62b519c5124486c9dac918e4))

- **deps**: Update docker/login-action digest to 650006c
  ([#669](https://github.com/n24q02m/better-godot-mcp/pull/669),
  [`b2adb61`](https://github.com/n24q02m/better-godot-mcp/commit/b2adb616ec50b0ff1448b1174c7206c32a6e772b))

- **deps**: Update docker/setup-buildx-action digest to d7f5e7f
  ([#671](https://github.com/n24q02m/better-godot-mcp/pull/671),
  [`0ef20df`](https://github.com/n24q02m/better-godot-mcp/commit/0ef20dfa44d1d1f13b428a403422387ef00b1888))

- **deps**: Update non-major dependencies
  ([#644](https://github.com/n24q02m/better-godot-mcp/pull/644),
  [`081100c`](https://github.com/n24q02m/better-godot-mcp/commit/081100c73dc781a239f06dd5942a0514935a087f))

- **deps**: Update oven/bun:1-alpine docker digest to 5acc90a
  ([#650](https://github.com/n24q02m/better-godot-mcp/pull/650),
  [`95751e2`](https://github.com/n24q02m/better-godot-mcp/commit/95751e288a3835e738db1c266a35f681b6ca6e01))

- **deps**: Update step-security/harden-runner digest to ab7a940
  ([#672](https://github.com/n24q02m/better-godot-mcp/pull/672),
  [`418fc06`](https://github.com/n24q02m/better-godot-mcp/commit/418fc06f46c7d1551cc2b25b7afd2e59a6e5f9ea))

### Performance Improvements

- Avoid split('\\n')[0] array allocation in findInPath
  ([#670](https://github.com/n24q02m/better-godot-mcp/pull/670),
  [`8a8952e`](https://github.com/n24q02m/better-godot-mcp/commit/8a8952eee724da575fca03f0e4fe9fde86fdd0a7))


## v1.18.0 (2026-05-09)


## v1.18.0-beta.1 (2026-05-08)

### Bug Fixes

- Add error path test for stop action when process is already dead
  ([`85bc343`](https://github.com/n24q02m/better-godot-mcp/commit/85bc343377a8e433f62a6697d000c927d05e2afb))

- Add MAX_PARSE_DEPTH edge case tests
  ([`49cd787`](https://github.com/n24q02m/better-godot-mcp/commit/49cd787194e95c017fc4cef5ec8e9abc68dbe5e6))

- Cleanup CONTRIBUTING and remove deprecated setup tool
  ([`e3ca864`](https://github.com/n24q02m/better-godot-mcp/commit/e3ca8643f3f0bf73b628d21eef51e8b18ac759fa))

- Extract resolveBusLayoutPath helper in audio tool
  ([`fee3647`](https://github.com/n24q02m/better-godot-mcp/commit/fee36471b5bd00522726f1bed04241825bcb8294))

- Extract transformSceneContent helper and add updateNodeInScene
  ([`c984389`](https://github.com/n24q02m/better-godot-mcp/commit/c984389462d49f322d581602aa7ce85075eb4da3))

- Extract validateNoNewlines helper for physics validation
  ([`17cad88`](https://github.com/n24q02m/better-godot-mcp/commit/17cad8810c086d8bac7d0043134f87a774bf698b))

- Parallelize docs directory candidates check
  ([`f8bed76`](https://github.com/n24q02m/better-godot-mcp/commit/f8bed76643a83353b075f36450ccb97c64086548))

- Prevent regex replacement string injection in scene parser
  ([`306b1ed`](https://github.com/n24q02m/better-godot-mcp/commit/306b1eda87588ce8ab72fc063ce44233fe83548f))

- Prevent replacement string injection in scene and project modification
  ([`306b1ed`](https://github.com/n24q02m/better-godot-mcp/commit/306b1eda87588ce8ab72fc063ce44233fe83548f))

- Refactor registry test and remove duplicate help entry
  ([`a37978a`](https://github.com/n24q02m/better-godot-mcp/commit/a37978a51ffaafbd7e4551fedba964b7f79639d9))

- Remove stray dev script update_security_tests.py
  ([`306b1ed`](https://github.com/n24q02m/better-godot-mcp/commit/306b1eda87588ce8ab72fc063ce44233fe83548f))

- Replace placeholder N_xxxxx with concrete identifier in scene-parser docs
  ([`aa1fb32`](https://github.com/n24q02m/better-godot-mcp/commit/aa1fb32ecbba94093c1e92acbc95070caad7f9b0))

- Replace XXX marker in input-map with descriptive comment
  ([`94ab6cb`](https://github.com/n24q02m/better-godot-mcp/commit/94ab6cbb37738067798a8eddc2ee3bdd0456e025))

- Simplify findClosestMatch and remove unused withErrorHandling
  ([`418ec58`](https://github.com/n24q02m/better-godot-mcp/commit/418ec58470ddae6f0f86d570a95d5df5cdcf3582))

- **deps**: Lock file maintenance
  ([`4766fe2`](https://github.com/n24q02m/better-godot-mcp/commit/4766fe24a4fcc2857f903dd518dadd9a8c7dbb5c))

- **deps**: Refresh bun.lock for non-major bumps
  ([`112a859`](https://github.com/n24q02m/better-godot-mcp/commit/112a859d038713f7d656c64ed1a97d80637797fd))

- **deps**: Update non-major dependencies
  ([`112a859`](https://github.com/n24q02m/better-godot-mcp/commit/112a859d038713f7d656c64ed1a97d80637797fd))

- **security**: Prevent arbitrary command execution via godot_path
  ([#619](https://github.com/n24q02m/better-godot-mcp/pull/619),
  [`9e9cba0`](https://github.com/n24q02m/better-godot-mcp/commit/9e9cba0fd3f53ad62622ca897e6c2e8b5724f81e))

### Features

- Add scene_path to project run and fix Godot value parsing
  ([`c5432f5`](https://github.com/n24q02m/better-godot-mcp/commit/c5432f59a6e56759da7aebbf984ea47b2a2f013b))

- Add Table of contents heading + auto-generated link list (Spec E Wave 2)
  ([`b033ff5`](https://github.com/n24q02m/better-godot-mcp/commit/b033ff5f4cecaf24f872667f5721fdf250804c69))

- Link to mcp.n24q02m.com unified docs site (Spec F Phase 4)
  ([`be7ef4c`](https://github.com/n24q02m/better-godot-mcp/commit/be7ef4cf1786176b89337dc1325223fa8de9bf21))

- Sync cross-promo section ([#640](https://github.com/n24q02m/better-godot-mcp/pull/640),
  [`024542e`](https://github.com/n24q02m/better-godot-mcp/commit/024542e9b6ef40ee4de3a1934e186216c9547812))


## v1.17.0 (2026-05-06)


## v1.17.0-beta.1 (2026-05-06)

### Bug Fixes

- Consolidate setup docs body to 3 methods (drop legacy Method 4/5)
  ([#603](https://github.com/n24q02m/better-godot-mcp/pull/603),
  [`554d1cd`](https://github.com/n24q02m/better-godot-mcp/commit/554d1cd0ca2ab6a19ab1daba653c3c58909de059))

- Prevent scene file injection in animation and navigation tools
  ([#605](https://github.com/n24q02m/better-godot-mcp/pull/605),
  [`2cd8d90`](https://github.com/n24q02m/better-godot-mcp/commit/2cd8d90f8207d4aa506dd3f3d57ca35c4b0b7358))

- Regenerate bun.lock after non-major dep bumps
  ([`8899ef3`](https://github.com/n24q02m/better-godot-mcp/commit/8899ef3285d9cc4b01ee24ba01ab48566312a6f3))

- **deps**: Update non-major dependencies
  ([#592](https://github.com/n24q02m/better-godot-mcp/pull/592),
  [`f019257`](https://github.com/n24q02m/better-godot-mcp/commit/f01925719cccffdaae894a8567882ca017c620bb))

### Chores

- **deps**: Lock file maintenance ([#593](https://github.com/n24q02m/better-godot-mcp/pull/593),
  [`cecfb98`](https://github.com/n24q02m/better-godot-mcp/commit/cecfb982c44733177ff51b10f41acc5c7edbb558))

- **deps**: Update step-security/harden-runner digest to a5ad31d
  ([#591](https://github.com/n24q02m/better-godot-mcp/pull/591),
  [`6051863`](https://github.com/n24q02m/better-godot-mcp/commit/6051863bdfeb45e0fbeb5d113fdb9e69f0463b7a))

### Features

- Add explicit Method overview section to setup docs
  ([#602](https://github.com/n24q02m/better-godot-mcp/pull/602),
  [`4dfc9da`](https://github.com/n24q02m/better-godot-mcp/commit/4dfc9da6ef2a282cfce75dd1372c060d8caafb01))

- Align userConfig with runtime env vars
  ([#606](https://github.com/n24q02m/better-godot-mcp/pull/606),
  [`beb8a1f`](https://github.com/n24q02m/better-godot-mcp/commit/beb8a1fd211ec67c0c16b6f97a75b9a76b23d375))

- Document userConfig credential prompt in Method 1 install
  ([#604](https://github.com/n24q02m/better-godot-mcp/pull/604),
  [`34a4399`](https://github.com/n24q02m/better-godot-mcp/commit/34a4399383c0ccc1eb98de2f82be029fb3359952))

- Document userConfig credential prompts per plugin
  ([#607](https://github.com/n24q02m/better-godot-mcp/pull/607),
  [`ea7132f`](https://github.com/n24q02m/better-godot-mcp/commit/ea7132f35a93aaa3577d1a09dfe4a8b43f0cf8a4))

- Note CC scope-by-endpoint mutual exclusivity rule
  ([#608](https://github.com/n24q02m/better-godot-mcp/pull/608),
  [`8a56310`](https://github.com/n24q02m/better-godot-mcp/commit/8a563101ae89feed00fb70d718870785034311eb))


## v1.16.0 (2026-05-04)

### Bug Fixes

- Bump mcp-core to 1.13.0 (STABLE) ([#601](https://github.com/n24q02m/better-godot-mcp/pull/601),
  [`c96aac7`](https://github.com/n24q02m/better-godot-mcp/commit/c96aac758a8f639b22dcadb25174f74274e95888))


## v1.16.0-beta.4 (2026-05-03)

### Features

- Bump mcp-core to 1.13.0-beta.7 ([#598](https://github.com/n24q02m/better-godot-mcp/pull/598),
  [`dd7e16c`](https://github.com/n24q02m/better-godot-mcp/commit/dd7e16c9d4846d74eb1a5409081f03596b8a1552))


## v1.16.0-beta.3 (2026-05-02)

### Bug Fixes

- Setup docs + README reflect stdio-pure architecture
  ([#590](https://github.com/n24q02m/better-godot-mcp/pull/590),
  [`bac8d51`](https://github.com/n24q02m/better-godot-mcp/commit/bac8d519c375e0a4ea7f0f470544ce81a0b555da))

### Chores

- **deps**: Lock file maintenance ([#583](https://github.com/n24q02m/better-godot-mcp/pull/583),
  [`843a718`](https://github.com/n24q02m/better-godot-mcp/commit/843a7187cd850566a39dd2ac0d0ced10873e2f21))

- **deps**: Update dawidd6/action-send-mail action to v17
  ([#582](https://github.com/n24q02m/better-godot-mcp/pull/582),
  [`bf05f5e`](https://github.com/n24q02m/better-godot-mcp/commit/bf05f5edea67cb1a7f54327338fc04cf0ab99409))

### Features

- Stdio-pure + http-multi-user (drop daemon-bridge)
  ([#589](https://github.com/n24q02m/better-godot-mcp/pull/589),
  [`120c405`](https://github.com/n24q02m/better-godot-mcp/commit/120c405afd6b8f97c138fd8265c2d31dbf2e1faa))


## v1.16.0-beta.2 (2026-04-30)

### Bug Fixes

- Move stdio-direct test to tests/live (requires build artifact)
  ([#586](https://github.com/n24q02m/better-godot-mcp/pull/586),
  [`cd10eee`](https://github.com/n24q02m/better-godot-mcp/commit/cd10eeebb266a1f2c52b4d8e8b6094f6a7f3b96a))

### Features

- Route stdio mode to MCP SDK direct + multi-target Dockerfile
  ([#586](https://github.com/n24q02m/better-godot-mcp/pull/586),
  [`cd10eee`](https://github.com/n24q02m/better-godot-mcp/commit/cd10eeebb266a1f2c52b4d8e8b6094f6a7f3b96a))

- **docs**: Add trust model section to README
  ([#586](https://github.com/n24q02m/better-godot-mcp/pull/586),
  [`cd10eee`](https://github.com/n24q02m/better-godot-mcp/commit/cd10eeebb266a1f2c52b4d8e8b6094f6a7f3b96a))


## v1.16.0-beta.1 (2026-04-30)

### Bug Fixes

- Move stdio-direct test to tests/live (requires build artifact)
  ([#584](https://github.com/n24q02m/better-godot-mcp/pull/584),
  [`56b2f68`](https://github.com/n24q02m/better-godot-mcp/commit/56b2f68c0616d472cf3d223d2153d1027b8862d2))

### Features

- Route stdio mode to FastMCP/MCP SDK direct + multi-target Dockerfile
  ([#584](https://github.com/n24q02m/better-godot-mcp/pull/584),
  [`56b2f68`](https://github.com/n24q02m/better-godot-mcp/commit/56b2f68c0616d472cf3d223d2153d1027b8862d2))

- Route stdio mode to MCP SDK direct + multi-target Dockerfile
  ([#584](https://github.com/n24q02m/better-godot-mcp/pull/584),
  [`56b2f68`](https://github.com/n24q02m/better-godot-mcp/commit/56b2f68c0616d472cf3d223d2153d1027b8862d2))


## v1.15.2 (2026-04-28)

### Bug Fixes

- Pass MCP_TRANSPORT=stdio in plugin.json
  ([#572](https://github.com/n24q02m/better-godot-mcp/pull/572),
  [`62f64dc`](https://github.com/n24q02m/better-godot-mcp/commit/62f64dc748676b6070e1c38a843ffaf53a712379))

- **deps**: Bump @n24q02m/mcp-core to 1.10.0 — Transparent Bridge waves 1-3
  ([#574](https://github.com/n24q02m/better-godot-mcp/pull/574),
  [`3ca8ea1`](https://github.com/n24q02m/better-godot-mcp/commit/3ca8ea128500b21de34bff2c79d783bd66dd7008))

- **deps**: Bump mcp-core to 1.10.0 — Transparent Bridge waves 1-3
  ([#574](https://github.com/n24q02m/better-godot-mcp/pull/574),
  [`3ca8ea1`](https://github.com/n24q02m/better-godot-mcp/commit/3ca8ea128500b21de34bff2c79d783bd66dd7008))

- **lint**: Biome format plugin.json ([#574](https://github.com/n24q02m/better-godot-mcp/pull/574),
  [`3ca8ea1`](https://github.com/n24q02m/better-godot-mcp/commit/3ca8ea128500b21de34bff2c79d783bd66dd7008))


## v1.15.1 (2026-04-28)

### Bug Fixes

- Bump @n24q02m/mcp-core to 1.9.0 ([#571](https://github.com/n24q02m/better-godot-mcp/pull/571),
  [`c51cac3`](https://github.com/n24q02m/better-godot-mcp/commit/c51cac388c1cd356ac7cf0fcb518fe8a78cb997a))

- Bump @n24q02m/mcp-core to ^1.8.2 (stdio Streamable HTTP fix)
  ([`7056c87`](https://github.com/n24q02m/better-godot-mcp/commit/7056c87e0f5e0f2023a5533a441dee72a61b22c1))


## v1.15.0 (2026-04-27)

### Bug Fixes

- Bump @n24q02m/mcp-core to 1.8.0 ([#564](https://github.com/n24q02m/better-godot-mcp/pull/564),
  [`720beb0`](https://github.com/n24q02m/better-godot-mcp/commit/720beb0c630ac85768802d71c13db62eb184b4c8))

### Chores

- **deps**: Lock file maintenance ([#557](https://github.com/n24q02m/better-godot-mcp/pull/557),
  [`c522b63`](https://github.com/n24q02m/better-godot-mcp/commit/c522b6381b9ddb75d27f2a1bc99c685a466cb73d))

### Features

- Add ## E2E section to CLAUDE.md per Task 21 docs rollout
  ([#564](https://github.com/n24q02m/better-godot-mcp/pull/564),
  [`720beb0`](https://github.com/n24q02m/better-godot-mcp/commit/720beb0c630ac85768802d71c13db62eb184b4c8))

- Add ## E2E section to CLAUDE.md per Task 21 docs rollout
  ([#562](https://github.com/n24q02m/better-godot-mcp/pull/562),
  [`7477f1d`](https://github.com/n24q02m/better-godot-mcp/commit/7477f1d4b3fcb06c875d09adda37dcc3a6d0695f))

### Performance Improvements

- **errors**: Optimize bigram string matching in `findClosestMatch`
  ([#560](https://github.com/n24q02m/better-godot-mcp/pull/560),
  [`8e68f18`](https://github.com/n24q02m/better-godot-mcp/commit/8e68f183c0ce066214d0e76650e66df4dc1b6cfc))


## v1.14.1-beta.1 (2026-04-27)

### Bug Fixes

- Read HOST env var so HTTP daemon binds inside Docker
  ([`b9cd0c1`](https://github.com/n24q02m/better-godot-mcp/commit/b9cd0c114ee507b7c14dea8cdb708b9441133662))

- Sweep doppler/infisical refs to skret SSM
  ([`5405f3a`](https://github.com/n24q02m/better-godot-mcp/commit/5405f3a85f470a9895b105679d7b0a51ddc519b0))


## v1.14.0 (2026-04-24)

### Bug Fixes

- Biome format trailing comma in init-server.ts
  ([`8915076`](https://github.com/n24q02m/better-godot-mcp/commit/8915076fab38d20d42fac995e7dafd281afe144b))

- Bump @n24q02m/mcp-core to 1.7.6 ([#556](https://github.com/n24q02m/better-godot-mcp/pull/556),
  [`a41e4ff`](https://github.com/n24q02m/better-godot-mcp/commit/a41e4ff5a5cc18e50e2cf5c88eeffa705c6dd7df))

- Bump @n24q02m/mcp-core to ^1.7.0 for transport subpath export
  ([#549](https://github.com/n24q02m/better-godot-mcp/pull/549),
  [`bcc1baa`](https://github.com/n24q02m/better-godot-mcp/commit/bcc1baa6755682f4dc7c0080417448302a7ab766))

- Regenerate bun.lock after @n24q02m/mcp-core 1.7.5 bump
  ([#546](https://github.com/n24q02m/better-godot-mcp/pull/546),
  [`278d541`](https://github.com/n24q02m/better-godot-mcp/commit/278d541901e6f34f8ad70485e7bdf306ddff2704))

- **deps**: Update non-major dependencies
  ([#546](https://github.com/n24q02m/better-godot-mcp/pull/546),
  [`278d541`](https://github.com/n24q02m/better-godot-mcp/commit/278d541901e6f34f8ad70485e7bdf306ddff2704))

### Chores

- **deps**: Lock file maintenance ([#547](https://github.com/n24q02m/better-godot-mcp/pull/547),
  [`c0e1fd1`](https://github.com/n24q02m/better-godot-mcp/commit/c0e1fd12e87243ded4eaf997c60a6dbe8444de0c))

- **deps**: Lock file maintenance ([#544](https://github.com/n24q02m/better-godot-mcp/pull/544),
  [`7029ec5`](https://github.com/n24q02m/better-godot-mcp/commit/7029ec5543b6971bdf4aebcf7420f0ee28ce7c50))

### Features

- Migrate stdio transport to 1-Daemon architecture (runSmartStdioProxy)
  ([`862f80f`](https://github.com/n24q02m/better-godot-mcp/commit/862f80fed5880bdd3ad17bd5edac0dbdea3f1240))


## v1.13.5 (2026-04-22)

### Bug Fixes

- Bump @n24q02m/mcp-core to 1.6.3 (relay form follow redirect_url)
  ([#543](https://github.com/n24q02m/better-godot-mcp/pull/543),
  [`f314bd8`](https://github.com/n24q02m/better-godot-mcp/commit/f314bd80d7305bce097ff58928418ae74f7cca3f))


## v1.13.4 (2026-04-22)

### Bug Fixes

- Bump mcp-core to 1.6.2 ([#541](https://github.com/n24q02m/better-godot-mcp/pull/541),
  [`82eb0bc`](https://github.com/n24q02m/better-godot-mcp/commit/82eb0bc1dbb36b2af110ae45d6c0274f07203cc3))


## v1.13.3 (2026-04-22)

### Bug Fixes

- Bump @n24q02m/mcp-core to 1.5.1
  ([`5610fe0`](https://github.com/n24q02m/better-godot-mcp/commit/5610fe026b5ed29b3b2053ab29c0843e166aac3b))

- Bump @n24q02m/mcp-core to 1.6.1 ([#539](https://github.com/n24q02m/better-godot-mcp/pull/539),
  [`624e4e2`](https://github.com/n24q02m/better-godot-mcp/commit/624e4e2d0b803c3c4c0faa8d2f85e490dc0f370f))

- Integrate MCP stdio handshake live test into CI
  ([`10360e4`](https://github.com/n24q02m/better-godot-mcp/commit/10360e4dfec63851dcc4ad2c327e8aa9c3129500))

- Refresh bun.lock for mcp-core 1.5.1 bump
  ([`aecdb49`](https://github.com/n24q02m/better-godot-mcp/commit/aecdb490f1d49ee5fa4056ca223756856e2a52f2))

### Chores

- **deps**: Lock file maintenance ([#536](https://github.com/n24q02m/better-godot-mcp/pull/536),
  [`51e04f9`](https://github.com/n24q02m/better-godot-mcp/commit/51e04f95fb37f45b084ea771c0c2fb475782ecb8))

- **deps**: Update non-major dependencies to ^4.1.5
  ([#535](https://github.com/n24q02m/better-godot-mcp/pull/535),
  [`bbe9519`](https://github.com/n24q02m/better-godot-mcp/commit/bbe951993b87f05555f8b5f5f6bcbf80ead1cbda))


## v1.13.2 (2026-04-21)

### Bug Fixes

- Bump actions/setup-node digest to 48b55a0
  ([`d7ec92a`](https://github.com/n24q02m/better-godot-mcp/commit/d7ec92a633be8240b3f738964f61d19c4ef4c797))

- Bump oven/bun:1-alpine docker digest to 4de4753
  ([`51ccb0b`](https://github.com/n24q02m/better-godot-mcp/commit/51ccb0ba4c0214a4714de6fc1992be0c484970d9))

- Bump step-security/harden-runner digest to 8d3c67d
  ([`ee0bc67`](https://github.com/n24q02m/better-godot-mcp/commit/ee0bc67fdee4c029debe24415e212c03063c8388))


## v1.13.1 (2026-04-21)

### Bug Fixes

- Optimize path normalization with native replaceAll
  ([`24489bc`](https://github.com/n24q02m/better-godot-mcp/commit/24489bc836f04cf71df3b86babf0f2435a8fb338))

- **deps**: Bump @n24q02m/mcp-core to ^1.5.0
  ([`e872fa7`](https://github.com/n24q02m/better-godot-mcp/commit/e872fa7a856331e483ec425144681e0f70d070b9))

- **deps**: Bump mcp-core to 1.4.3
  ([`8ef9a06`](https://github.com/n24q02m/better-godot-mcp/commit/8ef9a06264acc11319ad1f4cfbbc9880bcbed505))

- **deps**: Lock file maintenance (eventsource-parser 3.0.7->3.0.8)
  ([`560ed5b`](https://github.com/n24q02m/better-godot-mcp/commit/560ed5bb0b77e7f21e0b59de93f20d6d58d1a246))


## v1.13.0 (2026-04-19)

### Bug Fixes

- Apply biome format across test files for CI parity
  ([#517](https://github.com/n24q02m/better-godot-mcp/pull/517),
  [`bf33be0`](https://github.com/n24q02m/better-godot-mcp/commit/bf33be0c5630b9c098e2097b0dd55af7beed2c56))

- Bump mcp-core to 1.3.0 ([#518](https://github.com/n24q02m/better-godot-mcp/pull/518),
  [`ed156b2`](https://github.com/n24q02m/better-godot-mcp/commit/ed156b20042d25914a411176e19e12d1cbf14a86))

- Bump n24q02m-mcp-core to 1.4.0 ([#523](https://github.com/n24q02m/better-godot-mcp/pull/523),
  [`f8e6b14`](https://github.com/n24q02m/better-godot-mcp/commit/f8e6b148e25e5287f64c53639be1fe27069c9b24))

- Fix strict type checks for readdirSync mock
  ([#490](https://github.com/n24q02m/better-godot-mcp/pull/490),
  [`53a23da`](https://github.com/n24q02m/better-godot-mcp/commit/53a23daa0d232b28efe51a6521048271a08c8172))

- Refactor handleNodes into specialized handlers
  ([#499](https://github.com/n24q02m/better-godot-mcp/pull/499),
  [`0d0ba04`](https://github.com/n24q02m/better-godot-mcp/commit/0d0ba047dd525eedfb72571d3981e1454d9aea0d))

- Sanitize signal connection parameters to prevent scene file injection
  ([#498](https://github.com/n24q02m/better-godot-mcp/pull/498),
  [`97654de`](https://github.com/n24q02m/better-godot-mcp/commit/97654decdbd4567622b36a4455cc6da2c81daf37))

- Trigger CI re-run after detector test fix
  ([#517](https://github.com/n24q02m/better-godot-mcp/pull/517),
  [`bf33be0`](https://github.com/n24q02m/better-godot-mcp/commit/bf33be0c5630b9c098e2097b0dd55af7beed2c56))

- Untrack .jules + docs/superpowers AI traces from public repo
  ([`6556c63`](https://github.com/n24q02m/better-godot-mcp/commit/6556c63405cef3b774e125580d11b97d9f46feeb))

- Update test mocks for fstatSync after chunked-scan refactor
  ([#517](https://github.com/n24q02m/better-godot-mcp/pull/517),
  [`bf33be0`](https://github.com/n24q02m/better-godot-mcp/commit/bf33be0c5630b9c098e2097b0dd55af7beed2c56))

- **detector**: FstatSync, fix test mocks, add preview/beta binary names and paths
  ([#487](https://github.com/n24q02m/better-godot-mcp/pull/487),
  [`2d837b9`](https://github.com/n24q02m/better-godot-mcp/commit/2d837b9bbcfce255b3d818cd03440aca7ec89d34))

- **detector**: Skip signature heuristic for explicit paths, add overlap to chunked scan
  ([#487](https://github.com/n24q02m/better-godot-mcp/pull/487),
  [`2d837b9`](https://github.com/n24q02m/better-godot-mcp/commit/2d837b9bbcfce255b3d818cd03440aca7ec89d34))

- **helpers**: Refactor parseSceneContent for better maintainability
  ([#508](https://github.com/n24q02m/better-godot-mcp/pull/508),
  [`84184d9`](https://github.com/n24q02m/better-godot-mcp/commit/84184d9a6f9e704cd64bf7b4ade7cf51a3ef22fd))

- **physics**: [SECURITY] prevent scene file injection via physics properties
  ([#493](https://github.com/n24q02m/better-godot-mcp/pull/493),
  [`778c8cd`](https://github.com/n24q02m/better-godot-mcp/commit/778c8cd1cfbdbbeeb7abfd7f8abb00dbd2b968fa))

- **security**: Prevent argument injection in Godot CLI execution
  ([#504](https://github.com/n24q02m/better-godot-mcp/pull/504),
  [`b1cd0a6`](https://github.com/n24q02m/better-godot-mcp/commit/b1cd0a6d47534da53f9f3ec0808c87ff1e249d5b))

### Chores

- **deps**: Lock file maintenance ([#519](https://github.com/n24q02m/better-godot-mcp/pull/519),
  [`8127085`](https://github.com/n24q02m/better-godot-mcp/commit/81270855da0ff771e4cc2455a296d76090bc6ddf))

- **deps**: Lock file maintenance ([#515](https://github.com/n24q02m/better-godot-mcp/pull/515),
  [`e6210f3`](https://github.com/n24q02m/better-godot-mcp/commit/e6210f3e5a3f9fdf3225654fa55679cdda4a212f))

- **deps**: Update actions/create-github-app-token digest to 1b10c78
  ([#513](https://github.com/n24q02m/better-godot-mcp/pull/513),
  [`d612d95`](https://github.com/n24q02m/better-godot-mcp/commit/d612d95b34b4f96773ca0cbb3ed420cd03e4a546))

- **deps**: Update step-security/harden-runner digest to 6c3c2f2
  ([#514](https://github.com/n24q02m/better-godot-mcp/pull/514),
  [`320d91c`](https://github.com/n24q02m/better-godot-mcp/commit/320d91c325b7516989393fb43a3c3f1649aebf3d))

### Features

- Add MCP protocol E2E tests for stdio and HTTP transports
  ([`87404c3`](https://github.com/n24q02m/better-godot-mcp/commit/87404c34ca1e5e6f1c23b2ff6ff5fcfa653bb666))

- Add setup_* no-op actions to config tool for 7-repo parity
  ([#517](https://github.com/n24q02m/better-godot-mcp/pull/517),
  [`bf33be0`](https://github.com/n24q02m/better-godot-mcp/commit/bf33be0c5630b9c098e2097b0dd55af7beed2c56))

- **detector**: Add head/tail fast path before full chunked scan
  ([#487](https://github.com/n24q02m/better-godot-mcp/pull/487),
  [`2d837b9`](https://github.com/n24q02m/better-godot-mcp/commit/2d837b9bbcfce255b3d818cd03440aca7ec89d34))

### Performance Improvements

- Optimize split('\n') allocations in project and project-settings
  ([#503](https://github.com/n24q02m/better-godot-mcp/pull/503),
  [`bfc3777`](https://github.com/n24q02m/better-godot-mcp/commit/bfc3777178d50b770183098fcb75f2c8fdbc8dd3))

### Refactoring

- Replace hardcoded Godot object strings with serializeGodotObject helper
  ([#489](https://github.com/n24q02m/better-godot-mcp/pull/489),
  [`9f9e168`](https://github.com/n24q02m/better-godot-mcp/commit/9f9e168966ecc992425d1ce150ac75451871db43))

### Testing

- Add unit tests for launchGodotEditor and runGodotProject
  ([#507](https://github.com/n24q02m/better-godot-mcp/pull/507),
  [`3204efc`](https://github.com/n24q02m/better-godot-mcp/commit/3204efc6aacd7a161c962abacfcde72df50ce98e))

- **godot**: Add coverage for tryGetVersion and isLikelyGodotBinary
  ([#501](https://github.com/n24q02m/better-godot-mcp/pull/501),
  [`167c301`](https://github.com/n24q02m/better-godot-mcp/commit/167c301f8a30b19dc3ff9495f1459c0bf2fc5a92))


## v1.12.2 (2026-04-17)

### Bug Fixes

- Bump @n24q02m/mcp-core to 1.2.0 (authlib CVE + auto-issue CD)
  ([`1e07e8b`](https://github.com/n24q02m/better-godot-mcp/commit/1e07e8b7a7573f3d05aafa41d212b286be7e955b))


## v1.12.1 (2026-04-17)

### Bug Fixes

- Add diacritic preservation pre-commit hook
  ([#509](https://github.com/n24q02m/better-godot-mcp/pull/509),
  [`1a1462f`](https://github.com/n24q02m/better-godot-mcp/commit/1a1462f7b52c935f9cc680168b151157ebc582c3))

- Ignore coverage.xml and htmlcov artifacts
  ([`eefa83e`](https://github.com/n24q02m/better-godot-mcp/commit/eefa83e78d26d4817b5d6437ba1a9fb1b9b3081e))

- **deps**: Bump actions/upload-artifact digest to 043fb46
  ([#475](https://github.com/n24q02m/better-godot-mcp/pull/475),
  [`4e8ca41`](https://github.com/n24q02m/better-godot-mcp/commit/4e8ca41b742a19dfbef61362aeabbbab9a849e46))

- **deps**: Bump docker/build-push-action digest to bcafcac
  ([#476](https://github.com/n24q02m/better-godot-mcp/pull/476),
  [`4afec26`](https://github.com/n24q02m/better-godot-mcp/commit/4afec2602bbbf2440df5405d26e8b4cbc4555b0c))

- **deps**: Bump non-major dependencies (mcp-core 1.1.0, biome, vitest, types/node)
  ([#451](https://github.com/n24q02m/better-godot-mcp/pull/451),
  [`fbfbe5f`](https://github.com/n24q02m/better-godot-mcp/commit/fbfbe5fc535c73bf3585c44fa3bcbb763351c045))

- **deps**: Bump oven/bun:1-alpine docker digest to 26d8996
  ([#477](https://github.com/n24q02m/better-godot-mcp/pull/477),
  [`c78f9a6`](https://github.com/n24q02m/better-godot-mcp/commit/c78f9a6a3eca4d3642541c67aca5c31c4ef5eee2))

- **deps**: Lock file maintenance ([#452](https://github.com/n24q02m/better-godot-mcp/pull/452),
  [`bc31ee2`](https://github.com/n24q02m/better-godot-mcp/commit/bc31ee2d087ef998f54a85a90edffb2d671aed2e))

### Chores

- Ignore AI assistant traces
  ([`f78511b`](https://github.com/n24q02m/better-godot-mcp/commit/f78511be7c6c00f1498bbd22bcfdb4928939ffe2))


## v1.12.0 (2026-04-13)

### Bug Fixes

- Add tests for launchGodotEditor and consolidate suites
  ([#466](https://github.com/n24q02m/better-godot-mcp/pull/466),
  [`462f0e8`](https://github.com/n24q02m/better-godot-mcp/commit/462f0e8479ae632f42937b87584f118d6bfcd645))

- Add tests for setSettingInContent edge case
  ([#454](https://github.com/n24q02m/better-godot-mcp/pull/454),
  [`8f6ccb6`](https://github.com/n24q02m/better-godot-mcp/commit/8f6ccb6b54c7b7c8d06706944c5b0bbfc379bdb1))

- Add tests for wrapToolResult in registerTools
  ([#457](https://github.com/n24q02m/better-godot-mcp/pull/457),
  [`3dfd8a5`](https://github.com/n24q02m/better-godot-mcp/commit/3dfd8a5a3a42a206e5ca7909dd996f83478f9265))

- Bump @n24q02m/mcp-core to 1.0.0-beta.4
  ([`d755b93`](https://github.com/n24q02m/better-godot-mcp/commit/d755b93512c11bc44130fac8dff116cf73862e2c))

- Bump @n24q02m/mcp-core to ^1.0.0 stable
  ([`b60b930`](https://github.com/n24q02m/better-godot-mcp/commit/b60b9304afd3c3b2e8013b88a5d73737817fe5f6))

- Deduplicate boilerplate via createAnnotations helper
  ([`e1ef6fc`](https://github.com/n24q02m/better-godot-mcp/commit/e1ef6fc3b30b3483c7c891ecfec931644372dd64))

- Fix strict type checks for readdirSync mock
  ([`593cfa0`](https://github.com/n24q02m/better-godot-mcp/commit/593cfa0f4c3066d512c114ed022e1ab8cc07b618))

- Force LF line endings in .gitattributes to unblock Windows CI
  ([`f46caae`](https://github.com/n24q02m/better-godot-mcp/commit/f46caaead4157bbc6708379a579f44f9006e4604))

- Optimize input-map parser with direct string indexing
  ([`6f16b87`](https://github.com/n24q02m/better-godot-mcp/commit/6f16b87061eed261fd632865739abb8736dd1c5c))

- Optimize nodes list with single-pass mapping
  ([`e91dded`](https://github.com/n24q02m/better-godot-mcp/commit/e91dded930d822067681e5e7c56a26b3350ebebb))

- Pin @n24q02m/mcp-core to published 1.0.0-beta.3 instead of local editable path
  ([`0b92867`](https://github.com/n24q02m/better-godot-mcp/commit/0b92867d7ab9f74d35ab7f49b551e655a1cb81fc))

- Prevent argument injection in Godot project export
  ([`fe54521`](https://github.com/n24q02m/better-godot-mcp/commit/fe5452160669097a9b5e883dd92c1e3112ff8edf))

- Refactor handleScripts into per-action helpers
  ([`efa7548`](https://github.com/n24q02m/better-godot-mcp/commit/efa75488ac4da0cebaa37decdbe01ef4dff46fc4))

- Refactor handleUI into discrete functions
  ([`8e11ef6`](https://github.com/n24q02m/better-godot-mcp/commit/8e11ef69ceed5b5ab314ab87abf91e38e21f4ea0))

- Refactor handleUI into discrete functions and fix formatting
  ([`8e11ef6`](https://github.com/n24q02m/better-godot-mcp/commit/8e11ef69ceed5b5ab314ab87abf91e38e21f4ea0))

- Refactor handleUI into per-action helpers
  ([`8e11ef6`](https://github.com/n24q02m/better-godot-mcp/commit/8e11ef69ceed5b5ab314ab87abf91e38e21f4ea0))

- Replace regex with string boundary checks in parseGodotValue
  ([`7fb9bb5`](https://github.com/n24q02m/better-godot-mcp/commit/7fb9bb5ed8d3011e73fa1681248c4d3c502dc6cf))

- Sanitize node construction to prevent scene file injection
  ([`6703be6`](https://github.com/n24q02m/better-godot-mcp/commit/6703be65981bed177cf895b46d2e717fa70336b4))

- Sanitize physics properties to prevent scene file injection
  ([`38b5223`](https://github.com/n24q02m/better-godot-mcp/commit/38b5223f995fd28e7a2fd50e9197dcbc47eac282))

- Sanitize signal connection parameters to prevent scene file injection
  ([`ae23827`](https://github.com/n24q02m/better-godot-mcp/commit/ae238273dfd9d85cbf179ba5002173bea38aedd2))

- Strict type checks for readdirSync mock
  ([`593cfa0`](https://github.com/n24q02m/better-godot-mcp/commit/593cfa0f4c3066d512c114ed022e1ab8cc07b618))

- Validate Godot executable path to prevent arbitrary binary execution
  ([`a15ba00`](https://github.com/n24q02m/better-godot-mcp/commit/a15ba008a2f9441c03edfd1594ddfb8c7e95bcbd))

### Chores

- **deps**: Lock file maintenance ([#449](https://github.com/n24q02m/better-godot-mcp/pull/449),
  [`0ed42d8`](https://github.com/n24q02m/better-godot-mcp/commit/0ed42d85bc7b809ed5bcbfefc2312ccd430540f9))

- **security**: Update dependencies to fix npm audit vulnerabilities
  ([`a1d9cdf`](https://github.com/n24q02m/better-godot-mcp/commit/a1d9cdf68a712e3f98b292f7d0dc988d2e753b6e))

### Features

- Add cross-OS CI matrix (ubuntu/windows/macos)
  ([`be1ffc1`](https://github.com/n24q02m/better-godot-mcp/commit/be1ffc103e5dbabd3b9d3766fa6f2870ced4ef44))

- Add mcp-core dependency for future transport and lifecycle integration
  ([`f785c15`](https://github.com/n24q02m/better-godot-mcp/commit/f785c15de38ffa2d71d21d135f41a7e93326235b))

- Migrate code review from Qodo to CodeRabbit
  ([#412](https://github.com/n24q02m/better-godot-mcp/pull/412),
  [`7151bb7`](https://github.com/n24q02m/better-godot-mcp/commit/7151bb75b3024d025b6ba076367e6b771f031acb))

- Migrate from stdio-only to HTTP-default transport
  ([`a7c5fca`](https://github.com/n24q02m/better-godot-mcp/commit/a7c5fcac7044b1c255b503e6ca7ebfdb5bcd35c0))

- Migrate HTTP transport to mcp-core runLocalServer
  ([`ee4175d`](https://github.com/n24q02m/better-godot-mcp/commit/ee4175d4383d0cca07deccfa128156e4d69659e8))

- Optimize disconnect string parsing in handleSignals
  ([#450](https://github.com/n24q02m/better-godot-mcp/pull/450),
  [`2f8b583`](https://github.com/n24q02m/better-godot-mcp/commit/2f8b58315f7caa356f64e2786d8164d69b99c52e))

- Optimize godot types parsing and serialization
  ([#448](https://github.com/n24q02m/better-godot-mcp/pull/448),
  [`d8fcc3f`](https://github.com/n24q02m/better-godot-mcp/commit/d8fcc3f00147310cca03084568028d4d7f1a2e03))

- Optimize handleNodes list action
  ([`e91dded`](https://github.com/n24q02m/better-godot-mcp/commit/e91dded930d822067681e5e7c56a26b3350ebebb))

- Optimize input map string parsing
  ([`6f16b87`](https://github.com/n24q02m/better-godot-mcp/commit/6f16b87061eed261fd632865739abb8736dd1c5c))


## v1.11.0 (2026-04-04)

### Bug Fixes

- Consolidate Jules Round 2 PRs -- binary validation, DoS truncation, comma-list utility, tests
  ([#391](https://github.com/n24q02m/better-godot-mcp/pull/391),
  [`a4aed84`](https://github.com/n24q02m/better-godot-mcp/commit/a4aed841a3802457a82277146b8b85977c5b3fbb))

### Features

- Add agent/manual setup guides, simplify README, cleanup root
  ([`6f781d2`](https://github.com/n24q02m/better-godot-mcp/commit/6f781d2a3c937f71b285a0195883ce37af0eaf5c))


## v1.10.1 (2026-04-03)

### Bug Fixes

- Consolidated review of 28 Jules PRs with security, perf, and cleanup fixes
  ([#371](https://github.com/n24q02m/better-godot-mcp/pull/371),
  [`e0a3690`](https://github.com/n24q02m/better-godot-mcp/commit/e0a3690c18af214a482484c216d0027c4c18f722))


## v1.10.0 (2026-04-03)

### Bug Fixes

- **cd**: Scope marketplace sync token to claude-plugins repo
  ([`b936a8a`](https://github.com/n24q02m/better-godot-mcp/commit/b936a8ae4d3ae402592ab8889d7f5b593ca3efc2))

### Chores

- Remove empty Infisical config
  ([`0cf79e2`](https://github.com/n24q02m/better-godot-mcp/commit/0cf79e2870368814397e3466df3fe8d83e39926d))

### Features

- Remove deprecated Gemini CLI extension support
  ([`aa20d38`](https://github.com/n24q02m/better-godot-mcp/commit/aa20d38878e64166cd46443e3c946c713cc9a92a))


## v1.9.1 (2026-03-31)

### Bug Fixes

- Allow backslash in config paths for Windows compatibility
  ([`2f3fa7d`](https://github.com/n24q02m/better-godot-mcp/commit/2f3fa7df90d2e1a42017c220e7122933bbf1a94f))

- **deps**: Update non-major dependencies
  ([#341](https://github.com/n24q02m/better-godot-mcp/pull/341),
  [`52d2bf5`](https://github.com/n24q02m/better-godot-mcp/commit/52d2bf5c5c60ece702440359d58cda5d6cefec8f))

### Chores

- Migrate biome config schema to 2.4.10
  ([`17a49f0`](https://github.com/n24q02m/better-godot-mcp/commit/17a49f03539d2fb7509e4f9c53bbfe30c4188408))

### Continuous Integration

- Fix Qodo vertex_ai config and VERTEXAI_LOCATION
  ([`05720d8`](https://github.com/n24q02m/better-godot-mcp/commit/05720d8172727b976fe0198ae1b41fe838074577))

- **cd**: Add plugin marketplace sync on stable release
  ([`685698e`](https://github.com/n24q02m/better-godot-mcp/commit/685698e57277fcfba19fab475c2bef764d0faf69))

### Documentation

- Add stable release design spec
  ([`df7fcaa`](https://github.com/n24q02m/better-godot-mcp/commit/df7fcaa5cfa8f1c2644488f3affa54bc957ea431))

- Add stable release implementation plan
  ([`9465280`](https://github.com/n24q02m/better-godot-mcp/commit/946528054e07bf45368012ff8e97da214a3c815c))

### Performance Improvements

- **scene-parser**: Optimize regex evaluations with includes() guards
  ([#342](https://github.com/n24q02m/better-godot-mcp/pull/342),
  [`43131d1`](https://github.com/n24q02m/better-godot-mcp/commit/43131d14772e7f63db11da06efab8923b38963ff))

### Testing

- Add execGodotAsync coverage tests for headless.ts
  ([`58aa2c2`](https://github.com/n24q02m/better-godot-mcp/commit/58aa2c24c0bd4a9573ac764cf8f109a232908213))


## v1.9.1-beta.1 (2026-03-30)

### Chores

- Add Infisical project configuration
  ([`77956ad`](https://github.com/n24q02m/better-godot-mcp/commit/77956ad9a226a2fc3aa728ec165aa5f4e9dce23c))

- Fix line endings
  ([`d5d02b4`](https://github.com/n24q02m/better-godot-mcp/commit/d5d02b4b13b03587d8d201015f36a1d8c8ad9355))

- Remove Infisical project config (relay removed)
  ([`515e741`](https://github.com/n24q02m/better-godot-mcp/commit/515e741019fcc623cded9f2b01f368e9e99a5a48))

- Update tool count from 18 to 17 in metadata files
  ([`6a55e92`](https://github.com/n24q02m/better-godot-mcp/commit/6a55e92ae9ad1c760e2b89b9833258a9638cd588))

### Documentation

- Fix CLAUDE.md discrepancies
  ([`4cb343d`](https://github.com/n24q02m/better-godot-mcp/commit/4cb343df33c31ed0b489c0847980720c43c1bb0f))

### Performance Improvements

- Remove synchronous project.godot file I/O
  ([#339](https://github.com/n24q02m/better-godot-mcp/pull/339),
  [`670e19c`](https://github.com/n24q02m/better-godot-mcp/commit/670e19c5530beab411806ec81b070b060140e074))

### Refactoring

- Merge setup tool into config tool
  ([`fbe29ea`](https://github.com/n24q02m/better-godot-mcp/commit/fbe29ea76089e6e9e9ead9983a95d2a7a32c025b))


## v1.9.0 (2026-03-30)

### Bug Fixes

- Credential resolution order -- relay only when no local credentials
  ([`fcfda4c`](https://github.com/n24q02m/better-godot-mcp/commit/fcfda4c11b1a7f68e41072764352a891afb1496d))

- High Fix Unvalidated Editor Process Query
  ([#319](https://github.com/n24q02m/better-godot-mcp/pull/319),
  [`2f58480`](https://github.com/n24q02m/better-godot-mcp/commit/2f584804c7d08d49324ff4baefa11c153c748ada))

- Pin Docker base images to SHA digests
  ([`b40513b`](https://github.com/n24q02m/better-godot-mcp/commit/b40513b95a238b83d3e7fe44372f243c859a09f8))

- Pin pre-commit hooks to commit SHA
  ([`ac6743b`](https://github.com/n24q02m/better-godot-mcp/commit/ac6743bb5f2416590aaee4a97b35ca8d51fe6bca))

- Send complete message to relay page after config saved
  ([`19b2b97`](https://github.com/n24q02m/better-godot-mcp/commit/19b2b97aad5734a03db405e86845767ae012419d))

- **cd**: Remove empty env blocks from OIDC migration
  ([`d6312ce`](https://github.com/n24q02m/better-godot-mcp/commit/d6312ce815a3df76d237ac2a16012f7925b104d3))

- **cd**: Replace GH_PAT with GitHub App installation token
  ([`46c2012`](https://github.com/n24q02m/better-godot-mcp/commit/46c201288569b3ca91982e0ceadd65ae6848c5c2))

- **cd**: Use npm OIDC provenance instead of NPM_TOKEN
  ([`50ceb6e`](https://github.com/n24q02m/better-godot-mcp/commit/50ceb6e68e03277c3bbc91b04f944f6485f10726))

- **ci**: Consolidate SMTP_USERNAME and NOTIFY_EMAIL into one secret
  ([`f914d04`](https://github.com/n24q02m/better-godot-mcp/commit/f914d04c25b1ece20a59f84132d0a00173004b75))

- **ci**: Consolidate SMTP_USERNAME+PASSWORD into SMTP_CREDENTIAL
  ([`5b125a7`](https://github.com/n24q02m/better-godot-mcp/commit/5b125a7b68ac23bd6d4211bad653041e9e513ce5))

- **ci**: Remove CODECOV_TOKEN, use tokenless upload
  ([`f445b0a`](https://github.com/n24q02m/better-godot-mcp/commit/f445b0ad4bf016ecae6c6a25c377de3309b9f8fc))

- **ci**: Use Vertex AI WIF instead of GEMINI_API_KEY for code review
  ([`f6ac417`](https://github.com/n24q02m/better-godot-mcp/commit/f6ac41754b34cd6d3451ef32743ec49bcdd49180))

- **deps**: Update non-major dependencies
  ([#306](https://github.com/n24q02m/better-godot-mcp/pull/306),
  [`1cbe349`](https://github.com/n24q02m/better-godot-mcp/commit/1cbe349604ba34a43621acb91cf1f037a502acc7))

- **security**: Prevent type-stripping in wrapToolResult wrapper
  ([#324](https://github.com/n24q02m/better-godot-mcp/pull/324),
  [`c99c19b`](https://github.com/n24q02m/better-godot-mcp/commit/c99c19bd4a7ba0354993548e7691e848d53c61de))

### Chores

- **deps**: Lock file maintenance
  ([`fa9a225`](https://github.com/n24q02m/better-godot-mcp/commit/fa9a2257b7e5bf8548916ef32f18ff2e66aec4b0))

- **deps**: Lock file maintenance ([#332](https://github.com/n24q02m/better-godot-mcp/pull/332),
  [`9ca940d`](https://github.com/n24q02m/better-godot-mcp/commit/9ca940d8f14b7b909d07fec6777adf824138e70d))

- **deps**: Update actions/create-github-app-token action to v3
  ([#335](https://github.com/n24q02m/better-godot-mcp/pull/335),
  [`0c499d6`](https://github.com/n24q02m/better-godot-mcp/commit/0c499d6a88f5bbf61a85aec042117e0188499cc9))

- **deps**: Update codecov/codecov-action action to v6
  ([#330](https://github.com/n24q02m/better-godot-mcp/pull/330),
  [`7ec6b81`](https://github.com/n24q02m/better-godot-mcp/commit/7ec6b812d43b8cd4edde55d7f31c639430551d50))

- **deps**: Update google-github-actions/auth action to v3
  ([#336](https://github.com/n24q02m/better-godot-mcp/pull/336),
  [`738f339`](https://github.com/n24q02m/better-godot-mcp/commit/738f3398a8fb057d5791bbd1ad21d6f0828ac8e5))

### Code Style

- Fix Biome formatting in plugin/extension JSON files
  ([`82e3134`](https://github.com/n24q02m/better-godot-mcp/commit/82e31342c59bfd3e3000d1dae119b81a2186e6c8))

### Features

- Relay-first startup — always show relay URL
  ([`963488a`](https://github.com/n24q02m/better-godot-mcp/commit/963488af2082257804ac9111e10a9cdb0d1680a9))

### Performance Improvements

- **resources**: Avoid .flat() in findResourceFiles
  ([#333](https://github.com/n24q02m/better-godot-mcp/pull/333),
  [`c39f879`](https://github.com/n24q02m/better-godot-mcp/commit/c39f8797ec5fc753864c8d50b6eb42d57e985826))

### Refactoring

- Remove relay setup -- project_path provided per tool call
  ([`c25015e`](https://github.com/n24q02m/better-godot-mcp/commit/c25015e9ca97052f8399a53aaf3bbb7b5017a81e))


## v1.8.0 (2026-03-26)

### Chores

- Add server.json to PSR version_variables, sync version
  ([`3ac87b4`](https://github.com/n24q02m/better-godot-mcp/commit/3ac87b43fe2c0b51bcc6075c72e78f5cf8222d09))

- Clean up plugin manifest for best practices
  ([`6e2f03c`](https://github.com/n24q02m/better-godot-mcp/commit/6e2f03c99ad72199dd0e7e64ab1499599eeaa8ba))

### Documentation

- Fix marketplace references, improve Gemini CLI extension config
  ([`dbc05c4`](https://github.com/n24q02m/better-godot-mcp/commit/dbc05c409ecc7ae8d5f19c17e6d5787b031f438a))

- Standardize README structure
  ([`3b23973`](https://github.com/n24q02m/better-godot-mcp/commit/3b239732deb612268a8d2b62880b11b3ef845f47))


## v1.8.0-beta.1 (2026-03-25)

### Bug Fixes

- Add mcp-name line to README
  ([`de1a2c7`](https://github.com/n24q02m/better-godot-mcp/commit/de1a2c75080eb4814e11ffcd13acfd373dea636c))

- Align gemini-extension.json mcpServers key with plugin.json
  ([`0bff4ce`](https://github.com/n24q02m/better-godot-mcp/commit/0bff4ceb418bd04f7c8ee82d09110cca13d19f62))

- Auto-sync plugin.json version via PSR
  ([`35c8711`](https://github.com/n24q02m/better-godot-mcp/commit/35c871156a927728dbd138a3d92f1d042f165c19))

- Correct plugin install commands per official docs
  ([`44b0d21`](https://github.com/n24q02m/better-godot-mcp/commit/44b0d21cef78b9c2733c004f07c6bd53180a96ee))

- Format gemini-extension.json for biome
  ([`13f57c5`](https://github.com/n24q02m/better-godot-mcp/commit/13f57c5dbe07dd81d69dc38ab415fd7d256d081f))

- Pin third-party GitHub Actions to SHA hashes
  ([`aae22bb`](https://github.com/n24q02m/better-godot-mcp/commit/aae22bbf31ac99b5b8e07b06a2b224f430695d6a))

- Remove empty env vars from plugin configs to prevent empty-string bugs
  ([`ce5aa56`](https://github.com/n24q02m/better-godot-mcp/commit/ce5aa562ecca9256979bc56787ef496a43c7e5bb))

- Remove env vars from plugin.json to prevent overwriting user config
  ([`991cc6e`](https://github.com/n24q02m/better-godot-mcp/commit/991cc6e05167c8724b75ecb1fce3ed9da2646cdd))

- Remove pr-title-check job from CI
  ([`a6e06ad`](https://github.com/n24q02m/better-godot-mcp/commit/a6e06adaaac1d4ebff39a613784c0f4f9e7b39bf))

- Resolve biome lint errors
  ([`2683451`](https://github.com/n24q02m/better-godot-mcp/commit/26834517cb7e99f9dff7218b8e7a87e7bb8bc6b3))

- Switch mcp-relay-core from file dep to published npm package
  ([#326](https://github.com/n24q02m/better-godot-mcp/pull/326),
  [`b9e97af`](https://github.com/n24q02m/better-godot-mcp/commit/b9e97afe97f3d55f66115fecace698eb16036e3e))

- Sync plugin.json version and add skills/hooks references
  ([`ad2c324`](https://github.com/n24q02m/better-godot-mcp/commit/ad2c324a5587eef5fbcd54f148a7c49774b51149))

- Unify Plugin install section with marketplace + individual options
  ([`f7b4ba2`](https://github.com/n24q02m/better-godot-mcp/commit/f7b4ba21d4d66fecf932ff99a1b4cb281e798e1b))

### Documentation

- Add relay files to CLAUDE.md file structure
  ([`3d56dfa`](https://github.com/n24q02m/better-godot-mcp/commit/3d56dfab0554819d5368e7363ebcc36d01d56fa9))

- Add zero-config relay setup section to README
  ([`bbdd3fd`](https://github.com/n24q02m/better-godot-mcp/commit/bbdd3fd898ac5990fee3f85967bc3e625ac6786d))

### Features

- Add Gemini CLI extension config with PSR version sync
  ([`cdeed2f`](https://github.com/n24q02m/better-godot-mcp/commit/cdeed2fc9e7a655ff771697911c8b1cadad54931))

- Add GODOT_PATH env var and bunx mode to plugin config
  ([`35ce00e`](https://github.com/n24q02m/better-godot-mcp/commit/35ce00e5fab29cf6a36182392af7dd779d39bf3d))

- Add pnpx and yarn dlx modes to plugin config
  ([`128578f`](https://github.com/n24q02m/better-godot-mcp/commit/128578ffd31d7aed9d717df98a195ec672659541))

- Integrate mcp-relay-core for zero-env-config setup
  ([#326](https://github.com/n24q02m/better-godot-mcp/pull/326),
  [`b9e97af`](https://github.com/n24q02m/better-godot-mcp/commit/b9e97afe97f3d55f66115fecace698eb16036e3e))

- Multi-mode plugin config (stdio + docker + http)
  ([`067ddde`](https://github.com/n24q02m/better-godot-mcp/commit/067ddde1b5ca4300f9812bc632fa25eb58f5077b))

- Standardize README with MCP Resources, Security, collapsible clients
  ([`df53167`](https://github.com/n24q02m/better-godot-mcp/commit/df5316759f5c8ca2aa6cf08d90a8e4c67d262517))

- Zero-env-config relay setup via mcp-relay-core
  ([#326](https://github.com/n24q02m/better-godot-mcp/pull/326),
  [`b9e97af`](https://github.com/n24q02m/better-godot-mcp/commit/b9e97afe97f3d55f66115fecace698eb16036e3e))


## v1.7.0 (2026-03-24)

### Bug Fixes

- Add gitleaks secret detection to pre-commit hooks
  ([`8638d68`](https://github.com/n24q02m/better-godot-mcp/commit/8638d68910dc7cbada999d081cc964770ae4e4b6))

- Exclude live tests from default vitest run
  ([`0b75866`](https://github.com/n24q02m/better-godot-mcp/commit/0b758664307f0305bfa455a7ee205cc68bbe975f))


## v1.7.0-beta.2 (2026-03-23)

### Features

- Add full/real live tests for all 18 tools
  ([`ea20886`](https://github.com/n24q02m/better-godot-mcp/commit/ea208867e2d645a884ef3b5fba324f404125f2b1))


## v1.7.0-beta.1 (2026-03-23)

### Bug Fixes

- Apply node path normalization to all actions and fix help docs resolution
  ([`58428a3`](https://github.com/n24q02m/better-godot-mcp/commit/58428a3598c848b7d6d8769a12f1d669606e727b))

- Correct plugin packaging paths and marketplace schema
  ([`07352f5`](https://github.com/n24q02m/better-godot-mcp/commit/07352f5a3a22338530a569ff49db7796e242aa4d))

- Improve tool descriptions and corrective errors for LLM call pass rate
  ([`ad9d8d7`](https://github.com/n24q02m/better-godot-mcp/commit/ad9d8d78484f72044fe0ca0587ea1004a8e92d26))

- Redesign skills/hooks per approved spec
  ([`081d236`](https://github.com/n24q02m/better-godot-mcp/commit/081d2367c0b830001db3952457489f3e5323c31c))

- Standardize README structure with plugin-first Quick Start
  ([`9e277b3`](https://github.com/n24q02m/better-godot-mcp/commit/9e277b3b30b5efd08cd1a90175a6fc347e4b329f))

- Sync plugin.json and server.json versions
  ([`1d2c092`](https://github.com/n24q02m/better-godot-mcp/commit/1d2c092e0a79f4f32b9ec75844d0393b3c3b5c82))

### Chores

- **deps**: Lock file maintenance ([#302](https://github.com/n24q02m/better-godot-mcp/pull/302),
  [`397fa47`](https://github.com/n24q02m/better-godot-mcp/commit/397fa47184b80634477fb2730ebcbf447eb8967d))

### Features

- Add live MCP protocol tests
  ([`14cfddd`](https://github.com/n24q02m/better-godot-mcp/commit/14cfddd60ec898a4e258bcc13f77bc9130bd01b0))

- Add plugin packaging (skills, hooks, plugin metadata)
  ([`8225a68`](https://github.com/n24q02m/better-godot-mcp/commit/8225a68957437cdf5feff0f87347de5d9a9c6017))

- Improve tool descriptions and add node path auto-resolution
  ([`4d078d8`](https://github.com/n24q02m/better-godot-mcp/commit/4d078d8578354680fd77ce6e68b28aaf852858e2))

- Standardize README sections and sync Also by table
  ([`6c89f06`](https://github.com/n24q02m/better-godot-mcp/commit/6c89f060f5c7edff3d0509268161784f0a2cb90c))


## v1.6.2 (2026-03-20)

### Bug Fixes

- Add snap paths to Godot auto-detection and fix help docs resolution
  ([`11a0378`](https://github.com/n24q02m/better-godot-mcp/commit/11a0378151a00484f0af145dd9ac6039631d2dfa))


## v1.6.1 (2026-03-20)

### Bug Fixes

- Add backslash to shell metacharacter blocklist
  ([#301](https://github.com/n24q02m/better-godot-mcp/pull/301),
  [`ce419c7`](https://github.com/n24q02m/better-godot-mcp/commit/ce419c7c1fd57c8a22a7a0eb4122e600629a759e))

- Prevent path info disclosure in safeResolve error message
  ([`d501bbe`](https://github.com/n24q02m/better-godot-mcp/commit/d501bbe7561d9c08dca9b6f3f834dd7830439ae1))

### Chores

- **deps**: Lock file maintenance ([#280](https://github.com/n24q02m/better-godot-mcp/pull/280),
  [`3409dad`](https://github.com/n24q02m/better-godot-mcp/commit/3409dad70a257d60674c117a8605358d48f5898c))

- **deps**: Update codecov/codecov-action digest to 1af5884
  ([#282](https://github.com/n24q02m/better-godot-mcp/pull/282),
  [`6e6de30`](https://github.com/n24q02m/better-godot-mcp/commit/6e6de308f03df5070c0c90d71907cd0dfe7a2a41))

- **deps**: Update dawidd6/action-send-mail action to v16
  ([#284](https://github.com/n24q02m/better-godot-mcp/pull/284),
  [`4e908e9`](https://github.com/n24q02m/better-godot-mcp/commit/4e908e9b13a1074c45e54db029fb8b3b86a0b3bb))

- **deps**: Update dependency @biomejs/biome to ^2.4.8
  ([#283](https://github.com/n24q02m/better-godot-mcp/pull/283),
  [`d91dde3`](https://github.com/n24q02m/better-godot-mcp/commit/d91dde368c911d7518276cc451fc47d59d556f20))

### Performance Improvements

- Replace extname with endsWith for directory traversal
  ([#287](https://github.com/n24q02m/better-godot-mcp/pull/287),
  [`1012996`](https://github.com/n24q02m/better-godot-mcp/commit/1012996f52bee8995a90b5954736b8140888579b))


## v1.6.0 (2026-03-17)

### Bug Fixes

- Add Renovate mise manager disable rule
  ([`6d7e1b8`](https://github.com/n24q02m/better-godot-mcp/commit/6d7e1b8b4c2440e85cc2972eb69c1aeab0934553))

- Correct Glama.ai badge URL format
  ([`c608879`](https://github.com/n24q02m/better-godot-mcp/commit/c6088795cbba50be1c84ff3c5deb99885f238ed2))

- Patch path traversal in 6 tools and add recursion depth limit
  ([`3fb391d`](https://github.com/n24q02m/better-godot-mcp/commit/3fb391d75b5fb31fb9425e99e59cab3dfbc8d4e0))

- Security fix] Fix path traversal in physics tool
  ([#265](https://github.com/n24q02m/better-godot-mcp/pull/265),
  [`9e7505e`](https://github.com/n24q02m/better-godot-mcp/commit/9e7505e94d2f602072025839f9ff9b1ffc17c3fe))

- Standardize async I/O and error handling across all 18 tools
  ([#279](https://github.com/n24q02m/better-godot-mcp/pull/279),
  [`5361f4f`](https://github.com/n24q02m/better-godot-mcp/commit/5361f4fdc05dcf1eb145dc471e7343920cbc64e2))

- Standardize repo files across MCP server portfolio
  ([`c73bdef`](https://github.com/n24q02m/better-godot-mcp/commit/c73bdef70356e6bed52a857c0c3cb06b1256289b))

- Update biome schema version to match installed 2.4.7
  ([`37dc04f`](https://github.com/n24q02m/better-godot-mcp/commit/37dc04f1f254710d842d9c061d2c1cef6e105c57))

- **ci**: Use pull_request_target for jobs requiring secrets
  ([`5b91c85`](https://github.com/n24q02m/better-godot-mcp/commit/5b91c855afb019b0ca6cb1d2d208b829da142ff8))

### Chores

- **deps**: Lock file maintenance ([#273](https://github.com/n24q02m/better-godot-mcp/pull/273),
  [`7f0ce32`](https://github.com/n24q02m/better-godot-mcp/commit/7f0ce32ff89c5b3901f53410457cfd403aa66c76))

- **deps**: Update dawidd6/action-send-mail action to v15
  ([#252](https://github.com/n24q02m/better-godot-mcp/pull/252),
  [`b3c03e1`](https://github.com/n24q02m/better-godot-mcp/commit/b3c03e10a763f6aef2ff7f3d99fb94ee38f15a5d))

- **deps**: Update non-major dependencies
  ([#251](https://github.com/n24q02m/better-godot-mcp/pull/251),
  [`2f9ccf3`](https://github.com/n24q02m/better-godot-mcp/commit/2f9ccf30921813ef8963b900af3d92bfc558b18d))

- **deps**: Update oven-sh/setup-bun digest to 0c5077e
  ([#250](https://github.com/n24q02m/better-godot-mcp/pull/250),
  [`f0113f2`](https://github.com/n24q02m/better-godot-mcp/commit/f0113f2681c706e289e1ca16f0ab44e657819f69))

- **deps**: Update step-security/harden-runner digest to fa2e9d6
  ([#276](https://github.com/n24q02m/better-godot-mcp/pull/276),
  [`9a8f4e9`](https://github.com/n24q02m/better-godot-mcp/commit/9a8f4e94ae066cacae0bdd2e2b4fb5f7eeb34bcc))

### Features

- Add better-telegram-mcp to Also by section
  ([`51de248`](https://github.com/n24q02m/better-godot-mcp/commit/51de248bae004b3bf994d3293e63b084b7dc1efd))

- Add glama.json for Glama directory listing
  ([`10479cb`](https://github.com/n24q02m/better-godot-mcp/commit/10479cb709e2362ce5ac6add206394d1cbb71be1))


## v1.5.1 (2026-03-12)


## v1.5.1-beta.2 (2026-03-12)

### Bug Fixes

- Read server version from package.json instead of hardcoded value
  ([`508133a`](https://github.com/n24q02m/better-godot-mcp/commit/508133a51aba1803a3deb8adb352331e6fa7994d))


## v1.5.1-beta.1 (2026-03-12)

### Bug Fixes

- Correct help.md tool example syntax
  ([`a665777`](https://github.com/n24q02m/better-godot-mcp/commit/a665777b30f7900b3d2a54a46d4e7b44a6a77f3c))

- Paths helper] test coverage for safe path resolution and path traversal security checks
  ([#190](https://github.com/n24q02m/better-godot-mcp/pull/190),
  [`aa04cd8`](https://github.com/n24q02m/better-godot-mcp/commit/aa04cd80575f0095f6ecdb4c50514008ca82ef0e))

- Pin runtime versions with allowedVersions, revert Python to 3.13
  ([`233cc27`](https://github.com/n24q02m/better-godot-mcp/commit/233cc27def958e2ee2417bba19fc6e505717b50a))

- Remove .jules, .orig files and patch.diff from PR merges
  ([`6f91236`](https://github.com/n24q02m/better-godot-mcp/commit/6f91236143fcab597f92963619104ac5103bc97d))

- Revert Python to 3.13, disable mise runtime updates in Renovate
  ([`1518d00`](https://github.com/n24q02m/better-godot-mcp/commit/1518d006b722ee2453fa93b2fcd4148a70a6dd34))

- Security fix] Prevent array bypass in config path validation
  ([#237](https://github.com/n24q02m/better-godot-mcp/pull/237),
  [`7ceb796`](https://github.com/n24q02m/better-godot-mcp/commit/7ceb7964747e40fc4d6ff629cd815c838759ce20))

### Chores

- **deps**: Lock file maintenance ([#183](https://github.com/n24q02m/better-godot-mcp/pull/183),
  [`06ad55c`](https://github.com/n24q02m/better-godot-mcp/commit/06ad55c9899ae2cc429f41fc683eab9128cc2215))

- **deps**: Update actions/download-artifact digest to 3e5f45b
  ([#241](https://github.com/n24q02m/better-godot-mcp/pull/241),
  [`7b64602`](https://github.com/n24q02m/better-godot-mcp/commit/7b646027d269a0a2a20dbdbb4d2520f2a99be0ff))

- **deps**: Update dawidd6/action-send-mail action to v13
  ([#243](https://github.com/n24q02m/better-godot-mcp/pull/243),
  [`7e7777f`](https://github.com/n24q02m/better-godot-mcp/commit/7e7777fe9dd0224c2e5ee9610a02980cec977643))

- **deps**: Update non-major dependencies
  ([#242](https://github.com/n24q02m/better-godot-mcp/pull/242),
  [`899775c`](https://github.com/n24q02m/better-godot-mcp/commit/899775cb02f5dab95886b4156b6d6cc167dab2dc))

### Testing

- Add assertions for GODOT_PROJECT_PATH and Server initialization
  ([#212](https://github.com/n24q02m/better-godot-mcp/pull/212),
  [`82f4fba`](https://github.com/n24q02m/better-godot-mcp/commit/82f4fbabaee214c77d7e0222f61b2e7a620f0d60))

- **helpers**: Add test coverage for `paths.ts`
  ([#190](https://github.com/n24q02m/better-godot-mcp/pull/190),
  [`aa04cd8`](https://github.com/n24q02m/better-godot-mcp/commit/aa04cd80575f0095f6ecdb4c50514008ca82ef0e))


## v1.5.0 (2026-03-10)

### Bug Fixes

- Add .jules/ and JULES.md to gitignore
  ([`e8f8962`](https://github.com/n24q02m/better-godot-mcp/commit/e8f8962ea189583aa6e0702cf4014eb5632604d5))

- Correct Qodo PR Agent ignore_pr_authors config
  ([`732fa51`](https://github.com/n24q02m/better-godot-mcp/commit/732fa515e7d7f17cd220f5e15f93507ce54eb871))

- Migrate synchronous file traversal to async to prevent event loop blocking
  ([#177](https://github.com/n24q02m/better-godot-mcp/pull/177),
  [`83e38c6`](https://github.com/n24q02m/better-godot-mcp/commit/83e38c6a9c4c9beb506a97f4a9c06d87d1938ed8))

- Remove commit-message-check job
  ([`88ba358`](https://github.com/n24q02m/better-godot-mcp/commit/88ba3583722bdc2fb2f1afd79899893f1f36b567))

- Standardize CI with PR title check, email notify, and templates
  ([`16cdec5`](https://github.com/n24q02m/better-godot-mcp/commit/16cdec5dcb6145b8ae8bbd0c612edb1214d3b3b8))

- Sync CI/CD configs and standardize templates
  ([`a0bec35`](https://github.com/n24q02m/better-godot-mcp/commit/a0bec352b8f14d92bd47db6c8bbccda52ae45ba0))

- **ci**: Fix Qodo PR review for external contributors
  ([`d99a3d2`](https://github.com/n24q02m/better-godot-mcp/commit/d99a3d21bb882f835a04ba04513baceaecf8ddb1))

- **ci**: Pin PSR v10, Python 3.13, Node 24, Java 21 in Renovate
  ([`556f368`](https://github.com/n24q02m/better-godot-mcp/commit/556f3683edc6f60af44453d6f0227e4ca8186031))

- **ci**: Revert PSR v9 downgrade back to v10
  ([`81dd3b3`](https://github.com/n24q02m/better-godot-mcp/commit/81dd3b319d84da1bd5fc34111b2d6154569b174c))

### Chores

- **deps**: Lock file maintenance ([#172](https://github.com/n24q02m/better-godot-mcp/pull/172),
  [`f292e2c`](https://github.com/n24q02m/better-godot-mcp/commit/f292e2cde91494470353c0fd7c75b57c0edc168d))

- **deps**: Pin dawidd6/action-send-mail action to 4226df7
  ([#176](https://github.com/n24q02m/better-godot-mcp/pull/176),
  [`54d73bf`](https://github.com/n24q02m/better-godot-mcp/commit/54d73bfa2073ce659b18b84926cf9a8679c1c527))

- **deps**: Update actions/dependency-review-action digest to 3c4e3dc
  ([#179](https://github.com/n24q02m/better-godot-mcp/pull/179),
  [`8f81ad1`](https://github.com/n24q02m/better-godot-mcp/commit/8f81ad1f31e7fe54abc2b825bdc519e558cd336d))

- **deps**: Update dawidd6/action-send-mail action to v11
  ([#180](https://github.com/n24q02m/better-godot-mcp/pull/180),
  [`d81cced`](https://github.com/n24q02m/better-godot-mcp/commit/d81cced59e81c3f6312c1b53fd784a17e59b36f2))

- **deps**: Update dependency @types/node to ^25.4.0
  ([#170](https://github.com/n24q02m/better-godot-mcp/pull/170),
  [`6fcf12f`](https://github.com/n24q02m/better-godot-mcp/commit/6fcf12f42076ec495a7ae831c33a0f9e68bdbfaf))

### Continuous Integration

- Improve PR checks and Qodo filtering
  ([#178](https://github.com/n24q02m/better-godot-mcp/pull/178),
  [`d3dd732`](https://github.com/n24q02m/better-godot-mcp/commit/d3dd73231d2f61da7384b1af489f9303df4332b5))

### Features

- Add coverage tests to reach 97.66% statement coverage
  ([`bd04e69`](https://github.com/n24q02m/better-godot-mcp/commit/bd04e691b4e3ca1c5a8cba90b5acb563598e2c7e))

- Add fast-path substring checks to scene parser modifications
  ([#181](https://github.com/n24q02m/better-godot-mcp/pull/181),
  [`235f777`](https://github.com/n24q02m/better-godot-mcp/commit/235f7770cdbba48a1649919bf49f9ecaf00710f3))

### Performance Improvements

- Add fast-path substring checks to scene parser modifications
  ([#181](https://github.com/n24q02m/better-godot-mcp/pull/181),
  [`235f777`](https://github.com/n24q02m/better-godot-mcp/commit/235f7770cdbba48a1649919bf49f9ecaf00710f3))

- Migrate synchronous file traversal to async to prevent event loop blocking
  ([#177](https://github.com/n24q02m/better-godot-mcp/pull/177),
  [`83e38c6`](https://github.com/n24q02m/better-godot-mcp/commit/83e38c6a9c4c9beb506a97f4a9c06d87d1938ed8))

- **scenes**: Optimize `parseTscnFile` to prevent string allocation overhead
  ([#175](https://github.com/n24q02m/better-godot-mcp/pull/175),
  [`279e3f4`](https://github.com/n24q02m/better-godot-mcp/commit/279e3f4851071418fe7fa5966ca3c3af0daa515d))


## v1.4.7 (2026-03-06)

### Bug Fixes

- Add Docker LABEL and re-add OCI package for MCP Registry
  ([`8a3a212`](https://github.com/n24q02m/better-godot-mcp/commit/8a3a212ee01f5c0221e6fdb44f87e6168154be2b))


## v1.4.6 (2026-03-06)

### Bug Fixes

- Remove OCI package from server.json until Docker LABEL annotation added
  ([`c167cc2`](https://github.com/n24q02m/better-godot-mcp/commit/c167cc2740b4440f82f4fe866179d6088ad57c58))


## v1.4.5 (2026-03-06)

### Bug Fixes

- Keep OCI identifier as latest in MCP Registry publish
  ([`dfb75c3`](https://github.com/n24q02m/better-godot-mcp/commit/dfb75c33af6643af92a629d4a4754c6ed2367fbe))

- **ci**: Skip Qodo AI review for bot-created PRs
  ([`ad98e1a`](https://github.com/n24q02m/better-godot-mcp/commit/ad98e1aaa350ff143d5d598b7edda5d7322a9915))


## v1.4.4 (2026-03-06)

### Bug Fixes

- Handle OCI package version in MCP Registry publish
  ([`7750f75`](https://github.com/n24q02m/better-godot-mcp/commit/7750f75033997a9f015812aecb0ea3221e4a72ed))


## v1.4.3 (2026-03-06)

### Bug Fixes

- Update server.json version dynamically in MCP Registry publish job
  ([`a972126`](https://github.com/n24q02m/better-godot-mcp/commit/a9721264d27dc1e02f7f594380875101f3608ead))


## v1.4.2 (2026-03-06)

### Bug Fixes

- Add mcpName field for MCP Registry ownership validation
  ([`c068961`](https://github.com/n24q02m/better-godot-mcp/commit/c0689618f37be1c500ba89e169e93167c944367e))


## v1.4.1 (2026-03-06)

### Bug Fixes

- Shorten server.json description to comply with MCP Registry 100-char limit
  ([`9c0ea35`](https://github.com/n24q02m/better-godot-mcp/commit/9c0ea355bcf868fa3431d0d2bd155b310c5f7d16))


## v1.4.0 (2026-03-06)

### Features

- Add compatible-with badges and cross-links to sibling MCP servers
  ([`2b5b224`](https://github.com/n24q02m/better-godot-mcp/commit/2b5b224935ee405382b19fc057cc7cd3bcd21af3))

- Add MCP client keywords to package.json for npm discoverability
  ([`ff7e04e`](https://github.com/n24q02m/better-godot-mcp/commit/ff7e04e6a91576945d1c9d5fac9b55ef4b60a64b))

- Add server.json and MCP Registry publish step to CD workflow
  ([`a832e68`](https://github.com/n24q02m/better-godot-mcp/commit/a832e6862997adb3aeec74db0a3d72f7807358ae))

- Update compatible-with badges - add Antigravity, Gemini CLI, Codex, OpenCode
  ([`74f33a3`](https://github.com/n24q02m/better-godot-mcp/commit/74f33a389916e5389cc98b19512c1c7e39ec0737))


## v1.3.0 (2026-03-06)

### Bug Fixes

- Biome formatting in config tests from PR #167
  ([`f0d7a63`](https://github.com/n24q02m/better-godot-mcp/commit/f0d7a63751943831eff169ed4f29dfa149a9d7fc))

### Chores

- **deps**: Lock file maintenance ([#166](https://github.com/n24q02m/better-godot-mcp/pull/166),
  [`6f5d9f0`](https://github.com/n24q02m/better-godot-mcp/commit/6f5d9f0d6fd250e1eb5e9cc005e0a4040c6fdea1))

- **deps**: Update actions/setup-node digest to 53b8394
  ([#162](https://github.com/n24q02m/better-godot-mcp/pull/162),
  [`770c473`](https://github.com/n24q02m/better-godot-mcp/commit/770c473d53e606875ace949f8521003eb9ee420d))

- **deps**: Update docker/build-push-action action to v7
  ([#165](https://github.com/n24q02m/better-godot-mcp/pull/165),
  [`c460456`](https://github.com/n24q02m/better-godot-mcp/commit/c460456ebc035a2f58029b4572c0ee0019e86983))

- **deps**: Update docker/login-action action to v4
  ([#164](https://github.com/n24q02m/better-godot-mcp/pull/164),
  [`6a6d843`](https://github.com/n24q02m/better-godot-mcp/commit/6a6d843fab52e343d4ca60e2cdcd0c7baeb452bf))

- **deps**: Update oven-sh/setup-bun digest to ecf28dd
  ([#163](https://github.com/n24q02m/better-godot-mcp/pull/163),
  [`959d85c`](https://github.com/n24q02m/better-godot-mcp/commit/959d85c31d3804d1ba3070d3c0709820e5eefa17))

### Features

- Add comprehensive Phase 5 live test via MCP protocol
  ([`6dba0bc`](https://github.com/n24q02m/better-godot-mcp/commit/6dba0bcbf8956d6c524b2f323f0eb57b7ed95d89))


## v1.2.3 (2026-03-05)

### Bug Fixes

- Add safeResolve path traversal protection to all tools
  ([`e9f6b9e`](https://github.com/n24q02m/better-godot-mcp/commit/e9f6b9e688b4594fd03deec8118833aa719c0a93))


## v1.2.2 (2026-03-05)

### Bug Fixes

- Security hardening and performance optimizations
  ([#160](https://github.com/n24q02m/better-godot-mcp/pull/160),
  [`4bc6a16`](https://github.com/n24q02m/better-godot-mcp/commit/4bc6a1622bd9506f2e72086f969cc60b647535d8))

- Update Codecov badge in README.md
  ([`42861a7`](https://github.com/n24q02m/better-godot-mcp/commit/42861a7f2b5e660996144ed0193fe7e349ef7279))

- Update major dependencies for compatibility
  ([#161](https://github.com/n24q02m/better-godot-mcp/pull/161),
  [`49b330f`](https://github.com/n24q02m/better-godot-mcp/commit/49b330f3b0cd5a7e88985eb2a743d07734da9614))

### Chores

- **deps**: Update dependency @biomejs/biome to ^2.4.6
  ([#153](https://github.com/n24q02m/better-godot-mcp/pull/153),
  [`3ac5608`](https://github.com/n24q02m/better-godot-mcp/commit/3ac5608a2eb9357a1a011756fa0fd6d3abae46bc))

- **deps**: Update github artifact actions
  ([#98](https://github.com/n24q02m/better-godot-mcp/pull/98),
  [`3adc49a`](https://github.com/n24q02m/better-godot-mcp/commit/3adc49a5ad64868a52127e10914cf61e19345fef))


## v1.2.1 (2026-03-01)

### Bug Fixes

- Add coverage tests for config, navigation, tilemap, editor, scripts, input-map, ui
  ([`9048c28`](https://github.com/n24q02m/better-godot-mcp/commit/9048c283be772694f1891c0486bdecb2e5be7178))

- Add missing godotVersion to GodotConfig in benchmark script
  ([`f573321`](https://github.com/n24q02m/better-godot-mcp/commit/f573321c24ec8ab944fc64d1e8e10428099fb6a3))

- Delete .vscode directory
  ([`7753e73`](https://github.com/n24q02m/better-godot-mcp/commit/7753e73aabf5fbb8affa44ad19e50a2432127cd5))

- Regex injection in scene parser node renaming
  ([`fff1889`](https://github.com/n24q02m/better-godot-mcp/commit/fff188923193008e71303e8e0c95c15e42ac8079))

- Remove stray package-lock.json (project uses bun)
  ([`c1ded6c`](https://github.com/n24q02m/better-godot-mcp/commit/c1ded6ce20428ef8fe0376c7722a6944670adfd0))

- Replace catch(error: any) with unknown + type guard in shader and signals
  ([`f7f24b4`](https://github.com/n24q02m/better-godot-mcp/commit/f7f24b4fb2923e12f0680f7cefd533f8437a1195))

- Resolve TS2345 error in scenes tool validation
  ([`d6a0c95`](https://github.com/n24q02m/better-godot-mcp/commit/d6a0c95abbb6bbc05c86384a6ededb0a691c0bf8))

- Use bun run test (vitest) instead of bun test (bun native runner)
  ([`3c17fd0`](https://github.com/n24q02m/better-godot-mcp/commit/3c17fd0914ea2686ef7aa7dcc375149f7d288624))

- **deps**: Update non-major dependencies
  ([`ecdfcd4`](https://github.com/n24q02m/better-godot-mcp/commit/ecdfcd44c88bd7e0b8dfa00f3ec6977727fc0ddb))

- **input-map**: Sanitize action_name to prevent configuration injection
  ([`2b1dd09`](https://github.com/n24q02m/better-godot-mcp/commit/2b1dd090f55e0d659d1220a3dd5a466da4c20c5c))

- **security**: Prevent command injection in headless execution
  ([`ced96b6`](https://github.com/n24q02m/better-godot-mcp/commit/ced96b658ee4618e5220cfdb715b0014f2d5047b))

- **security**: Prevent command injection in headless execution
  ([`e60a041`](https://github.com/n24q02m/better-godot-mcp/commit/e60a04188c704b3b558636980bdb049282053382))

- **windows**: Replace bunx with bun x for cross-platform compatibility
  ([`189996b`](https://github.com/n24q02m/better-godot-mcp/commit/189996bac06fd999f5177e2564c982b3aef541b1))

### Chores

- Fix biome lint warnings
  ([`0d7ef92`](https://github.com/n24q02m/better-godot-mcp/commit/0d7ef92c7199597af8375357daa13e5053b732c7))

- Remove helper scripts
  ([`ea67cbd`](https://github.com/n24q02m/better-godot-mcp/commit/ea67cbd9ed173a67768615a0488ada4a7e575904))

- **config**: Migrate config renovate.json
  ([`8ea1fa4`](https://github.com/n24q02m/better-godot-mcp/commit/8ea1fa41aaeee6e4cc5f487e9b97cb0420cc6704))

- **deps**: Pin dependencies
  ([`9a49fd3`](https://github.com/n24q02m/better-godot-mcp/commit/9a49fd3456b892cd1ef547d28991e82f765ccc41))

- **deps**: Update actions/checkout action to v6
  ([`9c96c46`](https://github.com/n24q02m/better-godot-mcp/commit/9c96c46fa3260e71eb3b21b9a456a3bf847616dc))

### Performance Improvements

- Make editor process check async (non-blocking)
  ([`066fbb3`](https://github.com/n24q02m/better-godot-mcp/commit/066fbb3b6ef794abbb4994caad513fbf04757284))

- Optimize findScriptFiles recursion to reduce allocations
  ([`d8325d0`](https://github.com/n24q02m/better-godot-mcp/commit/d8325d0c705ab04f60e92d885084f5420bbf0ad3))

- Optimize resource listing by reusing stat results
  ([`d18aea1`](https://github.com/n24q02m/better-godot-mcp/commit/d18aea1fefbcf01da136b037d46993eb3a252b06))

- Optimize scene parser by avoiding split and regex per line
  ([`cbd5a86`](https://github.com/n24q02m/better-godot-mcp/commit/cbd5a86e1478e0800595e44dd16506756ef9dfa3))

- Replace blocking readFileSync with async readFile in parseTscnFile
  ([`0658435`](https://github.com/n24q02m/better-godot-mcp/commit/06584353c2878cc257b291c035980f173ef8e855))

- Use async file I/O for project settings and project tool
  ([`516146b`](https://github.com/n24q02m/better-godot-mcp/commit/516146b44b6443bc8b0fdde66b953699689a6469))

- **shader**: Async file ops & optimize traversal
  ([`b890957`](https://github.com/n24q02m/better-godot-mcp/commit/b8909579f64dceb01a3f4c1a157abf4972db66d0))

### Refactoring

- Consolidate argument validation in scenes tool
  ([`ef37944`](https://github.com/n24q02m/better-godot-mcp/commit/ef3794415d64129cf33e1f684a1b449b50957f0c))

- Use shared scene-parser in nodes tool
  ([`eb250b1`](https://github.com/n24q02m/better-godot-mcp/commit/eb250b1a8d52eebfc7413e6734d2c0c81bba72b7))

### Testing

- Add project tool tests
  ([`85656bf`](https://github.com/n24q02m/better-godot-mcp/commit/85656bf9e2e88fcd5d07b8cdce478ba22472fde5))

- Add project tool tests
  ([`6420371`](https://github.com/n24q02m/better-godot-mcp/commit/6420371f895cb8edd690a114af678ce021e030c9))

- Add tests for handleHelp tool
  ([`d81aca6`](https://github.com/n24q02m/better-godot-mcp/commit/d81aca6b0a90292a8bb5979e3c7338a989f7a15f))

- Add tests for handleHelp tool
  ([`c36ed3a`](https://github.com/n24q02m/better-godot-mcp/commit/c36ed3a49eff939176e43a17174323f5df437287))

- Add tests for physics tool
  ([`22bdbcc`](https://github.com/n24q02m/better-godot-mcp/commit/22bdbcc5d5392110584da53ab390a9f362fd968c))

- Add unit tests for security.ts wrapToolResult
  ([`b3e4052`](https://github.com/n24q02m/better-godot-mcp/commit/b3e405239ad06a1ad08ea6393ab51ef3900b9244))

- Add unit tests for security.ts wrapToolResult
  ([`df52f80`](https://github.com/n24q02m/better-godot-mcp/commit/df52f8051640615560e58d0a2c21bdd845605a9d))

- Improve error handling coverage for node removal
  ([`805f08b`](https://github.com/n24q02m/better-godot-mcp/commit/805f08bbfdd451a351d39b437b60c2b3124d8e6f))

- **composite**: Add integration tests for handleAnimation tool
  ([`76af0c9`](https://github.com/n24q02m/better-godot-mcp/commit/76af0c9545f09204f2af4921f1bd05461b208aa4))


## v1.2.0 (2026-02-28)

### Bug Fixes

- Biome trailing commas in vitest config
  ([`05dc277`](https://github.com/n24q02m/better-godot-mcp/commit/05dc27791be872854bca3baece884cefa21e6a99))

- Standardize repo structure with enforce-commit hook
  ([`8754ee5`](https://github.com/n24q02m/better-godot-mcp/commit/8754ee5ce53df05663aa285753cbc339275240e4))

- Update README badges with Codecov, tech stack, and engineering standards
  ([`e9dec88`](https://github.com/n24q02m/better-godot-mcp/commit/e9dec887a064cdc717299f65e388b9a71b751983))

- Update rollup to 4.59.0 to fix path traversal vulnerability (CVE)
  ([`3345780`](https://github.com/n24q02m/better-godot-mcp/commit/334578070c9513b7d14b1c050fb9673d83f6c542))

- Use vitest directly for coverage to fix codecov upload
  ([`e60a2ae`](https://github.com/n24q02m/better-godot-mcp/commit/e60a2aee599c8519b6103d7ef3c7504c283e97a6))

- **ci**: Fix Qodo Merge env variable dot notation bug
  ([`336f4b4`](https://github.com/n24q02m/better-godot-mcp/commit/336f4b4ac3121a186e1ccf761aa88e93a330d0ed))

- **ci**: Fix Qodo model to gemini-3-flash-preview
  ([`e9393ad`](https://github.com/n24q02m/better-godot-mcp/commit/e9393adb2f081069f64d1bcd72bdffde011dcc7e))

- **ci**: Fix syntax errors and correctly configure Qodo + Gemini 3 Flash
  ([`20835ca`](https://github.com/n24q02m/better-godot-mcp/commit/20835ca20d7118e4c7fe5398a7c193ddc166e3c5))

- **ci**: Move pr-agent config to .pr_agent.toml
  ([`e6e29eb`](https://github.com/n24q02m/better-godot-mcp/commit/e6e29eb75e039899dc4712fba33eb95e3d0a6f19))

- **ci**: Update to supported Gemini 3 and 2.5 flash models
  ([`c39d51a`](https://github.com/n24q02m/better-godot-mcp/commit/c39d51a8ccdedc24248f51b4e5edc93a697669bf))

- **deps**: Update @modelcontextprotocol/sdk to fix hono timing vulnerability
  ([`008247f`](https://github.com/n24q02m/better-godot-mcp/commit/008247f1f54cc58f7366b97ba575b68208d93423))

### Chores

- Add Gemini Code Assist style guide
  ([`a35097e`](https://github.com/n24q02m/better-godot-mcp/commit/a35097edd7a015b08f69d01951abe0a596d9cc23))

- Change Renovate schedule to daily 5am
  ([`7e846e8`](https://github.com/n24q02m/better-godot-mcp/commit/7e846e88fe3a9452120802a39de24bf4e8a92846))

- Migrate to 2025-2026 tech stack (bun/biome)
  ([`8ff9917`](https://github.com/n24q02m/better-godot-mcp/commit/8ff99175a87d48875bfcc577d51f280bbd32fde3))

- Remove CodeRabbit config, migrating to Gemini Code Assist
  ([`59f1b9b`](https://github.com/n24q02m/better-godot-mcp/commit/59f1b9bf23cc10101bffe70fb2f1e6fa887cd71e))

### Features

- Add Codecov coverage upload and CodeRabbit config
  ([`83822f2`](https://github.com/n24q02m/better-godot-mcp/commit/83822f26329c582c40fb964c4bd0fe0c0c34fb0a))

- **ci**: Add Renovate config for automated dependency updates
  ([`30c083f`](https://github.com/n24q02m/better-godot-mcp/commit/30c083f78cb77b772c168b521c924324fc756af8))

- **ci**: Add StepSecurity Harden-Runner to all workflow jobs (audit mode)
  ([`b979487`](https://github.com/n24q02m/better-godot-mcp/commit/b979487838fe81634fd4ffb2676875fa006fba1a))

- **ci**: Migrate to Qodo Merge AI Review (Gemini 3 Flash)
  ([`ad58894`](https://github.com/n24q02m/better-godot-mcp/commit/ad58894c9858d350916dac74d41d72c50ee9d27f))


## v1.1.1 (2026-02-25)

### Bug Fixes

- **cli**: Start-server entrypoint instead of init-server
  ([`0b752da`](https://github.com/n24q02m/better-godot-mcp/commit/0b752dacd17cdf9999260e4218b2f9feded84433))


## v1.1.0 (2026-02-25)

### Bug Fixes

- Add CI status badge to README
  ([`abc449e`](https://github.com/n24q02m/better-godot-mcp/commit/abc449ea4bbba79da210934beb75dbb856eb4189))

- Add GitHub ruleset for main branch protection
  ([`8ecdde6`](https://github.com/n24q02m/better-godot-mcp/commit/8ecdde62fc28651d52016b9ab4e8ce7d93df8693))

### Documentation

- Add AGENTS.md for AI coding agents
  ([`235b65b`](https://github.com/n24q02m/better-godot-mcp/commit/235b65b08244ff237a7fd5f3733bc7cd645d651f))

### Features

- Add data encapsulation against indirect prompt injection (XPIA)
  ([`1bc4991`](https://github.com/n24q02m/better-godot-mcp/commit/1bc499161ddc967327e39dfc6c4b84a170f557ba))


## v1.0.1 (2026-02-19)

### Bug Fixes

- **docker**: Fix entrypoint, add .dockerignore
  ([`61ec69c`](https://github.com/n24q02m/better-godot-mcp/commit/61ec69c11ea467b136c9647b7d0c87d65b7d6cd8))


## v1.0.0 (2026-02-19)

- Initial Release
