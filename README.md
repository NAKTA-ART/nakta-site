# NAKTA

Astro + Sanity CMS 포트폴리오 사이트. `design/` 의 PSD 시안을 픽셀 좌표 단위로 옮겼습니다.

```bash
npm run dev        # 개발 서버 (http://localhost:4321), 스튜디오는 /studio
npm run dev:clean  # Vite 캐시를 지우고 시작 (스튜디오가 깨졌을 때)
npm run build      # 정적 빌드 → dist/
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
- 갤러리 2단 배치는 각 이미지의 실제 종횡비로 짧은 쪽 컬럼에 채우는
  `balanceColumns()` 가 담당합니다. 이미지 개수가 달라져도 균형이 유지됩니다.

## 배포와 콘텐츠 반영

정적 빌드라서 **스튜디오에서 발행한 내용은 다음 빌드부터 반영**됩니다.
Vercel · Netlify · Cloudflare Pages 중 무엇을 쓰든, Sanity 프로젝트에
**Deploy Webhook** 을 걸어두면 발행 직후 자동으로 다시 빌드됩니다.

즉시 반영이 필요하면 `astro.config.mjs` 에 `output: 'server'` 와 어댑터를
추가해 SSR로 전환할 수 있습니다.

> 정적 빌드에서는 스튜디오가 자동으로 해시 라우터(`/studio#/...`)를 쓰므로,
> 어떤 정적 호스팅에서도 새로고침 404 없이 동작합니다.
> SSR로 바꾸면 자동으로 일반 경로 라우터로 전환됩니다.

## 남은 것

- `about` / `contact` 는 시안이 나오면 채웁니다.
- `design/sample-images/` 는 시안 JPG에서 잘라낸 임시 이미지입니다.
  스튜디오에 올려 확인용으로 쓰고, 원본으로 교체하세요.
