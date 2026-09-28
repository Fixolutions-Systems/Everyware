import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { LIVE_JOBS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from '../components/live-jobs.front-component';

export const LIVE_JOBS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER =
  '2ae6b94e-fb75-4520-ace1-84c9c89b7e03';

export default definePageLayout({
  universalIdentifier: LIVE_JOBS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Live jobs',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: 'd09a9d14-63ac-4793-bae9-65da3327cff8',
      title: 'Live jobs',
      position: 0,
      icon: 'IconBriefcase',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: '7e65e14f-8f66-471e-9464-265513c0cdcc',
          title: 'Live jobs',
          type: 'FRONT_COMPONENT',
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              LIVE_JOBS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
  ],
});
