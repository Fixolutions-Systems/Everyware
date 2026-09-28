import { useCallback, useEffect, useMemo, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';

export const TECHNICIANS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  '75cf44d7-1b85-4573-bce6-28f7eeb98110';

const REFRESH_INTERVAL_MS = 10_000;

const COLORS = {
  page: '#F3F6F9',
  card: '#FFFFFF',
  border: '#E6EBF0',
  text: '#0F1720',
  muted: '#5A6572',
  band: '#3A4654',
  pill: '#4A5767',
  pillMuted: 'rgba(245,245,247,0.65)',
  actionGradient: 'linear-gradient(135deg, #00B8E6 0%, #0066FF 100%)',
  photoBackground: '#E6FAFF',
  photoSilhouette: '#66D3FF',
  mapBackground: '#E6FAFF',
  danger: '#DC2626',
};

type TechnicianStatus =
  | 'INVITED'
  | 'OFF_DUTY'
  | 'AVAILABLE'
  | 'ON_THE_WAY'
  | 'ON_JOB'
  | 'ON_LEAVE';

const STATUS_LABEL: Record<TechnicianStatus, string> = {
  INVITED: 'Invited',
  OFF_DUTY: 'Off duty',
  AVAILABLE: 'Available',
  ON_THE_WAY: 'On the way',
  ON_JOB: 'On job',
  ON_LEAVE: 'On leave',
};

const STATUS_COLOR: Record<TechnicianStatus, string> = {
  INVITED: '#C5CDD6',
  OFF_DUTY: '#9CA3AF',
  AVAILABLE: '#16A34A',
  ON_THE_WAY: '#F97316',
  ON_JOB: '#0066FF',
  ON_LEAVE: '#D1D5DB',
};

const ON_DUTY_STATUSES: TechnicianStatus[] = ['AVAILABLE', 'ON_THE_WAY', 'ON_JOB'];

type Technician = {
  id: string;
  name: string;
  phone: string;
  status: TechnicianStatus;
  latitude: number | null;
  longitude: number | null;
};

type LeaveRequest = {
  id: string;
  date: string;
  technicianName: string;
};

type TechnicianStats = {
  jobsToday: number;
  averageRating: number | null;
};

type Overlay = 'NONE' | 'ADD' | 'LEAVES';

const startOfTodayIso = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
};

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

const fetchTechnicianData = async () => {
  const client = new CoreApiClient();

  const result = await client.query({
    technicians: {
      __args: {
        first: 200,
        filter: { isActive: { eq: true } },
        orderBy: [{ name: 'AscNullsLast' }],
      },
      edges: {
        node: {
          id: true,
          name: true,
          status: true,
          latitude: true,
          longitude: true,
          phone: { primaryPhoneNumber: true, primaryPhoneCallingCode: true },
        },
      },
    },
    leaves: {
      __args: { first: 50, filter: { status: { eq: 'REQUESTED' } } },
      edges: {
        node: { id: true, date: true, technician: { name: true } },
      },
    },
    serviceJobs: {
      __args: { first: 500, filter: { createdAt: { gte: startOfTodayIso() } } },
      edges: { node: { technicianId: true, rating: true } },
    },
  });

  const technicians: Technician[] = (result.technicians?.edges ?? []).map(
    ({ node }) => ({
      id: node.id,
      name: node.name ?? '',
      phone: [node.phone?.primaryPhoneCallingCode, node.phone?.primaryPhoneNumber]
        .filter(Boolean)
        .join(' '),
      status: (node.status ?? 'OFF_DUTY') as TechnicianStatus,
      latitude: node.latitude ?? null,
      longitude: node.longitude ?? null,
    }),
  ).sort((first, second) =>
    first.name.localeCompare(second.name, undefined, { numeric: true }),
  );

  const leaveRequests: LeaveRequest[] = (result.leaves?.edges ?? []).map(
    ({ node }) => ({
      id: node.id,
      date: node.date ?? '',
      technicianName: node.technician?.name ?? '',
    }),
  );

  const statsByTechnicianId: Record<string, TechnicianStats> = {};
  const ratingsByTechnicianId: Record<string, number[]> = {};
  for (const { node } of result.serviceJobs?.edges ?? []) {
    if (!node.technicianId) {
      continue;
    }
    statsByTechnicianId[node.technicianId] ??= { jobsToday: 0, averageRating: null };
    statsByTechnicianId[node.technicianId].jobsToday += 1;
    if (node.rating != null) {
      (ratingsByTechnicianId[node.technicianId] ??= []).push(node.rating);
    }
  }
  for (const [technicianId, ratings] of Object.entries(ratingsByTechnicianId)) {
    statsByTechnicianId[technicianId].averageRating =
      ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }

  return { technicians, leaveRequests, statsByTechnicianId };
};

