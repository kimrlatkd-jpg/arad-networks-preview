# ARAD V27 내부 3D (27.0.7)

`scene-source.js`는 편집 가능한 Three.js 원본이며 `scenes.js`는 Three.js와 후처리를 포함한 브라우저 번들이다. 외부 모델·텍스처·CDN을 요청하지 않는다. 승인된 인트로에는 변경이 없다.

## 재질·빛·깊이

- **Isolate:** 앞면이 막힌 상자 대신 실제 깊이가 열린 통신 캐비티. 각 캐비티에 전경·중경·후경 3개 층으로 나눈 108개 광섬유, 총 324개를 배치했다. 절삭 파티션, 깊은 후면, 광학 종단부를 표현했다.
- **Accelerate:** 3개 층의 깊은 경로, 무게감 있는 끝단 매니폴드와 적층 베이스. 총 288개 광섬유를 여러 높이에 배치했다.
- **Connect:** 금속 패널·지붕 결합부·설비·지하 단면을 보강했다. 5G·메시·PLC 경로에 총 156개 광섬유를 서로 다른 높이와 깊이로 배치했다.
- 새틴 알루미늄의 방향성 거칠기 결, 네이비 분체 도장, 금속 단면을 구분한다. 자체 PMREM 스튜디오의 넓은 면광 반사가 카메라 이동에 따라 달라진다.
- 광섬유는 블루 바탕·청백색 펄스·약한 외부 산란을 분리했다. 비선택 경로도 남겨 여러 공간을 읽을 수 있다.

기술을 설명하는 개념 모델이며 실제 ARAD 제품 외관 또는 성능을 보증하는 시각 자료가 아니다.

## API

```js
const scene = ARADObjects.mount(element, {
  type: 'isolate', // accelerate | connect
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
});
scene.setProgress(0.5); // native scroll progress, 0..1
scene.setMode(1);      // manual hero selection
scene.replay();
scene.setPaused(true);
scene.getState();      // readiness, mode, progress, camera, fiber count
scene.dispose();
```

`setProgress(p)`는 스크롤 위치의 결정론적 상태를 즉시 그린다. 상위 페이지가 스크롤 입력의 완만한 보간을 담당한다. 0은 첫 화면, .15/.45/.75가 설명의 세 단계이다. 0으로 돌아오면 조립·카메라가 첫 상태로 돌아간다.

- Isolate: 기기별 경로 → 별도 라우팅 공간 → 허용된 상대. 공간 사이 간격과 카메라가 변하며 각 깊이를 드러낸다.
- Accelerate: 할당 → 전송 → 해제. 층별 경로가 조금 벌어지고 카메라가 채널 내부를 비춘다. 종료 단계에는 자원 해제를 빛의 강도로 표현한다.
- Connect: 5G → 메시 → PLC. 건물의 지붕 결합부와 시선을 조금 이동해 마지막에는 지하 경로를 보여준다.

모션 감소 설정에서는 카메라와 구조 움직임을 생략하고 관련 경로만 정적으로 표시한다. 등장·선택 모션이 끝나면 RAF는 정지한다. 스크롤 중에도 호출이 들어올 때만 그리며 화면 밖/문서 숨김에서는 GPU 렌더링을 멈춘다.

`data-object-ready`, `data-object-mode`, `data-object-motion`, `data-object-progress`, `data-object-error`를 상태 관찰에 사용할 수 있다. WebGL 실패 시 canvas를 숨기고 정지 이미지를 표시하도록 상위 페이지가 처리한다. `render(seconds)`와 `getAnchors()`는 프레임 검수·오버레이용이다.

## 구성

Three.js 0.181.1, esbuild 0.25.11. HalfFloat 후처리, MSAA와 SMAA, 제한된 bloom. 모바일 DPR1.5/그림자1024, 데스크톱 DPR2/그림자2048. 금속 미세 리브의 자기 그림자 오류를 방지하고 큰 면에서는 접촉 그림자를 유지한다.

독립 폴더에서 원본을 번들하려면 해당 폴더에 `three@0.181.1`과 `esbuild@0.25.11`을 설치한 뒤 `npx esbuild scene-source.js --bundle --format=iife --target=es2020 --minify --outfile=scenes.js`를 실행한다. `<script src="scenes.js"></script>`로 불러오면 `window.ARADObjects`가 노출된다. 캔버스 컨테이너에는 명시적인 너비·높이를 부여한다.

## Three.js license

The MIT License

Copyright © 2010-2025 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## 모바일 하이라이트 보정

모바일의 일부 시점에서 좁은 금속면의 반사 하이라이트가 점광원처럼 과증폭되어 전체 장면을 덮는 현상을 실제 캡처에서 확인했다. 불안정한 반사 조건을 줄이기 위해 anisotropy와 미세 노멀맵을 제거하고 방향성 roughness 텍스처는 유지했다. 구조 금속의 반사 radiance는 bloom 임계값 아래로 제한하며, 광섬유의 독립 HDR 셰이더에는 이 제한을 적용하지 않는다. 작은 가공 홈도 자기 그림자를 받지 않도록 처리했다.

반사 보정 이후에는 환경광1.12, 주광.95, 림.42, 부드러운 채움.55로 밝기를 회복해 큰 금속면이 보이도록 했다. 빛줄기와 구조 금속의 발광을 분리한 제한은 유지한다.

금속이 검은 환경만 반사하지 않도록 스튜디오 환경의 바탕을 중성 슬레이트 #263348로 높였다. 실제 페이지·장면 배경은 계속 #000208이다.
