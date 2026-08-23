import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ReviewModel {
  @Field(() => ID)
  id: string;

  @Field()
  shipmentId: string;

  @Field()
  fromUserId: string;

  @Field()
  toUserId: string;

  @Field(() => Int)
  rating: number;

  @Field({ nullable: true })
  comment?: string;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class CarrierProfileModel {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field({ nullable: true })
  vehicleType?: string;

  @Field({ nullable: true })
  serviceArea?: string;

  @Field(() => Int)
  completedDeliveries: number;

  @Field()
  averageRating: number;
}
