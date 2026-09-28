import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { TECHNICIANS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER } from '../page-layouts/technicians.page-layout';

export default defineNavigationMenuItem({
  universalIdentifier: 'c29c5dd6-9301-4cf2-a6b0-fd0cd3949198',
  name: 'Technician control',
  icon: 'IconTool',
  position: -1,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: TECHNICIANS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
});
