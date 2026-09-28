import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { LIVE_JOBS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER } from '../page-layouts/live-jobs.page-layout';

export default defineNavigationMenuItem({
  universalIdentifier: '83b404e0-e33f-44bb-b471-c4242ce74494',
  name: 'Live jobs',
  icon: 'IconBriefcase',
  position: -1,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: LIVE_JOBS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
});
