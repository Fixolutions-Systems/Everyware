import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { LEAVE_UNIVERSAL_IDENTIFIER } from '../objects/leave.object';
import { TECHNICIAN_UNIVERSAL_IDENTIFIER } from '../objects/technician.object';

export const TECHNICIAN_ON_LEAVE_ID = '68551cc3-c514-467a-bc0c-95f18fae2b4f';
export const LEAVES_ON_TECHNICIAN_ID = '9fa4ccbe-3754-41be-a610-82d61506a31f';

export default defineField({
  universalIdentifier: TECHNICIAN_ON_LEAVE_ID,
  objectUniversalIdentifier: LEAVE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'technician',
  label: 'Technician',
  icon: 'IconTool',
  relationTargetObjectMetadataUniversalIdentifier: TECHNICIAN_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: LEAVES_ON_TECHNICIAN_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'technicianId',
  },
});
