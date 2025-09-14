/**
 * Unit tests for state manager
 * Run with: npx tsx src/parallel/state/state-manager.test.ts
 */

import { ExecutionStateManager } from './state-manager.js';
import { TaskState, ParallelTaskInfo } from '../types.js';

// Simple test framework
class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running State Manager Tests\n');

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.error(`   ${error}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

// Test utilities
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

// Create test suite
const runner = new TestRunner();

// Test 1: Initialize tasks
runner.test('should initialize tasks correctly', async () => {
  const stateManager = new ExecutionStateManager();

  const tasks: ParallelTaskInfo[] = [
    {
      id: '1',
      description: 'Task 1',
      parallelSafe: true,
      dependencies: [],
      completed: false
    },
    {
      id: '2',
      description: 'Task 2',
      parallelSafe: false,
      dependencies: ['1'],
      completed: false
    }
  ];

  stateManager.initializeTasks(tasks);

  const task1State = stateManager.getTaskState('1');
  const task2State = stateManager.getTaskState('2');

  assert(task1State !== null, 'Task 1 should exist');
  assert(task2State !== null, 'Task 2 should exist');

  assertEquals(task1State!.state, TaskState.PENDING);
  assertEquals(task2State!.state, TaskState.PENDING);
  assertEquals(task1State!.progress, 0);
  assertEquals(task2State!.dependencies.length, 1);
  assertEquals(task2State!.dependencies[0], '1');
});

// Test 2: Update task states
runner.test('should update task states correctly', async () => {
  const stateManager = new ExecutionStateManager();

  const tasks: ParallelTaskInfo[] = [
    {
      id: '1',
      description: 'Task 1',
      parallelSafe: true,
      dependencies: [],
      completed: false
    }
  ];

  stateManager.initializeTasks(tasks);

  stateManager.updateTaskState('1', TaskState.RUNNING, 50, 'Running task 1');

  const taskState = stateManager.getTaskState('1');
  assertEquals(taskState!.state, TaskState.RUNNING);
  assertEquals(taskState!.progress, 50);
  assertEquals(taskState!.output, 'Running task 1');
  assert(taskState!.startTime !== undefined, 'Should have start time');

  stateManager.updateTaskState('1', TaskState.COMPLETED, 100, 'Task 1 completed');

  const completedState = stateManager.getTaskState('1');
  assertEquals(completedState!.state, TaskState.COMPLETED);
  assertEquals(completedState!.progress, 100);
  assert(completedState!.endTime !== undefined, 'Should have end time');
});

// Test 3: Get ready tasks
runner.test('should identify ready tasks correctly', async () => {
  const stateManager = new ExecutionStateManager();

  const tasks: ParallelTaskInfo[] = [
    {
      id: '1',
      description: 'Independent task',
      parallelSafe: true,
      dependencies: [],
      completed: false
    },
    {
      id: '2',
      description: 'Dependent task',
      parallelSafe: false,
      dependencies: ['1'],
      completed: false
    },
    {
      id: '3',
      description: 'Another independent task',
      parallelSafe: true,
      dependencies: [],
      completed: false
    }
  ];

  stateManager.initializeTasks(tasks);

  const readyTasks = stateManager.getReadyTasks();
  assertEquals(readyTasks.length, 2);
  assert(readyTasks.includes('1'), 'Task 1 should be ready');
  assert(readyTasks.includes('3'), 'Task 3 should be ready');
  assert(!readyTasks.includes('2'), 'Task 2 should not be ready');

  // Complete task 1
  stateManager.updateTaskState('1', TaskState.COMPLETED);

  const readyTasksAfter = stateManager.getReadyTasks();
  assertEquals(readyTasksAfter.length, 2);
  assert(readyTasksAfter.includes('2'), 'Task 2 should now be ready');
  assert(readyTasksAfter.includes('3'), 'Task 3 should still be ready');
});

// Test 4: Execution progress
runner.test('should track execution progress correctly', async () => {
  const stateManager = new ExecutionStateManager();

  const tasks: ParallelTaskInfo[] = [
    { id: '1', description: 'Task 1', parallelSafe: true, dependencies: [], completed: false },
    { id: '2', description: 'Task 2', parallelSafe: true, dependencies: [], completed: false },
    { id: '3', description: 'Task 3', parallelSafe: true, dependencies: [], completed: false },
    { id: '4', description: 'Task 4', parallelSafe: true, dependencies: [], completed: false }
  ];

  stateManager.initializeTasks(tasks);

  let progress = stateManager.getExecutionProgress();
  assertEquals(progress.total, 4);
  assertEquals(progress.completed, 0);
  assertEquals(progress.failed, 0);
  assertEquals(progress.running, 0);
  assertEquals(progress.progress, 0);

  stateManager.updateTaskState('1', TaskState.RUNNING);
  stateManager.updateTaskState('2', TaskState.COMPLETED);

  progress = stateManager.getExecutionProgress();
  assertEquals(progress.running, 1);
  assertEquals(progress.completed, 1);
  assertEquals(progress.progress, 25); // 1 out of 4 completed

  stateManager.updateTaskState('3', TaskState.FAILED);

  progress = stateManager.getExecutionProgress();
  assertEquals(progress.failed, 1);
  assertEquals(progress.progress, 50); // 2 out of 4 done (completed + failed)
});

// Test 5: State snapshots
runner.test('should create and manage snapshots', async () => {
  const stateManager = new ExecutionStateManager();

  const tasks: ParallelTaskInfo[] = [
    { id: '1', description: 'Task 1', parallelSafe: true, dependencies: [], completed: false }
  ];

  stateManager.initializeTasks(tasks);

  const snapshot1 = stateManager.createSnapshot();
  assertEquals(snapshot1.totalTasks, 1);
  assertEquals(snapshot1.globalState, 'idle');

  stateManager.startExecution();
  stateManager.updateTaskState('1', TaskState.RUNNING);

  const snapshot2 = stateManager.createSnapshot();
  assertEquals(snapshot2.globalState, 'running');
  assertEquals(snapshot2.runningTasks, 1);

  // Check history
  const history = stateManager.getStateHistory();
  assert(history.length >= 2, 'Should have at least 2 snapshots in history');
});

// Test 6: Rollback capability
runner.test('should support rollback to previous snapshots', async () => {
  const stateManager = new ExecutionStateManager();

  const tasks: ParallelTaskInfo[] = [
    { id: '1', description: 'Task 1', parallelSafe: true, dependencies: [], completed: false }
  ];

  stateManager.initializeTasks(tasks);
  const initialSnapshot = stateManager.createSnapshot();

  stateManager.updateTaskState('1', TaskState.COMPLETED);
  assertEquals(stateManager.getTaskState('1')!.state, TaskState.COMPLETED);

  // Rollback
  const success = stateManager.rollbackToSnapshot(initialSnapshot.timestamp);
  assertEquals(success, true);

  const rolledBackState = stateManager.getTaskState('1');
  assertEquals(rolledBackState!.state, TaskState.PENDING);
});

// Test 7: State change listeners
runner.test('should notify state change listeners', async () => {
  const stateManager = new ExecutionStateManager();
  let notificationCount = 0;
  let lastSnapshot: any = null;

  stateManager.addStateChangeListener((snapshot) => {
    notificationCount++;
    lastSnapshot = snapshot;
  });

  const tasks: ParallelTaskInfo[] = [
    { id: '1', description: 'Task 1', parallelSafe: true, dependencies: [], completed: false }
  ];

  stateManager.initializeTasks(tasks);
  assert(notificationCount > 0, 'Should have received notifications');

  stateManager.updateTaskState('1', TaskState.RUNNING);
  assert(notificationCount >= 2, 'Should have received more notifications');
  assert(lastSnapshot !== null, 'Should have received snapshot');
});

// Test 8: Wait for task completion
runner.test('should wait for task completion', async () => {
  const stateManager = new ExecutionStateManager();

  const tasks: ParallelTaskInfo[] = [
    { id: '1', description: 'Task 1', parallelSafe: true, dependencies: [], completed: false }
  ];

  stateManager.initializeTasks(tasks);

  // Start waiting for completion
  const waitPromise = stateManager.waitForTaskCompletion('1');

  // Complete the task after a delay
  setTimeout(() => {
    stateManager.updateTaskState('1', TaskState.COMPLETED);
  }, 100);

  const completedSnapshot = await waitPromise;
  assertEquals(completedSnapshot.state, TaskState.COMPLETED);
});

// Test 9: Handle task failure in wait
runner.test('should handle task failure in wait', async () => {
  const stateManager = new ExecutionStateManager();

  const tasks: ParallelTaskInfo[] = [
    { id: '1', description: 'Task 1', parallelSafe: true, dependencies: [], completed: false }
  ];

  stateManager.initializeTasks(tasks);

  // Start waiting for completion
  const waitPromise = stateManager.waitForTaskCompletion('1');

  // Fail the task after a delay
  setTimeout(() => {
    stateManager.updateTaskState('1', TaskState.FAILED, undefined, undefined, 'Task failed');
  }, 100);

  try {
    await waitPromise;
    assert(false, 'Should have thrown an error');
  } catch (error) {
    assert((error as Error).message.includes('Task 1 failed'), 'Should contain failure message');
  }
});

// Test 10: Stop execution
runner.test('should stop execution and update all tasks', async () => {
  const stateManager = new ExecutionStateManager();

  const tasks: ParallelTaskInfo[] = [
    { id: '1', description: 'Task 1', parallelSafe: true, dependencies: [], completed: false },
    { id: '2', description: 'Task 2', parallelSafe: true, dependencies: [], completed: false },
    { id: '3', description: 'Task 3', parallelSafe: true, dependencies: [], completed: false }
  ];

  stateManager.initializeTasks(tasks);
  stateManager.startExecution();

  stateManager.updateTaskState('1', TaskState.COMPLETED);
  stateManager.updateTaskState('2', TaskState.RUNNING);
  // Task 3 remains pending

  stateManager.stopExecution();

  const task1 = stateManager.getTaskState('1');
  const task2 = stateManager.getTaskState('2');
  const task3 = stateManager.getTaskState('3');

  assertEquals(task1!.state, TaskState.COMPLETED); // Should remain completed
  assertEquals(task2!.state, TaskState.FAILED); // Should be marked as failed
  assertEquals(task3!.state, TaskState.FAILED); // Should be marked as failed

  const progress = stateManager.getExecutionProgress();
  assertEquals(progress.running, 0);
});

// Test 11: Complex dependency chain
runner.test('should handle complex dependency chains', async () => {
  const stateManager = new ExecutionStateManager();

  const tasks: ParallelTaskInfo[] = [
    { id: '1', description: 'Root', parallelSafe: true, dependencies: [], completed: false },
    { id: '2', description: 'Branch A', parallelSafe: false, dependencies: ['1'], completed: false },
    { id: '3', description: 'Branch B', parallelSafe: false, dependencies: ['1'], completed: false },
    { id: '4', description: 'Merge', parallelSafe: false, dependencies: ['2', '3'], completed: false }
  ];

  stateManager.initializeTasks(tasks);

  let readyTasks = stateManager.getReadyTasks();
  assertEquals(readyTasks.length, 1);
  assertEquals(readyTasks[0], '1');

  stateManager.updateTaskState('1', TaskState.COMPLETED);

  readyTasks = stateManager.getReadyTasks();
  assertEquals(readyTasks.length, 2);
  assert(readyTasks.includes('2'), 'Task 2 should be ready');
  assert(readyTasks.includes('3'), 'Task 3 should be ready');

  stateManager.updateTaskState('2', TaskState.COMPLETED);

  readyTasks = stateManager.getReadyTasks();
  assertEquals(readyTasks.length, 1);
  assertEquals(readyTasks[0], '3'); // Only task 3, task 4 still needs 3

  stateManager.updateTaskState('3', TaskState.COMPLETED);

  readyTasks = stateManager.getReadyTasks();
  assertEquals(readyTasks.length, 1);
  assertEquals(readyTasks[0], '4'); // Now task 4 is ready
});

// Run all tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});