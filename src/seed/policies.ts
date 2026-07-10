import type { PolicyPayload } from "../lib/qdrant.js";

export const POLICIES: PolicyPayload[] = [
  // ---------- Indemnification ----------
  {
    id: "policy-indem-ny",
    jurisdiction: "New York",
    category: "Indemnification",
    policyText: "Our firm standard is mutual indemnification for third-party claims arising from gross negligence or willful misconduct, capped at 12 months fees.",
    approvedLanguage: "Each party shall indemnify, defend, and hold harmless the other party from and against third-party claims arising out of its own gross negligence or willful misconduct, capped at 12 months' fees.",
    riskRules: "Do not accept uncapped indemnification for general breach of contract. Patent infringement indemnification should have a clear defense control clause.",
    notes: "New York law enforces mutual indemnification caps in commercial contracts."
  },
  {
    id: "policy-indem-ca",
    jurisdiction: "California",
    category: "Indemnification",
    policyText: "Indemnification obligations must be bilateral. Any unilateral obligation on the contractor must be rejected.",
    approvedLanguage: "The parties agree to mutually indemnify each other for direct liabilities resulting from their respective negligent acts or omissions.",
    riskRules: "California courts strictly construe indemnification clauses. Never agree to indemnify Client for Client's own active negligence.",
    notes: "Aligns with California Civil Code Section 2778 principles."
  },
  {
    id: "policy-indem-de",
    jurisdiction: "Delaware",
    category: "Indemnification",
    policyText: "Corporate officers and entities require broad indemnification coverage, but commercial contracts should maintain capped mutual indemnity.",
    approvedLanguage: "To the maximum extent permitted by Delaware law, the parties shall mutually indemnify each other for direct breach damages, subject to the overall liability cap.",
    riskRules: "Ensure Delaware choice of law matches the corporate registration. Exclude consequential damages from the indemnity scope.",
    notes: "Standard Delaware corporate and commercial practice."
  },
  {
    id: "policy-indem-tx",
    jurisdiction: "Texas",
    category: "Indemnification",
    policyText: "Texas requires indemnification clauses to be conspicuous and meet the express negligence doctrine.",
    approvedLanguage: "THE PARTIES AGREE TO MUTUALLY INDEMNIFY EACH OTHER FOR NEGLIGENCE, AND BOTH PARTIES ACKNOWLEDGE THIS CLAUSE IS CONSPICUOUS.",
    riskRules: "Unilateral indemnification is highly risky in Texas oil/gas and construction sectors due to statutory anti-indemnity acts.",
    notes: "Must satisfy the Texas Fair Notice requirements (express negligence doctrine + conspicuousness)."
  },
  {
    id: "policy-indem-fed",
    jurisdiction: "Federal/General",
    category: "Indemnification",
    policyText: "Federal contracts require compliance with Anti-Deficiency Act provisions; government entities cannot provide open-ended indemnification.",
    approvedLanguage: "The Contractor shall indemnify the Government only to the extent authorized by Federal procurement regulations and statutory limits.",
    riskRules: "Never include open-ended indemnification in contracts involving federal entities or public funding.",
    notes: "Derived from Federal Acquisition Regulations (FAR)."
  },

  // ---------- Liability Cap ----------
  {
    id: "policy-cap-ny",
    jurisdiction: "New York",
    category: "Liability Cap",
    policyText: "Liability must be capped at 1x the fees paid in the previous 12 months, with narrow exclusions for IP and confidentiality breaches.",
    approvedLanguage: "Except for breaches of Section 6 (Confidentiality) or Section 8 (IP Ownership), neither party's total liability shall exceed the fees paid in the 12 months preceding the claim.",
    riskRules: "Reject unlimited liability demands. If client insists on higher cap, negotiate a 2x super-cap for IP/confidentiality.",
    notes: "Highly standard NY commercial negotiation position."
  },
  {
    id: "policy-cap-ca",
    jurisdiction: "California",
    category: "Liability Cap",
    policyText: "Caps on liability must be conspicuous and cannot exempt willful misconduct or fraud.",
    approvedLanguage: "In no event shall either party's aggregate liability exceed the total contract value, except where prohibited by California public policy.",
    riskRules: "Under California Civil Code Section 1668, clauses exempting a party from fraud or willful injury are void. Ensure exclusions are written clearly.",
    notes: "Designed to comply with California Civil Code Section 1668."
  },
  {
    id: "policy-cap-de",
    jurisdiction: "Delaware",
    category: "Liability Cap",
    policyText: "Delaware enforces highly sophisticated limitation of liability clauses between commercial parties.",
    approvedLanguage: "The aggregate liability of the Supplier under this agreement shall be limited to the total fees paid under the contract.",
    riskRules: "Ensure the waiver of consequential damages is reciprocal and covers lost profits and business interruption.",
    notes: "Delaware courts respect freedom of contract between corporate entities."
  },
  {
    id: "policy-cap-tx",
    jurisdiction: "Texas",
    category: "Liability Cap",
    policyText: "Texas enforces limitation of liability caps but requires reciprocal exclusions for gross negligence.",
    approvedLanguage: "The total liability of either party shall not exceed the amounts paid under this Agreement, except in cases of gross negligence or willful misconduct.",
    riskRules: "Texas public policy voids liability limitations for gross negligence. Always add gross negligence as a carve-out.",
    notes: "Texas common law voids pre-injury waivers of gross negligence."
  },
  {
    id: "policy-cap-fed",
    jurisdiction: "Federal/General",
    category: "Liability Cap",
    policyText: "Standard liability cap in commercial federal contracts is equal to the total contract value.",
    approvedLanguage: "The Contractor's liability for damages under this contract shall be capped at the total price of the deliverables specified herein.",
    riskRules: "Avoid unlimited liability provisions. Federal entities generally accept standard commercial limitation terms.",
    notes: "Aligned with GSA schedule contracting guidelines."
  },

  // ---------- IP Ownership ----------
  {
    id: "policy-ip-ny",
    jurisdiction: "New York",
    category: "IP Ownership",
    policyText: "Client owns customer deliverables; developer retains pre-existing tools and background technology.",
    approvedLanguage: "Customer owns all intellectual property in the custom deliverables. Developer retains all background IP and pre-existing templates.",
    riskRules: "Do not assign core background technology or code libraries. Grant the customer a non-exclusive license to background IP embedded in deliverables.",
    notes: "NY standard work-for-hire and assignment hybrid model."
  },
  {
    id: "policy-ip-ca",
    jurisdiction: "California",
    category: "IP Ownership",
    policyText: "Employees and contractors retain rights to inventions developed on their own time without client resources.",
    approvedLanguage: "Subject to California Labor Code Section 2870, Contractor assigns deliverables to Client, excluding inventions developed entirely on Contractor's own time.",
    riskRules: "Contracts must explicitly reference California Labor Code Section 2870 to avoid ownership challenges.",
    notes: "Statutory mandatory notice required in California employment/contractor assignments."
  },
  {
    id: "policy-ip-de",
    jurisdiction: "Delaware",
    category: "IP Ownership",
    policyText: "Clean and complete IP assignment is required for all corporate deliverables.",
    approvedLanguage: "Developer hereby assigns all right, title, and interest in and to the custom deliverables, including all patent and copyrights therein, to the Company.",
    riskRules: "Ensure developer represents they have signed invention assignment agreements with all underlying contributors.",
    notes: "Critical for VC-backed startup due diligence under Delaware law."
  },
  {
    id: "policy-ip-tx",
    jurisdiction: "Texas",
    category: "IP Ownership",
    policyText: "Reciprocal licensing of background IP and transfer of deliverables to Client upon full payment.",
    approvedLanguage: "All custom deliverables transfer to Client upon receipt of final payment. Background technology remains the property of the respective creator.",
    riskRules: "Verify that the assignment is conditioned upon full payment to prevent Client from using unpaid deliverables.",
    notes: "Texas standard fee-for-service IP transfer clause."
  },
  {
    id: "policy-ip-fed",
    jurisdiction: "Federal/General",
    category: "IP Ownership",
    policyText: "Federal government acquires 'Unlimited Rights' or 'Limited Rights' in technical data depending on funding source.",
    approvedLanguage: "The Government shall acquire rights in technical data and computer software as specified in the applicable DFARS or FAR clauses.",
    riskRules: "Clearly mark proprietary software developed at private expense to prevent government from claiming unlimited rights.",
    notes: "Derived from FAR 52.227-14 (Rights in Data - General)."
  },

  // ---------- Non-Compete ----------
  {
    id: "policy-compete-ny",
    jurisdiction: "New York",
    category: "Non-Compete",
    policyText: "Non-compete clauses must protect a legitimate business interest, be reasonable in duration (6-12 months), and narrow in geography.",
    approvedLanguage: "Employee agrees not to compete with the Company for a period of 6 months post-employment, restricted to NYC and direct competitors.",
    riskRules: "Do not exceed 1 year. Never restrict employment in unrelated sectors or enforce a global ban without a client-relationship justification.",
    notes: "New York courts apply the tripartite reasonableness test to non-competes."
  },
  {
    id: "policy-compete-ca",
    jurisdiction: "California",
    category: "Non-Compete",
    policyText: "Post-employment non-compete clauses are completely void and illegal. Never include them.",
    approvedLanguage: "The parties acknowledge that no post-employment non-compete covenants are included in this agreement, in accordance with California law.",
    riskRules: "Any non-compete clause in California is void under B&P Section 16600 and can expose the firm to tort liability for unfair competition.",
    notes: "Enforced strictly by California courts."
  },
  {
    id: "policy-compete-de",
    jurisdiction: "Delaware",
    category: "Non-Compete",
    policyText: "Delaware enforces non-compete covenants if they protect goodwill, are reasonable in scope, and are ancillary to a business transaction or employment.",
    approvedLanguage: "Employee shall not engage in competitive business activities for a period of twelve (12) months following termination of employment.",
    riskRules: "Ensure the non-compete is supported by valid consideration (e.g. employment offer or stock options).",
    notes: "Delaware courts will review and occasionally blue-pencil overbroad non-competes."
  },
  {
    id: "policy-compete-tx",
    jurisdiction: "Texas",
    category: "Non-Compete",
    policyText: "Non-competes are enforceable in Texas if ancillary to an otherwise enforceable agreement and reasonable in time, scope, and geography.",
    approvedLanguage: "Employee shall not compete within 25 miles of the Company's offices for a period of 12 months following termination.",
    riskRules: "Texas requires the covenant to be ancillary to an agreement (e.g. sharing of trade secrets). Ensure trade secret disclosure is active in the contract.",
    notes: "Complies with the Texas Covenants Not to Compete Act."
  },
  {
    id: "policy-compete-fed",
    jurisdiction: "Federal/General",
    category: "Non-Compete",
    policyText: "Federal agencies and the FTC are increasingly banning or restricting non-compete agreements for general workers.",
    approvedLanguage: "Any non-compete restriction shall be subject to applicable federal regulations and FTC trade rules.",
    riskRules: "Monitor FTC non-compete ban rulings. Advise clients to utilize strong confidentiality and non-solicitation clauses instead.",
    notes: "Aligned with recent Federal Trade Commission regulatory shifts."
  }
];
