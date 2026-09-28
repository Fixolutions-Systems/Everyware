import { useCallback, useEffect, useMemo, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';

export const LIVE_JOBS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  '951906ee-95b2-4100-92a0-32dc370d63e9';

const REFRESH_INTERVAL_MS = 10_000;

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
  actionGradient: 'linear-gradient(135deg, #00B8E6 0%, #0066FF 100%)',
  mapBackground: '#E6FAFF',
};

type JobStatus =
  | 'NEW'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'IN_PROGRESS'
  | 'CLOSED'
  | 'CLOSED_PART_DECLINED'
  | 'REVISIT';

const STATUS_LABEL: Record<JobStatus, string> = {
  NEW: 'New',
  ACCEPTED: 'Accepted',
  ON_THE_WAY: 'On the way',
  IN_PROGRESS: 'In progress',
  CLOSED: 'Closed',
  CLOSED_PART_DECLINED: 'Part declined',
  REVISIT: 'Revisit',
};

const STATUS_COLOR: Record<JobStatus, string> = {
  NEW: '#0066FF',
  ACCEPTED: '#EAB308',
  ON_THE_WAY: '#F97316',
  IN_PROGRESS: '#86EFAC',
  CLOSED: '#16A34A',
  CLOSED_PART_DECLINED: '#16A34A',
  REVISIT: '#DC2626',
};

type StageFilter = 'ALL' | 'NEW' | 'ACCEPTED' | 'ON_THE_WAY' | 'IN_PROGRESS' | 'CLOSED';

const STAGE_FILTERS: { key: StageFilter; label: string; statuses: JobStatus[] }[] = [
  { key: 'NEW', label: 'New', statuses: ['NEW'] },
  { key: 'ACCEPTED', label: 'Accepted', statuses: ['ACCEPTED'] },
  { key: 'ON_THE_WAY', label: 'On the way', statuses: ['ON_THE_WAY'] },
  { key: 'IN_PROGRESS', label: 'In progress', statuses: ['IN_PROGRESS'] },
  { key: 'CLOSED', label: 'Closed', statuses: ['CLOSED', 'CLOSED_PART_DECLINED'] },
  { key: 'ALL', label: 'Show all', statuses: [] },
];

const TIME_WINDOWS = [
  { label: '1H', hours: 1 },
  { label: '4H', hours: 4 },
  { label: '12H', hours: 12 },
  { label: '24H', hours: 24 },
];

type Job = {
  id: string;
  complaintId: string;
  appliance: string;
  area: string;
  status: JobStatus;
  technicianName: string | null;
  createdAt: string;
  estimateRupees: number | null;
  paymentMode: string;
  latitude: number | null;
  longitude: number | null;
};

type TechnicianPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

const MONO = "'JetBrains Mono', ui-monospace, monospace";

const labelStyle = (color: string) => ({
  fontFamily: MONO,
  fontSize: '12px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color,
});

const formatTime = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

const fetchLiveData = async (windowHours: number) => {
  const client = new CoreApiClient();
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  const result = await client.query({
    serviceJobs: {
      __args: {
        first: 100,
        filter: {
          or: [
            { createdAt: { gte: since } },
            { status: { eq: 'REVISIT' } },
          ],
        },
        orderBy: [{ createdAt: 'DescNullsLast' }],
      },
      edges: {
        node: {
          id: true,
          complaintId: true,
          appliance: true,
          area: true,
          status: true,
          createdAt: true,
          paymentMode: true,
          latitude: true,
          longitude: true,
          estimate: { amountMicros: true },
          technician: { name: true },
        },
      },
    },
    technicians: {
      __args: {
        first: 100,
        filter: { status: { in: ['AVAILABLE', 'ON_THE_WAY', 'ON_JOB'] } },
      },
      edges: {
        node: { id: true, name: true, latitude: true, longitude: true },
      },
    },
  });

  const jobs: Job[] = (result.serviceJobs?.edges ?? []).map(({ node }) => ({
    id: node.id,
    complaintId: node.complaintId ?? '',
    appliance: node.appliance ?? '',
    area: node.area ?? '',
    status: (node.status ?? 'NEW') as JobStatus,
    technicianName: node.technician?.name ?? null,
    createdAt: node.createdAt,
    estimateRupees:
      node.estimate?.amountMicros == null
        ? null
        : Number(node.estimate.amountMicros) / 1_000_000,
    paymentMode: node.paymentMode ?? 'ONLINE',
    latitude: node.latitude ?? null,
    longitude: node.longitude ?? null,
  }));

  const technicians: TechnicianPin[] = (result.technicians?.edges ?? [])
    .map(({ node }) => node)
    .filter((node) => node.latitude != null && node.longitude != null)
    .map((node) => ({
      id: node.id,
      name: node.name ?? '',
      latitude: node.latitude as number,
      longitude: node.longitude as number,
    }));

  return { jobs, technicians };
};

