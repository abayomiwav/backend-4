import { IsIn, IsString } from 'class-validator';

export const SUPPORTED_METHODS = [
  'create_shipment',
  'accept_shipment',
  'confirm_pickup',
  'confirm_delivery',
  'cancel_shipment',
  'reclaim_expired',
  'raise_dispute',
  'resolve_dispute',
] as const;

export class BuildInvocationDto {
  @IsString()
  sourcePublicKey: string;

  @IsIn(SUPPORTED_METHODS)
  method: (typeof SUPPORTED_METHODS)[number];

  @IsString({ each: true })
  args: string[];
}

export class SubmitTransactionDto {
  @IsString()
  signedXdr: string;
}
