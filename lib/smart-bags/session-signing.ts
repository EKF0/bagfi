import type { SmartBagDepositSession } from '@/lib/smart-bags/session-engine';

export interface SmartBagSessionAuthorization {
  message: string;
  signature: string;
}

export function getSmartBagSessionSigningMessage(session: SmartBagDepositSession) {
  return [
    'BagFi Smart Bag Session',
    `Wallet: ${session.walletAddress}`,
    `Session: ${session.id}`,
    `Type: ${session.type}`,
    `Bag: ${session.bagId}`,
    `Input token: ${session.inputToken.mint}`,
    `Input amount: ${session.inputAmountBaseUnits}`,
    `Created at: ${session.createdAt}`
  ].join('\n');
}
