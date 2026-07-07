<<<<<<< HEAD
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
=======
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
>>>>>>> 28a8b0b697ebbef247abb29cbf55dfa53756f6a8
