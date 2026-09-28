import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const config = JSON.parse(
  await readFile(join(homedir(), '.twenty', 'config.json'), 'utf8'),
);
const remote = config.remotes[config.defaultRemote ?? 'local'];

const graphql = async (query, variables) => {
  const response = await fetch(`${remote.apiUrl}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${remote.apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (body.errors) {
    throw new Error(JSON.stringify(body.errors, null, 2));
  }
  return body.data;
};

for (const plural of ['Escalations', 'Leaves', 'Payouts', 'ServiceJobs', 'Technicians']) {
  await graphql(
    `mutation { destroy${plural}(filter: { id: { is: NOT_NULL } }) { id } }`,
  );
}

const HQ_COMMISSION_ON_BASE_CHARGE = 0.1;
const HQ_COMMISSION_ON_SERVICING_CHARGE = 0.02;
const SAMPLE_TRAVEL_RATE_PER_KM = 8;
const SAMPLE_BASE_CHARGE = 299;

const rupees = (amount) => ({
  amountMicros: Math.round(amount * 1_000_000),
  currencyCode: 'INR',
});

const hoursAgo = (hours) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

const daysAgo = (days) => hoursAgo(days * 24);

const dateOnly = (isoDate) => isoDate.slice(0, 10);

const TECHNICIANS = [
  ['Technician 1', '9810000001', 'AVAILABLE', 28.6, 77.04],
  ['Technician 2', '9810000002', 'ON_JOB', 28.59, 77.06],
  ['Technician 3', '9810000003', 'ON_THE_WAY', 28.585, 77.05],
  ['Technician 4', '9810000004', 'AVAILABLE', 28.61, 77.07],
  ['Technician 5', '9810000005', 'ON_JOB', 28.575, 77.045],
  ['Technician 6', '9810000006', 'AVAILABLE', 28.605, 77.08],
  ['Technician 7', '9810000007', 'OFF_DUTY', null, null],
  ['Technician 8', '9810000008', 'ON_LEAVE', null, null],
];

const { createTechnicians } = await graphql(
  `mutation ($data: [TechnicianCreateInput!]!) {
    createTechnicians(data: $data) { id name }
  }`,
  {
    data: TECHNICIANS.map(([name, phone, status, latitude, longitude]) => ({
      name,
      phone: {
        primaryPhoneNumber: phone,
        primaryPhoneCallingCode: '+91',
        primaryPhoneCountryCode: 'IN',
      },
      status,
      latitude,
      longitude,
      locationUpdatedAt: latitude === null ? null : hoursAgo(0.05),
      isActive: true,
    })),
  },
);

const technicianIdByName = Object.fromEntries(
  createTechnicians.map((technician) => [technician.name, technician.id]),
);

const buildJob = ({
  complaintId,
  appliance,
  area,
  status,
  technician,
  createdHoursAgo,
  distanceKm,
  servicingCharge,
  paymentMode,
  rating,
  latitude,
  longitude,
}) => {
  const travelCharge = distanceKm * SAMPLE_TRAVEL_RATE_PER_KM;
  const estimate = travelCharge + SAMPLE_BASE_CHARGE;
  const isClosed = status === 'CLOSED' || status === 'CLOSED_PART_DECLINED';
  const chargedServicing = status === 'CLOSED' ? servicingCharge : 0;
  const finalAmount = isClosed ? estimate + chargedServicing : null;
  const hqCommission =
    SAMPLE_BASE_CHARGE * HQ_COMMISSION_ON_BASE_CHARGE +
    chargedServicing * HQ_COMMISSION_ON_SERVICING_CHARGE;

  return {
    createdAt: hoursAgo(createdHoursAgo),
    complaintId,
    appliance,
    area,
    issue: `${appliance} not working`,
    customerFirstName: 'Customer',
    status,
    technicianId: technician ? technicianIdByName[technician] : null,
    estimate: rupees(estimate),
    baseCharge: rupees(SAMPLE_BASE_CHARGE),
    servicingCharge: rupees(chargedServicing),
    finalAmount: finalAmount === null ? null : rupees(finalAmount),
    scpEarning: finalAmount === null ? null : rupees(finalAmount - hqCommission),
    paymentMode,
    latitude,
    longitude,
    acceptedAt:
      status === 'NEW' ? null : hoursAgo(createdHoursAgo - 0.1),
    startedAt:
      ['IN_PROGRESS', 'CLOSED', 'CLOSED_PART_DECLINED', 'REVISIT'].includes(
        status,
      )
        ? hoursAgo(createdHoursAgo - 0.6)
        : null,
    closedAt: isClosed ? hoursAgo(createdHoursAgo - 1.4) : null,
    rating: isClosed ? rating : null,
  };
};

const TODAY_JOBS = [
  ['EW-1047', 'Washing machine', 'Dwarka Sec 10', 'REVISIT', 'Technician 1', 5, 4, 0, 'ONLINE', null, 28.59, 77.03],
  ['EW-1058', 'AC (split)', 'Janakpuri', 'NEW', null, 0.2, 6, 0, 'ONLINE', null, 28.62, 77.08],
  ['EW-1057', 'Geyser', 'Palam', 'NEW', null, 0.3, 5, 0, 'CASH', null, 28.585, 77.09],
  ['EW-1055', 'Refrigerator', 'Uttam Nagar', 'ACCEPTED', 'Technician 3', 0.9, 3, 0, 'CASH', null, 28.605, 77.055],
  ['EW-1054', 'Microwave', 'Dwarka Sec 3', 'ACCEPTED', 'Technician 6', 1, 4, 0, 'ONLINE', null, 28.6, 77.035],
  ['EW-1053', 'Washing machine', 'Dwarka Sec 7', 'ON_THE_WAY', 'Technician 2', 1.3, 5, 0, 'ONLINE', null, 28.58, 77.06],
  ['EW-1052', 'AC (window)', 'Janakpuri', 'ON_THE_WAY', 'Technician 4', 1.5, 7, 0, 'ONLINE', null, 28.615, 77.075],
  ['EW-1050', 'Chimney', 'Dwarka Sec 6', 'ON_THE_WAY', 'Technician 5', 1.8, 4, 0, 'CASH', null, 28.575, 77.04],
  ['EW-1049', 'Water purifier', 'Palam', 'IN_PROGRESS', 'Technician 1', 2.2, 3, 0, 'ONLINE', null, 28.59, 77.085],
  ['EW-1048', 'Refrigerator', 'Dwarka Sec 12', 'IN_PROGRESS', 'Technician 3', 2.5, 5, 0, 'ONLINE', null, 28.57, 77.05],
  ['EW-1046', 'AC (split)', 'Dwarka Sec 12', 'CLOSED', 'Technician 2', 4, 6, 450, 'ONLINE', 5, 28.572, 77.052],
  ['EW-1045', 'Microwave', 'Uttam Nagar', 'CLOSED_PART_DECLINED', 'Technician 4', 4.5, 3, 0, 'CASH', 4, 28.61, 77.06],
  ['EW-1044', 'Geyser', 'Janakpuri', 'CLOSED', 'Technician 6', 5, 5, 250, 'ONLINE', 4, 28.62, 77.07],
  ['EW-1043', 'Washing machine', 'Palam', 'CLOSED', 'Technician 5', 5.5, 4, 380, 'ONLINE', 5, 28.588, 77.088],
];

const EARLIER_JOBS = Array.from({ length: 22 }, (_, index) => {
  const appliances = ['AC (split)', 'Refrigerator', 'Washing machine', 'Microwave', 'Geyser', 'Water purifier'];
  const areas = ['Dwarka Sec 7', 'Janakpuri', 'Palam', 'Uttam Nagar', 'Dwarka Sec 12'];
  const technicians = ['Technician 1', 'Technician 2', 'Technician 3', 'Technician 4', 'Technician 5', 'Technician 6'];
  const partDeclined = index % 7 === 3;
  return [
    `EW-${1042 - index}`,
    appliances[index % appliances.length],
    areas[index % areas.length],
    partDeclined ? 'CLOSED_PART_DECLINED' : 'CLOSED',
    technicians[index % technicians.length],
    24 * (1 + Math.floor(index / 2)),
    3 + (index % 5),
    partDeclined ? 0 : 200 + (index % 4) * 120,
    index % 3 === 0 ? 'CASH' : 'ONLINE',
    index % 9 === 4 ? 2 : 4 + (index % 2),
    28.58 + (index % 5) * 0.008,
    77.04 + (index % 4) * 0.012,
  ];
});

const toJob = ([complaintId, appliance, area, status, technician, createdHoursAgo, distanceKm, servicingCharge, paymentMode, rating, latitude, longitude]) =>
  buildJob({ complaintId, appliance, area, status, technician, createdHoursAgo, distanceKm, servicingCharge, paymentMode, rating, latitude, longitude });

const { createServiceJobs } = await graphql(
  `mutation ($data: [ServiceJobCreateInput!]!) {
    createServiceJobs(data: $data) { id complaintId technicianId }
  }`,
  { data: [...TODAY_JOBS, ...EARLIER_JOBS].map(toJob) },
);

const jobByComplaintId = Object.fromEntries(
  createServiceJobs.map((job) => [job.complaintId, job]),
);

const escalation = (title, escalationType, status, complaintId, raisedHoursAgo) => ({
  title,
  escalationType,
  status,
  raisedAt: hoursAgo(raisedHoursAgo),
  serviceJobId: jobByComplaintId[complaintId].id,
  technicianId: jobByComplaintId[complaintId].technicianId,
});

await graphql(
  `mutation ($data: [EscalationCreateInput!]!) {
    createEscalations(data: $data) { id }
  }`,
  {
    data: [
      escalation('Revisit requested', 'REVISIT_REQUESTED', 'OPEN', 'EW-1047', 0.4),
      escalation('Not accepted in 15 min', 'NOT_ACCEPTED_IN_15_MIN', 'OPEN', 'EW-1055', 0.2),
      escalation('Rating below 3', 'LOW_RATING', 'OPEN', 'EW-1038', 20),
      escalation('Different tech requested', 'DIFFERENT_TECH_REQUESTED', 'RESOLVED', 'EW-1031', 110),
      escalation('Tech marked unsafe', 'UNSAFE', 'RESOLVED', 'EW-1026', 160),
      escalation('Revisit requested', 'REVISIT_REQUESTED', 'RESOLVED', 'EW-1024', 190),
      escalation('Rating below 3', 'LOW_RATING', 'RESOLVED', 'EW-1021', 220),
    ],
  },
);

await graphql(
  `mutation ($data: [LeaveCreateInput!]!) {
    createLeaves(data: $data) { id }
  }`,
  {
    data: [
      { title: 'Leave request', date: dateOnly(daysAgo(-3)), status: 'REQUESTED', technicianId: technicianIdByName['Technician 4'] },
      { title: 'Leave request', date: dateOnly(daysAgo(-5)), status: 'REQUESTED', technicianId: technicianIdByName['Technician 6'] },
      { title: 'Leave', date: dateOnly(daysAgo(0)), status: 'APPROVED', technicianId: technicianIdByName['Technician 8'] },
    ],
  },
);

await graphql(
  `mutation ($data: [PayoutCreateInput!]!) {
    createPayouts(data: $data) { id }
  }`,
  {
    data: [
      { week: 'This week', weekStart: dateOnly(daysAgo(6)), weekEnd: dateOnly(daysAgo(0)), amount: rupees(9860), status: 'UPCOMING', jobsCount: 14 },
      { week: 'Last week', weekStart: dateOnly(daysAgo(13)), weekEnd: dateOnly(daysAgo(7)), amount: rupees(11420), status: 'PAID', paidOn: dateOnly(daysAgo(6)), jobsCount: 16 },
      { week: 'Two weeks ago', weekStart: dateOnly(daysAgo(20)), weekEnd: dateOnly(daysAgo(14)), amount: rupees(3020), status: 'PAID', paidOn: dateOnly(daysAgo(13)), jobsCount: 5 },
    ],
  },
);

console.log(
  `Seeded ${createTechnicians.length} technicians and ${createServiceJobs.length} jobs with escalations, leaves and payouts.`,
);
