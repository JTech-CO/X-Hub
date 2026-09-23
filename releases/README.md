# 배포 파일

- [x-hub-v3.3.1.zip](x-hub-v3.3.1.zip): 확장 실행 파일 8개만 포함한 스토어 업로드용 패키지.
- ZIP 최상위의 `manifest.json`을 기준으로 설치합니다. 저장소 전체를 압축한 Source code ZIP과 구분하세요.
- `npm run package`로 다시 생성하며 SHA-256 검증을 자동 수행합니다.
- GitHub Release 게시와 스토어 업로드는 자동 수행하지 않습니다. 절차는 [개발·배포 안내](../docs/development.md)에 있습니다.
