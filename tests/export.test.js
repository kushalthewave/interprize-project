/**
 * Exporting a training record as CSV.
 *
 * The file is read by Excel and by whoever audits the training, so the
 * escaping has to be right: a hazard name with a comma in it must not become
 * two columns, and a quote must not end the field.
 */
import { describe, it, expect } from 'vitest';
import { csvCell, toCsv, roundsToCsv, exportFilename } from '../src/services/export.js';

describe('CSV escaping', () => {
  it('leaves a plain value alone', () => {
    expect(csvCell('Main Storage Hall')).toBe('Main Storage Hall');
    expect(csvCell(87)).toBe('87');
  });

  it('quotes a value with a comma, so it stays one column', () => {
    expect(csvCell('Aisle C, north end')).toBe('"Aisle C, north end"');
  });

  it('doubles a quote rather than ending the field early', () => {
    expect(csvCell('He said "stop"')).toBe('"He said ""stop"""');
  });

  it('quotes a value with a line break', () => {
    expect(csvCell('line one\nline two')).toBe('"line one\nline two"');
  });

  it('writes an empty cell for a missing value rather than the word null', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('separates rows with CRLF, which is what Excel expects', () => {
    expect(toCsv(['a', 'b'], [[1, 2]])).toBe('a,b\r\n1,2');
  });
});

describe('A round export', () => {
  const rounds = [
    {
      played_at: '2026-10-12T09:30:00.000Z', environment: 'env01', mode: 'test',
      difficulty: 'mid', score: 87, rank: 'competent', correct: 11, total_hazards: 15,
      wrong: 2, accuracy: 84.62,
    },
    { at: Date.UTC(2026, 9, 11, 8, 0), environment: 'env02', mode: 'train', score: 63, correct: 7, total: 12 },
  ];

  it('writes a header and one row per round', () => {
    const lines = roundsToCsv(rounds, { name: 'Kushal Neupane' }).split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Trainee,Played at,Warehouse');
  });

  it('puts the trainee on every row, so merged files stay readable', () => {
    const lines = roundsToCsv(rounds, { name: 'Kushal Neupane' }).split('\r\n').slice(1);
    expect(lines.every((l) => l.startsWith('Kushal Neupane,'))).toBe(true);
  });

  it('accepts both shapes of round: from the database and from this device', () => {
    const csv = roundsToCsv(rounds);
    expect(csv).toContain('2026-10-12T09:30:00.000Z');
    expect(csv).toContain('2026-10-11T08:00:00.000Z');
  });

  it('leaves difficulty empty for a training round, which has none', () => {
    const row = roundsToCsv([rounds[1]]).split('\r\n')[1].split(',');
    expect(row[3]).toBe('train');
    expect(row[4]).toBe('');
  });

  it('survives a round with almost nothing in it', () => {
    expect(() => roundsToCsv([{}])).not.toThrow();
    expect(roundsToCsv([{}]).split('\r\n')).toHaveLength(2);
  });
});

describe('The file name', () => {
  const now = () => new Date('2026-10-13T06:00:00Z');

  it('carries the trainee and the date, so it can be filed without renaming', () => {
    expect(exportFilename('Kushal Neupane', { now })).toBe('beat-the-hazard-kushal-neupane-2026-10-13.csv');
  });

  it('strips anything a file system would object to', () => {
    expect(exportFilename('Sunita / Shrestha?', { now })).toBe('beat-the-hazard-sunita-shrestha-2026-10-13.csv');
  });

  it('still produces a name when there is no trainee name', () => {
    expect(exportFilename('', { now })).toBe('beat-the-hazard-trainee-2026-10-13.csv');
  });
});
