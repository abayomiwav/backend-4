import { Module } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { DisputesResolver } from './disputes.resolver';

@Module({
  providers: [DisputesService, DisputesResolver],
})
export class DisputesModule {}
