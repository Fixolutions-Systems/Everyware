import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { ESCALATION_UNIVERSAL_IDENTIFIER } from '../objects/escalation.object';
import { JOB_UNIVERSAL_IDENTIFIER } from '../objects/job.object';

export const JOB_ON_ESCALATION_ID = '2b28ed22-0233-40bc-b2b2-82562ef59567';
export const ESCALATIONS_ON_JOB_ID = '59fd39dd-a1a2-4507-b526-e9a77118627c';

export default defineField({
  universalIdentifier: JOB_ON_ESCALATION_ID,
  objectUniversalIdentifier: ESCALATION_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'serviceJob',
  label: 'Job',
  icon: 'IconBriefcase',
  relationTargetObjectMetadataUniversalIdentifier: JOB_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ESCALATIONS_ON_JOB_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'serviceJobId',
  },
});
