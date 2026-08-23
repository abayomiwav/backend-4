import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TrackingService } from './tracking.service';
import { TrackingUpdateModel } from './models/tracking-update.model';
import { AddTrackingUpdateInput } from './dto/tracking-update.dto';

@Resolver(() => TrackingUpdateModel)
@UseGuards(JwtAuthGuard)
export class TrackingResolver {
  constructor(private readonly tracking: TrackingService) {}

  @Query(() => [TrackingUpdateModel])
  trackingUpdates(@Args('shipmentId') shipmentId: string, @CurrentUser() user: { userId: string }) {
    return this.tracking.listForShipment(shipmentId, user.userId);
  }

  @Mutation(() => TrackingUpdateModel)
  addTrackingUpdate(
    @Args('input') input: AddTrackingUpdateInput,
    @CurrentUser() user: { userId: string },
  ) {
    return this.tracking.addUpdate(
      input.shipmentId,
      user.userId,
      input.status,
      input.location,
      input.note,
    );
  }
}
