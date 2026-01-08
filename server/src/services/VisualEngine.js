class VisualEngine {
    generateChart(candidate) {
        const { context, text } = candidate;
        // Simple rule engine
        if (context === 'financial_growth') {
            return {
                type: 'line',
                title: 'Sales Growth',
                description: 'projected growth over Q1-Q4',
                data: {
                    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                    datasets: [{
                        label: 'Sales ($)',
                        data: [12000, 19000, 3000, 5000],
                        borderColor: '#4ade80'
                    }]
                }
            };
        }

        if (context === 'budget_split') {
            return {
                type: 'pie',
                title: 'Budget Allocation',
                description: 'Marketing vs Dev vs Ops',
                data: {
                    labels: ['Marketing', 'Dev', 'Ops'],
                    datasets: [{
                        data: [30, 50, 20],
                        backgroundColor: ['#f87171', '#60a5fa', '#fbbf24']
                    }]
                }
            };
        }

        // Default generic
        return {
            type: 'generic',
            title: 'Visual Representation',
            description: text,
            data: {}
        };
    }
}

module.exports = new VisualEngine();
