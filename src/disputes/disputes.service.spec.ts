import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DisputeStatus, ShipmentStatus } from '@prisma/client';
import { DisputesService } from './disputes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DisputesService', () => {
  let service: DisputesService;
  let prisma: {
    shipment: { findUnique: jest.Mock; update: jest.Mock };
    dispute: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    user: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let config: ConfigService;

  beforeEach(() => {
    prisma = {
      shipment: { findUnique: jest.fn(), update: jest.fn() },
      dispute: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };
    config = { get: jest.fn().mockReturnValue('GARBITER...') } as unknown as ConfigService;
    service = new DisputesService(prisma as unknown as PrismaService, config);
  });

  describe('raise', () => {
    it('rejects a caller who is not a party to the shipment', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 's1',
        senderId: 'sender1',
        carrierId: 'carrier1',
        status: ShipmentStatus.IN_TRANSIT,
      });
      await expect(service.raise('s1', 'stranger', 'never arrived')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects raising a dispute on a shipment that has not been accepted yet', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 's1',
        senderId: 'sender1',
        carrierId: null,
        status: ShipmentStatus.OPEN,
      });
      await expect(service.raise('s1', 'sender1', 'no carrier')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates a dispute and moves the shipment to DISPUTED', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 's1',
        senderId: 'sender1',
        carrierId: 'carrier1',
        status: ShipmentStatus.IN_TRANSIT,
      });
      prisma.dispute.create.mockResolvedValue({ id: 'd1' });
      prisma.shipment.update.mockResolvedValue({ id: 's1', status: ShipmentStatus.DISPUTED });

      const result = await service.raise('s1', 'sender1', 'damaged goods');
      expect(result).toEqual({ id: 'd1' });
    });
  });

  describe('resolve', () => {
    it('rejects a resolver whose linked Stellar address does not match the arbiter', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', stellarPublicKey: 'GNOTARBITER' });
      await expect(service.resolve('d1', 'u1', 'split funds', 5000)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects resolving an already-resolved dispute', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'arbiter1', stellarPublicKey: 'GARBITER...' });
      prisma.dispute.findUnique.mockResolvedValue({ id: 'd1', status: DisputeStatus.RESOLVED });
      await expect(service.resolve('d1', 'arbiter1', 'split funds', 5000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('resolves an open dispute for the configured arbiter', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'arbiter1', stellarPublicKey: 'GARBITER...' });
      prisma.dispute.findUnique.mockResolvedValue({
        id: 'd1',
        shipmentId: 's1',
        status: DisputeStatus.OPEN,
      });
      prisma.dispute.update.mockResolvedValue({ id: 'd1', status: DisputeStatus.RESOLVED });
      prisma.shipment.update.mockResolvedValue({ id: 's1', status: ShipmentStatus.RESOLVED });

      const result = await service.resolve('d1', 'arbiter1', '70/30 split', 7000);
      expect(result.status).toBe(DisputeStatus.RESOLVED);
    });
  });
});
