/**
 * Rollback Manager for Parallel Execution
 * Handles failure recovery and state rollback capabilities
 */

import { TaskState, ParallelTaskInfo } from '../types.js';
import { ExecutionResult, IsolatedTaskContext } from '../executors/parallel-executor.js';
import { ExecutionSnapshot, ExecutionStateManager } from '../state/state-manager.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface RollbackPoint {
  id: string;
  timestamp: number;
  description: string;
  snapshot: ExecutionSnapshot;
  filesBackup: Map<string, string>; // filePath -> content
  environmentBackup: Record<string, string>;
}

export interface RecoveryAction {
  type: 'restore_file' | 'restore_environment' | 'restart_task' | 'skip_task';
  taskId?: string;
  filePath?: string;
  data?: any;
}

export class RollbackManager {
  private rollbackPoints: Map<string, RollbackPoint>;
  private stateManager: ExecutionStateManager;
  private maxRollbackPoints: number;
  private backupDirectory: string;

  constructor(stateManager: ExecutionStateManager, backupDirectory: string, maxRollbackPoints: number = 10) {
    this.rollbackPoints = new Map();
    this.stateManager = stateManager;
    this.maxRollbackPoints = maxRollbackPoints;
    this.backupDirectory = backupDirectory;
  }

  async createRollbackPoint(description: string, affectedFiles: string[] = []): Promise<string> {
    const id = `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    // Create state snapshot
    const snapshot = this.stateManager.createSnapshot();

    // Backup affected files
    const filesBackup = new Map<string, string>();
    for (const filePath of affectedFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        filesBackup.set(filePath, content);
      } catch (error) {
        console.warn(`Failed to backup file ${filePath}:`, error);
      }
    }

    // Backup environment variables
    const environmentBackup: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        environmentBackup[key] = value;
      }
    }

    const rollbackPoint: RollbackPoint = {
      id,
      timestamp,
      description,
      snapshot,
      filesBackup,
      environmentBackup
    };

    // Store rollback point
    this.rollbackPoints.set(id, rollbackPoint);

    // Persist to disk
    await this.persistRollbackPoint(rollbackPoint);

    // Cleanup old rollback points
    await this.cleanupOldRollbackPoints();

    console.log(`Created rollback point: ${id} - ${description}`);
    return id;
  }

  async rollbackToPoint(rollbackId: string): Promise<boolean> {
    const rollbackPoint = this.rollbackPoints.get(rollbackId);
    if (!rollbackPoint) {
      console.error(`Rollback point ${rollbackId} not found`);
      return false;
    }

    try {
      console.log(`Rolling back to: ${rollbackPoint.description} (${new Date(rollbackPoint.timestamp).toISOString()})`);

      // Restore state manager state
      this.stateManager.rollbackToSnapshot(rollbackPoint.timestamp);

      // Restore files
      for (const [filePath, content] of rollbackPoint.filesBackup) {
        try {
          await fs.writeFile(filePath, content, 'utf-8');
          console.log(`Restored file: ${filePath}`);
        } catch (error) {
          console.error(`Failed to restore file ${filePath}:`, error);
        }
      }

      // Restore environment variables (selective)
      for (const [key, value] of Object.entries(rollbackPoint.environmentBackup)) {
        if (key.startsWith('SPEC_WORKFLOW_') || key.startsWith('PARALLEL_')) {
          process.env[key] = value;
        }
      }

      console.log(`Successfully rolled back to: ${rollbackId}`);
      return true;

    } catch (error) {
      console.error(`Failed to rollback to ${rollbackId}:`, error);
      return false;
    }
  }

  async handleTaskFailure(taskId: string, error: string, context: IsolatedTaskContext): Promise<RecoveryAction[]> {
    console.log(`Handling failure for task ${taskId}: ${error}`);

    const recoveryActions: RecoveryAction[] = [];
    const taskState = this.stateManager.getTaskState(taskId);

    if (!taskState) {
      return recoveryActions;
    }

    // Analyze failure type and suggest recovery actions
    if (error.includes('file not found') || error.includes('ENOENT')) {
      // File-related error
      recoveryActions.push({
        type: 'restore_file',
        taskId,
        data: { error: 'Missing file detected' }
      });
    } else if (error.includes('permission denied') || error.includes('EACCES')) {
      // Permission error
      recoveryActions.push({
        type: 'restore_environment',
        taskId,
        data: { error: 'Permission issue detected' }
      });
    } else if (error.includes('timeout') || error.includes('killed')) {
      // Timeout or kill signal
      recoveryActions.push({
        type: 'restart_task',
        taskId,
        data: { error: 'Task timeout detected' }
      });
    } else {
      // Unknown error - suggest skipping
      recoveryActions.push({
        type: 'skip_task',
        taskId,
        data: { error: 'Unknown error - consider skipping' }
      });
    }

    // Create automatic rollback point for this failure
    await this.createRollbackPoint(
      `Auto rollback before task ${taskId} failure`,
      context.getAllocatedResources()
    );

    return recoveryActions;
  }

  async recoverFromFailure(taskId: string, action: RecoveryAction): Promise<boolean> {
    try {
      switch (action.type) {
        case 'restore_file':
          return await this.restoreFilesForTask(taskId);

        case 'restore_environment':
          return await this.restoreEnvironmentForTask(taskId);

        case 'restart_task':
          return await this.restartTask(taskId);

        case 'skip_task':
          return await this.skipTask(taskId);

        default:
          console.warn(`Unknown recovery action type: ${action.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Recovery action ${action.type} failed for task ${taskId}:`, error);
      return false;
    }
  }

  private async restoreFilesForTask(taskId: string): Promise<boolean> {
    // Find the most recent rollback point that contains file backups
    const sortedRollbacks = Array.from(this.rollbackPoints.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    for (const rollback of sortedRollbacks) {
      if (rollback.filesBackup.size > 0) {
        console.log(`Restoring files from rollback point: ${rollback.id}`);

        for (const [filePath, content] of rollback.filesBackup) {
          try {
            await fs.writeFile(filePath, content, 'utf-8');
          } catch (error) {
            console.warn(`Failed to restore ${filePath}:`, error);
          }
        }
        return true;
      }
    }

    console.warn(`No file backups found for task ${taskId}`);
    return false;
  }

  private async restoreEnvironmentForTask(taskId: string): Promise<boolean> {
    // Find the most recent rollback point with environment backup
    const sortedRollbacks = Array.from(this.rollbackPoints.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    for (const rollback of sortedRollbacks) {
      if (Object.keys(rollback.environmentBackup).length > 0) {
        console.log(`Restoring environment from rollback point: ${rollback.id}`);

        // Restore relevant environment variables
        for (const [key, value] of Object.entries(rollback.environmentBackup)) {
          if (key.startsWith('SPEC_WORKFLOW_') || key.startsWith('PARALLEL_')) {
            process.env[key] = value;
          }
        }
        return true;
      }
    }

    console.warn(`No environment backup found for task ${taskId}`);
    return false;
  }

  private async restartTask(taskId: string): Promise<boolean> {
    console.log(`Marking task ${taskId} for restart`);

    // Reset task state to pending
    this.stateManager.updateTaskState(taskId, TaskState.PENDING, 0);

    return true;
  }

  private async skipTask(taskId: string): Promise<boolean> {
    console.log(`Skipping failed task ${taskId}`);

    // Mark task as completed with warning
    this.stateManager.updateTaskState(
      taskId,
      TaskState.COMPLETED,
      100,
      'Task skipped due to failure',
      'Task was skipped during recovery'
    );

    return true;
  }

  private async persistRollbackPoint(rollbackPoint: RollbackPoint): Promise<void> {
    try {
      await fs.mkdir(this.backupDirectory, { recursive: true });

      const filePath = path.join(this.backupDirectory, `${rollbackPoint.id}.json`);
      const data = {
        id: rollbackPoint.id,
        timestamp: rollbackPoint.timestamp,
        description: rollbackPoint.description,
        snapshot: {
          ...rollbackPoint.snapshot,
          tasks: Object.fromEntries(rollbackPoint.snapshot.tasks)
        },
        filesBackup: Object.fromEntries(rollbackPoint.filesBackup),
        environmentBackup: rollbackPoint.environmentBackup
      };

      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.warn(`Failed to persist rollback point ${rollbackPoint.id}:`, error);
    }
  }

  private async cleanupOldRollbackPoints(): Promise<void> {
    if (this.rollbackPoints.size <= this.maxRollbackPoints) {
      return;
    }

    // Sort by timestamp and remove oldest
    const sortedRollbacks = Array.from(this.rollbackPoints.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    const toRemove = sortedRollbacks.slice(0, this.rollbackPoints.size - this.maxRollbackPoints);

    for (const [id, rollback] of toRemove) {
      this.rollbackPoints.delete(id);

      // Remove from disk
      try {
        const filePath = path.join(this.backupDirectory, `${id}.json`);
        await fs.unlink(filePath);
      } catch (error) {
        console.warn(`Failed to remove rollback file for ${id}:`, error);
      }
    }
  }

  async loadPersistedRollbackPoints(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDirectory);

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.backupDirectory, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);

            const rollbackPoint: RollbackPoint = {
              id: data.id,
              timestamp: data.timestamp,
              description: data.description,
              snapshot: {
                ...data.snapshot,
                tasks: new Map(Object.entries(data.snapshot.tasks))
              },
              filesBackup: new Map(Object.entries(data.filesBackup)),
              environmentBackup: data.environmentBackup
            };

            this.rollbackPoints.set(rollbackPoint.id, rollbackPoint);
          } catch (error) {
            console.warn(`Failed to load rollback point from ${file}:`, error);
          }
        }
      }

      console.log(`Loaded ${this.rollbackPoints.size} rollback points`);
    } catch (error) {
      console.warn(`Failed to load persisted rollback points:`, error);
    }
  }

  getRollbackPoints(): RollbackPoint[] {
    return Array.from(this.rollbackPoints.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async deleteRollbackPoint(rollbackId: string): Promise<boolean> {
    const rollbackPoint = this.rollbackPoints.get(rollbackId);
    if (!rollbackPoint) {
      return false;
    }

    this.rollbackPoints.delete(rollbackId);

    // Remove from disk
    try {
      const filePath = path.join(this.backupDirectory, `${rollbackId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to remove rollback file for ${rollbackId}:`, error);
    }

    return true;
  }

  async clearAllRollbackPoints(): Promise<void> {
    for (const id of this.rollbackPoints.keys()) {
      await this.deleteRollbackPoint(id);
    }
  }
}