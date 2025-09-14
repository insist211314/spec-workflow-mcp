/**
 * User Preferences for Parallel Execution
 * Manages user settings and preferences for smart coordination
 */

export interface UserPreferences {
  riskTolerance: 'conservative' | 'balanced' | 'aggressive';
  autoResolveConflicts: boolean;
  suggestionMode: 'always' | 'on-demand' | 'never';
  learningEnabled: boolean;
  maxParallelTasks: number;
  executionMode: 'classic' | 'turbo' | 'auto';
  notificationSettings: NotificationSettings;
  analysisSettings: AnalysisSettings;
  displaySettings: DisplaySettings;
}

export interface NotificationSettings {
  conflictAlerts: boolean;
  completionNotifications: boolean;
  riskWarnings: boolean;
  adaptationUpdates: boolean;
  soundEnabled: boolean;
  emailNotifications: boolean;
}

export interface AnalysisSettings {
  patternRecognition: boolean;
  historicalLearning: boolean;
  semanticAnalysis: boolean;
  riskAssessment: boolean;
  confidenceThreshold: number; // 0-1
  analysisDepth: 'quick' | 'standard' | 'thorough';
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'auto';
  density: 'compact' | 'comfortable' | 'spacious';
  showAdvancedFeatures: boolean;
  defaultView: 'overview' | 'detailed' | 'graph';
  animationsEnabled: boolean;
  colorBlindFriendly: boolean;
}

export interface PreferenceProfile {
  id: string;
  name: string;
  description: string;
  preferences: UserPreferences;
  isDefault: boolean;
  createdAt: number;
  lastUsed: number;
}

export class UserPreferencesManager {
  private preferences: UserPreferences;
  private profiles: Map<string, PreferenceProfile>;
  private activeProfileId: string;
  private storageKey = 'spec-workflow-parallel-preferences';
  private listeners: Set<(preferences: UserPreferences) => void>;

  constructor() {
    this.preferences = this.getDefaultPreferences();
    this.profiles = new Map();
    this.activeProfileId = 'default';
    this.listeners = new Set();
    this.initializeDefaultProfiles();
    this.loadFromStorage();
  }

