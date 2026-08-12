import { defineType, defineField, defineArrayMember } from 'sanity';
import { CATEGORIES } from '../../lib/site';

/**
 * 작업물(Work) 문서 타입.
 * 카테고리 목록은 src/lib/site.ts 의 CATEGORIES 를 그대로 씁니다.
 * (상단 메뉴 · 라우트 · 스튜디오 선택지가 항상 같은 값을 공유합니다)
 */
export const work = defineType({
  name: 'work',
  title: '작업물',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: '제목',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL 주소',
      type: 'slug',
      description: '비워두고 Generate 를 누르면 제목에서 자동 생성됩니다.',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: '카테고리',
      type: 'string',
      description: '상단 메뉴 중 어디에 노출할지 선택합니다.',
      options: {
        list: CATEGORIES.map((c) => ({ title: c.label, value: c.slug })),
        layout: 'radio',
        direction: 'horizontal',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'date',
      title: '작업 시점',
      type: 'date',
      description: '카드에 "2026. 05" 형식으로 표시되고, 정렬 기준(최신순)이 됩니다.',
      options: { dateFormat: 'YYYY-MM-DD' },
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'cover',
      title: '대표 이미지',
      type: 'image',
      description: '홈과 아카이브 카드에 쓰입니다. 핫스팟을 지정하면 잘릴 때 그 부분이 남습니다.',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: '대체 텍스트', type: 'string' }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'gallery',
      title: '상세 이미지 · 영상',
      type: 'array',
      description:
        '상세 페이지에 좌우 2단으로 자동 배치됩니다. 순서대로 균형을 맞춰 채우며, 영상도 이미지와 섞어서 넣을 수 있습니다.',
      of: [
        defineArrayMember({
          type: 'image',
          title: '이미지',
          options: { hotspot: true },
          fields: [defineField({ name: 'alt', title: '대체 텍스트', type: 'string' })],
        }),
        defineArrayMember({
          type: 'object',
          name: 'videoEmbed',
          title: '영상 (YouTube · Vimeo)',
          fields: [
            defineField({
              name: 'url',
              title: '영상 주소',
              type: 'url',
              description:
                'YouTube 또는 Vimeo 주소를 그대로 붙여넣으세요. (youtu.be/… , youtube.com/watch?v=… , youtube.com/shorts/… , vimeo.com/… )',
              validation: (rule) =>
                rule
                  .required()
                  .uri({ scheme: ['http', 'https'] })
                  .custom((value) =>
                    !value || /(?:youtu\.be|youtube\.com|youtube-nocookie\.com|vimeo\.com)/i.test(value)
                      ? true
                      : 'YouTube 또는 Vimeo 주소만 넣을 수 있습니다.',
                  ),
            }),
            defineField({
              name: 'aspect',
              title: '화면 비율',
              type: 'string',
              description: '영상 원본 비율을 고르세요. 세로 영상(쇼츠·릴스)이면 9:16 입니다.',
              options: {
                list: [
                  { title: '16:9 (가로, 기본)', value: '16:9' },
                  { title: '9:16 (세로)', value: '9:16' },
                  { title: '4:3', value: '4:3' },
                  { title: '1:1 (정사각)', value: '1:1' },
                ],
                layout: 'radio',
              },
              initialValue: '16:9',
            }),
            defineField({ name: 'caption', title: '설명 (선택)', type: 'string' }),
          ],
          preview: {
            select: { url: 'url', aspect: 'aspect', caption: 'caption' },
            prepare({ url, aspect, caption }) {
              return { title: caption || url, subtitle: `영상 · ${aspect ?? '16:9'}` };
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'body',
      title: '설명',
      type: 'array',
      description: '상세 페이지 왼쪽 흰색 패널에 들어갑니다.',
      of: [defineArrayMember({ type: 'block', styles: [{ title: '본문', value: 'normal' }] })],
    }),
  ],

  orderings: [
    {
      title: '최신순',
      name: 'dateDesc',
      by: [{ field: 'date', direction: 'desc' }],
    },
  ],

  preview: {
    select: { title: 'title', date: 'date', category: 'category', media: 'cover' },
    prepare({ title, date, category, media }) {
      const label = CATEGORIES.find((c) => c.slug === category)?.label ?? category;
      return { title, subtitle: [label, date].filter(Boolean).join(' · '), media };
    },
  },
});
