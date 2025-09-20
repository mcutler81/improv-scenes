import { persistentDB } from './persistentDatabase';

// Supervisor monitoring service to track decisions and performance
class SupervisorMonitor {
  constructor() {
    this.currentSceneData = null;
    this.sceneHistory = [];
    this.loadHistory();
  }

  // Start monitoring a new scene
  startScene(characters, audienceWord, settings) {
    this.currentSceneData = {
      sessionId: Date.now(),
      startTime: Date.now(),
      characters: characters.map(c => c.name),
      audienceWord,
      settings: { ...settings },
      decisions: [],
      sceneStates: [],
      performance: {
        totalDecisions: 0,
        aiDecisions: 0,
        fallbackDecisions: 0,
        averageDecisionTime: 0,
        participationBalance: {},
        turnTakingStrategy: settings.turnTakingStrategy
      }
    };

    // Initialize participation tracking
    characters.forEach(char => {
      this.currentSceneData.performance.participationBalance[char.name] = {
        turns: 0,
        words: 0,
        percentage: 0
      };
    });
  }

  // Log a supervisor decision
  logDecision(decision, sceneState, timeTaken = 0, isAI = true, error = null) {
    if (!this.currentSceneData) return;

    // Enhanced error information
    let errorInfo = null;
    if (error) {
      errorInfo = {
        message: error.message || 'Unknown error',
        type: error.name || 'Error',
        stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null,
        timestamp: Date.now()
      };

      // Log to console for debugging
      console.error('[SupervisorMonitor] Decision error captured:', {
        message: error.message,
        type: error.name,
        isAI,
        timeTaken,
        speaker: decision.speaker.name
      });
    }

    const decisionEntry = {
      timestamp: Date.now(),
      lineNumber: sceneState.totalLines + 1,
      speaker: decision.speaker.name,
      reason: decision.reason,
      sceneNote: decision.sceneNote,
      timeTaken, // milliseconds
      isAI,
      error: errorInfo,
      sceneContext: {
        energy: sceneState.sceneContext.energy,
        mood: sceneState.sceneContext.mood,
        location: sceneState.sceneContext.location,
        phase: sceneState.scenePhase,
        totalLines: sceneState.totalLines
      },
      participationAtTime: { ...sceneState.characterStats }
    };

    this.currentSceneData.decisions.push(decisionEntry);

    // Update performance metrics
    this.updatePerformanceMetrics(decision, timeTaken, isAI, error);
  }

  // Log scene state at decision time
  logSceneState(sceneState) {
    if (!this.currentSceneData) return;

    const stateEntry = {
      timestamp: Date.now(),
      totalLines: sceneState.totalLines,
      energy: sceneState.sceneContext.energy,
      mood: sceneState.sceneContext.mood,
      phase: sceneState.scenePhase,
      establishedElements: { ...sceneState.establishedElements },
      dramaticBeats: [...sceneState.dramaticBeats],
      characterStats: JSON.parse(JSON.stringify(sceneState.characterStats))
    };

    this.currentSceneData.sceneStates.push(stateEntry);
  }

  // Update performance metrics
  updatePerformanceMetrics(decision, timeTaken, isAI, error = null) {
    const perf = this.currentSceneData.performance;

    // Track error statistics
    if (error) {
      if (!perf.errorStats) {
        perf.errorStats = {
          totalErrors: 0,
          errorTypes: {},
          lastError: null
        };
      }

      perf.errorStats.totalErrors += 1;
      const errorType = error.message || 'Unknown error';
      perf.errorStats.errorTypes[errorType] = (perf.errorStats.errorTypes[errorType] || 0) + 1;
      perf.errorStats.lastError = {
        message: error.message,
        timestamp: Date.now(),
        isAI
      };
    }

    perf.totalDecisions += 1;
    if (isAI) {
      perf.aiDecisions += 1;
    } else {
      perf.fallbackDecisions += 1;
    }

    // Update average decision time
    const prevAvg = perf.averageDecisionTime;
    perf.averageDecisionTime = ((prevAvg * (perf.totalDecisions - 1)) + timeTaken) / perf.totalDecisions;

    // Update participation balance
    const speakerName = decision.speaker.name;
    if (perf.participationBalance[speakerName]) {
      perf.participationBalance[speakerName].turns += 1;

      // Calculate percentages
      const totalTurns = Object.values(perf.participationBalance).reduce((sum, char) => sum + char.turns, 0);
      Object.keys(perf.participationBalance).forEach(name => {
        perf.participationBalance[name].percentage = totalTurns > 0
          ? Math.round((perf.participationBalance[name].turns / totalTurns) * 100)
          : 0;
      });
    }
  }

