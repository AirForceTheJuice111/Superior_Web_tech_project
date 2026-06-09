import { ModelExplanationPanelComponent } from './model-explanation-panel.component';

describe('ModelExplanationPanelComponent (q_learning)', () => {
  let component: ModelExplanationPanelComponent;

  beforeEach(() => {
    component = new ModelExplanationPanelComponent();
    component.algorithm = 'q_learning';
    component.parameters = {
      gridSize: 5,
      gamma: 0.9,
      alpha: 0.1,
      epsilon: 0.2,
      path: [[0, 0], [1, 1], [2, 2]]
    };
  });

  it('uses the policy/value explanation label', () => {
    expect(component.modeLabel).toBe('策略与价值函数解释');
  });

  it('exposes reinforcement stat items', () => {
    const labels = component.statItems.map((item) => item.label);
    expect(labels).toContain('Grid Size');
    expect(labels).toContain('γ 折扣因子');
    expect(labels).toContain('当前贪心路径长度');
  });

  it('reports that an explanation is available', () => {
    expect(component.hasExplanation).toBeTrue();
  });
});
