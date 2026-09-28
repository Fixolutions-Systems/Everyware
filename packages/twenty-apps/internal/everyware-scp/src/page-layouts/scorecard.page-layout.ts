import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { SCORECARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from '../components/scorecard.front-component';

export const SCORECARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER =
  '01628aaa-6b0f-4bbf-b79f-00ba14f97f2d';

export default definePageLayout({
  universalIdentifier: SCORECARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Scorecard',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: '5ae22db7-197b-4c5b-9422-e64983d71a6d',
      title: 'Scorecard',
      position: 0,
      icon: 'IconChartBar',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'c6c4e02e-2ce5-4e24-ab76-f101abb88a70',
          title: 'Scorecard',
          type: 'FRONT_COMPONENT',
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              SCORECARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
  ],
});