const StatusDot = ({ color, size = 10 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" style={{ flexShrink: 0 }}>
    <circle cx="5" cy="5" r="4.5" fill={color} stroke="rgba(15,23,42,0.15)" strokeWidth="0.6" />
  </svg>
);

const JobRow = ({
  job,
  isOpen,
  onToggle,
}: {
  job: Job;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  const isRevisit = job.status === 'REVISIT';
  const isNew = job.status === 'NEW';
  const rowSize = isRevisit
    ? { height: '68px', fontSize: '17px' }
    : isNew
      ? { height: '58px', fontSize: '15px' }
      : { height: '44px', fontSize: '14px' };
  const background = isRevisit
    ? '#DC2626'
    : isNew
      ? isOpen ? '#D6E6FF' : '#EBF2FF'
      : isOpen ? '#E6FAFF' : COLORS.card;
  const textColor = isRevisit ? '#FFFFFF' : COLORS.text;
  const mutedColor = isRevisit ? 'rgba(255,255,255,0.9)' : COLORS.muted;

  return (
    <div
      style={{
        borderBottom: `1px solid ${isRevisit ? 'rgba(255,255,255,0.3)' : COLORS.border}`,
        background,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          display: 'grid',
          gridTemplateColumns: '96px 1fr 1fr 130px',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          height: rowSize.height,
          padding: '0 16px',
          border: 0,
          background: 'transparent',
          color: textColor,
          font: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: '12px', color: mutedColor }}>
          {job.complaintId}
        </span>
        <span style={{ fontSize: rowSize.fontSize, fontWeight: isRevisit ? 700 : 600 }}>{job.appliance}</span>
        <span style={{ fontSize: '13px', color: mutedColor }}>{job.area}</span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <StatusDot color={isRevisit ? '#FFFFFF' : STATUS_COLOR[job.status]} />
          {STATUS_LABEL[job.status]}
        </span>
      </button>
      {isOpen && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '16px',
            padding: '4px 16px 14px 124px',
            color: textColor,
          }}
        >
          {[
            ['Technician', job.technicianName ?? 'Routing'],
            ['Created', formatTime(job.createdAt)],
            [
              'Estimate',
              job.estimateRupees == null ? '-' : `₹${job.estimateRupees.toFixed(0)}`,
            ],
            ['Payment', job.paymentMode === 'CASH' ? 'Cash' : 'Online'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ ...labelStyle(mutedColor), fontSize: '11px' }}>{label}</span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const LiveMap = ({
  jobs,
  technicians,
  selectedJobId,
}: {
  jobs: Job[];
  technicians: TechnicianPin[];
  selectedJobId: string | null;
}) => {
  const points = [
    ...jobs.filter((job) => job.latitude != null && job.longitude != null),
    ...technicians,
  ] as { latitude: number; longitude: number }[];

  const bounds = useMemo(() => {
    if (points.length === 0) {
      return null;
    }
    const latitudes = points.map((point) => point.latitude);
    const longitudes = points.map((point) => point.longitude);
    const padding = 0.004;
    return {
      minLatitude: Math.min(...latitudes) - padding,
      maxLatitude: Math.max(...latitudes) + padding,
      minLongitude: Math.min(...longitudes) - padding,
      maxLongitude: Math.max(...longitudes) + padding,
    };
  }, [points]);

  const position = (latitude: number, longitude: number) => {
    if (!bounds) {
      return { left: '50%', top: '50%' };
    }
    const left =
      ((longitude - bounds.minLongitude) / (bounds.maxLongitude - bounds.minLongitude)) * 100;
    const top =
      ((bounds.maxLatitude - latitude) / (bounds.maxLatitude - bounds.minLatitude)) * 100;
    return { left: `${left}%`, top: `${top}%` };
  };

  return (
    <div style={{ flexGrow: 1, position: 'relative', background: COLORS.mapBackground }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 600 600"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0 }}
      >
        <path
          d="M0 150 H600 M0 340 H600 M0 510 H600 M120 0 V600 M300 0 V600 M470 0 V600"
          stroke="#FFFFFF"
          strokeWidth="12"
        />
        <path d="M0 40 L600 240 M40 600 L420 0" stroke="#FFFFFF" strokeWidth="7" />
      </svg>
      {jobs
        .filter((job) => job.latitude != null && job.longitude != null)
        .map((job) => {
          const isSelected = job.id === selectedJobId;
          const size = isSelected ? 20 : 13;
          return (
            <span
              key={job.id}
              role="img"
              aria-label={`${job.complaintId} ${STATUS_LABEL[job.status]}`}
              title={`${job.complaintId} · ${STATUS_LABEL[job.status]}`}
              style={{
                position: 'absolute',
                ...position(job.latitude as number, job.longitude as number),
                width: `${size}px`,
                height: `${size}px`,
                margin: `-${size / 2}px 0 0 -${size / 2}px`,
                display: 'block',
              }}
            >
              <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
                <circle
                  cx="10"
                  cy="10"
                  r={isSelected ? 8 : 8.5}
                  fill={STATUS_COLOR[job.status]}
                  stroke={isSelected ? COLORS.text : '#FFFFFF'}
                  strokeWidth={isSelected ? 3 : 3}
                />
              </svg>
            </span>
          );
        })}
      {technicians.map((technician) => (
        <span
          key={technician.id}
          role="img"
          aria-label={technician.name}
          title={technician.name}
          style={{
            position: 'absolute',
            ...position(technician.latitude, technician.longitude),
            width: '11px',
            height: '11px',
            margin: '-5px 0 0 -5px',
            borderRadius: '2px',
            boxSizing: 'border-box',
            background: COLORS.text,
            border: '2px solid #FFFFFF',
          }}
        />
      ))}
    </div>
  );
};

const LiveJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianPin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL');
  const [windowIndex, setWindowIndex] = useState(TIME_WINDOWS.length - 1);
  const [showTechnicians, setShowTechnicians] = useState(true);
  const [openJobId, setOpenJobId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchLiveData(TIME_WINDOWS[windowIndex].hours);
      setJobs(data.jobs);
      setTechnicians(data.technicians);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    }
    setLoading(false);
  }, [windowIndex]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const countByStage = useMemo(() => {
    const counts: Record<StageFilter, number> = {
      ALL: jobs.length,
      NEW: 0,
      ACCEPTED: 0,
      ON_THE_WAY: 0,
      IN_PROGRESS: 0,
      CLOSED: 0,
    };
    for (const stage of STAGE_FILTERS) {
      if (stage.key !== 'ALL') {
        counts[stage.key] = jobs.filter((job) => stage.statuses.includes(job.status)).length;
      }
    }
    return counts;
  }, [jobs]);

  const visibleJobs = useMemo(() => {
    const activeStage = STAGE_FILTERS.find((stage) => stage.key === stageFilter);
    const filtered = jobs.filter(
      (job) =>
        stageFilter === 'ALL' ||
        job.status === 'REVISIT' ||
        activeStage?.statuses.includes(job.status),
    );
    return [
      ...filtered.filter((job) => job.status === 'REVISIT'),
      ...filtered.filter((job) => job.status !== 'REVISIT'),
    ];
  }, [jobs, stageFilter]);

  const panelCardStyle = {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '12px',
    boxShadow: '0px 4px 0px rgba(15,23,42,0.04)',
    overflow: 'hidden' as const,
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
        aria-label="Quick panel"
        style={{
          flexShrink: 0,
          boxSizing: 'border-box',
          padding: '16px 20px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: COLORS.panel,
          color: '#F3F6F9',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <span style={labelStyle(COLORS.panelMuted)}>SCP // Live jobs · auto-routed · view only</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div role="group" aria-label="Time window" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={labelStyle(COLORS.panelMuted)}>Window</span>
              {TIME_WINDOWS.map((timeWindow, index) => (
                <button
                  key={timeWindow.label}
                  type="button"
                  aria-pressed={index === windowIndex}
                  onClick={() => setWindowIndex(index)}
                  style={{
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '12px',
                    border: `1px solid ${index === windowIndex ? COLORS.action : 'rgba(255,255,255,0.15)'}`,
                    background: index === windowIndex ? 'rgba(0,184,230,0.25)' : 'transparent',
                    color: index === windowIndex ? '#FFFFFF' : COLORS.panelMuted,
                    fontFamily: MONO,
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  {timeWindow.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-pressed={showTechnicians}
              onClick={() => setShowTechnicians(!showTechnicians)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: '36px',
                padding: '0 12px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: showTechnicians ? 'rgba(0,184,230,0.25)' : 'transparent',
                cursor: 'pointer',
                ...labelStyle(showTechnicians ? '#FFFFFF' : COLORS.panelMuted),
              }}
            >
              <StatusDot color={showTechnicians ? COLORS.action : 'transparent'} />
              Techs on map
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '120px' }}>
          <div style={{ width: '190px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '84px', fontWeight: 200, lineHeight: 0.85, letterSpacing: '-0.05em' }}>
              {loading ? '-' : jobs.length}
            </span>
            <span style={labelStyle(COLORS.panelMuted)}>Jobs · last {TIME_WINDOWS[windowIndex].label}</span>
          </div>
          <div role="group" aria-label="Filter by stage" style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
            {STAGE_FILTERS.map((stage) => {
              const isActive = stage.key === stageFilter;
              const color = stage.key === 'ALL' ? '#FFFFFF' : STATUS_COLOR[stage.statuses[0]];
              return (
                <button
                  key={stage.key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setStageFilter(stage.key)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '0 16px',
                    border: 0,
                    borderLeft: `1px solid ${COLORS.panelDivider}`,
                    background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: '#F3F6F9',
                    font: 'inherit',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <StatusDot color={isActive ? color : 'transparent'} />
                  <span style={{ fontSize: '40px', fontWeight: 200, lineHeight: 1, letterSpacing: '-0.04em' }}>
                    {countByStage[stage.key]}
                  </span>
                  <span style={labelStyle(COLORS.panelMuted)}>{stage.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', gap: '12px' }}>
        <section aria-label="Job queue" style={{ ...panelCardStyle, width: '58%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...moduleHeaderStyle, display: 'grid', gridTemplateColumns: '96px 1fr 1fr 130px', gap: '12px' }}>
            {['Job ID', 'Appliance', 'Area', 'Status'].map((heading) => (
              <span key={heading} style={labelStyle(COLORS.muted)}>{heading}</span>
            ))}
          </div>
          <div style={{ overflowY: 'auto', flexGrow: 1 }}>
            {error && (
              <div style={{ padding: '16px', color: '#DC2626', fontSize: '13px' }}>
                Could not load jobs: {error}
              </div>
            )}
            {!error && !loading && visibleJobs.length === 0 && (
              <div style={{ padding: '16px', color: COLORS.muted, fontSize: '14px' }}>
                No jobs in this window.
              </div>
            )}
            {visibleJobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                isOpen={openJobId === job.id}
                onToggle={() => setOpenJobId(openJobId === job.id ? null : job.id)}
              />
            ))}
          </div>
        </section>

        <section aria-label="Live map" style={{ ...panelCardStyle, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={moduleHeaderStyle}>
            <span style={labelStyle(COLORS.muted)}>Live map</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', ...labelStyle('#15803D') }}>
              <StatusDot color="#16A34A" size={6} />
              Live
            </span>
          </div>
          <LiveMap
            jobs={visibleJobs}
            technicians={showTechnicians ? technicians : []}
            selectedJobId={openJobId}
          />
        </section>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: LIVE_JOBS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'live-jobs',
  description: 'Live job queue and map for the service centre partner',
  component: LiveJobs,
});
