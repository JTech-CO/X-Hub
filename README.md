# X Hub

> **X(트위터)를 위한 올인원 확장프로그램 - 추첨, 팔로우 분석, 트윗 필터링. 서버 불필요, 100% 클라이언트 사이드.**

## 1. 소개

**X Hub**는 X(트위터)에서 세 가지 강력한 도구를 하나의 플로팅 패널로 제공하는 Chrome 확장프로그램입니다. 모든 기능이 브라우저 내에서만 동작하며, 계정 로그인·외부 서버·데이터 전송이 일절 불필요합니다.

**주요 기능**
- **MODE 1 · Raffle** - 리포스트 페이지를 자동 스크롤하여 리포스터를 수집하고 랜덤 추첨. Text / CSV / JSON 내보내기 지원.
- **MODE 2 · Follow** - 팔로워/팔로잉 페이지를 스캔하여 일방 팔로우 관계(맞팔 안 함 / 맞팔이 안 된 경우)를 감지.
- **MODE 3 · Filter** - 뱃지 등급(ALL / VERIFIED / NON-VER)에 따라 트윗을 숨기거나 표시. 타임라인·상세·검색 범위 지원. 팔로우 화이트리스트로 내 팔로우 네트워크는 항상 예외 처리.
- **자동 최소화** - 재게시/좋아요 페이지에서는 MODE 1, 팔로워/팔로잉 페이지에서는 MODE 2를 자동 전체 표시. 그 외 화면에서는 X HUB 로고 버튼으로 자동 최소화.
- **검색 & 정렬** - 핸들, 닉네임, 바이오 기반 실시간 필터링 및 정렬.
- **Follower Only 추첨** - 나를 팔로우하는 유저만 추첨 풀에 포함.

## 2. 기술 스택

| 항목 | 내용 |
|---|---|
| 플랫폼 | Chrome 확장프로그램 - Manifest V3 |
| 언어 | Vanilla JavaScript (ES2020+) |
| UI | Shadow DOM (X 페이지 스타일과 완전 격리) |
| 타이포그래피 | Google Fonts - Inter, JetBrains Mono |
| 저장소 | `chrome.storage.local` (Filter 화이트리스트 & 설정만 해당) |
| 디자인 | X의 디자인에서 영감을 받은 고대비 다크 테마 |

## 3. 빠른 시작

**요구 사항**: Chromium 기반 브라우저 (Chrome, Edge, Brave 등)

### 설치 (개발자 모드)

1. **클론**
   ```bash
   git clone https://github.com/jtech-co/X-Hub.git
   ```
2. `chrome://extensions` 열기
3. 우측 상단 **개발자 모드** 활성화
4. **압축 해제된 확장 프로그램 로드** 클릭 후 클론한 폴더 선택

### 사용법

| 모드 | 사용 위치 | 시작 방법 |
|---|---|---|
| **Raffle** | `x.com/*/status/*/retweets` 또는 `/likes` | 패널이 자동으로 펼쳐짐 → **Start** 클릭 |
| **Follow** | `x.com/*/followers` 또는 `/following` | 패널이 자동으로 펼쳐짐 → **Start Scan** 클릭 |
| **Filter** | `x.com/*` 전체 페이지 | 미니 버튼 클릭 → 패널 펼침 → **Filter** 모드로 전환 → ALL / VERIFIED / NON-VER 선택 |

> **패널 최소화**: 리포스트·좋아요·팔로워·팔로잉 외의 화면(홈, Grok 등)에서는 패널이 자동으로 우측 상단의 **X HUB 로고 버튼**으로 최소화됩니다. 클릭하면 펼쳐지고, 헤더의 `−` 버튼으로 다시 최소화할 수 있습니다.

## 4. 파일 구조

```text
X Hub/
├── manifest.json            # 확장프로그램 설정 (Manifest V3)
├── content.js               # 핵심 로직 - UI + 데이터 수집 + 추첨 + 필터
├── background.js            # 서비스 워커 - 팔로우 자동 동기화 탭 관리
├── fetch-interceptor.js     # 페이지 컨텍스트 스크립트 - X API 뱃지 데이터 캡처
├── icons/                   # 확장프로그램 아이콘 (16 / 48 / 128 px)
├── xh-privacy-policy.html  # 개인정보 처리방침 페이지
├── xh-patch-notes.html     # 패치 노트 페이지
└── README.md                # 이 파일
```

## 5. 정보

- **버전**: 3.1.0
- **라이선스**: MIT
- **개인정보 처리방침**: [Privacy Policy](https://jtech-co.github.io/X-Hub/xh-privacy-policy.html)
- **패치 노트**: [Patch Notes](https://jtech-co.github.io/X-Hub/xh-patch-notes.html)
