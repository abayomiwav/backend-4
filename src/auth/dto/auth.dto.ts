import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
export class SignUpInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @MinLength(8)
  password: string;

  @Field()
  @IsString()
  @MinLength(1)
  displayName: string;

  @Field({ defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isCarrier: boolean;
}

@InputType()
export class SignInInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  password: string;
}

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken: string;
}
