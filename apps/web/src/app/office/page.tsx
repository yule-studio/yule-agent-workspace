'use client';
/**
 * Yule Agent Lab — a single living pixel-office floor. The Phaser scene owns
 * the viewport; React only floats a minimal HUD, an agent context menu, and a
 * compact detail drawer. Agents stream in live and the scene seats / moves them.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAgents } from '@/lib/live';
import { SessionPanel } from '@/components/SessionPanel';
import { StateBadge } from '@/components/StateBadge';
import { LabGame, type LabControls } from '@/office/lab/LabGame';
import { useKst } from '@/office/useKst';
import { AGENT_ROLE_LABEL } from '@yule/shared-types';
import '@/office/lab/lab.css';

export default function Office() {
  const { data } = useAgents();
  const agents = useMemo(() => data?.agents ?? [], [data]);
  const kst = useKst();
  const controls = useRef<LabControls>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [follow, setFollow] = useState(false);

  const active = agents.filter((a) => a.activity !== 'idle').length;
  const menuAgent = agents.find((a) => a.id === menu?.id) ?? null;
  const detail = agents.find((a) => a.id === detailId) ?? null;

  const onAgentClick = useCallback((id: string, x: number, y: number) => {
    setMenu({ id, x: Math.min(x, window.innerWidth - 200), y: Math.min(y, window.innerHeight - 240) });
  }, []);
  const onBackgroundClick = useCallback(() => setMenu(null), []);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  // follow: keep the camera on the most urgent active agent
  useEffect(() => {
    if (!follow) return;
    const a = agents.find((x) => x.activity === 'blocked') ?? agents.find((x) => x.activity !== 'idle');
    if (a) controls.current?.focusAgent(a.id);
  }, [follow, agents]);

  return (
    <div className="lab-root">
      <LabGame agents={agents} onAgentClick={onAgentClick} onBackgroundClick={onBackgroundClick} controlsRef={controls} />

      <div className={`lab-hud phase-${kst.phase}`}>
        <span className="chip" title={`KST ${kst.time} · ${kst.shift}`}>
          <span className="orb" />
          {kst.time}
        </span>
        <span className="chip count">
          <b>{active}</b>&nbsp;/ {agents.length} active
        </span>
        <span className="sep" />
        <button onClick={() => controls.current?.zoomOut()} title="Zoom out" aria-label="Zoom out">−</button>
        <button onClick={() => controls.current?.fit()} title="Fit floor" aria-label="Fit">⊡</button>
        <button onClick={() => controls.current?.zoomIn()} title="Zoom in" aria-label="Zoom in">+</button>
        <span className="sep" />
        <button className={follow ? 'on' : ''} onClick={() => setFollow((f) => !f)} title="Follow active" aria-pressed={follow}>◎</button>
      </div>

      {menu && menuAgent && (
        <div className="lab-menu" style={{ left: menu.x, top: menu.y }}>
          <div className="head">
            <div className="name">{menuAgent.name}</div>
            <div className="sub">{AGENT_ROLE_LABEL[menuAgent.role]} · {menuAgent.activity}</div>
          </div>
          <button disabled title="Coming soon">＋ Assign Task</button>
          <button disabled title="Coming soon">▷ New Session</button>
          <button disabled={!menuAgent.currentSessionId} onClick={() => { setDetailId(menuAgent.id); setMenu(null); }}>
            🕘 Session History
          </button>
          <button className="danger" disabled={!menuAgent.currentSessionId} title="Coming soon">■ Stop Task</button>
          <button onClick={() => { setDetailId(menuAgent.id); setMenu(null); }}>ⓘ View Details</button>
        </div>
      )}

      {detail && (
        <div className="lab-drawer">
          <button className="close" onClick={() => setDetailId(null)}>✕</button>
          <h3>{detail.name}</h3>
          <p className="sub">{AGENT_ROLE_LABEL[detail.role]} · {detail.title}</p>
          <div className="row">
            <StateBadge state={detail.state} />
            <span className="mode">{detail.activity}</span>
            {detail.groupId && <span className="mode">in meeting</span>}
          </div>
          {detail.currentSessionId ? (
            <SessionPanel sessionId={detail.currentSessionId} compact />
          ) : (
            <p className="sub">{detail.statusLine ?? 'Idle — available for work. Assign a task and this agent spins up a session.'}</p>
          )}
        </div>
      )}
    </div>
  );
}
