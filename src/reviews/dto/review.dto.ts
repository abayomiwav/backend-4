import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

@InputType()
export class CreateReviewInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  shipmentId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  comment?: string;
}