  // End current scene and save to history
  endScene() {
    if (!this.currentSceneData) return;

    this.currentSceneData.endTime = Date.now();
    this.currentSceneData.duration = this.currentSceneData.endTime - this.currentSceneData.startTime;

    // Calculate final analytics
    this.calculateFinalAnalytics();

    // Add to history
    this.sceneHistory.unshift(this.currentSceneData);

    // Keep only last 10 scenes
    if (this.sceneHistory.length > 10) {
      this.sceneHistory = this.sceneHistory.slice(0, 10);
    }

    this.saveHistory();
    this.currentSceneData = null;
  }

  // Calculate comprehensive scene analytics
  calculateFinalAnalytics() {
    const data = this.currentSceneData;
    const decisions = data.decisions;

    // Calculate decision patterns
    const strategyEffectiveness = {
      aiSuccessRate: data.performance.aiDecisions / data.performance.totalDecisions,
      averageDecisionTime: data.performance.averageDecisionTime,
      fallbackRate: data.performance.fallbackDecisions / data.performance.totalDecisions
    };

    // Analyze participation balance
    const participationBalance = Object.values(data.performance.participationBalance);
    const avgParticipation = participationBalance.reduce((sum, char) => sum + char.percentage, 0) / participationBalance.length;
    const participationVariance = participationBalance.reduce((sum, char) =>
      sum + Math.pow(char.percentage - avgParticipation, 2), 0) / participationBalance.length;

    // Analyze scene development
    const sceneProgression = {
      setupToDevTime: this.findPhaseTransitionTime('setup', 'development'),
      devToClimaxTime: this.findPhaseTransitionTime('development', 'climax'),
      climaxToResTime: this.findPhaseTransitionTime('climax', 'resolution')
    };

    // Decision reasoning analysis
    const reasoningPatterns = {};
    decisions.forEach(decision => {
      const key = decision.reason.toLowerCase();
      reasoningPatterns[key] = (reasoningPatterns[key] || 0) + 1;
    });

    data.analytics = {
      strategyEffectiveness,
      participationBalance: {
        variance: participationVariance,
        isBalanced: participationVariance < 100 // Threshold for "balanced"
      },
      sceneProgression,
      reasoningPatterns,
      dramaticBeatsCount: data.sceneStates[data.sceneStates.length - 1]?.dramaticBeats?.length || 0
    };
  }

  // Find when scene transitioned between phases
  findPhaseTransitionTime(fromPhase, toPhase) {
    const states = this.currentSceneData.sceneStates;
    for (let i = 1; i < states.length; i++) {
      if (states[i-1].phase === fromPhase && states[i].phase === toPhase) {
        return states[i].timestamp - this.currentSceneData.startTime;
      }
    }
    return null;
  }

  // Get current scene data for monitoring
  getCurrentSceneData() {
    return this.currentSceneData;
  }

  // Get scene history
  getSceneHistory() {
    return this.sceneHistory;
  }

  // Get real-time supervisor statistics
  getCurrentStatistics() {
    if (!this.currentSceneData) return null;

    return {
      decisions: this.currentSceneData.decisions,
      performance: this.currentSceneData.performance,
      lastDecision: this.currentSceneData.decisions[this.currentSceneData.decisions.length - 1],
      sceneInfo: {
        duration: Date.now() - this.currentSceneData.startTime,
        audienceWord: this.currentSceneData.audienceWord,
        characters: this.currentSceneData.characters,
        settings: this.currentSceneData.settings
      }
    };
  }

