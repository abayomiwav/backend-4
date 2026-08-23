import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CarrierProfileModel, ReviewModel } from './models/review.model';
import { CreateReviewInput } from './dto/review.dto';

@Resolver(() => ReviewModel)
@UseGuards(JwtAuthGuard)
export class ReviewsResolver {
  constructor(private readonly reviews: ReviewsService) {}

  @Query(() => [ReviewModel])
  myReviews(@CurrentUser() user: { userId: string }) {
    return this.reviews.listForUser(user.userId);
  }

  @Query(() => CarrierProfileModel)
  async carrierProfile(@Args('userId') userId: string) {
    const profile = await this.reviews.getCarrierProfile(userId);
    return { ...profile, averageRating: Number(profile.averageRating) };
  }

  @Mutation(() => ReviewModel)
  createReview(@Args('input') input: CreateReviewInput, @CurrentUser() user: { userId: string }) {
    return this.reviews.create(input.shipmentId, user.userId, input.rating, input.comment);
  }
}
