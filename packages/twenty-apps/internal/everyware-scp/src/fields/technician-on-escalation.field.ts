import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { ESCALATION_UNIVERSAL_IDENTIFIER } from '../objects/escalation.object';
import { TECHNICIAN_UNIVERSAL_IDENTIFIER } from '../objects/technician.object';

export const TECHNICIAN_ON_ESCALATION_ID = '8fb817e1-fdab-4ac6-ab55-fc326933fb83';
export const ESCALATIONS_ON_TECHNICIAN_ID = '4ba33095-9643-4362-9ef4-17688c07691e';

export default defineField({
  universalIdentifier: TECHNICIAN_ON_ESCALATION_ID,
  objectUniversalIdentifier: ESCALATION_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'technician',
  label: 'Technician',
  icon: 'IconTool',
  relationTargetObjectMetadataUniversalIdentifier: TECHNICIAN_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ESCALATIONS_ON_TECHNICIAN_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'technicianId',
  },
});
