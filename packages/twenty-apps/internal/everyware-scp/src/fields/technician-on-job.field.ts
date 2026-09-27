import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { JOB_UNIVERSAL_IDENTIFIER } from '../objects/job.object';
import { TECHNICIAN_UNIVERSAL_IDENTIFIER } from '../objects/technician.object';

export const TECHNICIAN_ON_JOB_ID = 'd9b35404-8ea8-4307-b0ce-bb892748040e';
export const JOBS_ON_TECHNICIAN_ID = '213fc930-9539-4562-94da-4b66b7a06470';

export default defineField({
  universalIdentifier: TECHNICIAN_ON_JOB_ID,
  objectUniversalIdentifier: JOB_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'technician',
  label: 'Technician',
  icon: 'IconTool',
  relationTargetObjectMetadataUniversalIdentifier: TECHNICIAN_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: JOBS_ON_TECHNICIAN_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'technicianId',
  },
});
