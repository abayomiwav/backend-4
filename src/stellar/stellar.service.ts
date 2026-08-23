import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Address,
  BASE_FEE,
  Contract,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';

const SHIPMENT_CATEGORIES = [
  'General',
  'Food',
  'Fragile',
  'Electronics',
  'Documents',
  'Furniture',
] as const;
export type ShipmentCategoryArg = (typeof SHIPMENT_CATEGORIES)[number];

/**
 * Builds unsigned Soroban transaction XDR against the StellarExpress
 * `escrow` contract and submits already-signed XDR. This service never
 * receives or stores a user's secret key — every state-changing call is
 * signed client-side (Freighter / hardware wallet / passkey signer) and
 * the signed envelope is handed back to `submitSignedTransaction`.
 */
@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly server: rpc.Server;
  private readonly networkPassphrase: string;
  private readonly escrowContractId: string;

  constructor(private readonly config: ConfigService) {
    this.server = new rpc.Server(
      this.config.get<string>('SOROBAN_RPC_URL', 'https://soroban-testnet.stellar.org'),
    );
    this.networkPassphrase = this.config.get<string>(
      'STELLAR_NETWORK_PASSPHRASE',
      'Test SDF Network ; September 2015',
    );
    this.escrowContractId = this.config.get<string>('ESCROW_CONTRACT_ID', '');
  }

  /** Builds an unsigned, simulated + prepared XDR envelope for a contract call. */
  async buildContractInvocation(
    sourcePublicKey: string,
    method: string,
    args: xdr.ScVal[],
  ): Promise<string> {
    const account = await this.server.getAccount(sourcePublicKey);
    const contract = new Contract(this.escrowContractId);

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(300)
      .build();

    const prepared = await this.server.prepareTransaction(transaction);
    return prepared.toXDR();
  }

  /** Submits a transaction that the client has already signed. */
  async submitSignedTransaction(signedXdr: string) {
    const transaction = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
    const result = await this.server.sendTransaction(transaction);

    if (result.status === 'ERROR') {
      this.logger.error(`Transaction submission failed: ${JSON.stringify(result.errorResult)}`);
    }
    return result;
  }

  async getTransactionStatus(hash: string) {
    return this.server.getTransaction(hash);
  }

  /** Read-only simulation, used to fetch on-chain view data without a signer. */
  async simulateRead<T>(method: string, args: xdr.ScVal[]): Promise<T> {
    const contract = new Contract(this.escrowContractId);
    const dummyAccount = await this.server.getAccount(
      this.config.get<string>('STELLAR_READ_SOURCE_ACCOUNT', ''),
    );
    const transaction = new TransactionBuilder(dummyAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const simulated = await this.server.simulateTransaction(transaction);
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }
    if (!simulated.result) {
      throw new Error('Simulation returned no result');
    }
    return scValToNative(simulated.result.retval) as T;
  }

  private categoryToScVal(category: ShipmentCategoryArg): xdr.ScVal {
    if (!SHIPMENT_CATEGORIES.includes(category)) {
      throw new Error(`Unknown shipment category: ${category}`);
    }
    // soroban-sdk encodes a fieldless #[contracttype] enum variant as a
    // one-element vec containing the variant name as a symbol.
    return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(category)]);
  }

  // --- ScVal argument builders for each escrow contract method ---

  createShipmentArgs(
    sender: string,
    receiver: string,
    asset: string,
    totalAmount: string,
    pickupReleaseBps: number,
    deliveryDeadlineLedger: number,
    category: ShipmentCategoryArg,
  ) {
    return [
      new Address(sender).toScVal(),
      new Address(receiver).toScVal(),
      new Address(asset).toScVal(),
      nativeToScVal(totalAmount, { type: 'i128' }),
      nativeToScVal(pickupReleaseBps, { type: 'u32' }),
      nativeToScVal(deliveryDeadlineLedger, { type: 'u32' }),
      this.categoryToScVal(category),
    ];
  }

  acceptShipmentArgs(shipmentId: string, carrier: string) {
    return [nativeToScVal(shipmentId, { type: 'u64' }), new Address(carrier).toScVal()];
  }

  confirmPickupArgs(shipmentId: string, carrier: string) {
    return [nativeToScVal(shipmentId, { type: 'u64' }), new Address(carrier).toScVal()];
  }

  confirmDeliveryArgs(shipmentId: string, receiver: string) {
    return [nativeToScVal(shipmentId, { type: 'u64' }), new Address(receiver).toScVal()];
  }

  cancelShipmentArgs(shipmentId: string, sender: string) {
    return [nativeToScVal(shipmentId, { type: 'u64' }), new Address(sender).toScVal()];
  }

  reclaimExpiredArgs(shipmentId: string, sender: string) {
    return [nativeToScVal(shipmentId, { type: 'u64' }), new Address(sender).toScVal()];
  }

  raiseDisputeArgs(shipmentId: string, caller: string) {
    return [nativeToScVal(shipmentId, { type: 'u64' }), new Address(caller).toScVal()];
  }

  resolveDisputeArgs(shipmentId: string, arbiter: string, senderBps: number) {
    return [
      nativeToScVal(shipmentId, { type: 'u64' }),
      new Address(arbiter).toScVal(),
      nativeToScVal(senderBps, { type: 'u32' }),
    ];
  }
}
