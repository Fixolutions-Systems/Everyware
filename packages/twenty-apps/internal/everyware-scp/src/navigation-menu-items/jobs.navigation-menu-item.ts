import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { JOB_UNIVERSAL_IDENTIFIER } from '../objects/job.object';

export default defineNavigationMenuItem({
  universalIdentifier: '293ca88c-ae12-48b6-832f-6b469d241f4e',
  position: 0,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: JOB_UNIVERSAL_IDENTIFIER,
});
