'use client';
/**
 * A floor is now rendered as a single pixel-art canvas bitmap (the office) with
 * agents as the only interactive overlay — see PixelFloorCanvas. No DOM
 * furniture / rooms / rounded boxes here.
 */
import type { AgentView, MeetingView } from '@yule/shared-types';
import { PixelFloorCanvas } from './PixelFloorCanvas.js';
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
  return <PixelFloorCanvas floor={floor} meetings={meetings} onSelect={onSelect} />;
}
