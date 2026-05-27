'use client';
/**
 * Client-only Phaser mount for the Yule Agent Lab. Phaser is dynamically
 * imported inside the effect so it never runs during Next's server render.
 * Live agents flow in through props and are pushed to the scene; agent clicks
 * and camera controls flow back out through callbacks / an imperative handle.
 */
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import type { AgentView } from '@yule/shared-types';
import type { Phase, Weather } from '@/office/useKst';

export interface LabControls {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  focusAgent: (id: string) => void;
}

export function LabGame({
  agents,
  phase = 'day',
  weather = 'clear',
  onAgentClick,
  onBackgroundClick,
  controlsRef,
}: {
  agents: AgentView[];
  phase?: Phase;
  weather?: Weather;
  onAgentClick?: (agentId: string, clientX: number, clientY: number) => void;
  onBackgroundClick?: () => void;
  controlsRef?: Ref<LabControls>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const readyRef = useRef(false);
  const agentsRef = useRef(agents);
  const envRef = useRef({ phase, weather });
  envRef.current = { phase, weather };
  const cbRef = useRef({ onAgentClick, onBackgroundClick });
  cbRef.current = { onAgentClick, onBackgroundClick };

  useImperativeHandle(controlsRef, () => ({
    zoomIn: () => sceneRef.current?.cameras?.main?.setZoom(Math.min(2.6, sceneRef.current.cameras.main.zoom * 1.2)),
    zoomOut: () => sceneRef.current?.cameras?.main?.setZoom(Math.max(sceneRef.current.minZoom, sceneRef.current.cameras.main.zoom * 0.83)),
    fit: () => sceneRef.current?.fitCamera?.(sceneRef.current.scale.width, sceneRef.current.scale.height),
    focusAgent: (id: string) => {
      const c = sceneRef.current?.sprites?.get(id);
      if (c) sceneRef.current.cameras.main.pan(c.x, c.y, 350, 'Sine.easeInOut');
    },
  }), []);

  useEffect(() => {
    let disposed = false;
    (async () => {
      const Phaser = (await import('phaser')).default;
      const { makeLabScene } = await import('./scene.js');
      if (disposed || !hostRef.current) return;
      const Scene = makeLabScene(Phaser);
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        backgroundColor: '#15171c',
        pixelArt: true,
        roundPixels: true,
        scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
        scene: Scene,
      });
      gameRef.current = game;
      game.registry.set('agents', agentsRef.current);
      game.registry.set('env', envRef.current);
      game.registry.set('cb', {
        onAgentClick: (id: string, x: number, y: number) => cbRef.current.onAgentClick?.(id, x, y),
        onBackgroundClick: () => cbRef.current.onBackgroundClick?.(),
        onReady: () => {
          sceneRef.current = game.scene.getScene('lab');
          readyRef.current = true;
          sceneRef.current?.syncAgents?.(agentsRef.current);
        },
      });
    })();
    return () => {
      disposed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    agentsRef.current = agents;
    if (readyRef.current && sceneRef.current) sceneRef.current.syncAgents(agents);
  }, [agents]);

  useEffect(() => {
    if (readyRef.current && sceneRef.current) sceneRef.current.setEnv(phase, weather);
  }, [phase, weather]);

  return <div ref={hostRef} className="lab-canvas" />;
}
