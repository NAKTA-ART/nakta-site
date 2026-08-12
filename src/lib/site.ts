/**
 * 사이트 전역 설정. 네비게이션 / 카테고리 정의는 여기 한 곳에서만 관리합니다.
 * Sanity 연동 후에도 카테고리는 코드에서 고정하거나, 이 파일을 Sanity 쿼리로 대체할 수 있습니다.
 */

export const SITE = {
  name: 'NAKTA',
  title: 'NAKTA — Digital artist',
  description: 'Digital artist. Create an imaginary world.',
  tagline: ['Digital artist', 'Create an imaginary world'],
  email: 'naktagraphic@gmail.com',
  copyright: `(C) ${new Date().getFullYear()} NAKTA. All rights reserved.`,
} as const;

export const CATEGORIES = [
  { slug: 'digital', label: 'DIGITAL' },
  { slug: 'painting', label: 'PAINTING' },
  { slug: 'collabo', label: 'COLLABO' },
  { slug: 'md', label: 'MD' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export const SECONDARY_NAV = [
  { href: '/about', label: 'ABOUT' },
  { href: '/contact', label: 'CONTACT' },
] as const;

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug.toUpperCase();
}
