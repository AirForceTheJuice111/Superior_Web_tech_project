export type LearningType = 'supervised' | 'unsupervised' | 'reinforcement';
export type AlgorithmCode = 'linear_regression' | 'svm' | 'kmeans' | 'pca' | 'q_learning' | 'dqn';
export type TrainingViewMode = 'classification' | 'regression' | 'clustering';

export interface ParamOption {
  label: string;
  value: string | number | boolean;
}

export interface ParamSchema {
  key: string;
  label: string;
  type: 'number' | 'select' | 'switch';
  default: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: ParamOption[];
}

export interface AlgorithmSchema {
  label: string;
  value: AlgorithmCode;
  description: string;
  params: ParamSchema[];
}

export interface DatasetOption {
  label: string;
  value: string;
  sourceType: 'builtin' | 'upload';
}

export interface ExperimentConfig {
  learningType: LearningType;
  algorithm: AlgorithmCode;
  dataset: string;
  params: Record<string, string | number | boolean>;
}

export interface ChartPoint {
  x: number;
  y: number;
  label?: string | null;
}

export interface PredictionResult {
  x: number;
  y: number;
  label?: string | null;
  predicted?: string | null;
}

export interface VisualizationData {
  points: ChartPoint[];
  boundary: ChartPoint[][];
  centers: ChartPoint[];
}

export interface TrainingStatusResponse {
  sessionId: string;
  algorithm: string;
  status: string;
  currentStep: number;
  maxSteps: number;
  progress: number;
  loss: number | null;
  metrics: Record<string, number | string | null>;
  parameters: Record<string, unknown>;
  predictions: PredictionResult[];
  visualization: VisualizationData;
  updatedAt: string | null;
}

export interface TrainingSessionResponse {
  sessionId: string;
  algorithm: string;
  status: string;
  currentStep: number;
  maxSteps: number;
  createdAt: string | null;
}
