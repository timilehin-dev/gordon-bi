export interface PlannedTask {
  id: string;
  title: string;
  description: string;
  assignedAgentId: string;
  dependencies: string[];
}

export interface PlannedTaskDag {
  goal: string;
  tasks: PlannedTask[];
}

export class GoalPlanner {
  public static planGoal(goal: string): PlannedTaskDag {
    const lowerGoal = goal.toLowerCase();

    const tasks: PlannedTask[] = [];

    // 1. Data Ingestion & Profiling Task
    tasks.push({
      id: 'task_data_ingest',
      title: 'Ingest and Profile Business Data',
      description: 'Ingest structured tables and citable documents, infer schema, and flag PII',
      assignedAgentId: 'data_engineering_agent',
      dependencies: [],
    });

    // 2. Statistical Analysis & Modeling Task
    tasks.push({
      id: 'task_analysis_modeling',
      title: 'Execute Statistical Modeling & SQL Queries',
      description: 'Query aggregates, compute measures, and extract analytical series',
      assignedAgentId: 'sql_agent',
      dependencies: ['task_data_ingest'],
    });

    // 3. Time Series Forecasting if requested
    if (lowerGoal.includes('forecast') || lowerGoal.includes('predict') || lowerGoal.includes('projection') || lowerGoal.includes('trend')) {
      tasks.push({
        id: 'task_forecasting',
        title: 'Run Predictive Multi-Model Forecast',
        description: 'Decompose time series, backtest candidate models, and output confidence intervals',
        assignedAgentId: 'forecasting_agent',
        dependencies: ['task_analysis_modeling'],
      });
    }

    // 4. Anomaly Detection if requested
    if (lowerGoal.includes('anomal') || lowerGoal.includes('outlier') || lowerGoal.includes('risk') || lowerGoal.includes('deviation')) {
      tasks.push({
        id: 'task_anomaly_scan',
        title: 'Scan for Statistical Outliers & Change Points',
        description: 'Scan series using Z-score/IQR and identify regime shifts',
        assignedAgentId: 'anomaly_detection_agent',
        dependencies: ['task_analysis_modeling'],
      });
    }

    // 5. Driver / Correlation Analysis if requested
    if (lowerGoal.includes('driver') || lowerGoal.includes('correlation') || lowerGoal.includes('attribution') || lowerGoal.includes('factor')) {
      tasks.push({
        id: 'task_driver_analysis',
        title: 'Multivariate Driver Attribution & Correlation',
        description: 'Compute feature correlation matrix and linear regression weights',
        assignedAgentId: 'trend_correlation_agent',
        dependencies: ['task_analysis_modeling'],
      });
    }

    const previousTaskIds = tasks.map(t => t.id).filter(id => id !== 'task_data_ingest');

    // 6. Insight / Narrative Synthesis Task
    tasks.push({
      id: 'task_narrative_synthesis',
      title: 'Synthesize Executive Narrative with Citations',
      description: 'Assemble multi-agent findings into an executive report with 100% lineage citations',
      assignedAgentId: 'insight_generation_agent',
      dependencies: [...previousTaskIds],
    });

    // 7. Critic / Verifier QA Pass
    tasks.push({
      id: 'task_critic_verification',
      title: 'Adversarial Lineage & Number Verification Audit',
      description: 'Audit 100% of numerical assertions in the synthesized narrative against raw Lineage Store records',
      assignedAgentId: 'critic_verifier_agent',
      dependencies: ['task_narrative_synthesis'],
    });

    return {
      goal,
      tasks,
    };
  }
}
