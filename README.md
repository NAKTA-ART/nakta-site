# NAKTA

Astro + Sanity CMS 포트폴리오 사이트. `design/` 의 PSD 시안을 픽셀 좌표 단위로 옮겼습니다.

## 링크

| | |
| --- | --- |
| 운영 사이트 | https://nakta-site.vercel.app |
| 스튜디오(CMS) | https://nakta-site.vercel.app/studio |
| 저장소 | https://github.com/NAKTA-ART/nakta-site |
| Sanity 프로젝트 관리 | https://sanity.io/manage — projectId `dkxl1vhh`, dataset `production` |
| 호스팅 | Vercel (팀 `npic`) — `main` 에 push 하면 자동 재배포 |

**렌더링 모드: SSR** (`output: 'server'`). 요청마다 Sanity 에서 가져오므로
스튜디오에서 Publish 하면 새로고침만으로 즉시 반영됩니다. Deploy Webhook 불필요.

새 도메인이나 프리뷰 주소에서 `/studio` 를 열려면 그 주소를 Sanity 의
**API → CORS origins** 에 `Allow credentials` 체크와 함께 추가해야 합니다.
(사이트 본문은 서버에서 가져오므로 CORS 없이도 보입니다)

```bash
npm run dev        # 개발 서버 (http://localhost:4321), 스튜디오는 /studio
npm run dev:clean  # Vite 캐시를 지우고 시작 (스튜디오가 깨졌을 때)
npm run build      # 빌드 → .vercel/output (Vercel 어댑터)
npm run check      # 타입 검사
```

> **스튜디오에 `Failed to fetch dynamically imported module` 이 뜨면**
> `npm run dev:clean` 으로 다시 띄우세요. 스튜디오는 화면마다 청크를 나눠
> 불러오는데, 설정 파일을 고쳐 dev 서버가 재시작되면 청크 이름이 바뀌어
> 열려 있던 탭이 옛 이름을 찾다가 실패합니다. 캐시를 지우면 해결됩니다.
> 프로덕션 빌드와는 무관한 개발 서버만의 현상입니다.

## 최초 설정 (한 번만)

```bash
npx sanity login            # Sanity 계정 로그인 (브라우저 열림)
npx sanity init --env       # 프로젝트 생성 + .env 자동 작성
```

`sanity init` 이 만들어준 `.env` 의 변수명이 다르면 `.env.example` 형식에 맞춰
`PUBLIC_SANITY_PROJECT_ID` / `PUBLIC_SANITY_DATASET` 로 바꿔주세요.

이후 `npm run dev` → `http://localhost:4321/studio` 에서 작업물을 올리면 됩니다.

## 페이지 구조

| 경로 | 내용 |
| --- | --- |
| `/` | 홈 — 카테고리 무관 **최신 4개**. `[0]`=우측 대형, `[1~3]`=좌측 썸네일 |
| `/digital` `/painting` `/collabo` `/md` | 해당 카테고리 작업물만 2단 그리드 |
| `/digital/the-last-nest` | 상세 — 흰색 텍스트 패널 + 갤러리 |
| `/about` `/contact` | 시안 대기 중 (기본 레이아웃) |
| `/studio` | Sanity 스튜디오 (임베디드) |

홈의 4칸은 **업로드 날짜(`date`) 최신순**으로 자동 채워집니다. 새 작업물을
올리면 가장 오래된 것이 홈에서 밀려나고, 카테고리 페이지에는 계속 남습니다.

## 소스 구조

```
sanity.config.ts          스튜디오 설정 (/studio)
src/
├─ sanity/schema/work.ts  ★ 작업물 스키마 — 카테고리는 lib/site.ts 를 재사용
├─ components/            Header · Footer · WorkCard
├─ layouts/BaseLayout     공통 <head> · 헤더 · 푸터
├─ lib/
│  ├─ site.ts             사이트 이름 / 카테고리 / 내비게이션 (단일 진실 공급원)
│  ├─ works.ts            ★ 데이터 접근 계층 — GROQ 쿼리는 전부 여기
│  └─ image.ts            Sanity 이미지 CDN URL / srcset 생성
├─ pages/
└─ styles/global.css      디자인 토큰 (색 · 타이포 · 레이아웃 수치)
```

페이지·컴포넌트는 Sanity 클라이언트를 직접 쓰지 않고 `lib/works.ts` 함수만
호출합니다.

| 함수 | 쓰이는 곳 |
| --- | --- |
| `getLatestWorks(4)` | 홈 |
| `getWorksByCategory(slug)` | 상단 메뉴 카테고리 페이지 |
| `getAllWorks()` | 상세 페이지 라우트 생성 |
| `getWorkBySlug(slug)` | 상세 페이지 |

### 카테고리 추가·변경

`src/lib/site.ts` 의 `CATEGORIES` 한 곳만 고치면 상단 메뉴 · 라우트 ·
스튜디오의 카테고리 선택지가 함께 바뀝니다.

## 시안 → 코드 매핑

시안(1920px 기준)에서 추출한 수치를 `global.css` 토큰에 넣고, 모든 크기를
`clamp()` + `vw` 로 비례 축소했습니다.

