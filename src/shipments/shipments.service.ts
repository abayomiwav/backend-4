import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetCode, ShipmentCategory, ShipmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShipmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    senderId: string,
    receiverName: string,
    receiverAddress: string,
    originLabel: string,
    destinationLabel: string,
    category: ShipmentCategory,
    assetCode: AssetCode,
    totalAmount: number,
    pickupReleaseBps: number,
    deliveryDeadlineAt: Date,
  ) {
    return this.prisma.shipment.create({
      data: {
        senderId,
        receiverName,
        receiverAddress,
        originLabel,
        destinationLabel,
        category,
        assetCode,
        totalAmount,
        pickupReleaseBps,
        deliveryDeadlineAt,
      },
    });
  }

  async recordOnChain(
    shipmentId: string,
    userId: string,
    contractShipmentId: string,
    contractAddress: string,
  ) {
    const shipment = await this.getOwned(shipmentId, userId);
    return this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { contractShipmentId: BigInt(contractShipmentId), contractAddress },
    });
  }

  listOpen() {
    return this.prisma.shipment.findMany({
      where: { status: ShipmentStatus.OPEN },
      orderBy: { createdAt: 'desc' },
    });
  }

  listMineAsSender(userId: string) {
    return this.prisma.shipment.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  listMineAsCarrier(userId: string) {
    return this.prisma.shipment.findMany({
      where: { carrierId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOwned(shipmentId: string, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    if (shipment.senderId !== userId && shipment.carrierId !== userId) {
      throw new ForbiddenException('You are not a party to this shipment');
    }
    return shipment;
  }

  /** Records that a carrier has claimed an open shipment (mirrors on-chain `accept_shipment`). */
  async acceptShipment(shipmentId: string, carrierId: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    if (shipment.status !== ShipmentStatus.OPEN) {
      throw new BadRequestException('This shipment has already been accepted');
    }
    if (shipment.senderId === carrierId) {
      throw new ForbiddenException('You cannot accept your own shipment');
    }
    return this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { carrierId, status: ShipmentStatus.ACCEPTED },
    });
  }

  /** Records the pickup-release payout (mirrors on-chain `confirm_pickup`). */
  async confirmPickup(shipmentId: string, carrierId: string) {
    const shipment = await this.getOwned(shipmentId, carrierId);
    if (shipment.carrierId !== carrierId) {
      throw new ForbiddenException('Only the assigned carrier can confirm pickup');
    }
    if (shipment.status !== ShipmentStatus.ACCEPTED) {
      throw new BadRequestException('This shipment is not awaiting pickup');
    }
    const pickupAmount = (Number(shipment.totalAmount) * shipment.pickupReleaseBps) / 10_000;
    return this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: ShipmentStatus.IN_TRANSIT,
        releasedAmount: { increment: pickupAmount },
      },
    });
  }

  /** Records the final delivery payout (mirrors on-chain `confirm_delivery`). */
  async confirmDelivery(shipmentId: string, userId: string) {
    const shipment = await this.getOwned(shipmentId, userId);
    if (shipment.status !== ShipmentStatus.IN_TRANSIT) {
      throw new BadRequestException('This shipment is not in transit');
    }
    return this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: ShipmentStatus.DELIVERED, releasedAmount: shipment.totalAmount },
    });
  }

  async cancel(shipmentId: string, senderId: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    if (shipment.senderId !== senderId) {
      throw new ForbiddenException('Only the sender can cancel a shipment');
    }
    if (shipment.status !== ShipmentStatus.OPEN) {
      throw new BadRequestException('Only an open, unaccepted shipment can be cancelled');
    }
    return this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: ShipmentStatus.CANCELLED },
    });
  }
}
