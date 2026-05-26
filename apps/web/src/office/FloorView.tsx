'use client';
/**
 * A floor is rendered as a Tiled tilemap background (real .tmj + tileset atlas,
 * see TilemapFloor / tilemap.ts) with agents as the only interactive overlay.
 * No hand-drawn CSS/canvas furniture.
 */
import type { AgentView, MeetingView } from '@yule/shared-types';
import { TilemapFloor } from './TilemapFloor.js';
import type { Floor } from './org.js';

export function FloorView({
  floor,
  meetings,
  onSelect,
}: {
  floor: Floor;
  meetings: MeetingView[];
  onSelect: (a: AgentView) => void;
}) {
  return <TilemapFloor floor={floor} meetings={meetings} onSelect={onSelect} />;
}
