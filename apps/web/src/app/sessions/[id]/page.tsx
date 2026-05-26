'use client';
import { useParams } from 'next/navigation';
import { ConnectionDot } from '@/components/Nav';
import { SessionPanel } from '@/components/SessionPanel';

export default function SessionDetail() {
  const id = String(useParams().id);
  return (
    <div>
      <div className="page-head">
        <h2>Session</h2>
        <ConnectionDot />
      </div>
      <p className="small muted mono">{id}</p>
      <div className="card">
        <SessionPanel sessionId={id} />
      </div>
    </div>
  );
}
