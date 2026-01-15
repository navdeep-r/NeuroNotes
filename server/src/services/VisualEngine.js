/**
 * VisualEngine - Transforms Grok-refined visualization specs into chart configs
 * 
 * STRICT PIPELINE: Only accepts validated Grok output with complete data
 * No fallbacks to mock/placeholder data
 */
class VisualEngine {
    /**
     * Generate chart configuration from Grok-refined candidate
     * @param {Object} candidate - Must have type, title, description, data.labels, data.values
     * @returns {Object|null} Chart configuration or null if invalid
     */
    generateChart(candidate) {
        // Validate required fields from Grok
        if (!this.validateCandidate(candidate)) {
            console.warn('[VisualEngine] Invalid candidate - missing required fields');
            return null;
        }

        const { type, title, description, insight, data, animation, confidence } = candidate;

        return {
            type: type || 'bar',
            title: title,
            description: description,
            insight: insight || null,
            animation: animation || 'grow',
            confidence: confidence || 0.8,
            data: {
                labels: data.labels,
                values: data.values,
                units: data.units || null
            }
        };
    }

    /**
     * Validate that candidate has all required fields from Grok refinement
     */
    validateCandidate(candidate) {
        if (!candidate) return false;
        if (!candidate.type) return false;
        if (!candidate.title) return false;
        if (!candidate.data) return false;
        if (!Array.isArray(candidate.data.labels) || candidate.data.labels.length < 2) return false;
        if (!Array.isArray(candidate.data.values) || candidate.data.values.length < 2) return false;
        if (candidate.data.labels.length !== candidate.data.values.length) return false;

        // All values must be valid numbers
        const allNumbers = candidate.data.values.every(v => typeof v === 'number' && !isNaN(v));
        if (!allNumbers) return false;

        return true;
    }
}

module.exports = new VisualEngine();