const StatusDot = ({ color, size = 10 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" style={{ flexShrink: 0 }}>
    <circle cx="5" cy="5" r="4.5" fill={color} stroke="rgba(15,23,42,0.15)" strokeWidth="0.6" />
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

const TechnicianCard = ({
  technician,
  isSelected,
  onSelect,
}: {
  technician: Technician;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const isOffMap = !ON_DUTY_STATUSES.includes(technician.status);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`${technician.name}, ${STATUS_LABEL[technician.status]}`}
      title={`${technician.name} · ${STATUS_LABEL[technician.status]}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxSizing: 'border-box',
        padding: '16px',
        border: 0,
        borderRadius: '28px',
        font: 'inherit',
        cursor: 'pointer',
        background: isSelected ? COLORS.card : 'rgba(255,255,255,0.65)',
        boxShadow: `inset 0px 1px 0px 0px rgba(255,255,255,1), 0px 20px 40px rgba(15,23,42,${isSelected ? 0.14 : 0.06})`,
        transform: `scale(${isSelected ? 1 : 0.98})`,
        transition: 'transform 300ms, box-shadow 300ms',
        opacity: isOffMap ? 0.6 : 1,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '96px',
          flexShrink: 0,
          borderRadius: '20px',
          background: COLORS.photoBackground,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <svg width="70" height="78" viewBox="0 0 84 92" aria-hidden="true">
          <circle cx="42" cy="34" r="20" fill={COLORS.photoSilhouette} />
          <path d="M4 92c3-22 18-34 38-34s35 12 38 34z" fill={COLORS.photoSilhouette} />
        </svg>
      </div>
      <StatusDot color={STATUS_COLOR[technician.status]} size={12} />
    </button>
  );
};

const TechnicianMap = ({
  technicians,
  selectedId,
}: {
  technicians: Technician[];
  selectedId: string | null;
}) => {
  const onMap = technicians.filter(
    (technician) =>
      ON_DUTY_STATUSES.includes(technician.status) &&
      technician.latitude != null &&
      technician.longitude != null,
  );

  const bounds = useMemo(() => {
    if (onMap.length === 0) {
      return null;
    }
    const latitudes = onMap.map((technician) => technician.latitude as number);
    const longitudes = onMap.map((technician) => technician.longitude as number);
    const padding = 0.006;
    return {
      minLatitude: Math.min(...latitudes) - padding,
      maxLatitude: Math.max(...latitudes) + padding,
      minLongitude: Math.min(...longitudes) - padding,
      maxLongitude: Math.max(...longitudes) + padding,
    };
  }, [onMap]);

  return (
    <>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 500 700"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0 }}
      >
        <path
          d="M0 170 H500 M0 400 H500 M0 600 H500 M100 0 V700 M250 0 V700 M400 0 V700"
          stroke="#FFFFFF"
          strokeWidth="14"
        />
        <path d="M0 40 L500 260 M40 700 L380 0" stroke="#FFFFFF" strokeWidth="8" />
      </svg>
      {bounds &&
        onMap.map((technician) => {
          const isSelected = technician.id === selectedId;
          const size = isSelected ? 26 : 16;
          const color = STATUS_COLOR[technician.status];
          const left =
            (((technician.longitude as number) - bounds.minLongitude) /
              (bounds.maxLongitude - bounds.minLongitude)) *
            100;
          const top =
            ((bounds.maxLatitude - (technician.latitude as number)) /
              (bounds.maxLatitude - bounds.minLatitude)) *
            100;
          return (
            <span
              key={technician.id}
              role="img"
              aria-label={`${technician.name}, ${STATUS_LABEL[technician.status]}`}
              title={technician.name}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                margin: `-${size / 2}px 0 0 -${size / 2}px`,
                display: 'block',
              }}
            >
              <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
                {isSelected && <circle cx="11" cy="11" r="11" fill={color} opacity="0.25" />}
                <circle cx="11" cy="11" r={isSelected ? 7 : 9} fill={color} stroke="#FFFFFF" strokeWidth="3" />
              </svg>
            </span>
          );
        })}
    </>
  );
};

const floatingPanelStyle: React.CSSProperties = {
  position: 'absolute',
  left: '20px',
  right: '20px',
  bottom: '20px',
  boxSizing: 'border-box',
  padding: '20px',
  borderRadius: '24px',
  background: 'rgba(255,255,255,0.95)',
  boxShadow: 'inset 0px 1px 0px 0px rgba(255,255,255,1), 0px 20px 40px rgba(15,23,42,0.12)',
};

const pillButtonStyle = (primary: boolean): React.CSSProperties => ({
  height: '44px',
  padding: '0 20px',
  border: 0,
  borderRadius: '22px',
  background: primary ? COLORS.actionGradient : 'rgba(255,255,255,0.85)',
  color: primary ? '#FFFFFF' : COLORS.text,
  font: 'inherit',
  fontSize: '15px',
  fontWeight: primary ? 600 : 500,
  cursor: 'pointer',
  boxShadow: 'inset 0px 1px 0px 0px rgba(255,255,255,0.6), 0px 20px 40px rgba(15,23,42,0.08)',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
});

const TechniciansScreen = () => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [statsByTechnicianId, setStatsByTechnicianId] = useState<Record<string, TechnicianStats>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>('NONE');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchTechnicianData();
      setTechnicians(data.technicians);
      setLeaveRequests(data.leaveRequests);
      setStatsByTechnicianId(data.statsByTechnicianId);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const runMutation = async (mutation: () => Promise<unknown>) => {
    setIsSaving(true);
    try {
      await mutation();
      await refresh();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : String(mutationError));
    }
    setIsSaving(false);
  };

  const addTechnician = () =>
    runMutation(async () => {
      await new CoreApiClient().mutation({
        createTechnician: {
          __args: {
            data: {
              name: newName.trim(),
              phone: {
                primaryPhoneNumber: newPhone.replace(/\D/g, '').slice(-10),
                primaryPhoneCallingCode: '+91',
                primaryPhoneCountryCode: 'IN',
              },
              status: 'INVITED',
              isActive: true,
            },
          },
          id: true,
        },
      });
      setNewName('');
      setNewPhone('');
      setOverlay('NONE');
    });

  const removeTechnician = (technicianId: string) =>
    runMutation(async () => {
      await new CoreApiClient().mutation({
        updateTechnician: {
          __args: {
            id: technicianId,
            data: { isActive: false, removedAt: new Date().toISOString(), status: 'OFF_DUTY' },
          },
          id: true,
        },
      });
      setSelectedId(null);
      setConfirmRemove(false);
    });

  const decideLeave = (leaveId: string, status: 'APPROVED' | 'REJECTED') =>
    runMutation(async () => {
      await new CoreApiClient().mutation({
        updateLeave: { __args: { id: leaveId, data: { status } }, id: true },
      });
    });

  const onDutyCount = technicians.filter((technician) =>
    ON_DUTY_STATUSES.includes(technician.status),
  ).length;
  const availableCount = technicians.filter(
    (technician) => technician.status === 'AVAILABLE',
  ).length;
  const selectedTechnician = technicians.find((technician) => technician.id === selectedId);
  const selectedStats = selectedId ? statsByTechnicianId[selectedId] : undefined;
  const canAdd = newName.trim().length > 1 && newPhone.replace(/\D/g, '').length >= 10;

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
            {technicians.length}
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', lineHeight: 1.3, color: COLORS.pillMuted }}>
            technicians
            <span style={{ color: '#F5F5F7' }}>{onDutyCount} on duty</span>
          </span>
        </SummaryPill>
        <SummaryPill style={{ right: 'calc(50% + 196px)', top: '28px', height: '56px', padding: '0 22px', borderRadius: '28px' }}>
          <StatusDot color="#2ECC71" size={8} />
          <span style={{ fontSize: '24px', fontWeight: 300, letterSpacing: '-0.04em' }}>{availableCount}</span>
          <span style={{ fontSize: '13px', color: COLORS.pillMuted }}>available</span>
        </SummaryPill>
        <SummaryPill style={{ left: 'calc(50% + 196px)', top: '28px', height: '56px', padding: '0 22px', borderRadius: '28px' }}>
          <StatusDot color="#F5C542" size={8} />
          <span style={{ fontSize: '24px', fontWeight: 300, letterSpacing: '-0.04em' }}>{leaveRequests.length}</span>
          <span style={{ fontSize: '13px', color: COLORS.pillMuted }}>leave requests</span>
        </SummaryPill>
      </section>

      {error && (
        <div role="alert" style={{ color: COLORS.danger, fontSize: '13px', padding: '0 8px' }}>
          {error}
        </div>
      )}

      <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', gap: '16px' }}>
        <div style={{ width: '56%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button type="button" style={pillButtonStyle(true)} onClick={() => setOverlay(overlay === 'ADD' ? 'NONE' : 'ADD')}>
              + Add technician
            </button>
            <button type="button" style={pillButtonStyle(false)} onClick={() => setOverlay(overlay === 'LEAVES' ? 'NONE' : 'LEAVES')}>
              Leave requests
              {leaveRequests.length > 0 && (
                <span
                  style={{
                    minWidth: '22px',
                    height: '22px',
                    padding: '0 6px',
                    boxSizing: 'border-box',
                    borderRadius: '11px',
                    background: COLORS.danger,
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {leaveRequests.length}
                </span>
              )}
            </button>
          </div>
          <section
            aria-label="Technician cards"
            style={{
              flexGrow: 1,
              minHeight: 0,
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gridAutoRows: '156px',
              alignContent: 'start',
              gap: '16px',
              padding: '4px',
            }}
          >
            {technicians.map((technician) => (
              <TechnicianCard
                key={technician.id}
                technician={technician}
                isSelected={technician.id === selectedId}
                onSelect={() => {
                  setSelectedId(technician.id === selectedId ? null : technician.id);
                  setConfirmRemove(false);
                  setOverlay('NONE');
                }}
              />
            ))}
          </section>
        </div>

        <section
          aria-label="Live technician map"
          style={{
            flexGrow: 1,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '28px',
            background: COLORS.mapBackground,
            boxShadow: 'inset 0px 1px 0px 0px rgba(255,255,255,1), 0px 20px 40px rgba(15,23,42,0.06)',
          }}
        >
          <TechnicianMap technicians={technicians} selectedId={selectedId} />

          <div
            style={{
              position: 'absolute',
              left: '20px',
              top: '20px',
              height: '40px',
              boxSizing: 'border-box',
              padding: '0 16px',
              borderRadius: '20px',
              background: 'rgba(255,255,255,0.9)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <StatusDot color="#16A34A" size={8} />
            On-duty technicians
          </div>

          {overlay === 'NONE' && selectedTechnician && (
            <div style={floatingPanelStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 500 }}>{selectedTechnician.name}</span>
                  <span style={{ fontSize: '14px', color: COLORS.muted }}>{selectedTechnician.phone}</span>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}>
                  <StatusDot color={STATUS_COLOR[selectedTechnician.status]} />
                  {STATUS_LABEL[selectedTechnician.status]}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '32px', marginTop: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 200 }}>{selectedStats?.jobsToday ?? 0}</span>
                  <span style={{ fontSize: '13px', color: COLORS.muted }}>jobs today</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 200 }}>
                    {selectedStats?.averageRating == null ? '-' : `${selectedStats.averageRating.toFixed(1)}★`}
                  </span>
                  <span style={{ fontSize: '13px', color: COLORS.muted }}>rating today</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                {confirmRemove ? (
                  <>
                    <span style={{ alignSelf: 'center', fontSize: '14px', color: COLORS.muted }}>
                      Remove {selectedTechnician.name}? He loses access immediately.
                    </span>
                    <button type="button" style={pillButtonStyle(false)} onClick={() => setConfirmRemove(false)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      style={{ ...pillButtonStyle(false), background: COLORS.danger, color: '#FFFFFF' }}
                      onClick={() => removeTechnician(selectedTechnician.id)}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <button type="button" style={pillButtonStyle(false)} onClick={() => setConfirmRemove(true)}>
                    Remove technician
                  </button>
                )}
              </div>
            </div>
          )}

          {overlay === 'ADD' && (
            <div style={floatingPanelStyle}>
              <span style={{ fontSize: '20px', fontWeight: 500 }}>Add technician</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px', marginTop: '16px' }}>
                {[
                  { id: 'technician-name', label: 'Name', value: newName, onChange: setNewName, type: 'text' },
                  { id: 'technician-phone', label: 'Phone (10 digits)', value: newPhone, onChange: setNewPhone, type: 'tel' },
                ].map((input) => (
                  <label key={input.id} htmlFor={input.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: COLORS.muted }}>
                    {input.label}
                    <input
                      id={input.id}
                      type={input.type}
                      value={input.value}
                      onChange={(event) => input.onChange(event.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        height: '44px',
                        padding: '0 14px',
                        borderRadius: '14px',
                        border: `1px solid ${COLORS.border}`,
                        font: 'inherit',
                        fontSize: '15px',
                        color: COLORS.text,
                      }}
                    />
                  </label>
                ))}
              </div>
              <p style={{ fontSize: '13px', color: COLORS.muted, margin: '12px 0 0' }}>
                He shows as Invited until he logs in to the technician app. Everyware HQ sends him the app link.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" style={pillButtonStyle(false)} onClick={() => setOverlay('NONE')}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canAdd || isSaving}
                  onClick={addTechnician}
                  style={{ ...pillButtonStyle(true), opacity: canAdd ? 1 : 0.5 }}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {overlay === 'LEAVES' && (
            <div style={floatingPanelStyle}>
              <span style={{ fontSize: '20px', fontWeight: 500 }}>Leave requests</span>
              {leaveRequests.length === 0 && (
                <p style={{ fontSize: '14px', color: COLORS.muted, margin: '12px 0 0' }}>No pending requests.</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {leaveRequests.map((leave) => (
                  <div
                    key={leave.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '16px', background: COLORS.page }}
                  >
                    <span style={{ flexGrow: 1, fontSize: '15px' }}>
                      {leave.technicianName}
                      <span style={{ color: COLORS.muted }}> · {formatDate(leave.date)} · full day</span>
                    </span>
                    <button
                      type="button"
                      disabled={isSaving}
                      style={{ ...pillButtonStyle(false), height: '40px' }}
                      onClick={() => decideLeave(leave.id, 'REJECTED')}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      style={{ ...pillButtonStyle(true), height: '40px' }}
                      onClick={() => decideLeave(leave.id, 'APPROVED')}
                    >
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: TECHNICIANS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'technicians',
  description: 'Technician control for the service centre partner',
  component: TechniciansScreen,
});
