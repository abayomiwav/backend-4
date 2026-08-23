import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class AddTrackingUpdateInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  shipmentId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  status: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  location?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string;
}
