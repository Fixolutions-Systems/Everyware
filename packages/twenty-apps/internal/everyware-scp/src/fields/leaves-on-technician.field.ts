import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import { LEAVE_UNIVERSAL_IDENTIFIER } from '../objects/leave.object';
import { TECHNICIAN_UNIVERSAL_IDENTIFIER } from '../objects/technician.object';
import { TECHNICIAN_ON_LEAVE_ID, LEAVES_ON_TECHNICIAN_ID } from './technician-on-leave.field';

export default defineField({
  universalIdentifier: LEAVES_ON_TECHNICIAN_ID,
  objectUniversalIdentifier: TECHNICIAN_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'leaves',
  label: 'Leaves',
  icon: 'IconBeach',
  relationTargetObjectMetadataUniversalIdentifier: LEAVE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: TECHNICIAN_ON_LEAVE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
