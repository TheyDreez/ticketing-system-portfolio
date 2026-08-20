import { describe, it, expect } from 'vitest';
import { canAccessTicket, canReassignTicket, canViewSensitiveFields } from '../server/lib/authorization';

describe('Authorization Library', () => {
  const admin = { role: 'Administrador', email: 'admin@test.com' };
  const supportNoDept = { role: 'Suporte', email: 'support1@test.com' };
  const supportIT = { role: 'Suporte', email: 'support2@test.com', department: 'TI' };
  const supportHR = { role: 'Suporte', email: 'support3@test.com', department: 'RH' };
  const collab = { role: 'Colaborador', email: 'collab@test.com' };

  const ticketIT = { authorEmail: 'other@test.com', department: 'TI' };
  const ticketHR = { authorEmail: 'other@test.com', department: 'RH' };
  const ticketNoDept = { authorEmail: 'other@test.com' };
  const ticketCollabAuthor = { authorEmail: 'collab@test.com', department: 'TI' };
  const ticketAssignedToSupportIT = { assignedToEmail: 'support2@test.com', department: 'RH' };

  describe('canAccessTicket', () => {
    it('admin pode acessar qualquer ticket', () => {
      expect(canAccessTicket(admin, ticketIT)).toBe(true);
      expect(canAccessTicket(admin, ticketHR)).toBe(true);
      expect(canAccessTicket(admin, ticketNoDept)).toBe(true);
    });

    it('suporte pode acessar ticket APENAS do mesmo departamento', () => {
      expect(canAccessTicket(supportIT, ticketIT)).toBe(true);
      expect(canAccessTicket(supportHR, ticketHR)).toBe(true);
    });

    it('suporte não pode acessar ticket de departamento diferente, mesmo atribuído a ele', () => {
      expect(canAccessTicket(supportIT, ticketAssignedToSupportIT)).toBe(false);
      expect(canAccessTicket(supportIT, ticketHR)).toBe(false);
      expect(canAccessTicket(supportHR, ticketIT)).toBe(false);
    });

    it('colaborador pode acessar apenas tickets que ele criou', () => {
      expect(canAccessTicket(collab, ticketCollabAuthor)).toBe(true);
      expect(canAccessTicket(collab, ticketIT)).toBe(false);
    });
  });

  describe('canReassignTicket', () => {
    it('admin pode reatribuir qualquer ticket', () => {
      expect(canReassignTicket(admin, ticketIT)).toBe(true);
    });

    it('suporte só pode reatribuir ticket do seu departamento', () => {
      expect(canReassignTicket(supportIT, ticketIT)).toBe(true);
      expect(canReassignTicket(supportIT, ticketHR)).toBe(false);
    });

    it('colaborador não pode reatribuir', () => {
      expect(canReassignTicket(collab, ticketCollabAuthor)).toBe(false);
    });
  });

  describe('canViewSensitiveFields', () => {
    it('admin pode ver tudo', () => {
      expect(canViewSensitiveFields(admin, ticketIT)).toBe(true);
    });

    it('suporte não pode ver campos sensíveis, nem mesmo do seu departamento', () => {
      expect(canViewSensitiveFields(supportIT, ticketIT)).toBe(false);
    });

    it('colaborador não pode ver', () => {
      expect(canViewSensitiveFields(collab, ticketCollabAuthor)).toBe(false);
    });
  });
});
