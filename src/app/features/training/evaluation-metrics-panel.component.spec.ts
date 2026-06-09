import { EvaluationMetricsPanelComponent } from './evaluation-metrics-panel.component';

describe('EvaluationMetricsPanelComponent (q_learning)', () => {
  let component: EvaluationMetricsPanelComponent;

  beforeEach(() => {
    component = new EvaluationMetricsPanelComponent();
    component.algorithm = 'q_learning';
    component.metrics = { avgReward: 5.2, successRate: 0.8, stepsToGoal: 7, epsilon: 0.05 };
  });

  it('uses the reinforcement mode label', () => {
    expect(component.modeLabel).toBe('强化学习评估');
  });

  it('builds reinforcement metric items', () => {
    const items = component.metricItems;
    const labels = items.map((item) => item.label);
    expect(labels).toContain('Avg Reward');
    expect(labels).toContain('Success Rate');
    expect(labels).toContain('Steps to Goal');
    expect(labels).toContain('Exploration ε');
  });

  it('formats success rate as a percentage', () => {
    const successRate = component.metricItems.find((item) => item.label === 'Success Rate');
    expect(successRate?.value).toBe('80.0%');
  });

  it('falls back to classification mode for svm', () => {
    component.algorithm = 'svm';
    component.metrics = { accuracy: 0.9 };
    expect(component.modeLabel).toBe('分类评估');
  });
});
