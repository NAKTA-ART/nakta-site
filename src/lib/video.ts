/**
 * YouTube / Vimeo 주소를 임베드용 주소로 변환합니다.
 * 스튜디오에서 붙여넣는 주소 형태가 제각각이라 URL 로 파싱해 처리합니다.
 */

export type VideoProvider = 'youtube' | 'vimeo';

export interface ParsedVideo {
  provider: VideoProvider;
  id: string;
  /** iframe 에 넣을 주소 */
  embedUrl: string;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const DIGITS = /^\d+$/;

function youtubeEmbed(id: string): string {
  // 관련 영상 노출을 이 채널로 제한(rel=0)하고, 추적이 적은 도메인을 씁니다.
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

function vimeoEmbed(id: string, hash?: string): string {
  return `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ''}`;
}

function parseYouTube(url: URL): ParsedVideo | undefined {
  const seg = url.pathname.split('/').filter(Boolean);

  // youtu.be/{id}
  if (url.hostname.endsWith('youtu.be')) {
    const id = seg[0];
    return id && YT_ID.test(id) ? { provider: 'youtube', id, embedUrl: youtubeEmbed(id) } : undefined;
  }

  // youtube.com/watch?v={id}
  const v = url.searchParams.get('v');
  if (v && YT_ID.test(v)) return { provider: 'youtube', id: v, embedUrl: youtubeEmbed(v) };

  // youtube.com/{embed|shorts|live|v}/{id}
  if (seg.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(seg[0]!)) {
    const id = seg[1]!;
    return YT_ID.test(id) ? { provider: 'youtube', id, embedUrl: youtubeEmbed(id) } : undefined;
  }

  return undefined;
}

function parseVimeo(url: URL): ParsedVideo | undefined {
  const seg = url.pathname.split('/').filter(Boolean);

  // player.vimeo.com/video/{id}
  if (seg[0] === 'video' && seg[1] && DIGITS.test(seg[1])) {
    const hash = url.searchParams.get('h') ?? undefined;
    return { provider: 'vimeo', id: seg[1], embedUrl: vimeoEmbed(seg[1], hash) };
  }

  // vimeo.com/{id} · vimeo.com/{id}/{hash}(비공개 영상) · vimeo.com/channels/x/{id}
  const idIndex = seg.findIndex((s) => DIGITS.test(s));
  if (idIndex === -1) return undefined;
  const id = seg[idIndex]!;
  const next = seg[idIndex + 1];
  const hash = next && !DIGITS.test(next) ? next : (url.searchParams.get('h') ?? undefined);
  return { provider: 'vimeo', id, embedUrl: vimeoEmbed(id, hash) };
}

/** 인식할 수 없는 주소면 undefined — 호출 쪽에서 해당 항목을 건너뜁니다. */
export function parseVideoUrl(raw: string): ParsedVideo | undefined {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return undefined;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;

  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtu.be' || host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    return parseYouTube(url);
  }
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    return parseVimeo(url);
  }
  return undefined;
}

/** "16:9" → { width: 16, height: 9 }. 형식이 이상하면 16:9 로 봅니다. */
export function parseAspect(value: string | null | undefined): { width: number; height: number } {
  const [w, h] = (value ?? '16:9').split(':').map((n) => Number.parseInt(n, 10));
  if (!w || !h || w <= 0 || h <= 0) return { width: 16, height: 9 };
  return { width: w, height: h };
}
