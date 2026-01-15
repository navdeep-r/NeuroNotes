/**
 * VisualEngine - Generates chart configurations from visualization candidates
 * 
 * Now supports both:
 * 1. Pre-built data from LLM analysis (has data.labels and data.values)
 * 2. Context-based generation for legacy flow (only has context string)
 */
class VisualEngine {
    generateChart(candidate) {
        const { context, text, type, data } = candidate;

        // If candidate already has full data structure, use it
        if (data && data.labels && data.values) {
            return {
                type: type || 'bar',
                title: candidate.title || text || 'Meeting Insight',
                description: candidate.description || text,
                data: {
                    labels: data.labels,
                    values: data.values
                }
            };
        }

        // Legacy context-based generation
        if (context === 'financial_growth' || context === 'growth') {
            return {
                type: 'line',
                title: 'Growth Trend',
                description: text || 'Projected growth over time',
                data: {
                    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                    values: [12000, 19000, 25000, 35000]
                }
            };
        }

        if (context === 'budget_split' || context === 'budget') {
            return {
                type: 'pie',
                title: 'Budget Allocation',
                description: text || 'Budget distribution breakdown',
                data: {
                    labels: ['Marketing', 'Development', 'Operations'],
                    values: [30, 50, 20]
                }
            };
        }

        if (context === 'performance_metrics' || context === 'comparison') {
            return {
                type: 'bar',
                title: 'Performance Comparison',
                description: text || 'Comparative analysis',
                data: {
                    labels: ['Option A', 'Option B', 'Option C'],
                    values: [75, 90, 60]
                }
            };
        }

        if (context === 'timeline' || context === 'summary') {
            return {
                type: 'timeline',
                title: 'Timeline',
                description: text || 'Key milestones',
                data: {
                    labels: ['Phase 1', 'Phase 2', 'Phase 3'],
                    values: [100, 80, 60]
                }
            };
        }

        // Default: bar chart with placeholder data
        return {
            type: type || 'bar',
            title: text || 'Visual Insight',
            description: 'Generated from meeting discussion',
            data: {
                labels: ['Item 1', 'Item 2', 'Item 3'],
                values: [50, 75, 60]
            }
        };
    }
}

module.exports = new VisualEngine();

