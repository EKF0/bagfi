import type {
  BagsPoolRow,
  BagsTokenLaunchRow,
  Json
} from '@/lib/bags/discovery-cache';
import type { TokenLaunchCreator } from '@/lib/bags/client';

export type BagsTokenRiskTier = 'low' | 'medium' | 'high' | 'blocked';

export interface BagsTokenRiskScore {
  tokenMint: string;
  isEligible: boolean;
  riskScore: number;
  riskTier: BagsTokenRiskTier;
  filters: Json;
  rejectionReasons: string[];
  warnings: string[];
  creatorWallets: string[];
  priceImpactPct: number | null;
}

interface ScoreCandidateParams {
  launch: BagsTokenLaunchRow;
  pool?: BagsPoolRow;
  creators: TokenLaunchCreator[];
  priceImpactPct: number | null;
  externalErrors?: {
    creators?: string;
    priceImpact?: string;
  };
}

const MAX_ELIGIBLE_PRICE_IMPACT_PCT = 5;
const WARN_PRICE_IMPACT_PCT = 2;
const MAX_PRIMARY_CREATOR_ROYALTY_BPS = 7500;

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function riskTierForScore(score: number, isEligible: boolean): BagsTokenRiskTier {
  if (!isEligible) return 'blocked';
  if (score >= 85) return 'low';
  if (score >= 70) return 'medium';
  return 'high';
}

function getPrimaryCreator(creators: TokenLaunchCreator[]) {
  return creators.find((creator) => creator.isCreator) ?? creators[0];
}

export function scoreBagsTokenCandidate(params: ScoreCandidateParams): BagsTokenRiskScore {
  const { launch, pool, creators, priceImpactPct, externalErrors } = params;
  const rejectionReasons: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  const isLaunched = launch.status === 'LAUNCHED';
  const hasName = hasText(launch.name);
  const hasSymbol = hasText(launch.symbol);
  const hasImage = hasText(launch.image_url);
  const hasMetadataUri = hasText(launch.metadata_uri);
  const hasSocialLink = hasText(launch.twitter_url) || hasText(launch.website_url);
  const hasPoolRow = Boolean(pool);
  const hasBondingPool = Boolean(pool?.dbc_pool_key || launch.dbc_pool_key);
  const hasMigratedPool = Boolean(pool?.damm_v2_pool_key);
  const primaryCreator = getPrimaryCreator(creators);
  const primaryCreatorWallet = primaryCreator?.wallet ?? null;
  const hasCreatorWallet = hasText(primaryCreatorWallet);
  const hasCreatorProvider = Boolean(
    primaryCreator?.provider &&
    (primaryCreator.providerUsername || primaryCreator.twitterUsername || primaryCreator.bagsUsername)
  );
  const creatorWallets = creators
    .map((creator) => creator.wallet)
    .filter((wallet): wallet is string => hasText(wallet));

  if (!isLaunched) {
    rejectionReasons.push('launch_status_not_launched');
    score -= 35;
  }

  if (!hasName || !hasSymbol) {
    rejectionReasons.push('missing_required_metadata');
    score -= 25;
  }

  if (!hasImage || !hasMetadataUri) {
    rejectionReasons.push('incomplete_token_metadata');
    score -= 20;
  }

  if (!hasSocialLink) {
    warnings.push('missing_project_social_or_website');
    score -= 5;
  }

  if (!hasPoolRow) {
    rejectionReasons.push('pool_state_missing');
    score -= 30;
  }

  if (!hasBondingPool) {
    rejectionReasons.push('bonding_pool_missing');
    score -= 20;
  }

  if (!hasMigratedPool) {
    rejectionReasons.push('migrated_liquidity_pool_missing');
    score -= 30;
  }

  if (externalErrors?.creators) {
    warnings.push('creator_lookup_failed');
    score -= 10;
  }

  if (!hasCreatorWallet) {
    rejectionReasons.push('creator_wallet_missing');
    score -= 25;
  }

  if (!hasCreatorProvider) {
    warnings.push('creator_provider_unverified');
    score -= 5;
  }

  if ((primaryCreator?.royaltyBps ?? 0) > MAX_PRIMARY_CREATOR_ROYALTY_BPS) {
    warnings.push('creator_royalty_concentration_high');
    score -= 10;
  }

  if (externalErrors?.priceImpact) {
    rejectionReasons.push('price_impact_probe_failed');
    score -= 25;
  } else if (priceImpactPct === null || Number.isNaN(priceImpactPct)) {
    rejectionReasons.push('price_impact_unavailable');
    score -= 25;
  } else if (priceImpactPct > MAX_ELIGIBLE_PRICE_IMPACT_PCT) {
    rejectionReasons.push('price_impact_too_high');
    score -= 35;
  } else if (priceImpactPct > WARN_PRICE_IMPACT_PCT) {
    warnings.push('price_impact_elevated');
    score -= 10;
  }

  const riskScore = clampScore(score);
  const isEligible = rejectionReasons.length === 0 && riskScore >= 70;

  return {
    tokenMint: launch.token_mint,
    isEligible,
    riskScore,
    riskTier: riskTierForScore(riskScore, isEligible),
    filters: {
      metadata: {
        passed: hasName && hasSymbol && hasImage && hasMetadataUri,
        hasName,
        hasSymbol,
        hasImage,
        hasMetadataUri,
        hasSocialLink
      },
      pool: {
        passed: hasPoolRow && hasBondingPool && hasMigratedPool,
        hasPoolRow,
        hasBondingPool,
        hasMigratedPool,
        dbcPoolKey: pool?.dbc_pool_key ?? launch.dbc_pool_key,
        dammV2PoolKey: pool?.damm_v2_pool_key ?? null
      },
      creator: {
        passed: hasCreatorWallet,
        creatorCount: creators.length,
        primaryCreatorWallet,
        hasCreatorProvider,
        primaryCreatorRoyaltyBps: primaryCreator?.royaltyBps ?? null
      },
      priceImpact: {
        passed: typeof priceImpactPct === 'number' && priceImpactPct <= MAX_ELIGIBLE_PRICE_IMPACT_PCT,
        priceImpactPct,
        maxEligiblePriceImpactPct: MAX_ELIGIBLE_PRICE_IMPACT_PCT,
        warningPriceImpactPct: WARN_PRICE_IMPACT_PCT
      }
    },
    rejectionReasons,
    warnings,
    creatorWallets,
    priceImpactPct
  };
}
