import { defineObject, FieldType } from 'twenty-sdk/define';

export const LEAVE_UNIVERSAL_IDENTIFIER = '5bf7050f-d4c7-4ab0-90fa-a32421e25d5f';
export const LEAVE_NAME_FIELD_UNIVERSAL_IDENTIFIER = '0e66dd72-8d9d-4a37-b72a-75fd56a4a758';

export default defineObject({
  universalIdentifier: LEAVE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'leave',
  namePlural: 'leaves',
  labelSingular: 'Leave',
  labelPlural: 'Leaves',
  description: 'A full-day leave for a technician',
  icon: 'IconBeach',
  labelIdentifierFieldMetadataUniversalIdentifier: LEAVE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: LEAVE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'title',
      label: 'Title',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: 'df3ce5d9-6c8c-4c39-ac66-01c07f82d025',
      type: FieldType.DATE,
      name: 'date',
      label: 'Date',
      icon: 'IconCalendar',
    },
    {
      universalIdentifier: '79e1eb52-ddb7-4261-8875-195610a79c9d',
      type: FieldType.SELECT,
      name: 'status',
      label: 'Status',
      icon: 'IconProgress',
      defaultValue: `'REQUESTED'`,
      options: [
        { id: '51eb0249-3db0-44c8-98bb-526cc1d6ddf0', value: 'REQUESTED', label: 'Requested', position: 0, color: 'yellow' },
        { id: '633c4835-6c90-44bd-85b4-5722a7207cae', value: 'APPROVED', label: 'Approved', position: 1, color: 'green' },
        { id: 'b46be02c-8142-43f3-9bef-3265722570a4', value: 'REJECTED', label: 'Rejected', position: 2, color: 'red' },
      ],
    },
  ],
});
