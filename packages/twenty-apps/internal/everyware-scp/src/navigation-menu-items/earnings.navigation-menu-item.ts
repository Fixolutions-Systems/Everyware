import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { EARNINGS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER } from '../page-layouts/earnings.page-layout';

export default defineNavigationMenuItem({
  universalIdentifier: 'a4c1798f-fc18-43ca-bdb1-6c3964e0bea1',
  name: 'Earnings',
  icon: 'IconCurrencyRupee',
  position: -1,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: EARNINGS_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
});
