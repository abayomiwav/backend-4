import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TrackingUpdateModel {
  @Field(() => ID)
  id: string;

  @Field()
  shipmentId: string;

  @Field({ nullable: true })
  createdByUserId?: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  location?: string;

  @Field({ nullable: true })
  note?: string;

  @Field()
  createdAt: Date;
}
