import { useCallback, useEffect, useMemo, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';

export const EARNINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'b67f6fd0-932c-41f8-aa02-b02432c73ed0';

const REFRESH_INTERVAL_MS = 30_000;

const COLORS = {
  page: '#F3F6F9',
  card: '#FFFFFF',
  border: '#E6EBF0',
  text: '#0F1720',
  muted: '#5A6572',
  panel: '#3A4654',
  panelMuted: '#C5CDD6',
  panelDivider: 'rgba(255,255,255,0.12)',
  action: '#00B8E6',
  link: '#0087AD',
  rowOpen: '#E6FAFF',
};

const MONO = "'JetBrains Mono', ui-monospace, monospace";

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type PeriodKey = '1D' | '7D' | '30D';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '1D', label: 'Today' },
  { key: '7D', label: 'This week' },
  { key: '30D', label: 'Last 30 days' },
];

// Payout weeks run Monday to Sunday in IST, so period starts are computed in IST, not browser time.
const periodStart = (period: PeriodKey, now: Date) => {
  const istNow = now.getTime() + IST_OFFSET_MS;
  const istMidnight = Math.floor(istNow / DAY_MS) * DAY_MS;
  if (period === '1D') {
    return new Date(istMidnight - IST_OFFSET_MS);
  }
  if (period === '7D') {
    const daysSinceMonday = (new Date(istMidnight).getUTCDay() + 6) % 7;
    return new Date(istMidnight - daysSinceMonday * DAY_MS - IST_OFFSET_MS);
  }
  return new Date(now.getTime() - 30 * DAY_MS);
};

const nextMonday = (now: Date) => {
  const istMidnight = Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS;
  const daysUntilMonday = ((8 - new Date(istMidnight).getUTCDay()) % 7) || 7;
  return new Date(istMidnight + daysUntilMonday * DAY_MS);
};

type EarningJob = {
  id: string;
  complaintId: string;
  closedAt: string;
  technicianName: string;
  appliance: string;
  paymentMode: string;
  earnedRupees: number;
};

type Payout = {
  id: string;
  week: string;
  weekStart: string | null;
  weekEnd: string | null;
  amountRupees: number;
  status: 'UPCOMING' | 'PAID';
  paidOn: string | null;
  jobsCount: number;
};

const microsToRupees = (amountMicros: unknown) =>
  amountMicros == null ? 0 : Number(amountMicros) / 1_000_000;

