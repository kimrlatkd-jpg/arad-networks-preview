# ARAD V26 내부 3D

원본: `scene-source.js`. 배포 번들: `scenes.js`. Three.js 0.181.1과 필요한 후처리를 포함하며 외부 CDN·모델·텍스처·폰트를 요청하지 않는다. V23 인트로는 수정하지 않았다.

## 장면별 디자인

| 장면 | 형태 | 빛과 진입 |
|---|---|---|
| Isolate | 낮고 넓은 트레이를 세 개의 깊은 수직 통신 캐비티로 교체. 두꺼운 네이비 몸체·절삭 금속 파티션·공통 하부 지지대. | 깊이와 밀도가 다른 108개 광섬유가 위로 채워진다. 각 캐비티가 약간 다른 시점에 내려앉으며 카메라가 우측으로 정착한다. |
| Accelerate | 긴 전송 엔진. 세 층의 큐 경로·층당 19개 핀·끝단 매니폴드. | 78개 광섬유가 좌→우로 전개된다. 레이어가 좌측에서 서로 다른 시간에 결합하고 넓은 카메라 각도가 정착한다. |
| Connect | 연속된 지반 위의 큰 산업동·서비스 타워·열린 설비 구역. 실제 공간이 열린 지하 터널. | 5G·메시·PLC의 공간 경로. 건축 매스가 위에서 정착하고 선택한 경로의 빛이 건물에서 지하까지 이어진다. |

공통 재질은 새틴 알루미늄, 네이비 `#1B2A55`, 딥 차콜이다. 광선은 절제된 블루와 아이스 화이트, 배경은 `#000208`. 금속의 모든 경계를 흰색으로 두르지 않고 큰 어두운 면과 넓은 스튜디오 반사를 남겼다. 실제 제품 사진이 아닌 기술 설명용 개념 모델이다.

## 사용

```js
const object = ARADObjects.mount(container, {
  type: 'isolate', // accelerate | connect
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  onReady(api) { /* 첫 프레임 성공 */ }
});
object.setMode(1);
object.replay();
object.setPaused(true);
object.dispose();
```

- 첫 진입: Isolate/Accelerate 4.6초, Connect 4.8초 후 정지. 자동 회전이나 무한 반복 없음.
- `setMode(0|1|2)`: 0.65초 상태 전환, 최대 1.05초 신호 후 정지. 진입이 진행 중이면 정상적으로 남은 진입까지 수행.
- `replay()`: 현 시점부터 장면 진입을 다시 재생. 정지 상태에서는 정지 유지.
- `render(seconds?)`: 검수용 명시적 프레임. 초기 진입 기준 초 값을 주면 해당 모션 상태를 그린다.
- `getAnchors()`: 선택 경로 시작/끝의 정규화된 화면 좌표.
- `data-object-ready=true`: 첫 WebGL 프레임 완료.
- `data-object-mode=0|1|2`: 현재 기술 선택.
- `data-object-motion=playing|settled|paused`: 진행 상태.
- `data-object-error=webgl-unavailable|context-lost`: 정지 이미지로 대체할 조건. 실패 시 ready 속성을 지우고 캔버스를 숨긴다.
- `onReady`는 mount 반환 전에 호출될 수 있으므로 콜백에 제공되는 API를 사용한다.

캔버스는 배경색을 포함한다. ACES 이후 출력의 RGB 하한을 #000208로 맞춰 컨테이너와 경계가 생기지 않게 한다. 컨테이너와 주변 배경을 `#000208`로 일치시킨다. 페이지 오버레이·버튼·텍스트는 DOM에 두고, 컨테이너 자체 높이를 반드시 지정한다. 기존 포스터 이미지는 컨테이너에 유지한다.

## 렌더링과 자원

모든 카메라는 실제 3D 경계 상자를 기준으로 컨테이너 종횡비에 맞게 재계산된다. DPR은 데스크톱2/모바일1.5, 그림자2048/1024. 데스크톱4x/모바일2x MSAA와 출력 이후 SMAA를 함께 사용한다. HalfFloat 후처리의 bloom 강도는0.15, threshold2.2이다. 새틴 금속의 거친 면과 자체 PMREM 스튜디오 환경을 사용한다.

신호 튜브는 각 경로별로 병합해 3개 경로의 core/halo로 렌더링한다. 금속 구조도 동일 부모의 동일 재질끼리 병합했다. 장면별 기하: Isolate30 meshes/212,400 triangles, Accelerate28/260,808, Connect22/104,036. 이는 기하 기준이며 환경·그림자·bloom 패스 비용은 별도다.

IO 화면 밖·document hidden에서는 RAF를 중단한다. 화면에 보이는 활성 객체 한 개만 그린다. `dispose()`는 관찰자·이벤트·GPU 자원·후처리 타깃을 정리한다. 모션 감소 설정은 완성 상태를 즉시 그리며 모드 변경도 즉시 반영한다.

## 빌드와 검수

```sh
node work/v26-objects/build.mjs
```

의존성은 기존 `work/arad-hero-3d-v23/node_modules`의 esbuild0.25.11, Three.js0.181.1을 사용한다. 번들·구문·기하 finite 검사와 출력 수량을 확인했다. 실제 브라우저의 형태·빛·모션·모바일 검수는 주 작업 담당이 V26 레이아웃에 통합한 화면으로 수행한다.

## Three.js license

The MIT License

Copyright © 2010-2025 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## 실제 화면에 따른 수정

V26 첫 통합 캡처에서 금속 리브 전체가 빛나는 문제가 확인되어 환경·키라이트·재질 반사 밝기를 낮추고 거칠기를 높였다. Bloom 임계값을1.05에서2.2로 올리고 강도도 낮춰 광섬유와 금속을 분리했다. Isolate의 얇은 전면 테두리는 다크 브러시드 재질로 변경했다. Connect 지붕에는 실제 연결된 낮은 설비 밴드를 추가했다. 배경은 후처리 이후에도 #000208로 맞췄다.

26.0.4에서는 실제 캡처에서 드러난 금속 경계의 반복적인 끊김을 자기 그림자 오류와 서브픽셀 샘플링으로 분리해 수정했다. 작은 고반사 금속 리브는 그림자를 만들되 자기 그림자를 받지 않으며, 큰 네이비 면·지반은 계속 그림자를 받는다. 그림자 해상도·bias를 수정하고 MSAA/SMAA를 적용했다. 환경광은0.67로 일부 회복시켜 넓은 새틴 면을 보이게 했다. SMAA lookup 이미지 로딩 뒤에는 모션 감소 상태에서도 한 번 다시 그린다.
