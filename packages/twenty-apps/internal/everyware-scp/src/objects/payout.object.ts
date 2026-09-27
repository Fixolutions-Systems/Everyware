import { defineObject, FieldType } from 'twenty-sdk/define';

export const PAYOUT_UNIVERSAL_IDENTIFIER = 'c79f208c-810d-46d0-8e54-1ffa88ca8a47';
export const PAYOUT_NAME_FIELD_UNIVERSAL_IDENTIFIER = 'bcd8ebb6-8972-4653-ac24-e6cd9ddb190c';

export default defineObject({
  universalIdentifier: PAYOUT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'payout',
  namePlural: 'payouts',
  labelSingular: 'Payout',
  labelPlural: 'Payouts',
  description: 'A weekly payout to the service centre partner',
  icon: 'IconCash',
  labelIdentifierFieldMetadataUniversalIdentifier: PAYOUT_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: PAYOUT_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'week',
      label: 'Week',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '0b634270-55d0-4c04-b726-df11a57e4c57',
      type: FieldType.DATE,
      name: 'weekStart',
      label: 'Week start',
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier: 'ee7e0e4e-339e-43a8-a26e-8748d2bd08da',
      type: FieldType.DATE,
      name: 'weekEnd',
      label: 'Week end',
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier: '8776085e-4a01-483d-97e1-6f7369d91931',
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Amount',
      icon: 'IconCurrencyRupee',
      isNullable: true,
    },
    {
      universalIdentifier: 'b60722ff-6b2d-4f3b-880f-84dd02a3a2b3',
      type: FieldType.SELECT,
      name: 'status',
      label: 'Status',
      icon: 'IconProgress',
      defaultValue: `'UPCOMING'`,
      options: [
        { id: 'f78320fc-070f-44af-9b3c-46265206875a', value: 'UPCOMING', label: 'Upcoming', position: 0, color: 'yellow' },
        { id: '6f391720-a622-4d35-ad00-3098ad8f2421', value: 'PAID', label: 'Paid', position: 1, color: 'green' },
      ],
    },
    {
      universalIdentifier: '4ec1e365-66cf-494e-81a4-bdd4439663a9',
      type: FieldType.DATE,
      name: 'paidOn',
      label: 'Paid on',
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier: 'a33e6202-961d-4dc7-a0b6-ba4d5be784f3',
      type: FieldType.NUMBER,
      name: 'jobsCount',
      label: 'Jobs',
      icon: 'IconHash',
      isNullable: true,
    },
  ],
});
