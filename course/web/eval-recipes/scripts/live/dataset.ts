/**
 * Evaluation dataset — the deals we run the proposal-pricing agent against.
 * Each item gives the agent an already-eligible bundle (as if presales-solution-advisor
 * had produced it) and asks for its structured INDICATIVE quote per its output contract.
 *
 * Add/curate deals here — this is your "golden set" for the schema-conformance gate.
 */
export type DealInput = {
  id: string;
  deal_id: string;
  /** Self-contained instruction sent to the agent. We ask for ONLY the contract JSON. */
  prompt: string;
};

const ONLY_JSON =
  "Respond with ONLY the JSON object from your Output contract (deal_id, quotes[], proposal_md, " +
  "schema_valid, confidence, unpriceable). No prose, no code fences.";

export const DATASET: DealInput[] = [
  {
    id: "halberd-tf-cm",
    deal_id: "D-HALBERD-001",
    prompt:
      `Use the proposal-pricing agent. Deal D-HALBERD-001, client "Halberd Logistics Ltd". ` +
      `Eligible bundle from presales-solution-advisor: ` +
      `[{"product":"import_lc","eligible":true},{"product":"cash_management","eligible":true}]. ` +
      `RM request: 180-day import LC for USD 2,000,000 plus a cash-management overlay. ` +
      ONLY_JSON,
  },
  {
    id: "apex-revolver",
    deal_id: "D-APEX-204",
    prompt:
      `Use the proposal-pricing agent. Deal D-APEX-204, client "Northwind Freight". ` +
      `Eligible bundle: [{"product":"revolver","eligible":true}]. ` +
      `RM request: a 12-month USD 5,000,000 revolving credit facility, risk grade BBB. ` +
      ONLY_JSON,
  },
  {
    id: "meridian-fx",
    deal_id: "D-MERID-377",
    prompt:
      `Use the proposal-pricing agent. Deal D-MERID-377, client "Halberd Logistics Ltd". ` +
      `Eligible bundle: [{"product":"fx_forward","eligible":true}]. ` +
      `RM request: a 90-day EUR/USD forward to hedge EUR 1,500,000 of payables. ` +
      ONLY_JSON,
  },
];
