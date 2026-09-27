import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { PAYOUT_UNIVERSAL_IDENTIFIER } from '../objects/payout.object';

export default defineNavigationMenuItem({
  universalIdentifier: '5597dd91-48ea-4fa5-a3bf-50ee8a298d5a',
  position: 2,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: PAYOUT_UNIVERSAL_IDENTIFIER,
});
