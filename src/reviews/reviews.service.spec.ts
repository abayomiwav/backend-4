import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: {
    shipment: { findUnique: jest.Mock };
    review: { create: jest.Mock };
    carrierProfile: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      shipment: { findUnique: jest.fn() },
      review: { create: jest.fn() },
      carrierProfile: { findUnique: jest.fn(), update: jest.fn() },
    };
    service = new ReviewsService(prisma as unknown as PrismaService);
  });

  it('rejects reviewing a shipment that has not been delivered yet', async () => {
    prisma.shipment.findUnique.mockResolvedValue({ id: 's1', status: 'IN_TRANSIT' });
    await expect(service.create('s1', 'sender1', 5)).rejects.toThrow(BadRequestException);
  });

  it('rejects a reviewer who is not a party to the shipment', async () => {
    prisma.shipment.findUnique.mockResolvedValue({
      id: 's1',
      status: 'DELIVERED',
      senderId: 'sender1',
      carrierId: 'carrier1',
    });
    await expect(service.create('s1', 'stranger', 5)).rejects.toThrow(ForbiddenException);
  });

  it('directs a sender review to the carrier and updates their rolling average', async () => {
    prisma.shipment.findUnique.mockResolvedValue({
      id: 's1',
      status: 'DELIVERED',
      senderId: 'sender1',
      carrierId: 'carrier1',
    });
    prisma.review.create.mockResolvedValue({ id: 'r1', toUserId: 'carrier1', rating: 5 });
    prisma.carrierProfile.findUnique.mockResolvedValue({
      userId: 'carrier1',
      completedDeliveries: 3,
      averageRating: 4,
    });

    await service.create('s1', 'sender1', 5);

    expect(prisma.review.create).toHaveBeenCalledWith({
      data: {
        shipmentId: 's1',
        fromUserId: 'sender1',
        toUserId: 'carrier1',
        rating: 5,
        comment: undefined,
      },
    });
    // (4*3 + 5) / 4 = 4.25
    expect(prisma.carrierProfile.update).toHaveBeenCalledWith({
      where: { userId: 'carrier1' },
      data: { completedDeliveries: 4, averageRating: 4.25 },
    });
  });

  it('directs a carrier review to the sender without touching a carrier profile', async () => {
    prisma.shipment.findUnique.mockResolvedValue({
      id: 's1',
      status: 'DELIVERED',
      senderId: 'sender1',
      carrierId: 'carrier1',
    });
    prisma.review.create.mockResolvedValue({ id: 'r1', toUserId: 'sender1', rating: 4 });
    prisma.carrierProfile.findUnique.mockResolvedValue(null);

    await service.create('s1', 'carrier1', 4);

    expect(prisma.carrierProfile.update).not.toHaveBeenCalled();
  });
});
