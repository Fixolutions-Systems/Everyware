import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';
import { TECHNICIANS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from '../components/technicians.front-component';

export const TECHNICIANS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER =
  'd8662573-a4bc-40a3-aa88-80b134bab1da';

export default definePageLayout({
  universalIdentifier: TECHNICIANS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Technician control',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: '0cb341c6-2e2f-4cc7-a25b-10fd80e72351',
      title: 'Technician control',
      position: 0,
      icon: 'IconTool',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'eb68cf9c-f7da-412f-8256-6354d432aff1',
          title: 'Technician control',
          type: 'FRONT_COMPONENT',
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              TECHNICIANS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
  ],
});
