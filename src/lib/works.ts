/**
 * ─────────────────────────────────────────────────────────────
 *  데이터 접근 계층 — Sanity CMS
 * ─────────────────────────────────────────────────────────────
 *  페이지/컴포넌트는 Sanity 클라이언트를 직접 쓰지 않고
 *  이 파일의 함수만 사용합니다.
 */
import { sanityClient } from 'sanity:client';
import { toHTML } from '@portabletext/to-html';
import type { SanityImageSource } from '@sanity/image-url';
import type { CategorySlug } from './site';
import { parseVideoUrl, parseAspect } from './video';

type PortableText = Parameters<typeof toHTML>[0];

/** Sanity 이미지 참조 + 렌더에 필요한 원본 크기 */
export interface WorkImage {
  kind: 'image';
  /** @sanity/image-url 에 넘길 이미지 객체 */
  src: SanityImageSource;
  alt: string;
  width: number;
  height: number;
}

/** YouTube · Vimeo 임베드 */
export interface WorkVideo {
  kind: 'video';
  /** iframe src */
  embedUrl: string;
  caption?: string;
  /** 화면 비율. 이미지와 같은 방식으로 2단 배치 계산에 쓰입니다. */
  width: number;
  height: number;
}

/** 상세 페이지 갤러리에 들어가는 항목 — 이미지와 영상이 섞일 수 있습니다. */
export type WorkMedia = WorkImage | WorkVideo;

export interface Work {
  slug: string;
  title: string;
  category: CategorySlug;
  date: Date;
  /** "2026. 05" 형식 — 배지/제목 옆 표기용 */
  dateLabel: string;
  cover: WorkImage;
  gallery: WorkMedia[];
  /** 상세 페이지 경로 */
  href: string;
}

/* ── GROQ ────────────────────────────────────────────────── */

const IMAGE_FIELDS = `
  "src": @,
  alt,
  "width": asset->metadata.dimensions.width,
  "height": asset->metadata.dimensions.height
`;

const WORK_FIELDS = `
  "slug": slug.current,
  title,
  category,
  date,
  cover { ${IMAGE_FIELDS} },
  "gallery": coalesce(
    gallery[(_type == "image" && defined(asset)) || (_type == "videoEmbed" && defined(url))] {
      _type,
      _type == "image" => { ${IMAGE_FIELDS} },
      _type == "videoEmbed" => { url, aspect, caption }
    },
    []
  )
`;

/**
 * 렌더 가능한 문서 조건.
 * 스튜디오에서 "Add item" 만 누르고 이미지를 넣지 않으면 asset 이 없는 빈
 * 항목이 남습니다. 그대로 두면 이미지 URL 을 만들 수 없어 500 이 나므로,
 * 갤러리는 위에서 걸러내고 대표 이미지가 없는 문서는 아예 제외합니다.
 */
const RENDERABLE = `_type == "work" && defined(slug.current) && defined(cover.asset)`;

/** 최신순 */
const ORDER = `| order(date desc, _createdAt desc)`;

interface RawImage {
  _type?: 'image';
  src: SanityImageSource;
  alt: string | null;
  width: number | null;
  height: number | null;
}

interface RawVideo {
  _type: 'videoEmbed';
  url: string;
  aspect: string | null;
  caption: string | null;
}

type RawMedia = (RawImage & { _type: 'image' }) | RawVideo;

interface RawWork {
  slug: string;
  title: string;
  category: CategorySlug;
  date: string;
  cover: RawImage;
  gallery: RawMedia[];
}

/* ── 매핑 ────────────────────────────────────────────────── */

