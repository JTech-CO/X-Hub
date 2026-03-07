# X Reposts Raffle

> **X(Twitter)의 리포스트 수집, 추첨, 맞팔 확인을 하나의 확장 프로그램으로 통합했습니다. 서버 불필요, 100% 클라이언트 사이드**

## 1. 소개 (Introduction)

이 프로젝트는 X(구 Twitter)에서 리포스트 이벤트 추첨과 팔로우 관계 분석을 간편하게 수행하기 위해 개발된 Chrome 확장 프로그램입니다.
별도의 서버 없이 브라우저에서 직접 동작하며, 수집된 데이터는 외부로 전송되지 않습니다.

**주요 기능**
- **Raffle Mode**: 리포스트(리트윗) 유저를 자동 스크롤로 수집하고, 원하는 인원만큼 랜덤 추첨
- **Follow Mode**: 팔로워/팔로잉 페이지에서 맞팔 여부를 자동 스캔하여 일방 팔로우 관계 확인
- **Cleaner Mode**: 향후 추가 예정 (Coming Soon)
- **다중 내보내기**: 수집 데이터를 Text / CSV / JSON 형식으로 클립보드에 복사
- **검색 & 정렬**: 핸들, 닉네임, 바이오 기반 실시간 필터링 및 정렬
- **Follower Only 필터**: 추첨 대상을 나를 팔로우하는 유저로만 한정
- **다국어 지원**: 영어·한국어 환경 모두에서 "Follows you" 배지 인식

## 2. 기술 스택 (Tech Stack)

- **Platform**: Chrome Extension (Manifest V3)
- **Language**: Vanilla JavaScript (ES2020+)
- **UI Rendering**: Shadow DOM (호스트 페이지 스타일과 완전 격리)
- **Typography**: Google Fonts - Inter, JetBrains Mono
- **Design**: Dark-theme 커스텀 UI, 모노스페이스 기반 미니멀 디자인 (X 디자인을 바탕으로 함)

## 3. 설치 및 실행 (Quick Start)

**요구 사항**: Chrome 기반 브라우저 (Chrome, Edge, Brave 등)

1. **다운로드 (Download)**
   ```bash
   git clone https://github.com/jtech-co/X-Repost-Raffle-Extension.git
   ```

2. **확장 프로그램 로드 (Load Extension)**
   - Chrome 주소창에 `chrome://extensions` 입력
   - 우측 상단 **개발자 모드** 활성화
   - **압축 해제된 확장 프로그램을 로드합니다** 클릭
   - 클론한 폴더를 선택

3. **사용 (Usage)**
   - **Raffle Mode**: `x.com/유저명/status/게시글ID/retweets` 페이지로 이동 → 패널이 자동 표시 → `Start` 클릭
   - **Follow Mode**: `x.com/유저명/followers` 또는 `/following` 페이지로 이동 → 모드 스위치 → `Start Scan` 클릭

## 4. 폴더 구조 (Structure)

```text
X Repost Raffle Extension/
├── manifest.json          # 확장 프로그램 설정 (Manifest V3)
├── content.js             # 핵심 로직 (UI 렌더링 + 데이터 수집 + 추첨)
├── icons/                 # 확장 프로그램 아이콘 (16/48/128px)
├── xrr-privacy-policy.html # 개인정보 처리방침 페이지
├── CHANGELOG.md           # 버전 히스토리
└── README.md              # 프로젝트 안내 문서
```

## 5. 정보 (Info)

- **Version**: 2.0.0
- **License**: MIT
- **Privacy Policy**: [개인정보 처리방침](https://jtech-co.github.io/X-Repost-Raffle-Extension/xrr-privacy-policy.html)
