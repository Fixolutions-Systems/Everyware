import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import { ESCALATION_UNIVERSAL_IDENTIFIER } from '../objects/escalation.object';
import { JOB_UNIVERSAL_IDENTIFIER } from '../objects/job.object';
import { JOB_ON_ESCALATION_ID, ESCALATIONS_ON_JOB_ID } from './job-on-escalation.field';

export default defineField({
  universalIdentifier: ESCALATIONS_ON_JOB_ID,
  objectUniversalIdentifier: JOB_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'escalations',
  label: 'Escalations',
  icon: 'IconAlertTriangle',
  relationTargetObjectMetadataUniversalIdentifier: ESCALATION_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: JOB_ON_ESCALATION_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
