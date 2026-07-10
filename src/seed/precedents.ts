import type { ClausePayload } from "../lib/qdrant.js";

const JURISDICTIONS = ["New York", "California", "Delaware", "Texas", "Federal/General"];
const CATEGORIES = [
  "Indemnification",
  "Non-Compete",
  "Dispute Resolution",
  "Liability Cap",
  "Confidentiality",
  "IP Ownership"
];

function generateUUID(idx: number): string {
  return `11111111-2222-3333-4444-${idx.toString().padStart(12, "0")}`;
}

const precedentsList: ClausePayload[] = [];
let count = 0;

for (const jur of JURISDICTIONS) {
  for (const cat of CATEGORIES) {
    // Generate 3 clauses for this category and jurisdiction
    for (let i = 0; i < 3; i++) {
      count++;
      const id = generateUUID(count);
      let riskLevel: "low" | "medium" | "high" = "low";
      let standardPractice = true;
      let clauseText = "";
      let notes = "";

      if (i === 0) {
        riskLevel = "low";
        standardPractice = true;
      } else if (i === 1) {
        riskLevel = "medium";
        standardPractice = true;
      } else {
        riskLevel = "high";
        standardPractice = false;
      }

      // Templates based on category
      if (cat === "Indemnification") {
        if (riskLevel === "low") {
          clauseText = `Each party shall indemnify, defend, and hold harmless the other party from and against third-party claims arising out of its own gross negligence or willful misconduct, subject to a liability cap of 12 months' fees paid under this Agreement in ${jur}.`;
          notes = `Balanced mutual indemnification capped at 12 months fees. Standard practice under ${jur} commercial law.`;
        } else if (riskLevel === "medium") {
          clauseText = `Service Provider shall indemnify and defend Customer from and against any and all claims, damages, liabilities, costs, and expenses arising out of Service Provider's performance of services under this Agreement under the laws of ${jur}.`;
          notes = `Unilateral indemnification favoring the Customer. Standard for service agreements under ${jur} law.`;
        } else {
          clauseText = `Contractor agrees to indemnify, defend, and hold harmless the Client and its affiliates from and against any claims, losses, or damages of any kind, including patent infringement and indirect liabilities, without any liability limitation or carve-outs under the laws of ${jur}.`;
          notes = `High risk due to broad indemnification coverage and inclusion of patent infringement without caps or limit carve-outs under ${jur} law.`;
        }
      } else if (cat === "Non-Compete") {
        if (jur === "California") {
          if (riskLevel === "low") {
            clauseText = "No non-compete restrictions are active. The parties acknowledge that post-employment non-compete covenants are void and unenforceable under California Business and Professions Code Section 16600.";
            notes = "Fully standard compliance under California B&P Code § 16600, which voids non-competes.";
          } else if (riskLevel === "medium") {
            clauseText = "Employee shall not solicit Company's customers for a period of one (1) year following termination, subject to the narrow statutory exceptions under California law.";
            notes = "Non-solicitation clauses are highly scrutinized and generally unenforceable in California post-employment unless protecting trade secrets.";
          } else {
            clauseText = "Employee agrees not to engage in or work for any business that competes directly or indirectly with the Company globally for a period of two (2) years post-employment under California jurisdiction.";
            notes = "High risk and void/unenforceable under California Business and Professions Code Section 16600.";
          }
        } else {
          if (riskLevel === "low") {
            clauseText = `Employee agrees not to engage in direct competition with the Company for a period of six (6) months post-termination, restricted to direct competitors in ${jur} and scope-limited to the specific services rendered.`;
            notes = `Reasonable duration and narrow geographic scope under ${jur} law. Standard practice.`;
          } else if (riskLevel === "medium") {
            clauseText = `Employee agrees not to compete with the Company in ${jur} for a period of one (1) year following termination of employment.`;
            notes = `Standard 1-year non-compete. Generally enforceable under ${jur} common law if reasonable.`;
          } else {
            clauseText = `Employee shall not compete with the Company globally in any business category for a period of three (3) years post-termination under the laws of ${jur}.`;
            notes = `High risk due to excessive duration and global geographic scope. Likely unenforceable under ${jur} law.`;
          }
        }
      } else if (cat === "Dispute Resolution") {
        if (riskLevel === "low") {
          clauseText = `Any dispute arising from this Agreement shall first be submitted to mediation. If mediation fails, the dispute shall be settled by binding arbitration in ${jur} under the commercial arbitration rules of JAMS.`;
          notes = `Standard mediation-escalated arbitration under JAMS rules in ${jur}. Highly balanced and standard.`;
        } else if (riskLevel === "medium") {
          clauseText = `All disputes arising out of this Agreement shall be brought exclusively in the state and federal courts located in ${jur}.`;
          notes = `Standard forum selection clause for litigation in the courts of ${jur}.`;
        } else {
          clauseText = `Any disputes under this Agreement shall be resolved through non-binding arbitration in London, UK under English Law, with all costs borne solely by the initiating party, regardless of the outcome under the laws of ${jur}.`;
          notes = `Extremely high risk forum selection and cost-allocation scheme. Distant venue and cost barriers.`;
        }
      } else if (cat === "Liability Cap") {
        if (riskLevel === "low") {
          clauseText = `Except for breach of confidentiality or intellectual property infringement, neither party's liability under this Agreement shall exceed the fees paid in the twelve (12) months preceding the claim in ${jur}.`;
          notes = `Balanced cap equal to 12 months fees with standard carve-outs under ${jur} law.`;
        } else if (riskLevel === "medium") {
          clauseText = `The maximum aggregate liability of either party under this Agreement shall be limited to the total contract value under the laws of ${jur}.`;
          notes = `Standard cap equal to total contract value. Balanced and common in ${jur}.`;
        } else {
          clauseText = `Neither party shall have any limitation of liability for any breach, negligence, or indemnity claim arising under this Agreement in the jurisdiction of ${jur}.`;
          notes = `High risk due to lack of liability caps, leaving both parties exposed to unlimited damages under ${jur} law.`;
        }
      } else if (cat === "Confidentiality") {
        if (riskLevel === "low") {
          clauseText = `Each party shall protect the other party's Confidential Information using at least a reasonable standard of care, with the confidentiality obligation surviving for three (3) years post-termination under the laws of ${jur}.`;
          notes = `Standard mutual confidentiality clause with a reasonable survival period. Common in ${jur}.`;
        } else if (riskLevel === "medium") {
          clauseText = `Receiving Party shall keep disclosing party's information strictly confidential. Confidentiality obligations shall survive termination for five (5) years under ${jur} regulations.`;
          notes = `Standard 5-year confidentiality obligation. Very common.`;
        } else {
          clauseText = `Receiving Party shall keep all Disclosing Party information confidential in perpetuity, with no exceptions for public domain or independent development, governed under the laws of ${jur}.`;
          notes = `High risk due to perpetual duration and lack of standard exclusions (public domain, independent discovery) under ${jur} law.`;
        }
      } else if (cat === "IP Ownership") {
        if (riskLevel === "low") {
          clauseText = `Each party retains its pre-existing intellectual property. All deliverables created specifically for the Customer shall become the sole property of the Customer upon payment, under the laws of ${jur}.`;
          notes = `Standard ownership of deliverables with pre-existing IP protection. Highly standard under ${jur} rules.`;
        } else if (riskLevel === "medium") {
          clauseText = `Developer retains all ownership rights in the Software and deliverables, granting Customer a non-exclusive, perpetual, worldwide license to use the deliverables, under ${jur} laws.`;
          notes = `Standard IP retention by developer with a broad customer license. Common under ${jur}.`;
        } else {
          clauseText = `Developer assigns all intellectual property rights in the Software, deliverables, and all background technology to the Customer without further compensation, governed under the laws of ${jur}.`;
          notes = `High risk as the developer transfers all background IP and core technology rights to the customer under ${jur} law.`;
        }
      }

      precedentsList.push({
        id,
        jurisdiction: jur,
        category: cat,
        clauseText,
        riskLevel,
        standardPractice,
        notes,
      });
    }
  }
}

export const PRECEDENTS = precedentsList;
