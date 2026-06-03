import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Setup',
      items: ['setup/go', 'setup/android'],
    },
    {
      type: 'category',
      label: 'SDK Reference (v1)',
      items: ['sdk/v1/go', 'sdk/v1/android'],
    },
    'peers',
    {
      type: 'category',
      label: 'Transports',
      items: [
        'transports/overview',
        'transports/mqtt',
        'transports/udp',
        'transports/lora',
      ],
    },
    'blobs',
    {
      type: 'category',
      label: 'Schema',
      items: ['schema/migrations'],
    },
  ],
};

export default sidebars;
