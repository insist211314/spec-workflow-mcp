/**
 * Parallel Analysis Display Component
 * Shows task dependency analysis and parallel execution suggestions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface ParallelAnalysisProps {
  projectPath: string;
  specName: string;
  ws: WebSocket | null;
}

interface AnalysisData {
  tasks: any[];
  groups: any[];
  stats: {
    totalTasks: number;
    independentTasks: number;
    maxParallelism: number;
    circularDependencies: number;
    conflicts: number;
  };
  warnings: string[];
}

interface VisualizationData {
  nodes: any[];
  edges: any[];
  groups: any[];
}

export const ParallelAnalysis: React.FC<ParallelAnalysisProps> = ({
  projectPath,
  specName,
  ws
}) => {
  const { t } = useTranslation();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [visualizationData, setVisualizationData] = useState<VisualizationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'list' | 'groups'>('groups');

  // Request analysis when component mounts
  useEffect(() => {
    if (ws && projectPath && specName) {
      requestAnalysis();
    }
  }, [ws, projectPath, specName]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'parallelAnalysis':
            handleAnalysisUpdate(message.analysis);
            break;

          case 'visualizationData':
            setVisualizationData(message.data);
            break;

          case 'analysisProgress':
            setProgress(message.progress);
            setProgressMessage(message.message);
            if (message.progress === 100) {
              setLoading(false);
            }
            break;

          case 'analysisWarnings':
            handleWarnings(message.warnings);
            break;

          case 'groupingUpdate':
            handleGroupingUpdate(message.groups);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws]);

  const requestAnalysis = useCallback(() => {
    if (!ws) return;

    setLoading(true);
    setProgress(0);
    setProgressMessage('Starting analysis...');

    ws.send(JSON.stringify({
      type: 'analyzeParallel',
      data: {
        projectPath,
        specName
      }
    }));
  }, [ws, projectPath, specName]);

  const handleAnalysisUpdate = (analysis: any) => {
    setAnalysisData({
      tasks: analysis.taskGraph ? Array.from(analysis.taskGraph.values()) : [],
      groups: analysis.parallelGroups || [],
      stats: {
        totalTasks: analysis.metadata?.totalTasks || 0,
        independentTasks: analysis.metadata?.independentTasks || 0,
        maxParallelism: analysis.metadata?.maxParallelism || 0,
        circularDependencies: analysis.circularDependencies?.length || 0,
        conflicts: analysis.potentialConflicts?.length || 0
      },
      warnings: []
    });
  };

  const handleWarnings = (warnings: string[]) => {
    setAnalysisData(prev => prev ? { ...prev, warnings } : null);
  };

  const handleGroupingUpdate = (groups: any[]) => {
    setAnalysisData(prev => prev ? { ...prev, groups } : null);
  };

  const renderStats = () => {
    if (!analysisData) return null;

    const { stats } = analysisData;

    return (
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalTasks}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.independentTasks}</div>
          <div className="stat-label">Independent</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.maxParallelism}</div>
          <div className="stat-label">Max Parallel</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{stats.circularDependencies}</div>
          <div className="stat-label">Circular Deps</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{stats.conflicts}</div>
          <div className="stat-label">Conflicts</div>
        </div>
      </div>
    );
  };

  const renderGroups = () => {
    if (!analysisData) return null;

    return (
      <div className="groups-container">
        {analysisData.groups.map((group, index) => (
          <div
            key={group.id}
            className={`group-card ${selectedGroup === group.id ? 'selected' : ''}`}
            onClick={() => setSelectedGroup(group.id)}
            style={{ borderLeftColor: getGroupColor(group.risk) }}
          >
            <div className="group-header">
              <h3>Group {index + 1}</h3>
              <span className={`risk-badge ${group.risk}`}>{group.risk} risk</span>
            </div>
            <div className="group-info">
              <p className="group-reason">{group.reason}</p>
              <div className="group-tasks">
                <strong>Tasks:</strong> {group.tasks.join(', ')}
              </div>
              <div className="group-confidence">
                <div className="confidence-bar">
                  <div
                    className="confidence-fill"
                    style={{ width: `${group.confidence * 100}%` }}
                  />
                </div>
                <span>{Math.round(group.confidence * 100)}% confidence</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderWarnings = () => {
    if (!analysisData || analysisData.warnings.length === 0) return null;

    return (
      <div className="warnings-container">
        <h3>⚠️ Warnings</h3>
        <ul className="warnings-list">
          {analysisData.warnings.map((warning, index) => (
            <li key={index} className="warning-item">
              {warning}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const getGroupColor = (risk: string): string => {
    switch (risk) {
      case 'low':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'high':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="parallel-analysis loading">
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="progress-message">{progressMessage}</p>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="parallel-analysis empty">
        <p>No analysis data available</p>
        <button onClick={requestAnalysis} className="btn-primary">
          Run Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="parallel-analysis">
      <div className="analysis-header">
        <h2>Parallel Execution Analysis</h2>
        <div className="view-mode-selector">
          <button
            className={viewMode === 'groups' ? 'active' : ''}
            onClick={() => setViewMode('groups')}
          >
            Groups
          </button>
          <button
            className={viewMode === 'graph' ? 'active' : ''}
            onClick={() => setViewMode('graph')}
          >
            Graph
          </button>
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
        </div>
      </div>

      {renderStats()}

      <div className="analysis-content">
        {viewMode === 'groups' && renderGroups()}
        {viewMode === 'graph' && (
          <div className="graph-placeholder">
            <p>Graph visualization coming in Phase 4</p>
          </div>
        )}
        {viewMode === 'list' && (
          <div className="task-list">
            {analysisData.tasks.map(task => (
              <div key={task.id} className="task-item">
                <span className="task-id">{task.id}</span>
                <span className="task-desc">{task.description}</span>
                {task.parallelSafe && (
                  <span className="parallel-badge">✓ Parallel</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {renderWarnings()}

      <div className="analysis-actions">
        <button onClick={requestAnalysis} className="btn-secondary">
          Re-analyze
        </button>
      </div>
    </div>
  );
};

export default ParallelAnalysis;