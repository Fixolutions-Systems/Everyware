import { useCallback, useEffect, useMemo, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';

export const SCORECARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  '9d1c7933-3f9d-45bc-be41-3feb6548ef19';

const REFRESH_INTERVAL_MS = 30_000;

const COLORS = {
  page: '#F3F6F9',
  card: '#FFFFFF',
  border: '#E6EBF0',
  text: '#0F1720',
  muted: '#5A6572',
  band: '#3A4654',
  pill: '#4A5767',
  pillMuted: 'rgba(245,245,247,0.65)',
  link: '#0087AD',
  danger: '#DC2626',
};

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

type PeriodKey = 'WEEK' | 'MONTH';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'WEEK', label: 'This week' },
  { key: 'MONTH', label: 'This month' },
];

const SEGMENT_WIDTH = 132;

const ESCALATION_LABEL: Record<string, string> = {
  LOW_RATING: 'Rating below 3★',
  REVISIT_REQUESTED: 'Revisit requested',
  DIFFERENT_TECH_REQUESTED: 'Different tech requested',
  NOT_ACCEPTED_IN_15_MIN: 'Not accepted in 15 min',
  UNSAFE: 'Tech marked unsafe',
};

// Scores follow the IST calendar so they line up with the Monday payout week.
const periodStart = (period: PeriodKey, now: Date) => {
  const istMidnight = Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS;
  const istDate = new Date(istMidnight);
  if (period === 'WEEK') {
    const daysSinceMonday = (istDate.getUTCDay() + 6) % 7;
    return new Date(istMidnight - daysSinceMonday * DAY_MS - IST_OFFSET_MS);
  }
  return new Date(
    Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), 1) - IST_OFFSET_MS,
  );
};

type ScoreJob = {
  status: string;
  technicianId: string | null;
  createdAt: number;
  acceptedAt: number | null;
  closedAt: number | null;
  revisitRequestedAt: number | null;
  rating: number | null;
};

type Escalation = {
  id: string;
  type: string;
  status: 'OPEN' | 'RESOLVED';
  raisedAt: number;
  complaintId: string;
  technicianName: string | null;
  technicianPhone: string | null;
};

type Technician = { id: string; name: string };

const toTime = (value: unknown) =>
  value == null ? null : new Date(String(value)).getTime();

const fetchScorecard = async () => {
  const client = new CoreApiClient();
  const since = new Date(Date.now() - 40 * DAY_MS).toISOString();

  const result = await client.query({
    serviceJobs: {
      __args: {
        first: 500,
        filter: { or: [{ createdAt: { gte: since } }, { closedAt: { gte: since } }] },
      },
      edges: {
        node: {
          status: true,
          technicianId: true,
          createdAt: true,
          acceptedAt: true,
          closedAt: true,
          revisitRequestedAt: true,
          rating: true,
        },
      },
    },
    escalations: {
      __args: { first: 100, orderBy: [{ raisedAt: 'DescNullsLast' }] },
      edges: {
        node: {
          id: true,
          escalationType: true,
          status: true,
          raisedAt: true,
          serviceJob: { complaintId: true },
          technician: {
            name: true,
            phone: { primaryPhoneNumber: true, primaryPhoneCallingCode: true },
          },
        },
      },
    },
    technicians: {
      __args: { first: 100, filter: { isActive: { eq: true } } },
      edges: { node: { id: true, name: true } },
    },
  });

  const jobs: ScoreJob[] = (result.serviceJobs?.edges ?? []).map(({ node }) => ({
    status: node.status ?? '',
    technicianId: node.technicianId ?? null,
    createdAt: toTime(node.createdAt) ?? 0,
    acceptedAt: toTime(node.acceptedAt),
    closedAt: toTime(node.closedAt),
    revisitRequestedAt: toTime(node.revisitRequestedAt),
    rating: node.rating == null ? null : Number(node.rating),
  }));

  const escalations: Escalation[] = (result.escalations?.edges ?? []).map(({ node }) => {
    const phoneNumber = node.technician?.phone?.primaryPhoneNumber;
    return {
      id: node.id,
      type: node.escalationType ?? '',
      status: node.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN',
      raisedAt: toTime(node.raisedAt) ?? 0,
      complaintId: node.serviceJob?.complaintId ?? '-',
      technicianName: node.technician?.name ?? null,
      technicianPhone: phoneNumber
        ? `${node.technician?.phone?.primaryPhoneCallingCode ?? ''}${phoneNumber}`
        : null,
    };
  });

  const technicians: Technician[] = (result.technicians?.edges ?? []).map(({ node }) => ({
    id: node.id,
    name: node.name ?? '',
  }));

  return { jobs, escalations, technicians };
};

