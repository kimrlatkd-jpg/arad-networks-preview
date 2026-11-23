# ARAD Networks · 홈페이지 미리보기 V34

[인트로부터 보기](https://kimrlatkd-jpg.github.io/arad-networks-preview/?v=34#home)

V32 디자인을 바탕으로 실제 아라드 제품의 형태를 반영한 검토용 홈페이지입니다.

- 완전한 블랙에서 시작하여 빛이 펼쳐지는 16:9·21:9 인트로
- 기존 카메라 이동과 빛이 장비 표면으로 변하는 모션 유지
- 메인 서버랙 전면에 Controller 통풍구·드라이브 베이와 Gateway 포트 배열 반영
- Isolate: Service Gateway와 Controller를 함께 탑재한 세로 랙
- Accelerate: Controller를 적층한 세로 랙
- Connect: 전면 Gateway·Point Gateway 장비, 후면 관리 화면
- 아라드 블루, 금속 재질, 제품 표면의 고정 로고로 통일
- 세 사업 선택 패널, 내부 페이지 전환, 스크롤 3단계와 기존 한글·영문 콘텐츠 유지

모델은 제공된 제품 사진을 참고해 만든 콘셉트 시각화이며, 치수와 사양을 보증하는 CAD가 아닙니다. Connect 관리 화면은 설명용 디자인입니다. AMLI의 성능 효과는 검증 중입니다.

## 실행과 소스
정적 HTTP 서버로 `site/`를 실행할 수 있습니다. 3D 편집 소스와 빌드 안내는 `site/assets/source/`에 있습니다. API 키나 별도 백엔드는 필요하지 않습니다.

## 배포
`site/**` 변경은 Pages 워크플로로 배포됩니다. `source.zip`과 `media.zip`에는 검토한 동일 버전 소스와 네 영상이 분리되어 있습니다. ZIP 업데이트 시 수동 워크플로의 `import_archives`를 선택합니다.

외부 라이브러리와 글꼴 고지는 `site/licenses/`와 `site/assets/fonts/OFL.txt`에 있습니다. 브랜드 자산의 권리는 각 권리자에게 있습니다.
