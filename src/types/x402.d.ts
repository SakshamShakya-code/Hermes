declare module "x402/client" {
  export function createPaymentHeader(
    client: unknown,
    paymentDetails: unknown
  ): Promise<string>;
}

declare module "x402/shared/evm/wallet" {
  export function createSignerSepolia(privateKey: string): unknown;
}

declare module "x402/schemes/exact/evm/utils/paymentUtils" {
  export function encodePayment(payment: unknown): string;
}
