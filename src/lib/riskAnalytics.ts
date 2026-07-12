import { qdrant, REVIEWER_KNOWLEDGE_COLLECTION } from "./qdrant.js";

export type RecalibrationSuggestion = {
  total_records_analyzed: number;
  total_overrides: number;
  total_rejections: number;
  frequent_overrides_by_category: Record<string, number>;
  rejections_by_jurisdiction: Record<string, number>;
  weight_recalibration_suggestions: Record<string, number>;
};

/**
 * Queries the reviewer_knowledge collection in Qdrant,
 * analyzes Senior Partner override and rejection patterns,
 * and suggests weight recalibrations for contract risk engines.
 */
export async function analyzeRiskOverrides(): Promise<RecalibrationSuggestion> {
  try {
    const result = await qdrant.scroll(REVIEWER_KNOWLEDGE_COLLECTION, {
      limit: 100,
      with_payload: true,
    });

    const points = result.points || [];
    
    const categoryOverrides: Record<string, number> = {};
    const jurisdictionRejections: Record<string, number> = {};
    let totalOverrides = 0;
    let totalRejections = 0;

    for (const point of points) {
      const payload = point.payload as any;
      if (!payload) continue;

      const category = payload.category || "unknown";
      const jurisdiction = payload.jurisdiction || "unknown";
      const status = payload.status || "approved";

      // Override represents an edit or rejection of the default position
      if (status === "edited" || status === "rejected") {
        categoryOverrides[category] = (categoryOverrides[category] || 0) + 1;
        totalOverrides++;
      }

      // Rejections represent complete clause removal or negative sign-offs
      if (status === "rejected") {
        jurisdictionRejections[jurisdiction] = (jurisdictionRejections[jurisdiction] || 0) + 1;
        totalRejections++;
      }
    }

    // Determine suggestion multipliers (e.g. raise multiplier by 1.2x - 1.5x for highly overridden categories)
    const weightRecalibration: Record<string, number> = {};
    for (const [cat, count] of Object.entries(categoryOverrides)) {
      const ratio = totalOverrides > 0 ? count / totalOverrides : 0;
      if (ratio > 0.4) {
        weightRecalibration[cat] = 1.5; // High priority recalibration
      } else if (ratio > 0.15) {
        weightRecalibration[cat] = 1.2; // Medium priority recalibration
      } else {
        weightRecalibration[cat] = 1.0; // Maintain standard weighting
      }
    }

    const historyRows = points.map(point => {
      const p = point.payload as any;
      return {
        id: point.id,
        date: new Date(p.timestamp || Date.now()).toISOString().split('T')[0],
        category: p.category || "General",
        jurisdiction: p.jurisdiction || "Unknown",
        partner: "Current User",
        action: p.status === 'rejected' ? 'Rejected' : p.status === 'edited' ? 'Edited' : 'Approved',
        risk: 'Medium', // We can derive this if needed
        note: p.partner_reasoning || p.original_clause?.substring(0, 50) + "..."
      };
    });

    return {
      total_records_analyzed: points.length,
      total_overrides: totalOverrides,
      total_rejections: totalRejections,
      frequent_overrides_by_category: categoryOverrides,
      rejections_by_jurisdiction: jurisdictionRejections,
      weight_recalibration_suggestions: weightRecalibration,
      history: historyRows,
    };
  } catch (error) {
    console.error("Failed to analyze risk overrides from Qdrant:", error);
    throw error;
  }
}
