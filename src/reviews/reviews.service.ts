import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(shipmentId: string, fromUserId: string, rating: number, comment?: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    if (shipment.status !== 'DELIVERED') {
      throw new BadRequestException('You can only review a delivered shipment');
    }

    let toUserId: string;
    if (fromUserId === shipment.senderId && shipment.carrierId) {
      toUserId = shipment.carrierId;
    } else if (fromUserId === shipment.carrierId) {
      toUserId = shipment.senderId;
    } else {
      throw new ForbiddenException('You are not a party to this shipment');
    }

    const review = await this.prisma.review.create({
      data: { shipmentId, fromUserId, toUserId, rating, comment },
    });

    const carrierProfile = await this.prisma.carrierProfile.findUnique({
      where: { userId: toUserId },
    });
    if (carrierProfile) {
      const newCount = carrierProfile.completedDeliveries + 1;
      const newAverage =
        (Number(carrierProfile.averageRating) * carrierProfile.completedDeliveries + rating) /
        newCount;
      await this.prisma.carrierProfile.update({
        where: { userId: toUserId },
        data: { completedDeliveries: newCount, averageRating: newAverage },
      });
    }

    return review;
  }

  listForUser(userId: string) {
    return this.prisma.review.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCarrierProfile(userId: string) {
    const profile = await this.prisma.carrierProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('This user does not have a carrier profile');
    }
    return profile;
  }
}
