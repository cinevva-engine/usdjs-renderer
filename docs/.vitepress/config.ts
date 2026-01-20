import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '@cinevva/usdjs-renderer',
  description: 'Headless PNG renderer for USD scenes',
  base: '/usdjs-renderer/',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['meta', { name: 'theme-color', content: '#e91e63' }],
  ],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/' },
      {
        text: 'Ecosystem',
        items: [
          { text: 'usdjs (Core)', link: 'https://cinevva-engine.github.io/usdjs/' },
          { text: 'usdjs-viewer', link: 'https://cinevva-engine.github.io/usdjs-viewer/' },
          { text: 'usdjs-renderer', link: 'https://cinevva-engine.github.io/usdjs-renderer/' },
        ]
      }
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'CLI Usage', link: '/cli' },
          { text: 'Programmatic API', link: '/api' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/cinevva-engine/usdjs-renderer' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Cinevva'
    },

    editLink: {
      pattern: 'https://github.com/cinevva-engine/usdjs-renderer/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  }
})
