import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import { ESCALATION_UNIVERSAL_IDENTIFIER } from '../objects/escalation.object';
import { TECHNICIAN_UNIVERSAL_IDENTIFIER } from '../objects/technician.object';
import { TECHNICIAN_ON_ESCALATION_ID, ESCALATIONS_ON_TECHNICIAN_ID } from './technician-on-escalation.field';

export default defineField({
  universalIdentifier: ESCALATIONS_ON_TECHNICIAN_ID,
  objectUniversalIdentifier: TECHNICIAN_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'escalations',
  label: 'Escalations',
  icon: 'IconAlertTriangle',
  relationTargetObjectMetadataUniversalIdentifier: ESCALATION_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: TECHNICIAN_ON_ESCALATION_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
