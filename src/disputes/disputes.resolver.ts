import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DisputesService } from './disputes.service';
import { DisputeModel } from './models/dispute.model';
import { RaiseDisputeInput, ResolveDisputeInput } from './dto/dispute.dto';

@Resolver(() => DisputeModel)
@UseGuards(JwtAuthGuard)
export class DisputesResolver {
  constructor(private readonly disputes: DisputesService) {}

  @Query(() => [DisputeModel])
  disputesForShipment(
    @Args('shipmentId') shipmentId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.disputes.listForShipment(shipmentId, user.userId);
  }

  @Mutation(() => DisputeModel)
  raiseDispute(@Args('input') input: RaiseDisputeInput, @CurrentUser() user: { userId: string }) {
    return this.disputes.raise(input.shipmentId, user.userId, input.reason);
  }

  @Mutation(() => DisputeModel)
  resolveDispute(
    @Args('input') input: ResolveDisputeInput,
    @CurrentUser() user: { userId: string },
  ) {
    return this.disputes.resolve(
      input.disputeId,
      user.userId,
      input.resolutionNote,
      input.senderBps,
    );
  }
}
