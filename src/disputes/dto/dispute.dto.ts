import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

@InputType()
export class RaiseDisputeInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  shipmentId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

@InputType()
export class ResolveDisputeInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  disputeId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  resolutionNote: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(10_000)
  senderBps: number;
}
