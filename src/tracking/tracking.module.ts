import { Module } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { TrackingResolver } from './tracking.resolver';

@Module({
  providers: [TrackingService, TrackingResolver],
})
export class TrackingModule {}
