import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { EARNINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from '../components/earnings.front-component';

export const EARNINGS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER =
  'ab3d4b09-1424-44dc-b009-2c27f60fa2a1';

export default definePageLayout({
  universalIdentifier: EARNINGS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Earnings',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: 'e4ce1d8c-e60e-4cb0-88f7-0173eb28c761',
      title: 'Earnings',
      position: 0,
      icon: 'IconCurrencyRupee',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'f204648a-6595-47ce-915e-014a37b4bd3a',
          title: 'Earnings',
          type: 'FRONT_COMPONENT',
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              EARNINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
  ],
});
