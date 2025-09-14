/**
 * Smart Suggestions Panel Component
 * Displays intelligent parallel execution recommendations
 */

import React, { useState, useEffect } from 'react';
import { ParallelRecommendation, Risk } from '../../parallel/intelligence/suggestion-system.js';
import { TaskGroup } from '../../parallel/types.js';

interface SmartSuggestionsProps {
  currentSuggestion: ParallelRecommendation | null;
  alternativeOptions: ParallelRecommendation[];
  onSuggestionAccepted: (suggestion: ParallelRecommendation) => void;
  onSuggestionRejected: (reason?: string) => void;
  onRequestAnalysis: () => void;
  loading?: boolean;
}

export const SmartSuggestionsPanel: React.FC<SmartSuggestionsProps> = ({
  currentSuggestion,
  alternativeOptions,
  onSuggestionAccepted,
  onSuggestionRejected,
  onRequestAnalysis,
  loading = false
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAlternative, setSelectedAlternative] = useState<number | null>(null);
  const [userFeedback, setUserFeedback] = useState('');

  if (loading) {
    return (
      <div className="smart-suggestions-panel loading">
        <div className="suggestion-header">
          <h3>🧠 Analyzing Tasks for Parallel Execution...</h3>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (!currentSuggestion) {
    return (
      <div className="smart-suggestions-panel empty">
        <div className="suggestion-header">
          <h3>🧠 Smart Parallel Analysis</h3>
          <p>Get intelligent recommendations for parallel task execution</p>
        </div>
        <button
          className="analyze-button primary"
          onClick={onRequestAnalysis}
        >
          Analyze Tasks for Parallel Opportunities
        </button>
      </div>
    );
  }

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'parallel-safe': return '✅';
      case 'parallel-risky': return '⚠️';
      case 'sequential': return '🔒';
      default: return '🤔';
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'parallel-safe': return 'success';
      case 'parallel-risky': return 'warning';
      case 'sequential': return 'info';
      default: return 'neutral';
    }
  };

  const getRiskSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'neutral';
    }
  };

  return (
    <div className="smart-suggestions-panel">
      <div className="suggestion-header">
        <h3>🧠 Smart Execution Recommendation</h3>
        <div className="confidence-badge">
          Confidence: {Math.round(currentSuggestion.confidence * 100)}%
        </div>
      </div>

      <div className={`main-recommendation ${getRecommendationColor(currentSuggestion.recommendation)}`}>
        <div className="recommendation-title">
          {getRecommendationIcon(currentSuggestion.recommendation)}
          <span className="recommendation-text">
            {currentSuggestion.recommendation === 'parallel-safe' && 'Parallel Execution Recommended'}
            {currentSuggestion.recommendation === 'parallel-risky' && 'Parallel Execution Possible (Monitor Required)'}
            {currentSuggestion.recommendation === 'sequential' && 'Sequential Execution Recommended'}
          </span>
        </div>

        {currentSuggestion.estimatedTimeSaved && (
          <div className="time-savings">
            💨 Estimated time savings: {currentSuggestion.estimatedTimeSaved}
          </div>
        )}

        <div className="reasoning-summary">
          <h4>Why this recommendation?</h4>
          <ul>
            {currentSuggestion.reasoning.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>

      {currentSuggestion.safeParallelGroups.length > 0 && (
        <div className="parallel-groups">
          <h4>Recommended Parallel Groups</h4>
          {currentSuggestion.safeParallelGroups.map((group, index) => (
            <TaskGroupCard key={group.id} group={group} index={index} />
          ))}
        </div>
      )}

      {currentSuggestion.risks.length > 0 && (
        <div className="risks-section">
          <h4>⚠️ Identified Risks ({currentSuggestion.risks.length})</h4>
          <div className="risks-list">
            {currentSuggestion.risks.map((risk, index) => (
              <RiskCard key={index} risk={risk} />
            ))}
          </div>
        </div>
      )}

      <div className="action-buttons">
        <button
          className={`accept-button ${getRecommendationColor(currentSuggestion.recommendation)}`}
          onClick={() => onSuggestionAccepted(currentSuggestion)}
        >
          {currentSuggestion.recommendation === 'sequential' ? 'Execute Sequentially' : 'Execute in Parallel'}
        </button>

        <button
          className="details-button secondary"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>

        <button
          className="reject-button neutral"
          onClick={() => onSuggestionRejected(userFeedback)}
        >
          Not Now
        </button>
      </div>

      {showDetails && (
        <DetailsPanel
          suggestion={currentSuggestion}
          alternatives={alternativeOptions}
          onAlternativeSelected={(alt) => onSuggestionAccepted(alt)}
        />
      )}

      {alternativeOptions.length > 0 && (
        <div className="alternatives-section">
          <h4>Alternative Strategies</h4>
          <div className="alternatives-list">
            {alternativeOptions.map((alt, index) => (
              <AlternativeCard
                key={index}
                alternative={alt}
                isSelected={selectedAlternative === index}
                onSelect={() => setSelectedAlternative(index)}
                onAccept={() => onSuggestionAccepted(alt)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="feedback-section">
        <h4>Feedback (Optional)</h4>
        <textarea
          value={userFeedback}
          onChange={(e) => setUserFeedback(e.target.value)}
          placeholder="Let us know your thoughts on this recommendation..."
          className="feedback-input"
        />
      </div>
    </div>
  );
};

const TaskGroupCard: React.FC<{ group: TaskGroup; index: number }> = ({ group, index }) => (
  <div className={`task-group-card risk-${group.risk}`}>
    <div className="group-header">
      <span className="group-number">Group {index + 1}</span>
      <span className="group-confidence">
        {Math.round(group.confidence * 100)}% confidence
      </span>
    </div>
    <div className="group-tasks">
      {group.tasks.map((taskId, i) => (
        <span key={taskId} className="task-chip">
          {taskId}
        </span>
      ))}
    </div>
    <div className="group-reason">{group.reason}</div>
    {group.estimatedDuration && (
      <div className="group-duration">
        ⏱️ Est. {Math.round(group.estimatedDuration / 1000)}s
      </div>
    )}
  </div>
);

const RiskCard: React.FC<{ risk: Risk }> = ({ risk }) => (
  <div className={`risk-card severity-${risk.severity}`}>
    <div className="risk-header">
      <span className="risk-type">{risk.type}</span>
      <span className={`risk-severity severity-${risk.severity}`}>
        {risk.severity.toUpperCase()}
      </span>
    </div>
    <div className="risk-description">{risk.description}</div>
    {risk.mitigation && (
      <div className="risk-mitigation">
        <strong>Mitigation:</strong> {risk.mitigation}
      </div>
    )}
  </div>
);

const AlternativeCard: React.FC<{
  alternative: ParallelRecommendation;
  isSelected: boolean;
  onSelect: () => void;
  onAccept: () => void;
}> = ({ alternative, isSelected, onSelect, onAccept }) => (
  <div
    className={`alternative-card ${isSelected ? 'selected' : ''} ${getRecommendationColor(alternative.recommendation)}`}
    onClick={onSelect}
  >
    <div className="alternative-header">
      {getRecommendationIcon(alternative.recommendation)}
      <span className="alternative-type">
        {alternative.recommendation.replace('-', ' ').toUpperCase()}
      </span>
      <span className="alternative-confidence">
        {Math.round(alternative.confidence * 100)}%
      </span>
    </div>

    <div className="alternative-summary">
      {alternative.reasoning.slice(0, 2).map((reason, i) => (
        <div key={i} className="reason-item">• {reason}</div>
      ))}
    </div>

    {alternative.estimatedTimeSaved && (
      <div className="alternative-savings">
        💨 {alternative.estimatedTimeSaved}
      </div>
    )}

    {isSelected && (
      <button
        className="use-alternative-button"
        onClick={(e) => {
          e.stopPropagation();
          onAccept();
        }}
      >
        Use This Strategy
      </button>
    )}
  </div>
);

const DetailsPanel: React.FC<{
  suggestion: ParallelRecommendation;
  alternatives: ParallelRecommendation[];
  onAlternativeSelected: (alt: ParallelRecommendation) => void;
}> = ({ suggestion, alternatives, onAlternativeSelected }) => (
  <div className="details-panel">
    <div className="analysis-breakdown">
      <h5>🔍 Analysis Breakdown</h5>
      <div className="analysis-grid">
        <div className="analysis-item">
          <label>Parallel Groups Found:</label>
          <value>{suggestion.safeParallelGroups.length}</value>
        </div>
        <div className="analysis-item">
          <label>Risk Level:</label>
          <value className={`risk-${suggestion.risks.length > 0 ? 'medium' : 'low'}`}>
            {suggestion.risks.length > 0 ? 'Medium' : 'Low'}
          </value>
        </div>
        <div className="analysis-item">
          <label>Confidence Score:</label>
          <value>{Math.round(suggestion.confidence * 100)}%</value>
        </div>
      </div>
    </div>

    <div className="detailed-reasoning">
      <h5>📋 Detailed Analysis</h5>
      <ol>
        {suggestion.reasoning.map((reason, index) => (
          <li key={index}>{reason}</li>
        ))}
      </ol>
    </div>

    {suggestion.risks.length > 0 && (
      <div className="risk-analysis">
        <h5>⚠️ Risk Analysis</h5>
        {suggestion.risks.map((risk, index) => (
          <RiskCard key={index} risk={risk} />
        ))}
      </div>
    )}
  </div>
);

// Helper function moved outside component
function getRecommendationColor(type: string): string {
  switch (type) {
    case 'parallel-safe': return 'success';
    case 'parallel-risky': return 'warning';
    case 'sequential': return 'info';
    default: return 'neutral';
  }
}

function getRecommendationIcon(type: string): string {
  switch (type) {
    case 'parallel-safe': return '✅';
    case 'parallel-risky': return '⚠️';
    case 'sequential': return '🔒';
    default: return '🤔';
  }
}