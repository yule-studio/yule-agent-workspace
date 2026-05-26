import { describe, expect, it } from 'vitest';
import { parseCommand } from '../src/commands.js';

describe('parseCommand', () => {
  it('parses a task command with a multi-word title', () => {
    expect(parseCommand('task engineering Fix the flaky test')).toEqual({
      kind: 'task',
      role: 'engineering',
      title: 'Fix the flaky test',
    });
  });

  it('tolerates a colon after the role', () => {
    expect(parseCommand('task marketing: Launch note')).toMatchObject({
      kind: 'task',
      role: 'marketing',
      title: 'Launch note',
    });
  });

  it('rejects an unknown role', () => {
    expect(parseCommand('task wizard cast a spell').kind).toBe('error');
  });

  it('parses decision commands with optional notes', () => {
    expect(parseCommand('approve abc123 looks good')).toEqual({
      kind: 'decide',
      decision: 'approved',
      id: 'abc123',
      note: 'looks good',
    });
    expect(parseCommand('reject xyz')).toEqual({
      kind: 'decide',
      decision: 'rejected',
      id: 'xyz',
      note: null,
    });
  });

  it('parses simple commands', () => {
    expect(parseCommand('status').kind).toBe('status');
    expect(parseCommand('summary').kind).toBe('summary');
    expect(parseCommand('help').kind).toBe('help');
    expect(parseCommand('session s1')).toEqual({ kind: 'session', id: 's1' });
  });

  it('flags unknown commands and empty input', () => {
    expect(parseCommand('  ').kind).toBe('error');
    expect(parseCommand('frobnicate').kind).toBe('error');
  });
});