const average = (values: number[]) =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

const isClosedStatus = (status: string) =>
  status === 'CLOSED' || status === 'CLOSED_PART_DECLINED';

const timeAgo = (timestamp: number, now: number) => {
  const minutes = Math.floor((now - timestamp) / MINUTE_MS);
  if (minutes < 60) {
    return `${Math.max(minutes, 1)} min ago`;
  }
  if (minutes < 24 * 60) {
    return `${Math.floor(minutes / 60)} h ago`;
  }
  if (minutes < 48 * 60) {
    return 'Yesterday';
  }
  return new Date(timestamp).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });
};

const StatusDot = ({ color, size = 10 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" style={{ flexShrink: 0 }}>
    <circle cx="5" cy="5" r="4.5" fill={color} />
  </svg>
);

const SummaryPill = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style: React.CSSProperties;
}) => (
  <div
    style={{
      position: 'absolute',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: COLORS.pill,
      color: '#F5F5F7',
      boxShadow: 'inset 0px 1px 0px 0px rgba(255,255,255,0.15), 0px 20px 40px rgba(15,23,32,0.25)',
      ...style,
    }}
  >
    {children}
  </div>
);

const glassStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.8)',
  boxShadow: 'inset 0px 1px 0px 0px rgba(255,255,255,1), 0px 20px 40px rgba(15,23,42,0.06)',
};

