import { createImageUrlBuilder } from '@sanity/image-url';
import { sanityClient } from 'sanity:client';
import type { WorkImage } from './works';

const builder = createImageUrlBuilder(sanityClient);

/** 카드/썸네일에 쓰는 기본 렌더 폭 */
const WIDTHS = [480, 768, 1024, 1440, 1920];

/**
 * 종횡비가 정해진 카드용 srcset.
 * 핫스팟/크롭 설정을 반영해 Sanity CDN 쪽에서 잘라옵니다.
 */
export function croppedSrcSet(image: WorkImage, aspect: number, widths = WIDTHS) {
  return widths
    .map((w) => {
      const url = builder
        .image(image.src)
        .width(w)
        .height(Math.round(w / aspect))
        .fit('crop')
        .auto('format')
        .quality(80)
        .url();
      return `${url} ${w}w`;
    })
    .join(', ');
}

export function croppedUrl(image: WorkImage, aspect: number, width = 1024) {
  return builder
    .image(image.src)
    .width(width)
    .height(Math.round(width / aspect))
    .fit('crop')
    .auto('format')
    .quality(80)
    .url();
}

/** 원본 비율을 유지하는 srcset (상세 페이지 갤러리용) */
export function fluidSrcSet(image: WorkImage, widths = WIDTHS) {
  return widths
    .filter((w) => w <= image.width * 2)
    .map((w) => `${builder.image(image.src).width(w).auto('format').quality(80).url()} ${w}w`)
    .join(', ');
}

export function fluidUrl(image: WorkImage, width = 1024) {
  return builder.image(image.src).width(width).auto('format').quality(80).url();
}
