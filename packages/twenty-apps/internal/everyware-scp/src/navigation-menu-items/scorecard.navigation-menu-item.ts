import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { SCORECARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER } from '../page-layouts/scorecard.page-layout';

export default defineNavigationMenuItem({
  universalIdentifier: '16bc3436-a22b-4d27-a54f-914ef43f9ae4',
  name: 'Scorecard',
  icon: 'IconChartBar',
  position: -1,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: SCORECARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
});
