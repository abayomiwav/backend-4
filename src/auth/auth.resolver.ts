import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthPayload, SignInInput, SignUpInput } from './dto/auth.dto';
import { UserModel } from './models/user.model';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}

  @Mutation(() => AuthPayload)
  signUp(@Args('input') input: SignUpInput) {
    return this.auth.signUp(input.email, input.password, input.displayName, input.isCarrier);
  }

  @Mutation(() => AuthPayload)
  signIn(@Args('input') input: SignInInput) {
    return this.auth.signIn(input.email, input.password);
  }

  @Query(() => UserModel)
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { userId: string }) {
    return this.auth.me(user.userId);
  }
}