  /**
   * Get current user preferences
   */
  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  /**
   * Update user preferences
   */
  updatePreferences(updates: Partial<UserPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      riskTolerance: 'balanced',
      autoResolveConflicts: false,
      suggestionMode: 'on-demand',
      learningEnabled: true,
      maxParallelTasks: 3,
      executionMode: 'auto',
      notificationSettings: {
        conflictAlerts: true,
        completionNotifications: true,
        riskWarnings: true,
        adaptationUpdates: false,
        soundEnabled: false,
        emailNotifications: false
      },
      analysisSettings: {
        patternRecognition: true,
        historicalLearning: true,
        semanticAnalysis: true,
        riskAssessment: true,
        confidenceThreshold: 0.7,
        analysisDepth: 'standard'
      },
      displaySettings: {
        theme: 'auto',
        density: 'comfortable',
        showAdvancedFeatures: false,
        defaultView: 'overview',
        animationsEnabled: true,
        colorBlindFriendly: false
      }
    };
  }

  /**
   * Initialize default preference profiles
   */
  private initializeDefaultProfiles(): void {
    const profiles: PreferenceProfile[] = [
      {
        id: 'beginner',
        name: 'Beginner',
        description: 'Safe settings for new users',
        preferences: {
          ...this.getDefaultPreferences(),
          riskTolerance: 'conservative',
          autoResolveConflicts: true,
          suggestionMode: 'always',
          maxParallelTasks: 2,
          executionMode: 'classic',
          analysisSettings: {
            ...this.getDefaultPreferences().analysisSettings,
            analysisDepth: 'quick'
          },
          displaySettings: {
            ...this.getDefaultPreferences().displaySettings,
            showAdvancedFeatures: false
          }
        },
        isDefault: false,
        createdAt: Date.now(),
        lastUsed: 0
      },
      {
        id: 'intermediate',
        name: 'Intermediate',
        description: 'Balanced settings for regular users',
        preferences: {
          ...this.getDefaultPreferences(),
          riskTolerance: 'balanced',
          autoResolveConflicts: false,
          suggestionMode: 'on-demand',
          maxParallelTasks: 3,
          executionMode: 'auto'
        },
        isDefault: true,
        createdAt: Date.now(),
        lastUsed: Date.now()
      },
      {
        id: 'expert',
        name: 'Expert',
        description: 'Advanced settings for experienced users',
        preferences: {
          ...this.getDefaultPreferences(),
          riskTolerance: 'aggressive',
          autoResolveConflicts: false,
          suggestionMode: 'never',
          maxParallelTasks: 3,
          executionMode: 'turbo',
          analysisSettings: {
            ...this.getDefaultPreferences().analysisSettings,
            analysisDepth: 'thorough'
          },
          displaySettings: {
            ...this.getDefaultPreferences().displaySettings,
            showAdvancedFeatures: true,
            defaultView: 'detailed'
          }
        },
        isDefault: false,
        createdAt: Date.now(),
        lastUsed: 0
      }
    ];

    profiles.forEach(profile => {
      this.profiles.set(profile.id, profile);
    });

    this.activeProfileId = 'intermediate';
    this.preferences = this.profiles.get('intermediate')!.preferences;
  }

  /**
   * Get available preference profiles
   */
  getProfiles(): PreferenceProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Switch to a different profile
   */
  switchProfile(profileId: string): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      return false;
    }

    this.activeProfileId = profileId;
    this.preferences = { ...profile.preferences };
    profile.lastUsed = Date.now();

    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  /**
   * Create a new custom profile
   */
  createProfile(name: string, description: string, preferences?: Partial<UserPreferences>): string {
    const profileId = `custom-${Date.now()}`;
    const profile: PreferenceProfile = {
      id: profileId,
      name,
      description,
      preferences: { ...this.preferences, ...preferences },
      isDefault: false,
      createdAt: Date.now(),
      lastUsed: Date.now()
    };

    this.profiles.set(profileId, profile);
    this.saveToStorage();
    return profileId;
  }

  /**
   * Update an existing profile
   */
  updateProfile(profileId: string, updates: Partial<PreferenceProfile>): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile || profile.isDefault) {
      return false; // Cannot update default profiles
    }

    const updatedProfile = { ...profile, ...updates };
    this.profiles.set(profileId, updatedProfile);

    if (this.activeProfileId === profileId) {
      this.preferences = { ...updatedProfile.preferences };
      this.notifyListeners();
    }

    this.saveToStorage();
    return true;
  }

  /**
   * Delete a custom profile
   */
  deleteProfile(profileId: string): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile || profile.isDefault) {
      return false; // Cannot delete default profiles
    }

    this.profiles.delete(profileId);

    if (this.activeProfileId === profileId) {
      // Switch to default profile
      this.switchProfile('intermediate');
    }

    this.saveToStorage();
    return true;
  }

  /**
   * Get current active profile
   */
  getActiveProfile(): PreferenceProfile | null {
    return this.profiles.get(this.activeProfileId) || null;
  }

  /**
   * Export preferences for backup
   */
  exportPreferences(): {
    activeProfileId: string;
    profiles: PreferenceProfile[];
    exportedAt: number;
  } {
    return {
      activeProfileId: this.activeProfileId,
      profiles: Array.from(this.profiles.values()),
      exportedAt: Date.now()
    };
  }

  /**
   * Import preferences from backup
   */
  importPreferences(data: {
    activeProfileId: string;
    profiles: PreferenceProfile[];
    exportedAt: number;
  }): boolean {
    try {
      // Clear existing custom profiles
      for (const [id, profile] of this.profiles) {
        if (!profile.isDefault) {
          this.profiles.delete(id);
        }
      }

      // Import profiles
      data.profiles.forEach(profile => {
        if (!profile.isDefault) {
          this.profiles.set(profile.id, profile);
        }
      });

      // Switch to active profile if it exists
      if (this.profiles.has(data.activeProfileId)) {
        this.switchProfile(data.activeProfileId);
      }

      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }

  /**
   * Reset to default preferences
   */
  resetToDefaults(): void {
    this.preferences = this.getDefaultPreferences();
    this.activeProfileId = 'intermediate';
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Get recommendation based on user context
   */
  getRecommendedSettings(context: {
    userExperience: 'beginner' | 'intermediate' | 'expert';
    projectComplexity: 'simple' | 'moderate' | 'complex';
    timeConstraints: 'relaxed' | 'normal' | 'urgent';
  }): Partial<UserPreferences> {
    const recommendations: Partial<UserPreferences> = {};

    // Risk tolerance based on experience and project complexity
    if (context.userExperience === 'beginner' || context.projectComplexity === 'complex') {
      recommendations.riskTolerance = 'conservative';
    } else if (context.userExperience === 'expert' && context.projectComplexity === 'simple') {
      recommendations.riskTolerance = 'aggressive';
    } else {
      recommendations.riskTolerance = 'balanced';
    }

    // Execution mode based on time constraints and experience
    if (context.timeConstraints === 'urgent' && context.userExperience !== 'beginner') {
      recommendations.executionMode = 'turbo';
    } else if (context.timeConstraints === 'relaxed') {
      recommendations.executionMode = 'classic';
    } else {
      recommendations.executionMode = 'auto';
    }

    // Auto-resolve conflicts for beginners or urgent situations
    recommendations.autoResolveConflicts =
      context.userExperience === 'beginner' || context.timeConstraints === 'urgent';

    // Suggestion mode based on experience
    if (context.userExperience === 'beginner') {
      recommendations.suggestionMode = 'always';
    } else if (context.userExperience === 'expert') {
      recommendations.suggestionMode = 'on-demand';
    }

    return recommendations;
  }

  /**
   * Add preference change listener
   */
  addListener(listener: (preferences: UserPreferences) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove preference change listener
   */
  removeListener(listener: (preferences: UserPreferences) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Save preferences to storage
   */
  private saveToStorage(): void {
    try {
      if (typeof globalThis === 'undefined' || typeof (globalThis as any).localStorage === 'undefined' || typeof (globalThis as any).window === 'undefined') {
        // Node.js environment or localStorage not available
        return;
      }

      const data = {
        activeProfileId: this.activeProfileId,
        profiles: Array.from(this.profiles.entries())
      };
      (globalThis as any).localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  /**
   * Load preferences from storage
   */
  private loadFromStorage(): void {
    try {
      if (typeof globalThis === 'undefined' || typeof (globalThis as any).localStorage === 'undefined' || typeof (globalThis as any).window === 'undefined') {
        // Node.js environment or localStorage not available
        return;
      }

      const stored = globalThis.localStorage.getItem(this.storageKey);
      if (!stored) return;

      const data = JSON.parse(stored);

      // Load profiles
      if (data.profiles) {
        data.profiles.forEach(([id, profile]: [string, PreferenceProfile]) => {
          // Only load custom profiles, keep defaults
          if (!profile.isDefault) {
            this.profiles.set(id, profile);
          }
        });
      }

      // Set active profile
      if (data.activeProfileId && this.profiles.has(data.activeProfileId)) {
        this.activeProfileId = data.activeProfileId;
        this.preferences = { ...this.profiles.get(data.activeProfileId)!.preferences };
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }

  /**
   * Notify all listeners of preference changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.preferences);
      } catch (error) {
        console.error('Error in preference listener:', error);
      }
    });
  }

  /**
   * Validate preferences object
   */
  private validatePreferences(preferences: Partial<UserPreferences>): boolean {
    // Basic validation - in real implementation would be more comprehensive
    if (preferences.maxParallelTasks && (preferences.maxParallelTasks < 1 || preferences.maxParallelTasks > 3)) {
      return false;
    }

    if (preferences.analysisSettings?.confidenceThreshold) {
      const threshold = preferences.analysisSettings.confidenceThreshold;
      if (threshold < 0 || threshold > 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Auto-adjust preferences based on usage patterns
   */
  autoAdjustPreferences(usageData: {
    conflictFrequency: number;
    userSatisfaction: number;
    averageExecutionTime: number;
    manualInterventions: number;
  }): Partial<UserPreferences> {
    const adjustments: Partial<UserPreferences> = {};

    // If conflicts are frequent, suggest more conservative settings
    if (usageData.conflictFrequency > 0.3) {
      adjustments.riskTolerance = 'conservative';
      adjustments.autoResolveConflicts = true;
    }

    // If user satisfaction is low, suggest more assistance
    if (usageData.userSatisfaction < 3) {
      adjustments.suggestionMode = 'always';
      adjustments.analysisSettings = {
        ...this.preferences.analysisSettings,
        analysisDepth: 'thorough'
      };
    }

    // If user frequently intervenes manually, reduce automation
    if (usageData.manualInterventions > 5) {
      adjustments.autoResolveConflicts = false;
      adjustments.suggestionMode = 'on-demand';
    }

    return adjustments;
  }
}