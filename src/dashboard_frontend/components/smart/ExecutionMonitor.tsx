/**
 * Execution Monitor Component
 * Real-time visualization of parallel task execution
 */

import React, { useState, useEffect } from 'react';
import { TaskExecutionStatus, ParallelTaskInfo, TaskConflict } from '../../parallel/types.js';
import { ActualConflict } from '../../parallel/conflicts/smart-detector.js';

interface ExecutionMonitorProps {
  runningTasks: TaskExecution[];
  queuedTasks: ParallelTaskInfo[];
  completedTasks: ExecutionResult[];
  conflicts: ActualConflict[];
  onPauseExecution: () => void;
  onResumeExecution: () => void;
  onStopExecution: () => void;
  onResolveConflict: (conflict: ActualConflict, resolution: string) => void;
  isExecuting: boolean;
  isPaused: boolean;
}

interface TaskExecution {
  task: ParallelTaskInfo;
  status: TaskExecutionStatus;
  progress: number;
  currentOperation: string;
  startTime: number;
  logs: ExecutionLog[];
}

interface ExecutionResult {
  taskId: string;
  success: boolean;
  duration: number;
  output: string;
  error?: string;
}

interface ExecutionLog {
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  taskId: string;
}

export const ExecutionMonitor: React.FC<ExecutionMonitorProps> = ({
  runningTasks,
  queuedTasks,
  completedTasks,
  conflicts,
  onPauseExecution,
  onResumeExecution,
  onStopExecution,
  onResolveConflict,
  isExecuting,
  isPaused
}) => {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'graph'>('overview');
  const [autoScroll, setAutoScroll] = useState(true);

  const totalTasks = runningTasks.length + queuedTasks.length + completedTasks.length;
  const completedCount = completedTasks.length;
  const progressPercentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  const successfulTasks = completedTasks.filter(t => t.success).length;
  const failedTasks = completedTasks.filter(t => !t.success).length;

  useEffect(() => {
    if (autoScroll && showLogs) {
      const logsContainer = document.getElementById('execution-logs');
      if (logsContainer) {
        logsContainer.scrollTop = logsContainer.scrollHeight;
      }
    }
  }, [runningTasks, autoScroll, showLogs]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'queued': return '⏳';
      case 'pending': return '⭕';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'info';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'queued': return 'warning';
      case 'pending': return 'neutral';
      default: return 'neutral';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getElapsedTime = (startTime: number) => {
    return Date.now() - startTime;
  };

  return (
    <div className="execution-monitor">
      <div className="monitor-header">
        <h3>⚡ Parallel Execution Monitor</h3>
        <div className="view-controls">
          <button
            className={`view-button ${viewMode === 'overview' ? 'active' : ''}`}
            onClick={() => setViewMode('overview')}
          >
            Overview
          </button>
          <button
            className={`view-button ${viewMode === 'detailed' ? 'active' : ''}`}
            onClick={() => setViewMode('detailed')}
          >
            Detailed
          </button>
          <button
            className={`view-button ${viewMode === 'graph' ? 'active' : ''}`}
            onClick={() => setViewMode('graph')}
          >
            Graph
          </button>
        </div>
      </div>

      <div className="execution-summary">
        <div className="progress-section">
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="progress-text">
              {Math.round(progressPercentage)}% Complete ({completedCount}/{totalTasks})
            </span>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card running">
            <div className="stat-icon">🔄</div>
            <div className="stat-content">
              <div className="stat-number">{runningTasks.length}</div>
              <div className="stat-label">Running</div>
            </div>
          </div>

          <div className="stat-card queued">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-number">{queuedTasks.length}</div>
              <div className="stat-label">Queued</div>
            </div>
          </div>

          <div className="stat-card completed">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-number">{successfulTasks}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>

          <div className="stat-card failed">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <div className="stat-number">{failedTasks}</div>
              <div className="stat-label">Failed</div>
            </div>
          </div>

          <div className="stat-card conflicts">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-number">{conflicts.length}</div>
              <div className="stat-label">Conflicts</div>
            </div>
          </div>
        </div>

        <div className="execution-controls">
          {isExecuting && !isPaused && (
            <button className="control-button pause" onClick={onPauseExecution}>
              ⏸️ Pause
            </button>
          )}
          {isExecuting && isPaused && (
            <button className="control-button resume" onClick={onResumeExecution}>
              ▶️ Resume
            </button>
          )}
          {isExecuting && (
            <button className="control-button stop" onClick={onStopExecution}>
              ⏹️ Stop
            </button>
          )}
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="conflicts-section">
          <h4>⚠️ Active Conflicts</h4>
          <div className="conflicts-list">
            {conflicts.map((conflict, index) => (
              <ConflictCard
                key={conflict.id}
                conflict={conflict}
                onResolve={(resolution) => onResolveConflict(conflict, resolution)}
              />
            ))}
          </div>
        </div>
      )}

      {viewMode === 'overview' && (
        <OverviewMode
          runningTasks={runningTasks}
          queuedTasks={queuedTasks}
          completedTasks={completedTasks}
          onTaskSelected={setSelectedTask}
          selectedTask={selectedTask}
        />
      )}

      {viewMode === 'detailed' && (
        <DetailedMode
          runningTasks={runningTasks}
          queuedTasks={queuedTasks}
          completedTasks={completedTasks}
          onTaskSelected={setSelectedTask}
          selectedTask={selectedTask}
        />
      )}

      {viewMode === 'graph' && (
        <GraphMode
          runningTasks={runningTasks}
          queuedTasks={queuedTasks}
          completedTasks={completedTasks}
        />
      )}

      <div className="logs-section">
        <div className="logs-header">
          <h4>📝 Execution Logs</h4>
          <div className="logs-controls">
            <label>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Auto-scroll
            </label>
            <button
              className={`logs-toggle ${showLogs ? 'active' : ''}`}
              onClick={() => setShowLogs(!showLogs)}
            >
              {showLogs ? 'Hide Logs' : 'Show Logs'}
            </button>
          </div>
        </div>

        {showLogs && (
          <div id="execution-logs" className="logs-container">
            {runningTasks.flatMap(task => task.logs).map((log, index) => (
              <LogEntry key={index} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ConflictCard: React.FC<{
  conflict: ActualConflict;
  onResolve: (resolution: string) => void;
}> = ({ conflict, onResolve }) => {
  const [selectedResolution, setSelectedResolution] = useState<string>('');

  const resolutionOptions = [
    { id: 'serialize', label: 'Execute Sequentially', description: 'Run conflicting tasks one after another' },
    { id: 'isolate', label: 'Isolate Resources', description: 'Create separate workspaces for each task' },
    { id: 'abort', label: 'Abort Execution', description: 'Stop execution and rollback' },
    { id: 'manual', label: 'Manual Resolution', description: 'Pause and resolve manually' }
  ];

  return (
    <div className={`conflict-card severity-${conflict.severity}`}>
      <div className="conflict-header">
        <span className="conflict-type">{conflict.type}</span>
        <span className="conflict-severity">{conflict.severity.toUpperCase()}</span>
      </div>

      <div className="conflict-description">{conflict.description}</div>

      <div className="conflict-details">
        <div className="affected-tasks">
          <strong>Affected Tasks:</strong> {conflict.affectedTasks.join(', ')}
        </div>
        <div className="detected-at">
          <strong>Detected:</strong> {new Date(conflict.detectedAt).toLocaleTimeString()}
        </div>
      </div>

      <div className="conflict-manifestation">
        <h5>Symptoms:</h5>
        <ul>
          {conflict.manifestation.symptoms.map((symptom, index) => (
            <li key={index}>{symptom}</li>
          ))}
        </ul>
      </div>

      <div className="resolution-options">
        <h5>Resolution Options:</h5>
        <div className="resolution-buttons">
          {resolutionOptions.map((option) => (
            <button
              key={option.id}
              className={`resolution-button ${selectedResolution === option.id ? 'selected' : ''}`}
              onClick={() => {
                setSelectedResolution(option.id);
                onResolve(option.id);
              }}
              title={option.description}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const OverviewMode: React.FC<{
  runningTasks: TaskExecution[];
  queuedTasks: ParallelTaskInfo[];
  completedTasks: ExecutionResult[];
  onTaskSelected: (taskId: string) => void;
  selectedTask: string | null;
}> = ({ runningTasks, queuedTasks, completedTasks, onTaskSelected, selectedTask }) => (
  <div className="overview-mode">
    <div className="tasks-overview">
      <div className="running-tasks">
        <h4>🔄 Running Tasks ({runningTasks.length})</h4>
        {runningTasks.map((execution) => (
          <TaskOverviewCard
            key={execution.task.id}
            task={execution.task}
            status={execution.status}
            progress={execution.progress}
            currentOperation={execution.currentOperation}
            elapsedTime={getElapsedTime(execution.startTime)}
            isSelected={selectedTask === execution.task.id}
            onSelect={() => onTaskSelected(execution.task.id)}
          />
        ))}
      </div>

      <div className="queued-tasks">
        <h4>⏳ Queued Tasks ({queuedTasks.length})</h4>
        {queuedTasks.map((task) => (
          <TaskOverviewCard
            key={task.id}
            task={task}
            status={{ state: 'queued' } as TaskExecutionStatus}
            progress={0}
            currentOperation="Waiting for dependencies"
            isSelected={selectedTask === task.id}
            onSelect={() => onTaskSelected(task.id)}
          />
        ))}
      </div>

      <div className="completed-tasks">
        <h4>✅ Completed Tasks ({completedTasks.length})</h4>
        {completedTasks.slice(-5).map((result) => (
          <CompletedTaskCard
            key={result.taskId}
            result={result}
            isSelected={selectedTask === result.taskId}
            onSelect={() => onTaskSelected(result.taskId)}
          />
        ))}
      </div>
    </div>
  </div>
);

const TaskOverviewCard: React.FC<{
  task: ParallelTaskInfo;
  status: TaskExecutionStatus;
  progress: number;
  currentOperation: string;
  elapsedTime?: number;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ task, status, progress, currentOperation, elapsedTime, isSelected, onSelect }) => (
  <div
    className={`task-overview-card ${getStatusColor(status.state)} ${isSelected ? 'selected' : ''}`}
    onClick={onSelect}
  >
    <div className="task-header">
      <span className="task-icon">{getStatusIcon(status.state)}</span>
      <span className="task-id">{task.id}</span>
      {elapsedTime && (
        <span className="elapsed-time">{formatDuration(elapsedTime)}</span>
      )}
    </div>

    <div className="task-description">{task.description}</div>

    {status.state === 'running' && (
      <>
        <div className="progress-container">
          <div className="progress-bar mini">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">{progress}%</span>
        </div>
        <div className="current-operation">{currentOperation}</div>
      </>
    )}

    {task.dependencies && task.dependencies.length > 0 && (
      <div className="task-dependencies">
        Dependencies: {task.dependencies.join(', ')}
      </div>
    )}
  </div>
);

const CompletedTaskCard: React.FC<{
  result: ExecutionResult;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ result, isSelected, onSelect }) => (
  <div
    className={`completed-task-card ${result.success ? 'success' : 'error'} ${isSelected ? 'selected' : ''}`}
    onClick={onSelect}
  >
    <div className="task-header">
      <span className="task-icon">{result.success ? '✅' : '❌'}</span>
      <span className="task-id">{result.taskId}</span>
      <span className="duration">{formatDuration(result.duration)}</span>
    </div>

    {result.error && (
      <div className="error-message">{result.error}</div>
    )}
  </div>
);

const DetailedMode: React.FC<{
  runningTasks: TaskExecution[];
  queuedTasks: ParallelTaskInfo[];
  completedTasks: ExecutionResult[];
  onTaskSelected: (taskId: string) => void;
  selectedTask: string | null;
}> = ({ runningTasks, queuedTasks, completedTasks, onTaskSelected, selectedTask }) => (
  <div className="detailed-mode">
    <div className="detailed-view">
      {/* Detailed implementation would include more comprehensive task information */}
      <div className="task-details">
        <h4>Task Details</h4>
        {selectedTask ? (
          <div className="selected-task-details">
            <p>Details for task: {selectedTask}</p>
            {/* Detailed task information would be rendered here */}
          </div>
        ) : (
          <p>Select a task to view details</p>
        )}
      </div>
    </div>
  </div>
);

const GraphMode: React.FC<{
  runningTasks: TaskExecution[];
  queuedTasks: ParallelTaskInfo[];
  completedTasks: ExecutionResult[];
}> = ({ runningTasks, queuedTasks, completedTasks }) => (
  <div className="graph-mode">
    <div className="execution-graph">
      <h4>Execution Dependency Graph</h4>
      <div className="graph-placeholder">
        {/* Graph visualization would be implemented here using D3.js or similar */}
        <p>Dependency graph visualization would be rendered here</p>
      </div>
    </div>
  </div>
);

const LogEntry: React.FC<{ log: ExecutionLog }> = ({ log }) => (
  <div className={`log-entry level-${log.level}`}>
    <span className="log-timestamp">
      {new Date(log.timestamp).toLocaleTimeString()}
    </span>
    <span className="log-level">{log.level.toUpperCase()}</span>
    <span className="log-task">[{log.taskId}]</span>
    <span className="log-message">{log.message}</span>
  </div>
);

// Helper functions
function getStatusIcon(status: string): string {
  switch (status) {
    case 'running': return '🔄';
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'queued': return '⏳';
    case 'pending': return '⭕';
    default: return '❓';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'running': return 'info';
    case 'completed': return 'success';
    case 'failed': return 'error';
    case 'queued': return 'warning';
    case 'pending': return 'neutral';
    default: return 'neutral';
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function getElapsedTime(startTime: number): number {
  return Date.now() - startTime;
}