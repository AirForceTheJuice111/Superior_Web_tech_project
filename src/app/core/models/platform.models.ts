export type LearningType = 'supervised' | 'unsupervised' | 'reinforcement';
export type TrainingViewMode = 'classification' | 'regression' | 'clustering';
export type ParamValue = string | number | boolean;
export type ParamInputType = 'number' | 'select' | 'boolean' | 'switch';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface ParamOption {
  label: string;
  value: ParamValue;
}

export interface ParamSchema {
  key: string;
  label?: string;
  type: ParamInputType;
  defaultValue: ParamValue;
  min?: number;
  max?: number;
  step?: number;
  options?: ParamOption[];
}

export interface AlgorithmMeta {
  code: string;
  name: string;
  category: string;
  learningType: string;
  description: string;
  paramsSchema: ParamSchema[];
}

export interface DatasetMeta {
  id: number;
  code: string;
  name: string;
  description: string;
  taskType: string;
  sourceType: string;
  featureCount: number;
  sampleCount: number;
  labelColumn: string | null;
}

export interface ExperimentConfig {
  learningType: LearningType;
  algorithm: string;
  dataset: string;
  params: Record<string, ParamValue>;
}

export interface UserProfile {
  userId: number;
  username: string;
  displayName: string;
  role: string;
  token: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SaveExperimentRequest {
  userId: number;
  name: string;
  learningType: string;
  algorithmCode: string;
  datasetCode: string;
  latestSessionId?: string;
  config: Record<string, unknown>;
}

export interface ExperimentRecord {
  id: number;
  userId: number;
  name: string;
  learningType: string;
  algorithmCode: string;
  datasetCode: string;
  latestSessionId: string | null;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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

export interface TrainingSessionSummary {
  sessionId: string;
  status: string;
  currentStep: number;
}
