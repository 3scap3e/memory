import type { CustomerCounts } from "./closing-rules";
// Fixed query against the existing shared purchase tables. No user input is SQL.
export const CUSTOMER_PAYMENTS_SQL = `
  SELECT DISTINCT c."requesterId" AS customer, s.product AS product
  FROM "StageCheckout" c JOIN "StageSubmission" s ON s.id = c."submissionId"
  WHERE upper(c.status) = 'PAID' AND c."amountCents" > 0
    AND (c."providerPaymentId" IS NOT NULL OR c."transactionHash" IS NOT NULL)
    AND s.product IN ('PARLEY', 'RUN', 'DEV')`;
export function countCustomers(rows: { customer: string; product: string }[]): CustomerCounts {
  const count = (product?: string) => new Set(rows.filter(row => !product || row.product === product).map(row => row.customer)).size;
  return { combined: count(), parley: count("PARLEY"), run: count("RUN"), dev: count("DEV") };
}
