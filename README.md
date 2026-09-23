# X HUB

X(트위터)의 추첨·팔로우 관리·게시물 필터·멀티 타임라인을 제공하는 Chrome 확장프로그램입니다. 현재 버전은 **3.3.1**입니다.

| 모드 | 기능 |
|---|---|
| Raffle | 리포스트 참여자 수집, 무작위 추첨, TXT·CSV·JSON 내보내기 |
| Follow | 팔로워·팔로잉 목록 수집과 일방 팔로우 관계 확인 |
| Filter | 인증 뱃지·재게시·인용 필터, 팔로우 화이트리스트 |
| Vertical | 최대 8개 타임라인 구성, 독립 스크롤, 열 이동·확대·구성 저장 |

## 설치

1. 저장소를 다운로드하거나 클론합니다.
2. Chrome·Edge·Brave의 확장 관리 화면에서 **개발자 모드**를 켭니다.
3. **압축 해제된 확장 프로그램 로드**에서 **[dist](dist/)** 폴더를 선택합니다.
4. X 탭을 새로고침합니다.

`dist`는 바로 설치할 수 있도록 저장소에 포함합니다. 설치만 할 때는 Node.js나 빌드가 필요하지 않습니다. [배포 ZIP](releases/x-hub-v3.3.1.zip)을 다운로드했다면 압축을 푼 뒤 `manifest.json`이 있는 폴더를 선택합니다.

기존에 프로젝트 루트를 등록했다면 이제 `dist`를 등록해야 합니다. 경로가 바뀌면 확장 ID와 저장 설정도 달라질 수 있습니다. 기존 확장을 삭제하기 전에 [설치 전환 안내](docs/development.md#기존-루트-설치에서-전환)를 확인하세요.

## 폴더 구성

```text
X-Hub/
├── src/          원본 JavaScript·매니페스트·아이콘
├── dist/         브라우저에 바로 설치하는 빌드 결과
├── docs/         사용법·점검 보고서·개인정보 처리방침·패치 노트·이미지
├── releases/     스토어 업로드용 버전별 ZIP
├── scripts/      빌드·패키징·수동 검증 도구
├── tests/        회귀 테스트·빌드 테스트
├── package.json  개발 명령과 버전
└── README.md
```

코드는 `src`에서 수정합니다. `dist`는 빌드할 때 다시 생성되며 직접 편집하면 변경 내용이 덮어써집니다. `dist`와 `releases`는 저장소에 포함하는 배포 결과물입니다.

## 개발

Node.js 22 또는 24 LTS를 사용합니다(`.nvmrc`: 24). 외부 npm 의존성은 없습니다. ZIP 생성에는 Windows PowerShell 5.1 이상이 필요합니다.

```powershell
npm ci
npm run build
npm test
npm run package
```

- `npm run build`: 원본 문법·버전·참조 파일을 검사하고 실행 파일 8개만 `dist`에 복사합니다.
- `npm test`: 빌드 후 배포 파일의 회귀 테스트와 빌드 실패·재생성 테스트를 실행합니다.
- `npm run package`: 빌드 후 `releases/x-hub-v<버전>.zip`을 만들고 각 파일의 SHA-256을 검증합니다.
- `npm run preview`: 가상 타임라인을 `http://127.0.0.1:8765/home`에서 엽니다. 실제 X 연결 검증과는 별개입니다.

소스 수정 후에는 빌드 → 확장 관리 화면에서 새로고침 → X 탭 새로고침 순서로 적용합니다. Vertical 헤더의 `v3.3.1`, 검정 배경·보라색 강조·직각 모서리로 현재 디자인을 확인할 수 있습니다.

[사용 안내](docs/usage.md) · [개발·배포 안내](docs/development.md) · [코드 점검 보고서](docs/audit.md) · [패치 노트](docs/xh-patch-notes.html) · [개인정보 처리방침](docs/xh-privacy-policy.html)
