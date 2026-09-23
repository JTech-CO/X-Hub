# 개발과 배포

## 파일 역할

- `src/manifest.json`: 권한, 버전, 실행 스크립트 순서.
- `src/content.js`: Raffle·Follow·Filter와 X HUB 패널.
- `src/vertical.js`: Vertical 화면과 각 열의 수명 주기.
- `src/background.js`: 자동 수집 탭 소유권, 저장 직렬화, Vertical 세션 규칙.
- `src/fetch-interceptor.js`: X 페이지 MAIN world의 응답 관찰.
- `docs/web-store-listing.txt`: 스토어 설명·권한 사용 근거 초안.
- `docs/images/`: 기존 홍보 이미지. 현재 버전의 화면과 다를 수 있으므로 스토어 등록 전 확인합니다.

원본은 `src` 한 곳에서 관리합니다. 과거 버전 전체를 중복 복사하는 대신 Git 태그와 버전별 ZIP으로 보관합니다.

## 빌드와 검증

Node.js 22 또는 24 LTS, Windows PowerShell 5.1 이상을 사용합니다. `.nvmrc`는 24를 지정합니다. `npm ci`는 잠금 파일을 확인하며 외부 라이브러리를 설치하지 않습니다.

```powershell
npm ci
npm test
npm run package
```

빌드는 매니페스트가 가리키는 파일, JavaScript 문법, `package.json`과 매니페스트의 버전 일치를 검사합니다. 검증한 임시 폴더로 `dist`를 교체하므로 원본 검증 실패 시 이전 결과를 유지하고, 성공 시 이전 빌드의 불필요한 파일을 제거합니다. 문서·테스트·개발 도구는 배포 파일에 포함하지 않습니다.

회귀 테스트는 `dist`에서 코드를 읽습니다. 수동 UI 검증은 `npm run preview` 후 `http://127.0.0.1:8765/home`에서 진행합니다. 이 서버는 가상 데이터만 사용하므로 실제 X의 로그인·DOM·네트워크 동작을 보증하지 않습니다. 종료는 터미널에서 Ctrl+C입니다.

실제 X 검증은 `dist`를 등록한 브라우저에서 수행합니다. 소스를 바꿀 때마다 다시 빌드하고 확장과 X 탭을 모두 새로고침하세요. 이전 검증 범위와 남은 확인 사항은 [점검 보고서](audit.md)를 참고하세요.

## 기존 루트 설치에서 전환

1. 기존 확장을 삭제하지 말고, X HUB의 필터 설정·화이트리스트·Vertical 열 구성을 기록합니다. 필요한 추첨·팔로우 수집 결과는 TXT·CSV·JSON으로 내보냅니다.
2. 기존 X HUB를 **사용 중지**한 후 **압축 해제된 확장 프로그램 로드**에서 프로젝트의 `dist` 폴더를 선택합니다. 두 설치를 동시에 활성화하지 않습니다.
3. X 탭을 새로고침하고 새 설치의 설정과 모드를 확인합니다. 설치 경로 변경으로 확장 ID가 달라지면 설정은 자동 이전되지 않습니다. 필터와 열 구성을 다시 지정하고 화이트리스트를 재동기화합니다.
4. 필요한 데이터와 기능을 확인한 뒤 기존 설치를 정리합니다. 기존 확장을 삭제하면 그 설치의 저장 데이터도 삭제될 수 있습니다.

이 정리는 브라우저 프로필이나 기존 확장의 저장소를 수정하지 않습니다.

## 새 버전 만들기

1. `src/manifest.json`과 `package.json`의 버전을 함께 변경합니다.
2. `npm install --package-lock-only --ignore-scripts`로 잠금 파일의 버전을 맞춥니다.
3. `docs/xh-patch-notes.html`, README의 버전·ZIP 링크와 스토어 설명을 갱신합니다.
4. `npm test`와 실제 브라우저 검증을 수행한 뒤 `npm run package`를 실행합니다.
5. 변경한 소스·문서·`dist`·`releases/x-hub-v<버전>.zip`을 같은 커밋에 포함합니다.
6. GitHub에 푸시한 뒤 해당 커밋에 `v<버전>` 태그와 GitHub Release를 생성하고 ZIP을 첨부합니다. 스토어에도 동일한 ZIP을 사용합니다.

패키징 스크립트는 ZIP 최상위에 `manifest.json`을 배치하고 모든 파일을 원본과 SHA-256으로 대조합니다. 파일 순서와 타임스탬프를 고정하므로 동일한 환경·소스로 재생성한 ZIP은 동일합니다. 같은 버전의 ZIP은 재생성 시 교체되고 다른 버전의 ZIP은 유지됩니다. 로컬 명령은 GitHub 업로드나 스토어 게시를 수행하지 않습니다.

## GitHub Pages 문서 경로

HTML 문서는 `docs`로 이동했습니다. 저장소에 반영한 뒤 **Settings → Pages → Deploy from a branch → main /docs**로 설정하면 기존 공개 주소를 유지할 수 있습니다.

- 개인정보 처리방침: <https://jtech-co.github.io/X-Hub/xh-privacy-policy.html>
- 패치 노트: <https://jtech-co.github.io/X-Hub/xh-patch-notes.html>

HTML 두 파일의 상대 링크는 그대로 유지됩니다. Pages 설정과 실제 공개 URL을 확인한 뒤 스토어에 반영하세요.
