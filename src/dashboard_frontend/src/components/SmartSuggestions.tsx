/**
 * Smart Suggestions Component
 * Provides intelligent recommendations for parallel task execution
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface SmartSuggestionsProps {
  projectPath: string;
  specName: string;
  ws: WebSocket | null;
  mode: 'classic' | 'turbo';
}

interface Suggestion {
  id: string;
  type: 'safe' | 'risky' | 'sequential';
  title: string;
  description: string;
  confidence: number;
  taskGroups: any[];
  benefits: string[];
  risks: string[];
  recommendation: string;
}

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  projectPath,
  specName,
  ws,
  mode
}) => {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (ws) {
      generateSuggestions();
    }
  }, [ws, mode]);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'smartSuggestions') {
          handleSuggestionsUpdate(message.suggestions);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws]);

  const generateSuggestions = () => {
    setLoading(true);

    // Generate mock suggestions for Phase 1 MVP
    // In Phase 3, this will use AI-powered analysis
    setTimeout(() => {
      const mockSuggestions: Suggestion[] = [
        {
          id: 'sug-1',
          type: 'safe',
          title: 'Parallel Independent Tasks',
          description: 'Run all independent tasks simultaneously for maximum speed',
          confidence: 0.95,
          taskGroups: [
            { id: 'group-1', tasks: ['1', '5'], risk: 'low' }
          ],
          benefits: [
            'Reduce total execution time by ~40%',
            'No dependency conflicts',
            'Safe to run with current setup'
          ],
          risks: [],
          recommendation: mode === 'turbo'
            ? 'Highly recommended - Apply this suggestion for optimal performance'
            : 'Switch to Turbo mode to apply this optimization'
        },
        {
          id: 'sug-2',
          type: 'risky',
          title: 'Aggressive Parallelization',
          description: 'Run tasks with shared dependencies in parallel',
          confidence: 0.65,
          taskGroups: [
            { id: 'group-2', tasks: ['2', '3'], risk: 'medium' }
          ],
          benefits: [
            'Further reduce execution time by ~20%',
            'Complete related tasks together'
          ],
          risks: [
            'Potential resource conflicts',
            'May need manual conflict resolution'
          ],
          recommendation: 'Consider only if you can monitor execution closely'
        },
        {
          id: 'sug-3',
          type: 'sequential',
          title: 'Safe Sequential Execution',
          description: 'Run tasks one by one to avoid all conflicts',
          confidence: 1.0,
          taskGroups: [],
          benefits: [
            'Guaranteed no conflicts',
            'Predictable execution order',
            'Easiest to debug'
          ],
          risks: [
            'Slower execution time',
            'No parallelization benefits'
          ],
          recommendation: mode === 'classic'
            ? 'Current mode - Safe and predictable'
            : 'Fall back option if parallel execution fails'
        }
      ];

      setSuggestions(mockSuggestions);
      setLoading(false);
    }, 1000);
  };

  const handleSuggestionsUpdate = (newSuggestions: any[]) => {
    const formattedSuggestions: Suggestion[] = newSuggestions.map((sug, index) => ({
      id: `sug-${index}`,
      type: sug.type || 'safe',
      title: sug.title || `Suggestion ${index + 1}`,
      description: sug.reason || sug.description || '',
      confidence: sug.confidence || 0.5,
      taskGroups: sug.taskGroups || [],
      benefits: sug.benefits || [],
      risks: sug.risks || [],
      recommendation: sug.recommendation || ''
    }));

    setSuggestions(formattedSuggestions);
  };

  const applySuggestion = (suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion || !ws) return;

    // Send application request to backend
    ws.send(JSON.stringify({
      type: 'applySuggestion',
      data: {
        suggestionId,
        suggestion
      }
    }));

    // Mark as applied
    setAppliedSuggestions(prev => new Set(prev).add(suggestionId));

    // Show feedback
    alert(`Applied suggestion: ${suggestion.title}`);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'safe':
        return '✅';
      case 'risky':
        return '⚠️';
      case 'sequential':
        return '📝';
      default:
        return '💡';
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'safe':
        return '#10b981';
      case 'risky':
        return '#f59e0b';
      case 'sequential':
        return '#6b7280';
      default:
        return '#3b82f6';
    }
  };

  if (loading) {
    return (
      <div className="smart-suggestions loading">
        <div className="loading-spinner"></div>
        <p>Generating smart suggestions...</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="smart-suggestions empty">
        <p>No suggestions available</p>
        <button onClick={generateSuggestions} className="btn-secondary">
          Generate Suggestions
        </button>
      </div>
    );
  }

  return (
    <div className="smart-suggestions">
      <div className="suggestions-header">
        <p className="suggestions-intro">
          Based on your task dependencies, here are optimized execution strategies:
        </p>
      </div>

      <div className="suggestions-list">
        {suggestions.map(suggestion => (
          <div
            key={suggestion.id}
            className={`suggestion-card ${selectedSuggestion === suggestion.id ? 'selected' : ''} ${appliedSuggestions.has(suggestion.id) ? 'applied' : ''}`}
            onClick={() => setSelectedSuggestion(suggestion.id)}
            style={{ borderLeftColor: getSuggestionColor(suggestion.type) }}
          >
            <div className="suggestion-header">
              <span className="suggestion-icon">{getSuggestionIcon(suggestion.type)}</span>
              <h3 className="suggestion-title">{suggestion.title}</h3>
              <div className="suggestion-confidence">
                <div className="confidence-meter">
                  <div
                    className="confidence-fill"
                    style={{ width: `${suggestion.confidence * 100}%` }}
                  />
                </div>
                <span className="confidence-label">
                  {Math.round(suggestion.confidence * 100)}% confidence
                </span>
              </div>
            </div>

            <p className="suggestion-description">{suggestion.description}</p>

            {selectedSuggestion === suggestion.id && (
              <div className="suggestion-details">
                {suggestion.benefits.length > 0 && (
                  <div className="detail-section">
                    <h4>✅ Benefits</h4>
                    <ul>
                      {suggestion.benefits.map((benefit, idx) => (
                        <li key={idx}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {suggestion.risks.length > 0 && (
                  <div className="detail-section">
                    <h4>⚠️ Risks</h4>
                    <ul>
                      {suggestion.risks.map((risk, idx) => (
                        <li key={idx}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="suggestion-recommendation">
                  <strong>Recommendation:</strong> {suggestion.recommendation}
                </div>

                <div className="suggestion-actions">
                  {mode === 'turbo' && !appliedSuggestions.has(suggestion.id) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        applySuggestion(suggestion.id);
                      }}
                      className="btn-primary"
                      disabled={suggestion.type === 'sequential' && mode === 'turbo'}
                    >
                      Apply This Strategy
                    </button>
                  ) : appliedSuggestions.has(suggestion.id) ? (
                    <span className="applied-badge">✓ Applied</span>
                  ) : (
                    <span className="mode-hint">Switch to Turbo mode to apply</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="suggestions-footer">
        <button onClick={generateSuggestions} className="btn-secondary">
          Regenerate Suggestions
        </button>
        <p className="suggestions-note">
          💡 Suggestions are based on static analysis. Actual execution may vary.
        </p>
      </div>
    </div>
  );
};

export default SmartSuggestions;