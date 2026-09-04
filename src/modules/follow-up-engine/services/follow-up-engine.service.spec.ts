import { Test, TestingModule } from '@nestjs/testing';
import { FollowUpEngineService } from './follow-up-engine.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('FollowUpEngineService (Candado de Horario de Atención)', () => {
  let service: FollowUpEngineService;
  let prisma: any;
  let eventEmitter: any;

  beforeEach(async () => {
    prisma = {
      tenant: { findMany: jest.fn().mockResolvedValue([]) },
      knowledgeBundle: { findUnique: jest.fn() },
      conversation: { findMany: jest.fn().mockResolvedValue([]) },
      pendingOutboundMessage: { findFirst: jest.fn() },
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowUpEngineService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<FollowUpEngineService>(FollowUpEngineService);
  });

  describe('isWithinAllowedWindow (Venezuela / Caracas VET UTC-4)', () => {
    const checkWindow = (date: Date, start = 7, end = 22) => (service as any).isWithinAllowedWindow(date, start, end);

    it('Candado 1: Debe BLOQUEAR a la 1:00 AM (01:00 VET)', () => {
      // 01:00 VET = 05:00 UTC
      const date1am = new Date('2026-09-04T05:00:00Z');
      const allowed = checkWindow(date1am, 7, 22);
      expect(allowed).toBe(false);
    });

    it('Candado 2: Debe BLOQUEAR a las 11:30 PM (23:30 VET)', () => {
      // 23:30 VET = 03:30 UTC del día siguiente
      const date1130pm = new Date('2026-09-05T03:30:00Z');
      const allowed = checkWindow(date1130pm, 7, 22);
      expect(allowed).toBe(false);
    });

    it('Candado 3: Debe BLOQUEAR a las 10:15 PM (22:15 VET)', () => {
      // 22:15 VET = 02:15 UTC del día siguiente
      const date1015pm = new Date('2026-09-05T02:15:00Z');
      const allowed = checkWindow(date1015pm, 7, 22);
      expect(allowed).toBe(false);
    });

    it('Candado 4: Debe PERMITIR a las 10:00 AM (10:00 VET)', () => {
      // 10:00 VET = 14:00 UTC
      const date10am = new Date('2026-09-04T14:00:00Z');
      const allowed = checkWindow(date10am, 7, 22);
      expect(allowed).toBe(true);
    });

    it('Candado 5: Debe PERMITIR a las 4:00 PM (16:00 VET)', () => {
      // 16:00 VET = 20:00 UTC
      const date4pm = new Date('2026-09-04T20:00:00Z');
      const allowed = checkWindow(date4pm, 7, 22);
      expect(allowed).toBe(true);
    });
  });

  describe('evaluateFollowUps', () => {
    it('Candado 6: Si está fuera de horario, debe suspender seguimientos sin consultar tenants', async () => {
      // Forzar isWithinAllowedWindow a devolver false
      jest.spyOn(service as any, 'isWithinAllowedWindow').mockReturnValue(false);

      const report = await service.evaluateFollowUps();

      expect(report.isWindowAllowed).toBe(false);
      expect(prisma.tenant.findMany).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