  // Get performance insights for tuning
  getPerformanceInsights() {
    if (this.sceneHistory.length === 0) return null;

    const recentScenes = this.sceneHistory.slice(0, 5); // Last 5 scenes

    const insights = {
      averageAISuccessRate: recentScenes.reduce((sum, scene) =>
        sum + (scene.analytics?.strategyEffectiveness?.aiSuccessRate || 0), 0) / recentScenes.length,

      averageDecisionTime: recentScenes.reduce((sum, scene) =>
        sum + (scene.performance?.averageDecisionTime || 0), 0) / recentScenes.length,

      participationConsistency: recentScenes.filter(scene =>
        scene.analytics?.participationBalance?.isBalanced).length / recentScenes.length,

      commonReasoningPatterns: this.getMostCommonReasoningPatterns(recentScenes),

      recommendedTuning: this.generateTuningRecommendations(recentScenes)
    };

    return insights;
  }

  // Analyze most common reasoning patterns across scenes
  getMostCommonReasoningPatterns(scenes) {
    const allPatterns = {};
    scenes.forEach(scene => {
      if (scene.analytics?.reasoningPatterns) {
        Object.entries(scene.analytics.reasoningPatterns).forEach(([pattern, count]) => {
          allPatterns[pattern] = (allPatterns[pattern] || 0) + count;
        });
      }
    });

    return Object.entries(allPatterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }));
  }

  // Generate tuning recommendations based on performance
  generateTuningRecommendations(scenes) {
    const recommendations = [];

    const avgAISuccess = scenes.reduce((sum, scene) =>
      sum + (scene.analytics?.strategyEffectiveness?.aiSuccessRate || 0), 0) / scenes.length;

    const avgDecisionTime = scenes.reduce((sum, scene) =>
      sum + (scene.performance?.averageDecisionTime || 0), 0) / scenes.length;

    const participationIssues = scenes.filter(scene =>
      !scene.analytics?.participationBalance?.isBalanced).length;

    // AI performance recommendations
    if (avgAISuccess < 0.8) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        message: 'AI decision success rate is low. Consider adjusting prompt templates or OpenAI settings.',
        suggestion: 'Increase temperature for more creative decisions or refine supervisor prompts.'
      });
    }

    // Decision time recommendations
    if (avgDecisionTime > 3000) {
      recommendations.push({
        type: 'performance',
        severity: 'medium',
        message: 'Supervisor decisions are taking too long. This may affect scene flow.',
        suggestion: 'Consider simplifying supervisor prompts or using faster turn-taking strategies for smoother scenes.'
      });
    }

    // Participation balance recommendations
    if (participationIssues > scenes.length * 0.6) {
      recommendations.push({
        type: 'balance',
        severity: 'medium',
        message: 'Participation balance is inconsistent across scenes.',
        suggestion: 'Try stricter participation balance settings or adjust character interaction weights.'
      });
    }

    return recommendations;
  }

  // Save history to persistent database
  saveHistory() {
    try {
      persistentDB.saveMonitorHistory(this.sceneHistory);
    } catch (error) {
      console.warn('Could not save supervisor monitor history:', error);
    }
  }

  // Load history from persistent database
  loadHistory() {
    try {
      const saved = persistentDB.getMonitorHistory();
      if (saved && saved.length > 0) {
        this.sceneHistory = saved;
      }
    } catch (error) {
      console.warn('Could not load supervisor monitor history:', error);
      this.sceneHistory = [];
    }
  }

  // Clear all monitoring data
  clearHistory() {
    this.sceneHistory = [];
    this.saveHistory();
  }
}

// Global monitor instance
export const supervisorMonitor = new SupervisorMonitor();