import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import { JOB_UNIVERSAL_IDENTIFIER } from '../objects/job.object';
import { TECHNICIAN_UNIVERSAL_IDENTIFIER } from '../objects/technician.object';
import { TECHNICIAN_ON_JOB_ID, JOBS_ON_TECHNICIAN_ID } from './technician-on-job.field';

export default defineField({
  universalIdentifier: JOBS_ON_TECHNICIAN_ID,
  objectUniversalIdentifier: TECHNICIAN_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'serviceJobs',
  label: 'Jobs',
  icon: 'IconBriefcase',
  relationTargetObjectMetadataUniversalIdentifier: JOB_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: TECHNICIAN_ON_JOB_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
