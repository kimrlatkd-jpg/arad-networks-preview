# ARAD Networks Preview — V43

장비 뒤 홀로그램·모니터·개념도 오버레이를 제거하고, 승인된 장비 이미지만 보이도록 선택 화면과 한·영 내부 페이지를 정리했습니다. 인트로와 패널 전환은 그대로 유지됩니다.

[처음부터 보기](https://kimrlatkd-jpg.github.io/arad-networks-preview/?v=43#home)

## 블로그 운영
[원고 관리](https://kimrlatkd-jpg.github.io/arad-networks-preview/insights/manage.html) · [운영 안내](EDITORIAL-GUIDE.md)

연구소·영업 담당자는 저장소 쓰기 권한을 가진 GitHub 계정으로 `content/insights/*.json` 원고를 추가·수정합니다. `scripts/build_insights.py`가 한·영 목록, 본문, RSS를 생성하고 Pages 워크플로가 검증 후 발행합니다. 별도 CMS 계정이나 공개 작성 권한은 만들지 않았습니다. 검토 사이트의 noindex 설정은 유지했으며, 검색/AI 수집 여부를 보장하지 않습니다.

## 실행과 배포
정적 HTTP 서버로 `site/`를 실행할 수 있습니다. 현재 장비 UI·모션 소스는 `site/device-visuals.js`와 `site/device-visuals.css`입니다. 이전 모델 소스는 `site/assets/source/`에 보관돼 있습니다.

`site/**`, 원고, 생성기 변경은 Pages 워크플로로 반영됩니다. source.zip 갱신 시 수동 워크플로의 `import_archives`를 선택합니다. V43에서도 승인된 영상 4개가 담긴 V34 media.zip을 유지합니다.

사진·라이브러리·글꼴 출처는 `site/licenses/`와 `site/assets/fonts/OFL.txt`에 기록돼 있습니다.
