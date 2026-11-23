# ARAD V35 제품 기반 3D 소스 (35.0.0)

V32의 홈페이지 구성과 선택 화면 전환을 유지하면서, 사용자가 제공한 ARAD 제품 사진을 참고해 장비 형상을 반영한 버전이다. 네이비·실버 재질, 아라드 블루 광섬유, 기존의 깊이감과 스크롤 연동 방식은 이어간다. 인트로 영상은 완전한 블랙에서 빛이 시작되도록 별도 갱신되었으며, 이 폴더는 선택 화면과 내부 페이지의 실시간 3D 소스를 담는다.

## 파일과 빌드 관계

- scene-source.js: 내부 페이지의 모델·광섬유·카메라·스크롤 상태. 빌드 결과는 사이트 루트의 scenes.js이며 window.ARADObjects를 제공한다.
- selector-scene-source.js: 세 사업분야 선택 화면의 투명 배경 모델과 hover 동작. 빌드 결과는 사이트 루트의 selector-objects.js이며 window.ARADSelectorObjects를 제공한다.
- products.js: 두 장면 소스가 공통으로 사용하는 ARAD Controller, Service Gateway, Point Gateway, 관리 화면, 표면 로고 함수.
- logo-paths.js: 사용자가 제공한 공식 ARAD 로고 SVG에서 추출한 path 데이터. products.js가 CanvasTexture로 만들어 제품 표면에 배치한다.
- ../editorial/object-{isolate,accelerate,connect}.jpg: 내부 페이지용 정지 이미지.
- ../editorial/selector-{isolate,accelerate,connect}.png: 선택 화면용 투명 RGBA 정지 이미지.

브라우저에는 번들 JS 두 개만 로드한다. 네 개의 편집 소스는 같은 폴더에 유지해야 하며, 제품 모델이나 로고를 변경하면 두 번들을 모두 다시 빌드한다. 정지 이미지는 같은 소스의 실제 Three.js 렌더에서 내보냈다. 외부 모델·텍스처·CDN을 런타임에 요청하지 않는다.

## 제품 표현

공통 제품 형상은 제공된 사진의 특징을 반영한다. Controller는 왼쪽 두 개의 통풍 그릴과 오른쪽 드라이브 베이, Service Gateway는 얇은 랙 장착형 케이스와 전면 포트, Point Gateway는 소형 케이스와 네 개의 LAN 포트를 표현한다. 로고는 장비에 처음부터 부착되어 있다.

선택 화면:
- Isolate: Service Gateway 6대와 Controller 2대를 장착한 세로 랙.
- Accelerate: 랙 없이 가로로 넓은 독립형 섀시에 세로 블레이드 8개와 우측 서비스 열을 배치하고, 앞쪽에 분리된 라인 카드를 둔다.
- Connect: 뒤쪽 관리 화면과 앞쪽 Service Gateway 2대·Point Gateway 2대.

내부 페이지:
- Isolate: 세 캐비닛에 각각 Service Gateway 6대와 Controller 2대를 배치한다. 세 경로를 구분하는 총 324개의 광섬유가 장비 측면을 따라 흐른다.
- Accelerate: 독립형 가로 섀시의 세로 블레이드와 전면 분리 카드를 표현한다. 288개의 광섬유가 블레이드별 경로와 병렬 흐름을 보여주며, 스크롤 후반에 하나의 블레이드가 미세하게 빠졌다 복귀한다. 장비의 전면 금속을 읽을 수 있도록 이 장면에만 소프트박스 반사를 추가했다.
- Connect: 관리 화면 뒤·앞의 깊이를 가진 구성에 Service Gateway 2대와 Point Gateway 2대를 배치한다. 총 156개의 광섬유가 관리 화면, 네트워크 장비, 단말 쪽 연결을 잇는다.

선택 화면은 작은 영역에서 사업을 식별하기 위한 축약 표현이고, 내부 페이지는 세 단계의 설명을 위한 구성이다. 장비 수량·치수·배치는 시각적 구성값이며 실제 납품 사양이 아니다. 관리 화면은 Concept view로 표시한 개념 UI로, 실제 제품 UI나 측정 성능을 주장하지 않는다.