const formatRupees = (amount: number, fractionDigits = 0) =>
  `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;

const formatDate = (isoDate: string | null) =>
  isoDate == null
    ? '-'
    : new Date(isoDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Kolkata',
      });

const labelStyle = (color: string) => ({
  fontFamily: MONO,
  fontSize: '12px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color,
});

const fetchEarnings = async (since: Date) => {
  const client = new CoreApiClient();

  const result = await client.query({
    serviceJobs: {
      __args: {
        first: 200,
        filter: {
          status: { in: ['CLOSED', 'CLOSED_PART_DECLINED'] },
          closedAt: { gte: since.toISOString() },
        },
        orderBy: [{ closedAt: 'DescNullsLast' }],
      },
      edges: {
        node: {
          id: true,
          complaintId: true,
          closedAt: true,
          appliance: true,
          paymentMode: true,
          scpEarning: { amountMicros: true },
          technician: { name: true },
        },
      },
    },
    payouts: {
      __args: { first: 12, orderBy: [{ weekStart: 'DescNullsLast' }] },
      edges: {
        node: {
          id: true,
          week: true,
          weekStart: true,
          weekEnd: true,
          status: true,
          paidOn: true,
          jobsCount: true,
          amount: { amountMicros: true },
        },
      },
    },
  });

  const jobs: EarningJob[] = (result.serviceJobs?.edges ?? []).map(({ node }) => ({
    id: node.id,
    complaintId: node.complaintId ?? '',
    closedAt: node.closedAt ?? '',
    technicianName: node.technician?.name ?? '-',
    appliance: node.appliance ?? '',
    paymentMode: node.paymentMode ?? 'ONLINE',
    earnedRupees: microsToRupees(node.scpEarning?.amountMicros),
  }));

  const payouts: Payout[] = (result.payouts?.edges ?? []).map(({ node }) => ({
    id: node.id,
    week: node.week ?? '',
    weekStart: node.weekStart ?? null,
    weekEnd: node.weekEnd ?? null,
    amountRupees: microsToRupees(node.amount?.amountMicros),
    status: node.status === 'PAID' ? 'PAID' : 'UPCOMING',
    paidOn: node.paidOn ?? null,
    jobsCount: node.jobsCount ?? 0,
  }));

  return { jobs, payouts };
};

const StatusDot = ({ color, size = 10 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" style={{ flexShrink: 0 }}>
    <circle cx="5" cy="5" r="4.5" fill={color} stroke="rgba(15,23,42,0.15)" strokeWidth="0.6" />
  </svg>
);

const PeriodSlider = ({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (period: PeriodKey) => void;
}) => {
  const activeIndex = PERIODS.findIndex((period) => period.key === value);

  return (
    <div role="radiogroup" aria-label="Period" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={labelStyle(COLORS.panelMuted)}>Period</span>
      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 56px)',
          height: '32px',
          borderRadius: '16px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '2px',
            left: `${2 + activeIndex * 56}px`,
            width: '52px',
            height: '26px',
            borderRadius: '14px',
            background: 'rgba(0,184,230,0.35)',
            border: `1px solid ${COLORS.action}`,
            boxSizing: 'border-box',
            transition: 'left 160ms ease',
          }}
        />
        {PERIODS.map((period) => (
          <button
            key={period.key}
            type="button"
            role="radio"
            aria-checked={period.key === value}
            onClick={() => onChange(period.key)}
            style={{
              position: 'relative',
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              ...labelStyle(period.key === value ? '#FFFFFF' : COLORS.panelMuted),
              fontSize: '11px',
            }}
          >
            {period.key}
          </button>
        ))}
      </div>
    </div>
  );
};

const PayoutRow = ({
  payout,
  isOpen,
  onToggle,
}: {
  payout: Payout;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  const isPaid = payout.status === 'PAID';

  return (
    <div style={{ borderBottom: `1px solid ${COLORS.border}`, background: isOpen ? COLORS.rowOpen : COLORS.card }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto auto',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          height: '56px',
          padding: '0 16px',
          border: 0,
          background: 'transparent',
          color: COLORS.text,
          font: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{payout.week}</span>
          <span style={{ fontSize: '12px', color: COLORS.muted }}>
            {formatDate(payout.weekStart)} to {formatDate(payout.weekEnd)}
          </span>
        </span>
        <span style={{ fontSize: '15px', fontWeight: 700 }}>{formatRupees(payout.amountRupees)}</span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: '24px',
            padding: '0 10px',
            borderRadius: '12px',
            background: isPaid ? '#DCFCE7' : '#FEF9C3',
            color: isPaid ? '#15803D' : '#854D0E',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <StatusDot color={isPaid ? '#16A34A' : '#EAB308'} size={7} />
          {isPaid ? 'Paid' : 'Upcoming'}
        </span>
      </button>
      {isOpen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', padding: '0 16px 14px' }}>
          {[
            ['Jobs', String(payout.jobsCount)],
            ['Paid on', isPaid ? formatDate(payout.paidOn) : '-'],
            ['Mode', 'Bank transfer'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ ...labelStyle(COLORS.muted), fontSize: '11px' }}>{label}</span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const JOB_COLUMNS = '100px 90px minmax(0, 1fr) minmax(0, 1fr) 90px 100px';

const Earnings = () => {
  const [period, setPeriod] = useState<PeriodKey>('7D');
  const [jobs, setJobs] = useState<EarningJob[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [openPayoutId, setOpenPayoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchEarnings(periodStart(period, new Date()));
      setJobs(data.jobs);
      setPayouts(data.payouts);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    }
    setLoading(false);
  }, [period]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const totalEarned = useMemo(
    () => jobs.reduce((sum, job) => sum + job.earnedRupees, 0),
    [jobs],
  );

  const upcomingPayout = payouts.find((payout) => payout.status === 'UPCOMING');
  const payoutDate = nextMonday(new Date());
  const periodLabel = PERIODS.find((item) => item.key === period)?.label ?? '';

  const panelCardStyle = {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '12px',
    boxShadow: '0px 4px 0px rgba(15,23,42,0.04)',
    overflow: 'hidden' as const,
    display: 'flex',
    flexDirection: 'column' as const,
  };

  const moduleHeaderStyle = {
    height: '44px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    background: COLORS.page,
    borderBottom: `1px solid ${COLORS.border}`,
  };

  const metrics = [
    { label: 'Jobs', value: loading ? '-' : String(jobs.length) },
    {
      label: 'Next payout (₹)',
      value: upcomingPayout ? upcomingPayout.amountRupees.toLocaleString('en-IN') : '-',
    },
    {
      label: 'Payout date (Mon)',
      value: payoutDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    },
  ];

  return (
    <div
      style={{
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px',
        background: COLORS.page,
        color: COLORS.text,
        fontFamily: 'Manrope, Inter, system-ui, sans-serif',
      }}
    >
      <section
        aria-label="Earnings summary"
        style={{
          height: '208px',
          flexShrink: 0,
          boxSizing: 'border-box',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: COLORS.panel,
          color: '#F3F6F9',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <span style={labelStyle(COLORS.panelMuted)}>SCP // Earnings · your share after HQ commission</span>
          <PeriodSlider value={period} onChange={setPeriod} />
        </div>
        <div style={{ flexGrow: 1, display: 'flex', alignItems: 'stretch' }}>
          <div style={{ width: '42%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
            <span style={{ fontSize: '76px', fontWeight: 200, lineHeight: 0.9, letterSpacing: '-0.05em' }}>
              {loading ? '-' : formatRupees(totalEarned)}
            </span>
            <span style={labelStyle(COLORS.panelMuted)}>Earned · {periodLabel}</span>
          </div>
          <div style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {metrics.map((metric) => (
              <div
                key={metric.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '0 20px',
                  borderLeft: `1px solid ${COLORS.panelDivider}`,
                }}
              >
                <span style={{ fontSize: '40px', fontWeight: 200, lineHeight: 1, letterSpacing: '-0.04em' }}>
                  {metric.value}
                </span>
                <span style={labelStyle(COLORS.panelMuted)}>{metric.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', gap: '12px' }}>
        <section aria-label="Payouts" style={{ ...panelCardStyle, width: '34%' }}>
          <div style={moduleHeaderStyle}>
            <span style={labelStyle(COLORS.muted)}>Payouts</span>
            <span style={{ fontSize: '12px', color: COLORS.muted }}>Every Monday</span>
          </div>
          <div style={{ overflowY: 'auto', flexGrow: 1 }}>
            {!loading && payouts.length === 0 && (
              <div style={{ padding: '16px', color: COLORS.muted, fontSize: '14px' }}>No payouts yet.</div>
            )}
            {payouts.map((payout) => (
              <PayoutRow
                key={payout.id}
                payout={payout}
                isOpen={openPayoutId === payout.id}
                onToggle={() => setOpenPayoutId(openPayoutId === payout.id ? null : payout.id)}
              />
            ))}
          </div>
        </section>

        <section aria-label="Per job" style={{ ...panelCardStyle, flexGrow: 1 }}>
          <div style={{ ...moduleHeaderStyle, display: 'grid', gridTemplateColumns: JOB_COLUMNS, gap: '12px' }}>
            {['Job ID', 'Date', 'Technician', 'Appliance', 'Paid by', 'Earned (₹)'].map((heading, index) => (
              <span key={heading} style={{ ...labelStyle(COLORS.muted), textAlign: index === 5 ? 'right' : 'left' }}>
                {heading}
              </span>
            ))}
          </div>
          <div style={{ overflowY: 'auto', flexGrow: 1 }}>
            {error && (
              <div style={{ padding: '16px', color: '#DC2626', fontSize: '13px' }}>
                Could not load earnings: {error}
              </div>
            )}
            {!error && !loading && jobs.length === 0 && (
              <div style={{ padding: '16px', color: COLORS.muted, fontSize: '14px' }}>
                No closed jobs in this period.
              </div>
            )}
            {jobs.map((job) => (
              <div
                key={job.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: JOB_COLUMNS,
                  alignItems: 'center',
                  gap: '12px',
                  height: '48px',
                  padding: '0 16px',
                  borderBottom: `1px solid ${COLORS.border}`,
                  fontSize: '14px',
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: '12px', color: COLORS.muted }}>{job.complaintId}</span>
                <span style={{ color: COLORS.muted }}>{formatDate(job.closedAt)}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.technicianName}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.appliance}</span>
                <span style={{ color: COLORS.muted }}>{job.paymentMode === 'CASH' ? 'Cash' : 'Online'}</span>
                <span style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupees(job.earnedRupees, 2)}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              ...moduleHeaderStyle,
              borderBottom: 0,
              borderTop: `1px solid ${COLORS.border}`,
            }}
          >
            <span style={labelStyle(COLORS.muted)}>{jobs.length} jobs · {periodLabel}</span>
            <span style={{ fontSize: '15px', fontWeight: 700 }}>{formatRupees(totalEarned, 2)}</span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: EARNINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'earnings',
  description: 'Earnings, payouts and per job share for the service centre partner',
  component: Earnings,
});