export function formatWorkDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}. ${m}`;
}

function toWorkImage(raw: RawImage, fallbackAlt: string): WorkImage {
  return {
    kind: 'image',
    src: raw.src,
    alt: raw.alt ?? fallbackAlt,
    // 메타데이터가 없는 예외적인 경우에도 레이아웃이 깨지지 않도록 4:3 으로 가정
    width: raw.width ?? 4,
    height: raw.height ?? 3,
  };
}

/** 인식할 수 없는 영상 주소는 undefined — 갤러리에서 제외됩니다. */
function toWorkVideo(raw: RawVideo): WorkVideo | undefined {
  const parsed = parseVideoUrl(raw.url);
  if (!parsed) return undefined;
  const { width, height } = parseAspect(raw.aspect);
  return {
    kind: 'video',
    embedUrl: parsed.embedUrl,
    caption: raw.caption ?? undefined,
    width,
    height,
  };
}

function toGallery(raw: RawMedia[], title: string): WorkMedia[] {
  return raw
    .map((item, i) =>
      item._type === 'videoEmbed' ? toWorkVideo(item) : toWorkImage(item, `${title} — ${i + 1}`),
    )
    .filter((m): m is WorkMedia => m !== undefined);
}

function toWork(raw: RawWork): Work {
  const date = new Date(raw.date);
  return {
    slug: raw.slug,
    title: raw.title,
    category: raw.category,
    date,
    dateLabel: formatWorkDate(date),
    cover: toWorkImage(raw.cover, raw.title),
    gallery: toGallery(raw.gallery, raw.title),
    href: `/${raw.category}/${raw.slug}`,
  };
}

/* ── 조회 ────────────────────────────────────────────────── */

/** 전체 목록 (최신순) */
export async function getAllWorks(): Promise<Work[]> {
  const raw = await sanityClient.fetch<RawWork[]>(
    `*[${RENDERABLE}] ${ORDER} { ${WORK_FIELDS} }`,
  );
  return raw.map(toWork);
}

/** 홈 — 최신 n개. [0]이 우측 대형, [1..3]이 좌측 썸네일 */
export async function getLatestWorks(limit: number): Promise<Work[]> {
  const raw = await sanityClient.fetch<RawWork[]>(
    `*[${RENDERABLE}] ${ORDER} [0...$limit] { ${WORK_FIELDS} }`,
    { limit },
  );
  return raw.map(toWork);
}

/** 상단 메뉴 — 해당 카테고리 작업물만 */
export async function getWorksByCategory(category: string): Promise<Work[]> {
  const raw = await sanityClient.fetch<RawWork[]>(
    `*[${RENDERABLE} && category == $category] ${ORDER} { ${WORK_FIELDS} }`,
    { category },
  );
  return raw.map(toWork);
}

/** 상세 페이지 — 작업물 + 설명(Portable Text → HTML) */
export async function getWorkBySlug(
  slug: string,
): Promise<{ work: Work; bodyHtml: string } | undefined> {
  const raw = await sanityClient.fetch<(RawWork & { body: PortableText | null }) | null>(
    `*[${RENDERABLE} && slug.current == $slug][0] { ${WORK_FIELDS}, body }`,
    { slug },
  );
  if (!raw) return undefined;
  return {
    work: toWork(raw),
    bodyHtml: raw.body ? toHTML(raw.body) : '',
  };
}

/* ── 레이아웃 헬퍼 (CMS 무관) ─────────────────────────────── */

/**
 * 갤러리 항목(이미지 · 영상)을 2컬럼으로 분배합니다.
 * 각 항목의 종횡비로 컬럼 누적 높이를 계산해 항상 짧은 쪽에 넣는 greedy
 * 방식이라, 개수/비율이 달라져도 시안과 같은 균형이 유지됩니다.
 * 영상도 화면 비율을 폭·높이로 갖고 있어 이미지와 동일하게 계산됩니다.
 *
 * @param seedLeft 좌측 컬럼에 미리 놓인 텍스트 블록의 정규화 높이(폭 대비)
 */
export function balanceColumns(media: WorkMedia[], seedLeft = 0.82) {
  const left: WorkMedia[] = [];
  const right: WorkMedia[] = [];
  let hLeft = seedLeft;
  let hRight = 0;

  for (const item of media) {
    const ratio = item.height / item.width; // 컬럼 폭을 1로 봤을 때의 높이
    if (hRight <= hLeft) {
      right.push(item);
      hRight += ratio;
    } else {
      left.push(item);
      hLeft += ratio;
    }
  }
  return { left, right };
}
