/**
 * Parallel Analysis Tab Component
 * Main tab for parallel execution analysis in dashboard
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ParallelAnalysis from './ParallelAnalysis';
import SmartSuggestions from './SmartSuggestions';
import ExecutionMonitor from './ExecutionMonitor';
import '../styles/parallel-analysis.css';

interface ParallelAnalysisTabProps {
  projectPath: string;
  specName: string;
  ws: WebSocket | null;
  isActive: boolean;
}

interface ExecutionMode {
  mode: 'classic' | 'turbo';
  maxParallelTasks: number;
  enableSuggestions: boolean;
}

export const ParallelAnalysisTab: React.FC<ParallelAnalysisTabProps> = ({
  projectPath,
  specName,
  ws,
  isActive
}) => {
  const { t } = useTranslation();
  const [executionMode, setExecutionMode] = useState<ExecutionMode>({
    mode: 'classic',
    maxParallelTasks: 3,
    enableSuggestions: true
  });
  const [showCCPMAnalysis, setShowCCPMAnalysis] = useState(false);
  const [ccpmAnalysisResult, setCCPMAnalysisResult] = useState<any>(null);

  // Handle WebSocket messages for CCPM analysis
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'ccpmAnalysis') {
          setCCPMAnalysisResult(message);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws]);

  const handleModeChange = (mode: 'classic' | 'turbo') => {
    setExecutionMode(prev => ({ ...prev, mode }));

    // Send mode change to backend
    if (ws) {
      ws.send(JSON.stringify({
        type: 'setExecutionMode',
        data: { mode }
      }));
    }
  };

  const handleMaxParallelChange = (value: number) => {
    const clamped = Math.min(3, Math.max(1, value));
    setExecutionMode(prev => ({ ...prev, maxParallelTasks: clamped }));

    // Send update to backend
    if (ws) {
      ws.send(JSON.stringify({
        type: 'setMaxParallelTasks',
        data: { maxTasks: clamped }
      }));
    }
  };

  const analyzeCCPM = () => {
    if (!ws) return;

    setShowCCPMAnalysis(true);
    ws.send(JSON.stringify({
      type: 'analyzeCCPM',
      data: { projectPath }
    }));
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="parallel-analysis-tab">
      <div className="tab-header">
        <h1>🚀 Parallel Execution Analysis</h1>
        <p className="tab-description">
          Analyze task dependencies and optimize parallel execution
        </p>
      </div>

      <div className="execution-mode-panel">
        <h3>Execution Mode</h3>
        <div className="mode-selector">
          <label className={`mode-option ${executionMode.mode === 'classic' ? 'active' : ''}`}>
            <input
              type="radio"
              name="mode"
              value="classic"
              checked={executionMode.mode === 'classic'}
              onChange={() => handleModeChange('classic')}
            />
            <span className="mode-label">
              <strong>Classic Mode</strong>
              <small>Sequential execution (safe)</small>
            </span>
          </label>

          <label className={`mode-option ${executionMode.mode === 'turbo' ? 'active' : ''}`}>
            <input
              type="radio"
              name="mode"
              value="turbo"
              checked={executionMode.mode === 'turbo'}
              onChange={() => handleModeChange('turbo')}
            />
            <span className="mode-label">
              <strong>Turbo Mode</strong>
              <small>Parallel execution (faster)</small>
            </span>
          </label>
        </div>

        {executionMode.mode === 'turbo' && (
          <div className="turbo-settings">
            <div className="setting-row">
              <label>Max Parallel Tasks:</label>
              <input
                type="number"
                min="1"
                max="3"
                value={executionMode.maxParallelTasks}
                onChange={(e) => handleMaxParallelChange(parseInt(e.target.value))}
              />
              <span className="setting-hint">Maximum: 3 (for stability)</span>
            </div>

            <div className="setting-row">
              <label>
                <input
                  type="checkbox"
                  checked={executionMode.enableSuggestions}
                  onChange={(e) => setExecutionMode(prev => ({
                    ...prev,
                    enableSuggestions: e.target.checked
                  }))}
                />
                Enable Smart Suggestions
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="analysis-sections">
        <section className="analysis-section">
          <h2>Task Dependency Analysis</h2>
          <ParallelAnalysis
            projectPath={projectPath}
            specName={specName}
            ws={ws}
          />
        </section>

        {executionMode.enableSuggestions && (
          <section className="analysis-section">
            <h2>Smart Suggestions</h2>
            <SmartSuggestions
              projectPath={projectPath}
              specName={specName}
              ws={ws}
              mode={executionMode.mode}
            />
          </section>
        )}

        <section className="analysis-section">
          <h2>Execution Monitor</h2>
          <ExecutionMonitor
            ws={ws}
            isActive={true}
          />
        </section>

        <section className="analysis-section">
          <div className="ccpm-analysis-header">
            <h2>CCPM Integration Analysis</h2>
            <button onClick={analyzeCCPM} className="btn-secondary">
              Analyze CCPM Project
            </button>
          </div>

          {showCCPMAnalysis && ccpmAnalysisResult && (
            <div className="ccpm-analysis-results">
              {ccpmAnalysisResult.success ? (
                <div className="ccpm-data">
                  <div className="ccpm-summary">
                    <h4>CCPM Project Summary</h4>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span className="summary-label">Agents:</span>
                        <span className="summary-value">{ccpmAnalysisResult.data?.summary?.agents || 0}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Commands:</span>
                        <span className="summary-value">{ccpmAnalysisResult.data?.summary?.commands || 0}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Scripts:</span>
                        <span className="summary-value">{ccpmAnalysisResult.data?.summary?.scripts || 0}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Compatibility:</span>
                        <span className="summary-value">{ccpmAnalysisResult.data?.summary?.compatibilityScore || 0}%</span>
                      </div>
                    </div>
                  </div>

                  {ccpmAnalysisResult.data?.topAgents && (
                    <div className="ccpm-agents">
                      <h4>Available Agents</h4>
                      <ul>
                        {ccpmAnalysisResult.data.topAgents.map((agent: any, idx: number) => (
                          <li key={idx}>
                            <strong>{agent.name}</strong> - {agent.description} ({agent.tools} tools)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ccpmAnalysisResult.data?.recommendations && (
                    <div className="ccpm-recommendations">
                      <h4>Integration Recommendations</h4>
                      <ul>
                        {ccpmAnalysisResult.data.recommendations.map((rec: string, idx: number) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ccpmAnalysisResult.data?.issues && ccpmAnalysisResult.data.issues.length > 0 && (
                    <div className="ccpm-issues">
                      <h4>⚠️ Compatibility Issues</h4>
                      <ul>
                        {ccpmAnalysisResult.data.issues.map((issue: string, idx: number) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="ccpm-error">
                  <p>❌ Failed to analyze CCPM project</p>
                  <p className="error-message">{ccpmAnalysisResult.error}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="tab-footer">
        <div className="phase-indicator">
          <span className="phase-badge">Phase 1 MVP</span>
          <span className="phase-description">
            Analysis Only - Execution in Phase 2
          </span>
        </div>
      </div>
    </div>
  );
};

export default ParallelAnalysisTab;