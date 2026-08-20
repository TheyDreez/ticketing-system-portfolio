import { describe, it, expect, vi } from 'vitest';
import { calculateSla, defaultSlaConfigs } from '../server/lib/slaEngine';
import { Ticket } from '../src/types';

describe('SLA Engine', () => {
  const configs = defaultSlaConfigs;

  it('calculates deadline correctly based on priority and category', () => {
    const baseDate = new Date('2023-01-01T10:00:00Z');
    const ticket: Ticket = {
      id: 't1', title: 'Test', status: 'Aguardando', category: 'Infraestrutura', priority: 'Alta',
      user: 'u1', description: 'Desc', createdAt: '2023-01-01', notes: [], createdAtIso: baseDate.toISOString(), deadline: ''
    };

    const calculated = calculateSla(ticket, configs);
    const expectedDeadline = new Date(baseDate.getTime() + 0.5 * 60 * 60 * 1000).toISOString();
    
    expect(calculated.slaDeadline).toBe(expectedDeadline);
  });

  it('marks as dentro_prazo if Resolvido', () => {
    const baseDate = new Date('2023-01-01T10:00:00Z');
    const ticket: Ticket = {
      id: 't2', title: 'Test', status: 'Resolvido', category: 'Infraestrutura', priority: 'Alta',
      user: 'u1', description: 'Desc', createdAt: '2023-01-01', notes: [], createdAtIso: baseDate.toISOString(), deadline: ''
    };

    const calculated = calculateSla(ticket, configs);
    expect(calculated.slaStatus).toBe('dentro_prazo');
  });

  it('marks as estourado if past deadline', () => {
    vi.useFakeTimers();
    const now = new Date('2023-01-01T11:00:00Z');
    vi.setSystemTime(now);

    const baseDate = new Date('2023-01-01T10:00:00Z');
    const ticket: Ticket = {
      id: 't3', title: 'Test', status: 'Aguardando', category: 'Infraestrutura', priority: 'Alta', // Alta/Infra = 0.5h
      user: 'u1', description: 'Desc', createdAt: '2023-01-01', notes: [], createdAtIso: baseDate.toISOString(), deadline: ''
    };

    const calculated = calculateSla(ticket, configs);
    expect(calculated.slaStatus).toBe('estourado');
    vi.useRealTimers();
  });

  it('marks as em_risco if less than 30 mins remaining', () => {
    vi.useFakeTimers();
    const now = new Date('2023-01-01T10:20:00Z'); // 20 mins passed, 10 mins remaining
    vi.setSystemTime(now);

    const baseDate = new Date('2023-01-01T10:00:00Z');
    const ticket: Ticket = {
      id: 't4', title: 'Test', status: 'Aguardando', category: 'Infraestrutura', priority: 'Alta', // Alta/Infra = 0.5h = 30m
      user: 'u1', description: 'Desc', createdAt: '2023-01-01', notes: [], createdAtIso: baseDate.toISOString(), deadline: ''
    };

    const calculated = calculateSla(ticket, configs);
    expect(calculated.slaStatus).toBe('em_risco');
    vi.useRealTimers();
  });
});
