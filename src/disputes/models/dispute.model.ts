import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { DisputeStatus } from '@prisma/client';

registerEnumType(DisputeStatus, { name: 'DisputeStatus' });

@ObjectType()
export class DisputeModel {
  @Field(() => ID)
  id: string;

  @Field()
  shipmentId: string;

  @Field()
  raisedByUserId: string;

  @Field()
  reason: string;

  @Field(() => DisputeStatus)
  status: DisputeStatus;

  @Field({ nullable: true })
  resolutionNote?: string;

  @Field(() => Int, { nullable: true })
  senderBps?: number;

  @Field({ nullable: true })
  resolvedAt?: Date;

  @Field()
  createdAt: Date;
}
