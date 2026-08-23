import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { AssetCode, ShipmentCategory } from '@prisma/client';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsPositive, IsString, Max, Min } from 'class-validator';

@InputType()
export class CreateShipmentInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  receiverName: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  receiverAddress: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  originLabel: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  destinationLabel: string;

  @Field(() => ShipmentCategory)
  @IsEnum(ShipmentCategory)
  category: ShipmentCategory;

  @Field(() => AssetCode)
  @IsEnum(AssetCode)
  assetCode: AssetCode;

  @Field(() => Float)
  @IsPositive()
  totalAmount: number;

  @Field(() => Int, { defaultValue: 5000 })
  @IsInt()
  @Min(0)
  @Max(10_000)
  pickupReleaseBps: number;

  @Field()
  @IsDate()
  deliveryDeadlineAt: Date;
}

@InputType()
export class RecordOnChainShipmentInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  shipmentId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  contractShipmentId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  contractAddress: string;
}
