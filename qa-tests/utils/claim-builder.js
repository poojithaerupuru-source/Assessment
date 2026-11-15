/**
 * Builds claim data that passes the backend rules in Claim.java:
 * date not in the future, location 5-200 chars, description 10-1000 chars,
 * amount > 0 and <= 1,000,000.
 */
export const CLAIM_RULES = Object.freeze({
  MAX_AMOUNT: 1_000_000,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_LOCATION_LENGTH: 5,
  MAX_LOCATION_LENGTH: 200,
});

const DAYS_BEFORE_TODAY = 1;

function isoDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10); // yyyy-mm-dd, the format <input type="date"> expects
}

/** Unique per run so a test can find its own claim in a shared list. */
function uniqueTag() {
  return `QA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function buildValidClaim(overrides = {}) {
  const tag = uniqueTag();
  return {
    tag,
    incidentDate: isoDateDaysAgo(DAYS_BEFORE_TODAY),
    incidentLocation: '123 Main Street, Springfield',
    // Tag goes first: the claims table truncates long descriptions.
    description: `${tag} rear-end collision at a traffic light.`,
    claimAmount: '5000.00',
    ...overrides,
  };
}
