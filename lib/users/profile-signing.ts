export const USER_PROFILE_ACTIONS = ['update-public-leaderboard'] as const;

export type UserProfileAction = typeof USER_PROFILE_ACTIONS[number];

export interface UserProfileAuthorization {
  message: string;
  signature: string;
}

export function getUserProfileSigningMessage(params: {
  walletAddress: string;
  action: UserProfileAction;
  isPublicLeaderboard: boolean;
}) {
  return [
    'BagFi User Profile',
    `Wallet: ${params.walletAddress}`,
    `Action: ${params.action}`,
    `Public leaderboard: ${params.isPublicLeaderboard ? 'true' : 'false'}`
  ].join('\n');
}
