// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sanity from '@sanity/astro';
import react from '@astrojs/react';

// astro.config 는 Vite 의 env 로딩보다 먼저 실행되므로 직접 읽어옵니다.
const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');

// @sanity/astro 의 모듈 dedupe 플러그인이 Windows 경로에서 `sanity` /
// `styled-components` 를 package.json 자체로 해석해 dev 서버의 사전 번들링이
// 실패합니다(스튜디오 화면이 빈 화면으로 뜸). 공식 스위치로 비활성화합니다.
process.env.SANITY_ASTRO_DISABLE_MODULE_DEDUPE = '1';

export default defineConfig({
  site: 'https://nakta.site',
  integrations: [
    sanity({
      projectId: env.PUBLIC_SANITY_PROJECT_ID,
      dataset: env.PUBLIC_SANITY_DATASET,
      apiVersion: '2025-02-19',
      // 빌드 시점에 최신 콘텐츠를 가져오도록 CDN 캐시를 쓰지 않습니다.
      useCdn: false,
      // 임베디드 스튜디오 경로
      studioBasePath: '/studio',
    }),
    // 스튜디오(React) 렌더링용 — 사이트 자체는 React를 쓰지 않습니다.
    react(),
  ],
  vite: {
    optimizeDeps: {
      // 스튜디오(/studio)는 사이트의 다른 페이지와 의존성이 완전히 다릅니다.
      // 명시하지 않으면 Vite 가 방문한 페이지에 따라 sanity 를 넣었다 뺐다 하며
      // 재최적화하고, 그때마다 청크 해시가 바뀌어 이미 로드된 스튜디오가
      // "Failed to fetch dynamically imported module" 로 깨집니다.
      include: ['sanity', 'sanity/structure', 'styled-components', 'react-is'],
      // react/compiler-runtime 은 `exports.c` 를 조건부 IIFE 안에서 할당해
      // cjs-module-lexer 가 named export 를 못 찾습니다. Sanity 6 이 이 모듈의
      // `c` 를 import 하므로, 명시적으로 interop 처리하도록 지정합니다.
      needsInterop: ['react/compiler-runtime'],
    },
  },
});