## 재질과 실행

새틴 금속의 방향성 roughness, 네이비 외함, 은색 가공면을 구분한다. 내부 장면은 중성 슬레이트 환경과 넓은 면광 반사를 사용하며, 구조 금속의 radiance를 bloom 임계값 아래로 제한한다. 블루 광섬유의 독립 HDR 셰이더는 유지한다.

내부 페이지는 HalfFloat 후처리, 제한된 bloom, MSAA와 SMAA를 사용한다. 모바일 DPR은 최대 1.5, 데스크톱은 최대 2이다. 화면 밖·문서 숨김에서는 GPU 렌더링을 멈추며, 선택 및 등장 모션이 끝나면 RAF를 정지한다. 스크롤 입력이 있을 때 현재 상태를 다시 그린다.

선택 화면의 캔버스는 투명하고 배경색은 패널이 담당한다. hover는 700ms의 절제된 회전으로 끝난다. ResizeObserver가 크기에 맞춰 카메라를 맞추고, IntersectionObserver와 문서 가시성으로 불필요한 렌더링을 멈춘다. V32의 패널 진입 순서와 페이지 전환은 상위 컨트롤러가 그대로 담당한다.

## 내부 페이지 API

const scene = ARADObjects.mount(element, {
  type: 'isolate', // accelerate | connect
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
});
scene.setProgress(0.5); // native scroll progress, 0..1
scene.setMode(1);       // 세 설명 단계 중 선택
scene.replay();
scene.setPaused(true);
scene.getState();       // version, readiness, mode, progress, camera, fiber count
scene.render(3.0);      // 프레임 검수용
scene.getAnchors();     // 오버레이 연결점
scene.dispose();

setProgress(p)는 스크롤 위치에 해당하는 결정론적 상태를 그린다. 상위 페이지가 입력 보간을 담당하며, 0으로 돌아오면 첫 상태로 복원한다. 모션 감소 설정에서는 카메라·구조 움직임을 줄이고 관련 경로를 정적으로 표시한다.

## 선택 화면 API

const object = ARADSelectorObjects.mount(element, {
  type: 'isolate', // accelerate | connect
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
});
object.setPaused(false);
object.hover(true);
object.render(0);
object.exportPng();     // 투명 PNG data URL
object.getState();
object.dispose();

각 컨테이너에는 명시적인 너비·높이가 필요하다. data-object-ready와 data-object-error로 준비·오류 상태를 확인한다. WebGL을 사용할 수 없을 때 상위 페이지가 정지 이미지를 표시한다.

## 다시 빌드하기

의존성: three@0.181.1, esbuild@0.25.11.

이 소스 폴더에서 의존성을 준비한 후:

npx esbuild scene-source.js --bundle --format=iife --target=es2020 --minify --legal-comments=eof --outfile=../../scenes.js
npx esbuild selector-scene-source.js --bundle --format=iife --target=es2020 --minify --legal-comments=eof --outfile=../../selector-objects.js

프로젝트 작업본에서는 다음 빌드 스크립트가 기존 설치 의존성을 재사용하고, 모든 모델의 좌표가 유한한 값인지 함께 검사한다.

node work/v35-objects/interior/build.mjs
node work/v35-objects/selector/build.mjs

작업본의 공유 파일은 work/v35-objects/products.js와 logo-paths.js이다. 배포용 편집 소스는 이 README와 같은 폴더의 상대 경로로 import한다. 선택 화면의 별도 selector-poster.js는 정지 이미지 출력 전용이며 웹사이트에는 배포하지 않는다.

제품 형상 수정 후 두 번들 및 관련 정지 이미지를 갱신하고, 실제 3D 렌더와 모바일·데스크톱 화면에서 크기, 가림, 전환을 확인한다.

## Three.js license

The MIT License

Copyright © 2010-2025 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