const Scorecard = () => {
  const [period, setPeriod] = useState<PeriodKey>('WEEK');
  const [jobs, setJobs] = useState<ScoreJob[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchScorecard();
      setJobs(data.jobs);
      setEscalations(data.escalations);
      setTechnicians(data.technicians);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const now = Date.now();
  const start = periodStart(period, new Date(now)).getTime();

  const scores = useMemo(() => {
    const closedJobs = jobs.filter(
      (job) => isClosedStatus(job.status) && job.closedAt != null && job.closedAt >= start,
    );
    const ratings = closedJobs
      .map((job) => job.rating)
      .filter((rating): rating is number => rating != null);
    const acceptMinutes = jobs
      .filter((job) => job.acceptedAt != null && job.acceptedAt >= start)
      .map((job) => ((job.acceptedAt as number) - job.createdAt) / MINUTE_MS);
    const closeMinutes = closedJobs.map(
      (job) => ((job.closedAt as number) - job.createdAt) / MINUTE_MS,
    );
    const repeatVisits = jobs.filter(
      (job) => job.revisitRequestedAt != null && job.revisitRequestedAt >= start,
    ).length;

    const ranking = technicians
      .map((technician) => {
        const own = closedJobs.filter((job) => job.technicianId === technician.id);
        const ownRatings = own
          .map((job) => job.rating)
          .filter((rating): rating is number => rating != null);
        return { ...technician, jobs: own.length, rating: average(ownRatings) };
      })
      .sort(
        (first, second) =>
          (second.rating ?? -1) - (first.rating ?? -1) || second.jobs - first.jobs,
      );

    return {
      closed: closedJobs.length,
      rating: average(ratings),
      accept: average(acceptMinutes),
      close: average(closeMinutes),
      repeatVisits,
      ranking,
    };
  }, [jobs, technicians, start]);

  const openEscalations = escalations.filter((escalation) => escalation.status === 'OPEN');
  const resolvedEscalations = escalations.filter((escalation) => escalation.status === 'RESOLVED');
  const stack = showResolved ? resolvedEscalations : openEscalations;
  const current = stack.length === 0 ? null : stack[cardIndex % stack.length];
  const periodIndex = PERIODS.findIndex((item) => item.key === period);

  const formatMinutes = (value: number | null) => (value == null ? '-' : String(Math.round(value)));

  const tiles = [
    { label: 'Time to accept', value: formatMinutes(scores.accept), unit: 'min' },
    { label: 'Time to close', value: formatMinutes(scores.close), unit: 'min' },
    { label: 'Repeat visits', value: String(scores.repeatVisits), unit: '' },
    { label: 'Jobs closed', value: String(scores.closed), unit: '' },
  ];

  const cardColors = showResolved
    ? { front: 'linear-gradient(180deg, #6B7785, #4A5767)', middle: '#8A96A3', back: '#B3BCC6', shadow: 'rgba(74,87,103,0.25)', button: '#4A5767' }
    : { front: 'linear-gradient(180deg, #E5453D, #C8302A)', middle: '#EE7A73', back: '#F4A5A0', shadow: 'rgba(200,48,42,0.25)', button: '#B3261E' };

  const handleToggleResolved = () => {
    setShowResolved(!showResolved);
    setCardIndex(0);
  };

  return (
    <div
      style={{
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '12px',
        background: COLORS.page,
        color: COLORS.text,
        fontFamily: 'Geist, Inter, system-ui, sans-serif',
        letterSpacing: '-0.01em',
      }}
    >
      <section
        aria-label="Summary"
        style={{ position: 'relative', height: '112px', flexShrink: 0, borderRadius: '28px', background: COLORS.band }}
      >
        <SummaryPill
          style={{ left: '50%', top: '16px', transform: 'translateX(-50%)', width: '360px', height: '80px', padding: '0 32px', borderRadius: '40px', justifyContent: 'center', gap: '16px' }}
        >
          <span style={{ fontSize: '52px', fontWeight: 200, letterSpacing: '-0.05em', lineHeight: 1 }}>
            {loading || scores.rating == null ? '-' : scores.rating.toFixed(1)}
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', lineHeight: 1.3, color: COLORS.pillMuted }}>
            ★ average
            <span style={{ color: '#F5F5F7' }}>consumer rating</span>
          </span>
        </SummaryPill>
        <SummaryPill style={{ right: 'calc(50% + 196px)', top: '28px', height: '56px', padding: '0 22px', borderRadius: '28px' }}>
          <span style={{ fontSize: '24px', fontWeight: 300, letterSpacing: '-0.04em' }}>{scores.closed}</span>
          <span style={{ fontSize: '13px', color: COLORS.pillMuted }}>jobs closed</span>
        </SummaryPill>
        <SummaryPill style={{ left: 'calc(50% + 196px)', top: '28px', height: '56px', padding: '0 22px', borderRadius: '28px' }}>
          <StatusDot color="#FF4D4D" size={8} />
          <span style={{ fontSize: '24px', fontWeight: 300, letterSpacing: '-0.04em' }}>{openEscalations.length}</span>
          <span style={{ fontSize: '13px', color: COLORS.pillMuted }}>escalations</span>
        </SummaryPill>
      </section>

      {error && (
        <div role="alert" style={{ color: COLORS.danger, fontSize: '13px', padding: '0 8px' }}>
          Could not load the scorecard: {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
        <div
          role="group"
          aria-label="Period"
          style={{ position: 'relative', width: '272px', height: '52px', boxSizing: 'border-box', padding: '4px', borderRadius: '26px', background: COLORS.border, display: 'flex', flexShrink: 0 }}
        >
          <span
            aria-hidden="true"
            style={{ position: 'absolute', top: '4px', left: `${4 + periodIndex * SEGMENT_WIDTH}px`, width: `${SEGMENT_WIDTH}px`, height: '44px', borderRadius: '22px', background: COLORS.card, boxShadow: `0px 4px 12px ${COLORS.border}`, transition: 'left 450ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
          />
          {PERIODS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={item.key === period}
              onClick={() => setPeriod(item.key)}
              style={{ position: 'relative', zIndex: 1, flex: 1, border: 0, background: 'transparent', font: 'inherit', fontSize: '14px', fontWeight: 500, cursor: 'pointer', color: item.key === period ? COLORS.text : COLORS.muted }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
          {tiles.map((tile) => (
            <div
              key={tile.label}
              style={{ ...glassStyle, height: '52px', boxSizing: 'border-box', padding: '0 20px', borderRadius: '26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span style={{ fontSize: '13px', color: COLORS.muted }}>{tile.label}</span>
              <span style={{ fontSize: '24px', fontWeight: 200, letterSpacing: '-0.04em' }}>
                {tile.value}
                {tile.unit && (
                  <span style={{ fontSize: '12px', color: COLORS.muted, marginLeft: '4px' }}>{tile.unit}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', gap: '16px' }}>
        <section aria-label={showResolved ? 'Resolved escalations' : 'Open escalations'} style={{ position: 'relative', width: '56%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '32px', padding: '0 8px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 500, letterSpacing: '-0.03em' }}>
              {showResolved ? 'Resolved escalations' : 'Open escalations'}
            </h2>
            <button
              type="button"
              onClick={handleToggleResolved}
              style={{ border: 0, background: 'transparent', font: 'inherit', fontSize: '14px', color: COLORS.link, textDecoration: 'underline', cursor: 'pointer' }}
            >
              {showResolved ? `See open (${openEscalations.length})` : `See resolved (${resolvedEscalations.length})`}
            </button>
          </div>
          {stack.length > 2 && (
            <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: '72px', bottom: '16px', transformOrigin: 'top center', transform: 'translateY(-24px) scale(0.92)', opacity: 0.35, borderRadius: '28px', background: cardColors.back }} />
          )}
          {stack.length > 1 && (
            <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: '72px', bottom: '16px', transformOrigin: 'top center', transform: 'translateY(-12px) scale(0.96)', opacity: 0.6, borderRadius: '28px', background: cardColors.middle }} />
          )}
          {current ? (
            <div
              style={{ position: 'absolute', left: 0, right: 0, top: '72px', bottom: '16px', boxSizing: 'border-box', padding: '28px', borderRadius: '28px', background: cardColors.front, color: '#FFFFFF', boxShadow: `inset 0px 1px 0px 0px rgba(255,255,255,0.25), 0px 20px 40px ${cardColors.shadow}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                  {(cardIndex % stack.length) + 1} of {stack.length} · {timeAgo(current.raisedAt, now)}
                </span>
                {stack.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setCardIndex(cardIndex + 1)}
                    style={{ height: '36px', padding: '0 16px', border: 0, borderRadius: '18px', background: 'rgba(0,0,0,0.18)', color: '#FFFFFF', font: 'inherit', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Next
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '40px', fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 1.05 }}>
                  {ESCALATION_LABEL[current.type] ?? current.type}
                </span>
                <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.9)' }}>
                  {current.complaintId} · {current.technicianName ?? 'No technician assigned'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>
                  {showResolved ? 'Resolved by HQ.' : 'View and call only. HQ resolves.'}
                </span>
                {!showResolved && current.technicianPhone && (
                  <a
                    href={`tel:${current.technicianPhone}`}
                    style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 24px', borderRadius: '24px', background: '#FFFFFF', color: cardColors.button, fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Call tech
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{ ...glassStyle, position: 'absolute', left: 0, right: 0, top: '72px', bottom: '16px', borderRadius: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: COLORS.muted }}
            >
              {loading ? 'Loading…' : showResolved ? 'Nothing resolved yet.' : 'No open escalations.'}
            </div>
          )}
        </section>

        <section
          aria-label="Technician ranking"
          style={{ ...glassStyle, flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box', padding: '24px', borderRadius: '28px', overflowY: 'auto' }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 500, letterSpacing: '-0.03em' }}>Technician ranking</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {scores.ranking.map((technician, index) => (
              <div
                key={technician.id}
                style={{ display: 'flex', alignItems: 'center', gap: '16px', height: '46px', padding: '0 16px', borderRadius: '16px', background: COLORS.page }}
              >
                <span style={{ width: '20px', fontSize: '13px', color: COLORS.muted }}>{index + 1}</span>
                <span style={{ flexGrow: 1, fontSize: '15px' }}>{technician.name}</span>
                <span style={{ fontSize: '13px', color: COLORS.muted }}>{technician.jobs} {technician.jobs === 1 ? 'job' : 'jobs'}</span>
                <span style={{ width: '64px', textAlign: 'right', fontSize: '22px', fontWeight: 200, letterSpacing: '-0.04em' }}>
                  {technician.rating == null ? '-' : `${technician.rating.toFixed(1)}★`}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: SCORECARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'scorecard',
  description: 'Scores, open escalations and technician ranking for the service centre partner',
  component: Scorecard,
});
