import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShipmentStatus } from '@prisma/client';
import { ShipmentsService } from './shipments.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ShipmentsService', () => {
  let service: ShipmentsService;
  let prisma: { shipment: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock } };

  beforeEach(() => {
    prisma = {
      shipment: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    };
    service = new ShipmentsService(prisma as unknown as PrismaService);
  });

  describe('acceptShipment', () => {
    it('rejects accepting a shipment that already has a carrier', async () => {
      prisma.shipment.findUnique.mockResolvedValue({ id: 's1', status: ShipmentStatus.ACCEPTED });
      await expect(service.acceptShipment('s1', 'carrier1')).rejects.toThrow(BadRequestException);
    });

    it('assigns the carrier and moves status to ACCEPTED', async () => {
      prisma.shipment.findUnique.mockResolvedValue({ id: 's1', status: ShipmentStatus.OPEN });
      prisma.shipment.update.mockResolvedValue({
        id: 's1',
        status: ShipmentStatus.ACCEPTED,
        carrierId: 'carrier1',
      });

      const result = await service.acceptShipment('s1', 'carrier1');
      expect(prisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { carrierId: 'carrier1', status: ShipmentStatus.ACCEPTED },
      });
      expect(result.status).toBe(ShipmentStatus.ACCEPTED);
    });
  });

  describe('confirmPickup', () => {
    it('rejects a carrier who is not assigned to the shipment', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 's1',
        senderId: 'sender1',
        carrierId: 'carrier1',
        status: ShipmentStatus.ACCEPTED,
      });
      await expect(service.confirmPickup('s1', 'someone-else')).rejects.toThrow(ForbiddenException);
    });

    it('releases the pickup share proportional to pickupReleaseBps', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 's1',
        senderId: 'sender1',
        carrierId: 'carrier1',
        status: ShipmentStatus.ACCEPTED,
        totalAmount: 1000,
        pickupReleaseBps: 4000,
      });
      prisma.shipment.update.mockResolvedValue({ id: 's1', status: ShipmentStatus.IN_TRANSIT });

      await service.confirmPickup('s1', 'carrier1');

      expect(prisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { status: ShipmentStatus.IN_TRANSIT, releasedAmount: { increment: 400 } },
      });
    });

    it('rejects confirming pickup on a shipment that is not awaiting pickup', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 's1',
        senderId: 'sender1',
        carrierId: 'carrier1',
        status: ShipmentStatus.IN_TRANSIT,
      });
      await expect(service.confirmPickup('s1', 'carrier1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmDelivery', () => {
    it('releases the full remaining balance and marks the shipment delivered', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 's1',
        senderId: 'sender1',
        carrierId: 'carrier1',
        status: ShipmentStatus.IN_TRANSIT,
        totalAmount: 1000,
      });
      prisma.shipment.update.mockResolvedValue({ id: 's1', status: ShipmentStatus.DELIVERED });

      await service.confirmDelivery('s1', 'sender1');

      expect(prisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { status: ShipmentStatus.DELIVERED, releasedAmount: 1000 },
      });
    });
  });

  describe('cancel', () => {
    it('rejects cancellation by anyone other than the sender', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 's1',
        senderId: 'sender1',
        status: ShipmentStatus.OPEN,
      });
      await expect(service.cancel('s1', 'not-the-sender')).rejects.toThrow(ForbiddenException);
    });

    it('rejects cancellation once a carrier has accepted', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 's1',
        senderId: 'sender1',
        status: ShipmentStatus.ACCEPTED,
      });
      await expect(service.cancel('s1', 'sender1')).rejects.toThrow(BadRequestException);
    });

    it('cancels an open, unaccepted shipment for its sender', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 's1',
        senderId: 'sender1',
        status: ShipmentStatus.OPEN,
      });
      prisma.shipment.update.mockResolvedValue({ id: 's1', status: ShipmentStatus.CANCELLED });

      const result = await service.cancel('s1', 'sender1');
      expect(result.status).toBe(ShipmentStatus.CANCELLED);
    });
  });

  describe('getOwned', () => {
    it('throws NotFoundException for a missing shipment', async () => {
      prisma.shipment.findUnique.mockResolvedValue(null);
      await expect(service.getOwned('missing', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for a user who is not sender or carrier', async () => {
      prisma.shipment.findUnique.mockResolvedValue({
        id: 's1',
        senderId: 'sender1',
        carrierId: 'carrier1',
      });
      await expect(service.getOwned('s1', 'stranger')).rejects.toThrow(ForbiddenException);
    });
  });
});
