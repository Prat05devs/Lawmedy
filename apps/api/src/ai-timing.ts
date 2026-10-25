// Leave time for private-file reads and database commits before a recovery
// worker may reclaim a crashed attempt. Each provider chain has one total budget.
export const AI_PROVIDER_BUDGET_MS = 120_000;
export const AI_LEASE_MS = 5 * 60_000;
