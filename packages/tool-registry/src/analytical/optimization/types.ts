export type OptimizationGoal = 'maximize' | 'minimize';

export interface LinearConstraint {
  coefficients: number[];
  operator: '<=' | '>=' | '==';
  rhs: number;
  name?: string;
}

export interface SimplexSolverParams {
  objectiveCoefficients: number[];
  goal: OptimizationGoal;
  constraints: LinearConstraint[];
  variableNames?: string[];
}

export interface SimplexSolverResult {
  optimalValue: number;
  solution: Record<string, number>;
  status: 'optimal' | 'infeasible' | 'unbounded';
  iterations: number;
  slackVariables: Record<string, number>;
}

export interface GoalSeekParams {
  targetValue: number;
  initialGuess?: number;
  lowerBound?: number;
  upperBound?: number;
  maxIterations?: number;
  tolerance?: number;
  evalExpression: string; // JavaScript formula expression using variable 'x' e.g. "x * 150 - 2000"
}

export interface GoalSeekResult {
  solvedInput: number;
  achievedValue: number;
  targetValue: number;
  iterations: number;
  isConverged: boolean;
  delta: number;
}

export interface PriceElasticityParams {
  priceHistory: number[];
  quantityHistory: number[];
  unitMarginalCost?: number;
}

export interface PriceElasticityResult {
  elasticity: number; // e.g. -1.45
  isElastic: boolean; // |e| > 1
  demandConstant: number;
  rSquared: number;
  currentAveragePrice: number;
  currentAverageRevenue: number;
  optimalPrice?: number;
  expectedOptimalRevenue?: number;
  interpretation: string;
}
