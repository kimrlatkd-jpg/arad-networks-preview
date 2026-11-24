# ARAD 인사이트 글 작성·관리

연구소와 영업에서 이어서 작성하는 정적 블로그입니다. 원고는 `content/insights/*.json`, 공개 결과는 `site/`에 있습니다. 별도 CMS나 계정 서비스는 제공하지 않습니다. 편집에는 GitHub 저장소 쓰기 권한이 필요하며, 접근 권한과 검토 정책은 저장소 소유자가 정합니다.

## 기존 글 수정

1. 홈페이지 인사이트 하단의 **글 작성·관리**를 열고 글 옆의 **원고 수정**을 누릅니다.
2. `translations.ko` 또는 `translations.en`에서 `title`, `summary`, `sections`를 수정합니다. 본문은 HTML 없이 일반 문장으로 작성합니다.
3. 커밋하거나 Pull Request를 만들어 검토를 요청합니다. 기본 브랜치에 반영되면 GitHub Actions가 목록·개별 글·RSS를 함께 생성하고 검사·배포합니다.
4. Actions 배포 성공 후 PC·모바일에서 링크와 본문을 확인합니다. 생성 오류가 발생하면 배포가 중단되고 기존 정상 사이트가 유지됩니다.

## 새 글 작성

관리 화면의 **새 글 작성**은 실제 GitHub 새 파일 화면을 엽니다. 기본 `new-article.json` 파일명과 내부 `slug`를 글에 맞는 동일한 이름으로 바꿉니다. 이미 같은 파일이 있으면 새 이름을 정합니다.

- `slug`: 영문 소문자·숫자·하이픈. 예: `network-operations`.
- `category`: `isolate`, `accelerate`, `connect` 중 하나.
- `order`: 목록 순서. 작은 수부터 나옵니다.
- `published`: 초안은 `false`, 검토 후 게시할 때 `true`.
- `image`: 저장소 `site/assets/` 아래에 업로드한 사용 권한 확인 이미지. 값은 `assets/…`로 시작합니다.
- `translations.ko`: 한국어 원고. `title`, `summary`, `image_alt`, `sections`를 입력합니다.
- `translations.en`: 영어 번역이 있을 때만 추가합니다. 없는 언어의 글은 만들지 않습니다.
- `sections`: 각 항목에 `heading`과 `paragraphs` 문단 배열을 넣습니다.
- `date`, `updated`: 실제 게시일·수정일을 알 때만 `YYYY-MM-DD` 형식으로 입력합니다.
- `translations.ko.author` / `translations.en.author`: 실제 작성자가 확인되었을 때만 입력합니다. 없으면 조직명으로 표시합니다.
- `editorial_team`: 언어별 편집 담당 표기입니다. 실제 담당 조직명만 입력합니다.

JSON의 따옴표와 쉼표를 유지합니다. 원고 형식이 잘못되었거나 이미지 파일이 없으면 생성기는 공개 파일을 쓰기 전에 실패합니다. 새 글의 예시 문구는 게시 전 실제 검토 원고로 바꿉니다.

## 글 내리기

원고를 삭제하지 말고 `published`를 `false`로 바꿉니다. 원고는 보관되며 다음 생성 시 목록·RSS·생성된 개별 글에서 제거됩니다. 다른 페이지에 직접 작성한 관련 링크가 있다면 그 링크도 함께 확인합니다.

## 검토 기준

기존 글 3개는 기존 홈페이지 자료를 보존한 것입니다. 날짜·작성자·실적·성능 수치·고객 사례를 추정해서 추가하지 않습니다. 성능 주장은 측정 조건과 확인 자료를 갖춘 뒤 작성합니다. 현재 실사 사진은 적용 환경을 설명하는 예시이며 아라드가 직접 구축한 현장으로 소개하지 않습니다. 사진 출처는 `site/licenses/photography.txt`에서 확인합니다.

## 글이 읽히는 방식

글은 자바스크립트 없이 읽을 수 있는 의미 있는 HTML입니다. 제목, 문단, 목차, canonical, BlogPosting 구조화 데이터, 전체 본문 RSS를 제공합니다.

- 한국어 RSS: `https://kimrlatkd-jpg.github.io/arad-networks-preview/insights/feed.xml`
- 영어 RSS: `https://kimrlatkd-jpg.github.io/arad-networks-preview/insights/feed-en.xml`

검토 사이트는 기존 `noindex,nofollow`를 유지합니다. GPT·Claude나 검색엔진이 반드시 수집하거나 노출한다고 보장하지 않습니다. 정식 도메인 오픈 시 공개 정책과 canonical 기본 주소를 함께 정합니다.

## 로컬 생성 / 배포 연동

```sh
python3 scripts/build_insights.py --site site --content content/insights
```

Python 3.10 이상, 표준 라이브러리만 사용합니다. 생성 시각을 자동으로 추가하지 않으므로 같은 입력은 같은 결과를 냅니다. V40의 `site/blog.css`, `site/blog.js`, 현재 `site/pages/insights.html`, `site/en/insights.html` 공통 헤더·푸터가 필요합니다. 실제 글은 원고에서 재생성되므로 생성된 HTML의 본문을 직접 편집하지 않습니다.

GitHub Actions는 `content/insights/**`와 `scripts/build_insights.py`, `site/**` 변경을 받아 생성 → 정적 검사 → Pages 게시 순서로 실행합니다. 연구소·영업 계정 초대나 권한 변경은 이 작업에 포함하지 않습니다.
