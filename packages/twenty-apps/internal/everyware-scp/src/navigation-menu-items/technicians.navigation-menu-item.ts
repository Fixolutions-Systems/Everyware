import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { TECHNICIAN_UNIVERSAL_IDENTIFIER } from '../objects/technician.object';

export default defineNavigationMenuItem({
  universalIdentifier: 'af332d14-9b96-449b-a42a-a2890be3e0e0',
  position: 1,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: TECHNICIAN_UNIVERSAL_IDENTIFIER,
});
