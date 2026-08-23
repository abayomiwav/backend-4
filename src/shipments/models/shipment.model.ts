import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { AssetCode, ShipmentCategory, ShipmentStatus } from '@prisma/client';

registerEnumType(AssetCode, { name: 'AssetCode' });
registerEnumType(ShipmentCategory, { name: 'ShipmentCategory' });
registerEnumType(ShipmentStatus, { name: 'ShipmentStatus' });

@ObjectType()
export class ShipmentModel {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  contractShipmentId?: string;

  @Field({ nullable: true })
  contractAddress?: string;

  @Field()
  senderId: string;

  @Field({ nullable: true })
  carrierId?: string;

  @Field()
  receiverName: string;

  @Field()
  receiverAddress: string;

  @Field()
  originLabel: string;

  @Field()
  destinationLabel: string;

  @Field(() => ShipmentCategory)
  category: ShipmentCategory;

  @Field(() => AssetCode)
  assetCode: AssetCode;

  @Field(() => Float)
  totalAmount: number;

  @Field(() => Float)
  releasedAmount: number;

  @Field(() => Int)
  pickupReleaseBps: number;

  @Field(() => ShipmentStatus)
  status: ShipmentStatus;

  @Field()
  deliveryDeadlineAt: Date;

  @Field()
  createdAt: Date;
}
