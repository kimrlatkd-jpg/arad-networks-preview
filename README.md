# ARAD Networks · 홈페이지 미리보기

[인트로부터 홈페이지 보기](https://kimrlatkd-jpg.github.io/arad-networks-preview/?v=33#home)

아라드 네트웍스 홈페이지의 디자인과 인터랙션 검토용 사이트입니다. 현재 버전은 V33입니다.

## 이번 검토 반영

- 완전한 블랙에서 시작하는 빛 인트로
- 승인된 빛 모션과 세 사업영역의 연속 전환
- 실사 사진 중심의 사업 소개와 적용 환경
- 회사 제공 자료에 근거한 실적 표현
- 글을 작성·수정할 수 있는 인사이트 블로그 구조

사진은 적용 환경을 설명하는 이미지이며, 아라드가 직접 설치한 고객 현장 사진으로 표시하지 않습니다. 연구소와 담당자가 제공할 확정 원고·그래프·파트너 로고는 확인된 자료에 맞춰 반영합니다.

## 인사이트 글 관리

글 원고는 [`content/insights/`](content/insights/)에 있습니다. 홈페이지의 **글 관리** 링크로도 이동할 수 있습니다. 연구소·영업 담당자는 해당 저장소의 쓰기 권한으로 로그인해야 편집할 수 있습니다.

1. 기존 글의 JSON 파일을 열고 연필 아이콘으로 제목·요약·본문을 수정합니다.
2. 새 글은 기존 JSON을 복사하고 파일명과 `slug`를 같은 영문 이름으로 지정합니다.
3. `published: false`는 초안, `published: true`는 게시 대상입니다. `order`가 작을수록 먼저 표시됩니다.
4. 기본 브랜치에 커밋하거나 PR을 검토·병합하면 목록·글·RSS가 생성되고 사이트가 배포됩니다.

`translations.ko`와 `translations.en`에는 각 언어의 원고를 넣습니다. 번역이 없으면 해당 언어를 생략할 수 있습니다. `date`와 `author`는 실제 게시일·작성자를 알 때만 넣습니다. 기존 글에는 임의의 날짜나 작성자를 붙이지 않았습니다.

글을 내릴 때는 원고를 삭제하기보다 `published`를 `false`로 바꿉니다. 생성기가 목록·RSS와 해당 개별 페이지에서 제외합니다. 사진은 사용 권한을 확인한 뒤 `site/assets/`에 올리고 원고의 `image`에 상대 경로를 지정합니다.

## 로컬 실행과 배포

```sh
python3 scripts/build_insights.py --root .
python3 -m http.server 8000 --directory site
```

`site/**`, `content/insights/**`, `scripts/build_insights.py` 변경은 Pages 워크플로로 배포됩니다. 생성기는 Python 표준 라이브러리만 사용합니다. JSON 오류나 끊어진 로컬 참조가 발견되면 배포 전에 중단합니다.

정적 소스는 `source.zip`, 승인된 영상은 `media.zip`, 원고와 생성기는 `blog-content.zip`으로 묶여 있습니다. 이 세 아카이브로 전체 버전을 교체하려는 경우에만 수동 워크플로의 가져오기 옵션을 사용하세요. 아카이브 가져오기는 현재 `site/`와 `content/insights/`를 해당 검토본으로 교체합니다. 일반적인 원고 편집은 JSON 파일에서 진행하면 됩니다.

원고와 Python 생성기는 공개 사이트 산출물에 포함하지 않습니다. GitHub Pages에는 `site/`만 게시합니다. 이 GitHub 저장소 자체는 공개 저장소입니다.

## 검색과 피드

글 본문은 자바스크립트 실행 없이 읽을 수 있는 HTML입니다. 각 글에 canonical URL과 Article 구조화 데이터를 제공하며, RSS는 [한국어](https://kimrlatkd-jpg.github.io/arad-networks-preview/insights/feed.xml)와 [English](https://kimrlatkd-jpg.github.io/arad-networks-preview/insights/feed-en.xml)로 나뉩니다.

공개 검토 사이트의 `noindex,nofollow`는 유지합니다. 정식 오픈 시 검색 공개 여부를 결정해야 합니다.

## 권리와 안내

브랜드 자산과 원본 콘텐츠의 권리는 각 권리자에게 있습니다. 사진·외부 라이브러리와 글꼴의 사용 고지는 `site/licenses/`와 `site/assets/fonts/OFL.txt`에 있습니다. 3D는 기술 구조를 설명하는 개념 모델입니다. 문의 화면은 방문자가 확인하고 보낼 이메일을 작성하며 별도로 제출 내용을 저장하지 않습니다.
