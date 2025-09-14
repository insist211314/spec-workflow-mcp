/**
 * Execution Monitor Component
 * Real-time monitoring of parallel task execution
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ExecutionMonitorProps {
  ws: WebSocket | null;
  isActive: boolean;
}

interface TaskStatus {
  taskId: string;
  state: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: number;
  endTime?: number;
  output?: string;
  error?: string;
  dependencies: string[];
  dependents: string[];
}

interface ExecutionSnapshot {
  timestamp: number;
  tasks: Map<string, TaskStatus>;
  globalState: 'idle' | 'running' | 'completed' | 'failed' | 'stopped';
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  runningTasks: number;
}

interface ExecutionProgress {
  total: number;
  completed: number;
  failed: number;
  running: number;
  progress: number;
}

export const ExecutionMonitor: React.FC<ExecutionMonitorProps> = ({
  ws,
  isActive
}) => {
  const { t } = useTranslation();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSnapshot, setExecutionSnapshot] = useState<ExecutionSnapshot | null>(null);
  const [executionProgress, setExecutionProgress] = useState<ExecutionProgress | null>(null);
  const [rollbackPoints, setRollbackPoints] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [executionResults, setExecutionResults] = useState<any[]>([]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'executionStateUpdate':
            handleExecutionStateUpdate(message.snapshot);
            break;

          case 'executionStarted':
            setIsExecuting(true);
            setExecutionResults([]);
            break;

          case 'executionCompleted':
            setIsExecuting(false);
            setExecutionResults(message.results);
            break;

          case 'executionStopped':
            setIsExecuting(false);
            break;

          case 'executionError':
            setIsExecuting(false);
            console.error('Execution error:', message.error);
            break;

          case 'rollbackPoints':
            setRollbackPoints(message.points);
            break;

          case 'executionStatus':
            setExecutionProgress(message.progress);
            setIsExecuting(message.isExecuting);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws]);

  const handleExecutionStateUpdate = (snapshot: any) => {
    // Convert tasks map from object to Map
    const tasksMap = new Map(Object.entries(snapshot.tasks));

    setExecutionSnapshot({
      ...snapshot,
      tasks: tasksMap
    });
  };

  const startExecution = () => {
    if (!ws) return;

    ws.send(JSON.stringify({
      type: 'executeParallel',
      data: {
        projectPath: '/current/project/path', // This should come from props
        specName: 'current-spec' // This should come from props
      }
    }));
  };

  const stopExecution = () => {
    if (!ws) return;

    ws.send(JSON.stringify({
      type: 'stopExecution',
      data: {}
    }));
  };

  const rollbackToPoint = (rollbackId: string) => {
    if (!ws) return;

    ws.send(JSON.stringify({
      type: 'rollbackToPoint',
      data: { rollbackId }
    }));
  };

  const getExecutionStatus = () => {
    if (!ws) return;

    ws.send(JSON.stringify({
      type: 'getExecutionStatus',
      data: {}
    }));
  };

  const getRollbackPoints = () => {
    if (!ws) return;

    ws.send(JSON.stringify({
      type: 'getRollbackPoints',
      data: {}
    }));
  };

  const getTaskStatusIcon = (state: string) => {
    switch (state) {
      case 'pending':
        return '⏳';
      case 'running':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '⚪';
    }
  };

  const getTaskStatusColor = (state: string) => {
    switch (state) {
      case 'pending':
        return '#9ca3af';
      case 'running':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatDuration = (startTime?: number, endTime?: number) => {
    if (!startTime) return '-';

    const end = endTime || Date.now();
    const duration = end - startTime;

    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="execution-monitor">
      <div className="monitor-header">
        <h2>🔄 Execution Monitor</h2>
        <div className="monitor-controls">
          <button
            onClick={getExecutionStatus}
            className="btn-secondary"
            disabled={!ws}
          >
            Refresh Status
          </button>
          <button
            onClick={getRollbackPoints}
            className="btn-secondary"
            disabled={!ws}
          >
            Load Rollback Points
          </button>
          {isExecuting ? (
            <button
              onClick={stopExecution}
              className="btn-danger"
              disabled={!ws}
            >
              Stop Execution
            </button>
          ) : (
            <button
              onClick={startExecution}
              className="btn-primary"
              disabled={!ws}
            >
              Start Execution
            </button>
          )}
        </div>
      </div>

      {/* Execution Progress */}
      {executionProgress && (
        <div className="execution-progress">
          <div className="progress-header">
            <h3>Overall Progress</h3>
            <span className="progress-percentage">
              {executionProgress.progress}%
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${executionProgress.progress}%` }}
            />
          </div>
          <div className="progress-stats">
            <div className="stat">
              <span className="stat-label">Total:</span>
              <span className="stat-value">{executionProgress.total}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Running:</span>
              <span className="stat-value running">{executionProgress.running}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Completed:</span>
              <span className="stat-value completed">{executionProgress.completed}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Failed:</span>
              <span className="stat-value failed">{executionProgress.failed}</span>
            </div>
          </div>
        </div>
      )}

      {/* Task Status List */}
      {executionSnapshot && (
        <div className="task-status-list">
          <h3>Task Status</h3>
          <div className="task-list">
            {Array.from(executionSnapshot.tasks.entries()).map(([taskId, task]) => (
              <div
                key={taskId}
                className={`task-status-item ${selectedTask === taskId ? 'selected' : ''}`}
                onClick={() => setSelectedTask(taskId)}
              >
                <div className="task-status-header">
                  <span className="task-icon">
                    {getTaskStatusIcon(task.state)}
                  </span>
                  <span className="task-id">{taskId}</span>
                  <span
                    className="task-state"
                    style={{ color: getTaskStatusColor(task.state) }}
                  >
                    {task.state}
                  </span>
                  <span className="task-duration">
                    {formatDuration(task.startTime, task.endTime)}
                  </span>
                </div>

                {task.state === 'running' && (
                  <div className="task-progress">
                    <div className="task-progress-bar">
                      <div
                        className="task-progress-fill"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="task-progress-text">{task.progress}%</span>
                  </div>
                )}

                {selectedTask === taskId && (
                  <div className="task-details">
                    {task.dependencies.length > 0 && (
                      <div className="task-dependencies">
                        <strong>Dependencies:</strong> {task.dependencies.join(', ')}
                      </div>
                    )}

                    {task.dependents.length > 0 && (
                      <div className="task-dependents">
                        <strong>Dependents:</strong> {task.dependents.join(', ')}
                      </div>
                    )}

                    {task.output && (
                      <div className="task-output">
                        <strong>Output:</strong>
                        <pre>{task.output}</pre>
                      </div>
                    )}

                    {task.error && (
                      <div className="task-error">
                        <strong>Error:</strong>
                        <pre className="error-text">{task.error}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution Results */}
      {executionResults.length > 0 && (
        <div className="execution-results">
          <h3>Execution Results</h3>
          <div className="results-summary">
            <span className="results-stat">
              Total: {executionResults.length}
            </span>
            <span className="results-stat success">
              Success: {executionResults.filter(r => r.success).length}
            </span>
            <span className="results-stat failed">
              Failed: {executionResults.filter(r => !r.success).length}
            </span>
          </div>

          <div className="results-list">
            {executionResults.map((result, index) => (
              <div
                key={index}
                className={`result-item ${result.success ? 'success' : 'failed'}`}
              >
                <div className="result-header">
                  <span className="result-icon">
                    {result.success ? '✅' : '❌'}
                  </span>
                  <span className="result-task-id">{result.taskId}</span>
                  <span className="result-duration">
                    {(result.duration / 1000).toFixed(2)}s
                  </span>
                </div>

                {result.output && (
                  <div className="result-output">
                    <pre>{result.output}</pre>
                  </div>
                )}

                {result.error && (
                  <div className="result-error">
                    <pre className="error-text">{result.error}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rollback Points */}
      {rollbackPoints.length > 0 && (
        <div className="rollback-points">
          <h3>🔄 Rollback Points</h3>
          <div className="rollback-list">
            {rollbackPoints.map((point) => (
              <div key={point.id} className="rollback-item">
                <div className="rollback-info">
                  <span className="rollback-description">{point.description}</span>
                  <span className="rollback-timestamp">
                    {new Date(point.timestamp).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => rollbackToPoint(point.id)}
                  className="btn-secondary btn-small"
                  disabled={isExecuting}
                >
                  Rollback
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!executionSnapshot && !isExecuting && (
        <div className="monitor-empty">
          <p>No execution data available</p>
          <p>Start an execution to see real-time monitoring</p>
        </div>
      )}
    </div>
  );
};

export default ExecutionMonitor;