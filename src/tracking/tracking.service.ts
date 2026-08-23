import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async addUpdate(
    shipmentId: string,
    userId: string,
    status: string,
    location?: string,
    note?: string,
  ) {
    await this.requireParty(shipmentId, userId);
    return this.prisma.trackingUpdate.create({
      data: { shipmentId, createdByUserId: userId, status, location, note },
    });
  }

  async listForShipment(shipmentId: string, userId: string) {
    await this.requireParty(shipmentId, userId);
    return this.prisma.trackingUpdate.findMany({
      where: { shipmentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async requireParty(shipmentId: string, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    if (shipment.senderId !== userId && shipment.carrierId !== userId) {
      throw new ForbiddenException('You are not a party to this shipment');
    }
    return shipment;
  }
}
