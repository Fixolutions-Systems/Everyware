import { defineApplication } from 'twenty-sdk/define';
import { DEFAULT_ROLE_UNIVERSAL_IDENTIFIER } from './roles/default-function.role';

export const APPLICATION_UNIVERSAL_IDENTIFIER = 'c8f2c3db-74f0-4c89-8648-0c4768957e44';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'Everyware SCP',
  description: 'Service centre partner dashboard: jobs, technicians, leaves, escalations and payouts',
  applicationVariables: {
    TRAVEL_RATE_PER_KM: {
      universalIdentifier: 'a76c0ebd-e825-4e6d-9bc5-01624c442ff2',
      description: 'Travel rate charged to the consumer per km (placeholder until set)',
      value: '',
      isSecret: false,
    },
    BASE_CHARGE: {
      universalIdentifier: '95445311-12a7-4111-adf9-4f721d458401',
      description: 'Base charge per visit (placeholder until set)',
      value: '',
      isSecret: false,
    },
    HQ_COMMISSION_ON_BASE_CHARGE_PERCENT: {
      universalIdentifier: 'c53bc3ea-8676-4ca7-8ff7-3e4a7be8f13f',
      description: 'Everyware HQ commission on the base charge',
      value: '10',
      isSecret: false,
    },
    HQ_COMMISSION_ON_SERVICING_CHARGE_PERCENT: {
      universalIdentifier: 'f57370c2-594b-4d48-b7c5-8795cec11648',
      description: 'Everyware HQ commission on the servicing charge',
      value: '2',
      isSecret: false,
    },
  },
  defaultRoleUniversalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
});
