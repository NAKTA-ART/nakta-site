import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schema';

/**
 * 임베디드 스튜디오 설정. /studio 에서 열립니다.
 * basePath 는 astro.config.mjs 의 studioBasePath 가 결정하므로 여기서 지정하지 않습니다.
 */
export default defineConfig({
  title: 'NAKTA Studio',
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .id('root')
          .title('콘텐츠')
          .items([
            S.listItem()
              .id('works')
              .title('작업물')
              .child(
                S.documentTypeList('work')
                  .title('작업물')
                  .defaultOrdering([{ field: 'date', direction: 'desc' }]),
              ),
          ]),
    }),
  ],
  schema: { types: schemaTypes },
});
