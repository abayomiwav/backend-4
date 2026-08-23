import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserModel {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  displayName: string;

  @Field()
  isCarrier: boolean;

  @Field({ nullable: true })
  stellarPublicKey?: string;

  @Field()
  createdAt: Date;
}
