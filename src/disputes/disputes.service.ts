import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DisputeStatus, ShipmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async raise(shipmentId: string, userId: string, reason: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    if (shipment.senderId !== userId && shipment.carrierId !== userId) {
      throw new ForbiddenException('You are not a party to this shipment');
    }
    if (!['ACCEPTED', 'IN_TRANSIT'].includes(shipment.status)) {
      throw new BadRequestException('Only an accepted or in-transit shipment can be disputed');
    }

    const [dispute] = await this.prisma.$transaction([
      this.prisma.dispute.create({ data: { shipmentId, raisedByUserId: userId, reason } }),
      this.prisma.shipment.update({
        where: { id: shipmentId },
        data: { status: ShipmentStatus.DISPUTED },
      }),
    ]);
    return dispute;
  }

  /** Only the platform's configured arbiter (matched by linked Stellar address) may resolve. */
  async resolve(disputeId: string, userId: string, resolutionNote: string, senderBps: number) {
    const arbiterAddress = this.config.get<string>('ARBITER_STELLAR_ADDRESS');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!arbiterAddress || !user?.stellarPublicKey || user.stellarPublicKey !== arbiterAddress) {
      throw new ForbiddenException('Only the configured arbiter can resolve a dispute');
    }

    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }
    if (dispute.status !== DisputeStatus.OPEN) {
      throw new BadRequestException('This dispute has already been resolved');
    }

    const [resolved] = await this.prisma.$transaction([
      this.prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: DisputeStatus.RESOLVED,
          resolutionNote,
          senderBps,
          resolvedAt: new Date(),
        },
      }),
      this.prisma.shipment.update({
        where: { id: dispute.shipmentId },
        data: { status: ShipmentStatus.RESOLVED },
      }),
    ]);
    return resolved;
  }

  async listForShipment(shipmentId: string, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    if (shipment.senderId !== userId && shipment.carrierId !== userId) {
      throw new ForbiddenException('You are not a party to this shipment');
    }
    return this.prisma.dispute.findMany({ where: { shipmentId }, orderBy: { createdAt: 'desc' } });
  }
}