| 항목 | 시안값 | 토큰 |
| --- | --- | --- |
| 브랜드 블루 | `#1031BE` | `--c-blue` |
| 헤드라인 라벤더 | `#D4DBF7` | `--c-lavender` |
| 좌우 여백 | 54px | `--page-pad` |
| 헤더 / 푸터 높이 | 130px / 72px | `--header-h` / `--footer-h` |
| 컬럼 비율 | 486 : 1303 | `--col-left` / `--col-right` |
| 카드 간격 | 25px / 29px | `--gap-col` / `--gap-row` |

홈은 행 높이를 뷰포트에서 역산해 **헤더 + 3행 + 푸터가 정확히 100dvh** 에
맞습니다. 폰트는 `@fontsource` 셀프 호스팅 — 표제 **Anton**, 본문 **Lato**
(한글은 `Noto Sans KR` 폴백).

## 이미지 처리

Sanity 이미지 CDN에서 직접 받아옵니다 (`lib/image.ts`).

- 카드 — 표시 비율에 맞춰 서버에서 크롭. 스튜디오에서 지정한 **핫스팟**이
  반영되므로, 잘려도 의도한 부분이 남습니다.
- 상세 갤러리 — 원본 비율 유지, 폭만 여러 단계로 `srcset` 제공.
- 갤러리 2단 배치는 각 항목의 종횡비로 짧은 쪽 컬럼에 채우는
  `balanceColumns()` 가 담당합니다. 개수나 비율이 달라져도 균형이 유지됩니다.

## 영상 넣기 (YouTube · Vimeo)

상세 페이지의 **"상세 이미지 · 영상"** 배열에 이미지와 영상을 섞어 넣을 수
있습니다. `Add item` 을 누르면 `이미지` / `영상` 중에서 고릅니다.
넣은 순서대로 2단 배치 계산에 들어가므로, 이미지 사이에 영상이 자연스럽게
끼어듭니다.

영상 항목에는 주소만 붙여넣으면 됩니다. 아래 형식을 모두 인식합니다.

```
https://youtu.be/{id}
https://www.youtube.com/watch?v={id}
https://www.youtube.com/shorts/{id}
https://vimeo.com/{id}
https://vimeo.com/{id}/{hash}        비공개 영상
https://player.vimeo.com/video/{id}
```

**화면 비율**은 반드시 원본에 맞게 고르세요(가로 16:9, 세로 쇼츠·릴스 9:16).
이 값으로 자리를 잡기 때문에 틀리면 위아래 여백이 생깁니다.

- 인식할 수 없는 주소는 화면에서 **조용히 제외**됩니다. 페이지가 깨지지 않습니다.
- YouTube 는 `youtube-nocookie.com` 으로 임베드해 추적을 줄입니다.
- 화면에 들어올 때 로드되므로(`loading="lazy"`) 영상이 많아도 첫 로딩이
  느려지지 않습니다.
- 주소 파싱은 `lib/video.ts`, 렌더링은 `components/GalleryMedia.astro` 입니다.

> **대표 이미지는 계속 이미지여야 합니다.** 홈과 아카이브 카드는 핫스팟으로
> 잘라내는 구조라 영상이 들어갈 자리가 아닙니다. 영상 작업물이어도 카드용
> 스틸 한 장은 필요합니다.
>
> 영상 파일을 Sanity 에 직접 올리는 것도 가능하지만(`type: 'file'`),
> 무료 플랜은 저장 용량·대역폭이 제한적이고 트랜스코딩이 없어 권하지 않습니다.

## 배포와 콘텐츠 반영

SSR(`output: 'server'`) + `@astrojs/vercel` 로 배포합니다. 요청마다 Sanity 를
조회하므로 **Publish 하면 새로고침만으로 반영**되고, 재빌드가 필요 없습니다.
`main` 에 push 하면 Vercel 이 자동으로 다시 배포합니다.

> `@astrojs/vercel` 은 Astro 버전과 메이저를 맞춰야 합니다.
> Astro 5 → 어댑터 **9.x** (10.x=Astro 6, 11.x=Astro 7).
> `npx astro add vercel` 은 최신(=상위 메이저)을 설치하려다 peer 충돌로 실패합니다.

### 정적 빌드로 되돌리려면

`astro.config.mjs` 에서 `output: 'static'` 으로 바꾸고, `useCdn` 은 `false` 로
되돌리는 편이 낫습니다(빌드 때 한 번만 조회하므로). 각 라우트의
`getStaticPaths` 를 남겨두었기 때문에 그대로 동작하며, Sanity 에 **Deploy
Webhook** 을 걸어 발행 시 자동 재빌드시키면 됩니다.

> SSR 에서는 `getStaticPaths` 가 무시되어 패턴에 맞는 **모든** URL 이 라우트로
> 들어옵니다. 그래서 `[category]` 페이지들은 요청 시점에 카테고리 유효성과
> URL·문서 카테고리 일치를 검사해 404 로 보냅니다. 이 검사는 정적 빌드에서도
> 무해하니 그대로 두세요.
>
> 스튜디오 라우터는 정적일 때 해시(`/studio#/...`), SSR 일 때 일반 경로로
> 자동 전환됩니다.

## 남은 것

- `about` / `contact` 는 시안이 나오면 채웁니다.
- `design/sample-images/` 는 시안 JPG에서 잘라낸 임시 이미지입니다.
  스튜디오에 올려 확인용으로 쓰고, 원본으로 교체하세요.
