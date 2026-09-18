import { CustomerProfile, SegmentRule, PushMessageLog } from '../types';
import { DataLakeService } from './dataLakeService';

export interface SegmentEvaluationResult {
  rule: SegmentRule;
  matchedCustomers: CustomerProfile[];
  audienceSize: number;
  lineReachableCount: number;
  unmappedCount: number;
  estimatedAovThb: number;
  totalPotentialRevenueThb: number;
  estimatedLineBroadcastCostThb: number;
  sprayAndPrayCostComparisonThb: number; // Cost if blasted to full list
  costSavingsThb: number;
}

export function evaluateSegmentRule(rule: SegmentRule, allCustomers: CustomerProfile[]): SegmentEvaluationResult {
  const matchedCustomers = allCustomers.filter(customer => {
    // 1. Unmapped LINE filter
    if (rule.onlyUnmappedLine) {
      return !customer.lineUid;
    }

    // 2. Category affinity filter
    if (rule.targetCategory) {
      const hasCategory = customer.topCategories.includes(rule.targetCategory) ||
        customer.transactions.some(t => t.items.some(i => i.category === rule.targetCategory));
      if (!hasCategory) return false;
    }

    // 3. Inactivity threshold filter
    if (rule.minInactivityDays !== undefined) {
      if (customer.daysSinceLastPurchase < rule.minInactivityDays) return false;
    }
    if (rule.maxInactivityDays !== undefined) {
      if (customer.daysSinceLastPurchase > rule.maxInactivityDays) return false;
    }

    // 4. Spend filter
    if (rule.minSpend !== undefined) {
      if (customer.aov < rule.minSpend && customer.totalSpendLtv < rule.minSpend) return false;
    }

    // 5. Tier filter
    if (rule.tier && rule.tier.length > 0) {
      if (!rule.tier.includes(customer.tier)) return false;
    }

    // 6. Branch filter
    if (rule.branch && rule.branch !== 'All Branches (National)') {
      if (customer.preferredBranch !== rule.branch) return false;
    }

    return true;
  });

  const audienceSize = matchedCustomers.length;
  const lineReachableCount = matchedCustomers.filter(c => Boolean(c.lineUid && c.isLineFriend)).length;
  const unmappedCount = matchedCustomers.filter(c => !c.lineUid).length;
  
  const estimatedAovThb = audienceSize > 0 
    ? Math.round(matchedCustomers.reduce((sum, c) => sum + c.aov, 0) / audienceSize)
    : 1100;

  const totalPotentialRevenueThb = audienceSize * estimatedAovThb;

  // LINE Thailand Messaging API cost economics:
  // Base tier ~ 0.05 THB per push message
  const unitPushCostThb = 0.05;
  const estimatedLineBroadcastCostThb = Math.max(1, Math.round(lineReachableCount * unitPushCostThb * 100) / 100);
  
  // Baseline if unsegmented full base (assuming typical 25,000 grocery LINE followers base)
  const simulatedTotalFollowers = Math.max(allCustomers.length * 1500, 25000);
  const sprayAndPrayCostComparisonThb = Math.round(simulatedTotalFollowers * unitPushCostThb);
  const costSavingsThb = sprayAndPrayCostComparisonThb - estimatedLineBroadcastCostThb;

  return {
    rule,
    matchedCustomers,
    audienceSize,
    lineReachableCount,
    unmappedCount,
    estimatedAovThb,
    totalPotentialRevenueThb,
    estimatedLineBroadcastCostThb,
    sprayAndPrayCostComparisonThb,
    costSavingsThb,
  };
}

export function executeCampaignTrigger(
  rule: SegmentRule, 
  targetCustomer: CustomerProfile,
  onSent?: (log: PushMessageLog) => void
): PushMessageLog {
  const lineUid = targetCustomer.lineUid || 'U_SIMULATED_TEST_RECEIVER';
  const firstName = targetCustomer.fullName.split(' ')[0];

  const log: PushMessageLog = {
    id: `PUSH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    customerLineUid: lineUid,
    customerName: targetCustomer.fullName,
    crmId: targetCustomer.crmCustomerId,
    campaignTitle: rule.pushTemplate.titleTh,
    messageType: 'FLEX_MESSAGE',
    status: 'DELIVERED',
    payload: {
      titleEn: rule.pushTemplate.titleEn.replace('{{customer_name}}', firstName),
      titleTh: rule.pushTemplate.titleTh.replace('{{customer_name}}', firstName),
      bodyEn: rule.pushTemplate.bodyEn,
      bodyTh: rule.pushTemplate.bodyTh,
      promoCode: rule.pushTemplate.promoCode,
      discountValue: rule.pushTemplate.discountValue,
      ctaText: rule.pushTemplate.ctaText,
      flexColor: rule.pushTemplate.flexColor,
      branch: targetCustomer.preferredBranch,
      tier: targetCustomer.tier,
    }
  };

  DataLakeService.addPushLog(log);
  if (onSent) onSent(log);
  return log;
}
