import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { LEAVE_UNIVERSAL_IDENTIFIER } from '../objects/leave.object';

export default defineNavigationMenuItem({
  universalIdentifier: 'f46ce18b-3500-4305-bcc6-8a2c14cf6034',
  position: 4,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: LEAVE_UNIVERSAL_IDENTIFIER,
});
