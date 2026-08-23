import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ShipmentsService } from './shipments.service';
import { ShipmentModel } from './models/shipment.model';
import { CreateShipmentInput, RecordOnChainShipmentInput } from './dto/shipment.dto';

function toModel(s: Awaited<ReturnType<ShipmentsService['create']>>): ShipmentModel {
  return {
    id: s.id,
    contractShipmentId: s.contractShipmentId?.toString(),
    contractAddress: s.contractAddress ?? undefined,
    senderId: s.senderId,
    carrierId: s.carrierId ?? undefined,
    receiverName: s.receiverName,
    receiverAddress: s.receiverAddress,
    originLabel: s.originLabel,
    destinationLabel: s.destinationLabel,
    category: s.category,
    assetCode: s.assetCode,
    totalAmount: Number(s.totalAmount),
    releasedAmount: Number(s.releasedAmount),
    pickupReleaseBps: s.pickupReleaseBps,
    status: s.status,
    deliveryDeadlineAt: s.deliveryDeadlineAt,
    createdAt: s.createdAt,
  };
}

@Resolver(() => ShipmentModel)
@UseGuards(JwtAuthGuard)
export class ShipmentsResolver {
  constructor(private readonly shipments: ShipmentsService) {}

  @Query(() => [ShipmentModel])
  openShipments() {
    return this.shipments.listOpen().then((list) => list.map(toModel));
  }

  @Query(() => [ShipmentModel])
  myShipmentsAsSender(@CurrentUser() user: { userId: string }) {
    return this.shipments.listMineAsSender(user.userId).then((list) => list.map(toModel));
  }

  @Query(() => [ShipmentModel])
  myShipmentsAsCarrier(@CurrentUser() user: { userId: string }) {
    return this.shipments.listMineAsCarrier(user.userId).then((list) => list.map(toModel));
  }

  @Query(() => ShipmentModel)
  shipment(@Args('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.shipments.getOwned(id, user.userId).then(toModel);
  }

  @Mutation(() => ShipmentModel)
  async createShipment(
    @Args('input') input: CreateShipmentInput,
    @CurrentUser() user: { userId: string },
  ) {
    const shipment = await this.shipments.create(
      user.userId,
      input.receiverName,
      input.receiverAddress,
      input.originLabel,
      input.destinationLabel,
      input.category,
      input.assetCode,
      input.totalAmount,
      input.pickupReleaseBps,
      input.deliveryDeadlineAt,
    );
    return toModel(shipment);
  }

  @Mutation(() => ShipmentModel)
  async recordOnChainShipment(
    @Args('input') input: RecordOnChainShipmentInput,
    @CurrentUser() user: { userId: string },
  ) {
    const shipment = await this.shipments.recordOnChain(
      input.shipmentId,
      user.userId,
      input.contractShipmentId,
      input.contractAddress,
    );
    return toModel(shipment);
  }

  @Mutation(() => ShipmentModel)
  async acceptShipment(
    @Args('shipmentId') shipmentId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const shipment = await this.shipments.acceptShipment(shipmentId, user.userId);
    return toModel(shipment);
  }

  @Mutation(() => ShipmentModel)
  async confirmPickup(
    @Args('shipmentId') shipmentId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const shipment = await this.shipments.confirmPickup(shipmentId, user.userId);
    return toModel(shipment);
  }

  @Mutation(() => ShipmentModel)
  async confirmDelivery(
    @Args('shipmentId') shipmentId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const shipment = await this.shipments.confirmDelivery(shipmentId, user.userId);
    return toModel(shipment);
  }

  @Mutation(() => ShipmentModel)
  async cancelShipment(
    @Args('shipmentId') shipmentId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const shipment = await this.shipments.cancel(shipmentId, user.userId);
    return toModel(shipment);
  }
}
