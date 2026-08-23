import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StellarService, ShipmentCategoryArg } from './stellar.service';
import { BuildInvocationDto, SubmitTransactionDto } from './dto/build-invocation.dto';
import { xdr } from '@stellar/stellar-sdk';

@Controller('stellar')
@UseGuards(JwtAuthGuard)
export class StellarController {
  constructor(private readonly stellar: StellarService) {}

  /**
   * Builds unsigned XDR for an escrow contract call. The client signs this
   * with Freighter/hardware wallet/passkey and posts it back to `/submit`.
   * The backend never sees a secret key at any point in this flow.
   */
  @Post('build')
  async build(@Body() dto: BuildInvocationDto) {
    const args = this.resolveArgs(dto.method, dto.sourcePublicKey, dto.args);
    const unsignedXdr = await this.stellar.buildContractInvocation(
      dto.sourcePublicKey,
      dto.method,
      args,
    );
    return { xdr: unsignedXdr };
  }

  @Post('submit')
  async submit(@Body() dto: SubmitTransactionDto) {
    const result = await this.stellar.submitSignedTransaction(dto.signedXdr);
    return { hash: result.hash, status: result.status };
  }

  private resolveArgs(method: string, source: string, args: string[]): xdr.ScVal[] {
    switch (method) {
      case 'create_shipment':
        return this.stellar.createShipmentArgs(
          source,
          args[0],
          args[1],
          args[2],
          Number(args[3]),
          Number(args[4]),
          args[5] as ShipmentCategoryArg,
        );
      case 'accept_shipment':
        return this.stellar.acceptShipmentArgs(args[0], source);
      case 'confirm_pickup':
        return this.stellar.confirmPickupArgs(args[0], source);
      case 'confirm_delivery':
        return this.stellar.confirmDeliveryArgs(args[0], source);
      case 'cancel_shipment':
        return this.stellar.cancelShipmentArgs(args[0], source);
      case 'reclaim_expired':
        return this.stellar.reclaimExpiredArgs(args[0], source);
      case 'raise_dispute':
        return this.stellar.raiseDisputeArgs(args[0], source);
      case 'resolve_dispute':
        return this.stellar.resolveDisputeArgs(args[0], source, Number(args[1]));
      default:
        throw new BadRequestException(`Unsupported method: ${method}`);
    }
  }
}
