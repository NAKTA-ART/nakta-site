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

type PortableText = Parameters<typeof toHTML>[0];

/** Sanity 이미지 참조 + 렌더에 필요한 원본 크기 */
export interface WorkImage {
  /** @sanity/image-url 에 넘길 이미지 객체 */
  src: SanityImageSource;
  alt: string;
  width: number;
  height: number;
}

export interface Work {
  slug: string;
  title: string;
  category: CategorySlug;
  date: Date;
  /** "2026. 05" 형식 — 배지/제목 옆 표기용 */
  dateLabel: string;
  cover: WorkImage;
  gallery: WorkImage[];
  /** 상세 페이지 경로 */
  href: string;
}

/* ── GROQ ────────────────────────────────────────────────── */

const IMAGE = `{
  "src": @,
  "alt": coalesce(@.alt, ^.title),
  "width": @.asset->metadata.dimensions.width,
  "height": @.asset->metadata.dimensions.height
}`;

const WORK_FIELDS = `
  "slug": slug.current,
  title,
  category,
  date,
  cover ${IMAGE},
  "gallery": coalesce(gallery[] ${IMAGE}, [])
`;

/** 발행된 문서만, 최신순 */
const ORDER = `| order(date desc, _createdAt desc)`;

interface RawImage {
  src: SanityImageSource;
  alt: string | null;
  width: number | null;
  height: number | null;
}

interface RawWork {
  slug: string;
  title: string;
  category: CategorySlug;
  date: string;
  cover: RawImage;
  gallery: RawImage[];
}

/* ── 매핑 ────────────────────────────────────────────────── */

export function formatWorkDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}. ${m}`;
}

function toWorkImage(raw: RawImage, fallbackAlt: string): WorkImage {
  return {
    src: raw.src,
    alt: raw.alt ?? fallbackAlt,
    // 메타데이터가 없는 예외적인 경우에도 레이아웃이 깨지지 않도록 4:3 으로 가정
    width: raw.width ?? 4,
    height: raw.height ?? 3,
  };
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
    gallery: raw.gallery.map((g, i) => toWorkImage(g, `${raw.title} — ${i + 1}`)),
    href: `/${raw.category}/${raw.slug}`,
  };
}

/* ── 조회 ────────────────────────────────────────────────── */

/** 전체 목록 (최신순) */
export async function getAllWorks(): Promise<Work[]> {
  const raw = await sanityClient.fetch<RawWork[]>(
    `*[_type == "work" && defined(slug.current)] ${ORDER} { ${WORK_FIELDS} }`,
  );
  return raw.map(toWork);
}

/** 홈 — 최신 n개. [0]이 우측 대형, [1..3]이 좌측 썸네일 */
export async function getLatestWorks(limit: number): Promise<Work[]> {
  const raw = await sanityClient.fetch<RawWork[]>(
    `*[_type == "work" && defined(slug.current)] ${ORDER} [0...$limit] { ${WORK_FIELDS} }`,
    { limit },
  );
  return raw.map(toWork);
}

/** 상단 메뉴 — 해당 카테고리 작업물만 */
export async function getWorksByCategory(category: string): Promise<Work[]> {
  const raw = await sanityClient.fetch<RawWork[]>(
    `*[_type == "work" && category == $category && defined(slug.current)] ${ORDER} { ${WORK_FIELDS} }`,
    { category },
  );
  return raw.map(toWork);
}

/** 상세 페이지 — 작업물 + 설명(Portable Text → HTML) */
export async function getWorkBySlug(
  slug: string,
): Promise<{ work: Work; bodyHtml: string } | undefined> {
  const raw = await sanityClient.fetch<(RawWork & { body: PortableText | null }) | null>(
    `*[_type == "work" && slug.current == $slug][0] { ${WORK_FIELDS}, body }`,
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
 * 갤러리 이미지를 2컬럼으로 분배합니다.
 * 각 이미지의 실제 종횡비로 컬럼 누적 높이를 계산해 항상 짧은 쪽에 넣는
 * greedy 방식이라, 이미지 개수/비율이 달라져도 시안과 같은 균형이 유지됩니다.
 *
 * @param seedLeft 좌측 컬럼에 미리 놓인 텍스트 블록의 정규화 높이(폭 대비)
 */
export function balanceColumns(images: WorkImage[], seedLeft = 0.82) {
  const left: WorkImage[] = [];
  const right: WorkImage[] = [];
  let hLeft = seedLeft;
  let hRight = 0;

  for (const img of images) {
    const ratio = img.height / img.width; // 컬럼 폭을 1로 봤을 때의 높이
    if (hRight <= hLeft) {
      right.push(img);
      hRight += ratio;
    } else {
      left.push(img);
      hLeft += ratio;
    }
  }
  return { left, right };
}
