# ARAD Networks · 홈페이지 미리보기 V42

[인트로부터 보기](https://kimrlatkd-jpg.github.io/arad-networks-preview/?v=42#home)

승인된 장비 비주얼과 프레임 없는 홀로그램 UI를 한·영 사업 선택 화면과 세 내부 페이지에 적용했습니다.

- Isolate AI: 컨트롤러·스위치·게이트웨이와 기기별 경로
- Accelerate AI: 서버와 작업·논리 경로·연산 구조
- Connect AI: PLC·Wi-Fi Mesh·5G Edge와 현장 연결 UI
- 선명한 영문 웹 텍스트, 경로 선택 및 스크롤 단계 연동
- 인트로 영상과 기존 대각선 패널 전환 유지
- 같은 해상도의 고품질 WebP로 웹 장비 5개 합계 약 1.8 MB

하단 실사 카드와 주소, 블로그 운영 구조는 반영됐습니다. 연구소 신규 원고·실측 그래프·기술 사진, Connect PM 최종안, 대표 회사소개 목차는 아직 미수신이며 현재 자료 기반 초안입니다.

- 승인된 인트로·사업 선택·실사 느낌 장비·홀로그램·전환 모션 유지
- Isolate 스마트홈·CCTV 적용 환경 사진과 설명
- 세 사업 하단 실사 사진과 한·영 주소 통일
- Accelerate 작업 수명주기·VRF/하드웨어 큐·평가 기준 및 검증 현황
- Connect 현장 서비스와 통신 방식별 설명, PLC 구성 보완
- 인사이트: 한·영 블로그 목록·검색·필터·개별 본문·목차·RSS
- 회사소개: 사업영역·설계 관점·제공 자료에 근거한 연혁·오시는 길

연구소·PM·대표의 최종 원고는 아직 전달되지 않아 현재 자료로 구성한 검토본입니다. 장비 이미지는 실물 사진이 아닌 콘셉트 시각화이고, 적용 환경 사진은 ARAD 고객사 구축 사진이 아닙니다. AMLI 작업별 대기열 분리의 성능 효과는 검증 중입니다.

## 블로그 운영
[원고 관리](https://kimrlatkd-jpg.github.io/arad-networks-preview/insights/manage.html) · [운영 안내](EDITORIAL-GUIDE.md)

연구소·영업 담당자는 저장소 쓰기 권한을 가진 GitHub 계정으로 `content/insights/*.json` 원고를 추가·수정합니다. `scripts/build_insights.py`가 한·영 목록, 본문, RSS를 생성하고 Pages 워크플로가 검증 후 발행합니다. 별도 CMS 계정이나 공개 작성 권한은 만들지 않았습니다. 검토 사이트의 noindex 설정은 유지했으며, 검색/AI 수집 여부를 보장하지 않습니다.

## 실행과 배포
정적 HTTP 서버로 `site/`를 실행할 수 있습니다. 현재 장비 UI·모션 소스는 `site/device-visuals.js`와 `site/device-visuals.css`입니다. 이전 모델 소스는 `site/assets/source/`에 보관돼 있습니다.

`site/**`, 원고, 생성기 변경은 Pages 워크플로로 반영됩니다. source.zip 갱신 시 수동 워크플로의 `import_archives`를 선택합니다. V42에서도 승인된 영상 4개가 담긴 V34 media.zip을 유지합니다.

사진·라이브러리·글꼴 출처는 `site/licenses/`와 `site/assets/fonts/OFL.txt`에 기록돼 있습니다.
