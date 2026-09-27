import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { ESCALATION_UNIVERSAL_IDENTIFIER } from '../objects/escalation.object';

export default defineNavigationMenuItem({
  universalIdentifier: '37aac90c-c403-4f64-b8a6-9711059c2460',
  position: 3,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: ESCALATION_UNIVERSAL_IDENTIFIER,
});
