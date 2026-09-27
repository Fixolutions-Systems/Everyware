import { defineObject, FieldType } from 'twenty-sdk/define';

export const ESCALATION_UNIVERSAL_IDENTIFIER = '900e5f20-45da-4074-9a3d-bd39c5755c3b';
export const ESCALATION_NAME_FIELD_UNIVERSAL_IDENTIFIER = '430d94c3-3f53-40fb-8648-5ad77e93ed51';

export default defineObject({
  universalIdentifier: ESCALATION_UNIVERSAL_IDENTIFIER,
  nameSingular: 'escalation',
  namePlural: 'escalations',
  labelSingular: 'Escalation',
  labelPlural: 'Escalations',
  description: 'A flag raised on a job that needs attention',
  icon: 'IconAlertTriangle',
  labelIdentifierFieldMetadataUniversalIdentifier: ESCALATION_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: ESCALATION_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'title',
      label: 'Title',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: 'ed163e3a-1acf-414a-aa70-bd1e00c7a8d4',
      type: FieldType.SELECT,
      name: 'escalationType',
      label: 'Type',
      icon: 'IconAlertTriangle',
      defaultValue: `'REVISIT_REQUESTED'`,
      options: [
        { id: 'b0df2a7b-edf2-4b88-997a-36f117cd2541', value: 'LOW_RATING', label: 'Rating below 3', position: 0, color: 'red' },
        { id: '14110d10-6914-4d58-981b-3c7d15e9cc54', value: 'REVISIT_REQUESTED', label: 'Revisit requested', position: 1, color: 'red' },
        { id: 'c6172f59-80aa-4cad-bfa5-5b2d9616cc61', value: 'DIFFERENT_TECH_REQUESTED', label: 'Different tech requested', position: 2, color: 'orange' },
        { id: '76150888-8e23-44ae-af08-74f6442c93e6', value: 'NOT_ACCEPTED_IN_15_MIN', label: 'Not accepted in 15 min', position: 3, color: 'orange' },
        { id: '25e10973-6579-4977-959e-39bbdea6dd82', value: 'UNSAFE', label: 'Tech marked unsafe', position: 4, color: 'red' },
      ],
    },
    {
      universalIdentifier: '854a503f-7e8e-46f3-b747-00670f799064',
      type: FieldType.SELECT,
      name: 'status',
      label: 'Status',
      icon: 'IconProgress',
      defaultValue: `'OPEN'`,
      options: [
        { id: '9328fa13-f60c-468d-970b-cde20d8c0e5f', value: 'OPEN', label: 'Open', position: 0, color: 'red' },
        { id: '0944ba33-565d-4309-899f-2465b398a439', value: 'RESOLVED', label: 'Resolved', position: 1, color: 'green' },
      ],
    },
    {
      universalIdentifier: '7b83fc38-a058-44f5-8c83-062a15cdfe9d',
      type: FieldType.DATE_TIME,
      name: 'raisedAt',
      label: 'Raised at',
      icon: 'IconClock',
      isNullable: true,
    },
  ],
});
