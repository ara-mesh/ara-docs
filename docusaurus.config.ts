import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Ara',
  tagline: 'Offline-first mesh sync for field operations',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: 'https://ara.dev',
  baseUrl: '/',

  organizationName: 'ara-mesh',
  projectName: 'ara',

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/ara-mesh/ara-docs/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Ara',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/ara-mesh',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Introduction', to: '/docs/intro'},
            {label: 'Go Setup', to: '/docs/setup/go'},
            {label: 'Android Setup', to: '/docs/setup/android'},
          ],
        },
        {
          title: 'SDK Reference',
          items: [
            {label: 'Go SDK (v1)', to: '/docs/sdk/v1/go'},
            {label: 'Android SDK (v1)', to: '/docs/sdk/v1/android'},
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/ara-mesh',
            },
          ],
        },
      ],
      copyright: `Copyright © 2026 James Moriarty. All rights reserved.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['kotlin', 'go', 'bash', 'sql', 'c'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
