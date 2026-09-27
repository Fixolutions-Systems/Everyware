import { defineObject, FieldType } from 'twenty-sdk/define';

export const TECHNICIAN_UNIVERSAL_IDENTIFIER = '3a5f2597-7626-49cb-a097-22d6f686b146';
export const TECHNICIAN_NAME_FIELD_UNIVERSAL_IDENTIFIER = '2ce4b0a6-b56c-4d38-bc50-bfb6e8d38592';

export default defineObject({
  universalIdentifier: TECHNICIAN_UNIVERSAL_IDENTIFIER,
  nameSingular: 'technician',
  namePlural: 'technicians',
  labelSingular: 'Technician',
  labelPlural: 'Technicians',
  description: 'A technician working for the service centre partner',
  icon: 'IconTool',
  labelIdentifierFieldMetadataUniversalIdentifier: TECHNICIAN_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: TECHNICIAN_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Name',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '23811dd5-16a0-4853-991e-577e4c120ffa',
      type: FieldType.PHONES,
      name: 'phone',
      label: 'Phone',
      icon: 'IconPhone',
    },
    {
      universalIdentifier: '2aa44d45-c946-40ba-ab07-58f5ba93ec52',
      type: FieldType.SELECT,
      name: 'status',
      label: 'Status',
      icon: 'IconProgress',
      defaultValue: `'OFF_DUTY'`,
      options: [
        { id: '202528a1-fa6c-45dd-b95c-e58d35e8f147', value: 'OFF_DUTY', label: 'Off duty', position: 0, color: 'gray' },
        { id: '3ded3d8f-1657-4d18-8169-95af450ef286', value: 'AVAILABLE', label: 'Available', position: 1, color: 'green' },
        { id: '0dc2935a-ab10-412b-a90e-ed85b7b87ad7', value: 'ON_THE_WAY', label: 'On the way', position: 2, color: 'orange' },
        { id: '3f0d5747-45c3-410b-a3df-b227aba193b4', value: 'ON_JOB', label: 'On job', position: 3, color: 'blue' },
        { id: 'b0d1b606-3464-4450-b358-85951c565617', value: 'ON_LEAVE', label: 'On leave', position: 4, color: 'gray' },
        { id: 'a4ac1da8-df8d-4b98-a1dc-d68d8a49d6a9', value: 'INVITED', label: 'Invited', position: 5, color: 'sky' },
      ],
    },
    {
      universalIdentifier: '240c3fc5-5e72-496c-a66a-b6aecb66e0dd',
      type: FieldType.NUMBER,
      name: 'latitude',
      label: 'Latitude',
      icon: 'IconMapPin',
      isNullable: true,
    },
    {
      universalIdentifier: '7cd1a8ff-d785-43a1-8e3f-01f43a2031d0',
      type: FieldType.NUMBER,
      name: 'longitude',
      label: 'Longitude',
      icon: 'IconMapPin',
      isNullable: true,
    },
    {
      universalIdentifier: '9ce2f180-a7ef-480d-bcbd-3330493ee073',
      type: FieldType.DATE_TIME,
      name: 'locationUpdatedAt',
      label: 'Location updated at',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: 'f5b8ed90-0102-4ff9-b524-597bdff82fac',
      type: FieldType.BOOLEAN,
      name: 'isActive',
      label: 'Active',
      icon: 'IconCheck',
      defaultValue: true,
    },
    {
      universalIdentifier: '2fe38788-b516-4d9c-9baf-e6703610f631',
      type: FieldType.DATE_TIME,
      name: 'removedAt',
      label: 'Removed at',
      icon: 'IconUserX',
      isNullable: true,
    },
  ],
});
