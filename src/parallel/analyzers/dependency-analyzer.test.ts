/**
 * Unit tests for dependency analyzer
 * Run with: npx tsx src/parallel/analyzers/dependency-analyzer.test.ts
 */

import { DependencyAnalyzer } from './dependency-analyzer.js';
import { ParallelTaskInfo } from '../types.js';

// Simple test framework
class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running Dependency Analyzer Tests\n');

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

function assertArrayEquals(actual: any[], expected: any[], message?: string) {
  if (actual.length !== expected.length || !actual.every((v, i) => v === expected[i])) {
    throw new Error(message || `Arrays not equal: [${actual}] !== [${expected}]`);
  }
}

// Create test suite
const runner = new TestRunner();
const analyzer = new DependencyAnalyzer();

// Test 1: Simple independent tasks
runner.test('should identify independent tasks', async () => {
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
      parallelSafe: true,
      dependencies: [],
      completed: false
    }
  ];

  const result = await analyzer.analyzeDependencies(tasks);

  assertEquals(result.metadata.independentTasks, 2);
  assertEquals(result.parallelGroups[0].tasks.length, 2);
  assertEquals(result.parallelGroups[0].risk, 'low');
});

// Test 2: Linear dependency chain
runner.test('should handle linear dependencies', async () => {
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
    },
    {
      id: '3',
      description: 'Task 3',
      parallelSafe: false,
      dependencies: ['2'],
      completed: false
    }
  ];

  const result = await analyzer.analyzeDependencies(tasks);

  assertEquals(result.metadata.independentTasks, 1);
  assertEquals(result.executionOrder.length, 3);
  assertArrayEquals(result.executionOrder[0], ['1']);
  assertArrayEquals(result.executionOrder[1], ['2']);
  assertArrayEquals(result.executionOrder[2], ['3']);
});

// Test 3: Diamond dependency pattern
runner.test('should handle diamond dependencies', async () => {
  const tasks: ParallelTaskInfo[] = [
    {
      id: '1',
      description: 'Start',
      parallelSafe: true,
      dependencies: [],
      completed: false
    },
    {
      id: '2',
      description: 'Branch A',
      parallelSafe: false,
      dependencies: ['1'],
      completed: false
    },
    {
      id: '3',
      description: 'Branch B',
      parallelSafe: false,
      dependencies: ['1'],
      completed: false
    },
    {
      id: '4',
      description: 'Merge',
      parallelSafe: false,
      dependencies: ['2', '3'],
      completed: false
    }
  ];

  const result = await analyzer.analyzeDependencies(tasks);

  // Tasks 2 and 3 should be in the same parallel group
  const parallelGroup = result.parallelGroups.find(g =>
    g.tasks.includes('2') && g.tasks.includes('3')
  );
  assert(parallelGroup !== undefined, 'Should find parallel group for tasks 2 and 3');
  assertEquals(parallelGroup!.reason, 'Share dependencies: 1');
});

// Test 4: Circular dependency detection
runner.test('should detect circular dependencies', async () => {
  const tasks: ParallelTaskInfo[] = [
    {
      id: '1',
      description: 'Task 1',
      parallelSafe: false,
      dependencies: ['3'],
      completed: false
    },
    {
      id: '2',
      description: 'Task 2',
      parallelSafe: false,
      dependencies: ['1'],
      completed: false
    },
    {
      id: '3',
      description: 'Task 3',
      parallelSafe: false,
      dependencies: ['2'],
      completed: false
    }
  ];

  const result = await analyzer.analyzeDependencies(tasks);

  assert(result.circularDependencies.length > 0, 'Should detect circular dependency');
  const circle = result.circularDependencies[0];
  assert(circle.length >= 3, 'Circular dependency should include all three tasks');
});

// Test 5: Resource conflict detection
runner.test('should detect resource conflicts', async () => {
  const tasks: ParallelTaskInfo[] = [
    {
      id: '1',
      description: 'Task 1',
      parallelSafe: true,
      dependencies: [],
      resources: ['database', 'api'],
      completed: false
    },
    {
      id: '2',
      description: 'Task 2',
      parallelSafe: true,
      dependencies: [],
      resources: ['database', 'cache'],
      completed: false
    }
  ];

  const result = await analyzer.analyzeDependencies(tasks);

  assert(result.potentialConflicts.length > 0, 'Should detect resource conflict');
  const conflict = result.potentialConflicts[0];
  assertEquals(conflict.type, 'resource');
  assert(conflict.description.includes('database'), 'Should mention conflicting resource');
});

// Test 6: Maximum parallelism calculation
runner.test('should calculate maximum parallelism', async () => {
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
      parallelSafe: true,
      dependencies: [],
      completed: false
    },
    {
      id: '3',
      description: 'Task 3',
      parallelSafe: true,
      dependencies: [],
      completed: false
    },
    {
      id: '4',
      description: 'Task 4',
      parallelSafe: false,
      dependencies: ['1', '2', '3'],
      completed: false
    }
  ];

  const result = await analyzer.analyzeDependencies(tasks);

  assertEquals(result.metadata.maxParallelism, 3);
  assertEquals(result.metadata.independentTasks, 3);
});

// Test 7: Time saving estimation
runner.test('should estimate time savings', async () => {
  const tasks: ParallelTaskInfo[] = [
    {
      id: '1',
      description: 'Task 1',
      parallelSafe: true,
      dependencies: [],
      estimatedDuration: 10000,
      completed: false
    },
    {
      id: '2',
      description: 'Task 2',
      parallelSafe: true,
      dependencies: [],
      estimatedDuration: 10000,
      completed: false
    }
  ];

  const result = await analyzer.analyzeDependencies(tasks);

  // Sequential: 20000ms, Parallel: 10000ms, Saving: 10000ms
  assertEquals(result.metadata.estimatedTimeSaving, 10000);
});

// Test 8: Complex dependency graph
runner.test('should handle complex dependency graphs', async () => {
  const tasks: ParallelTaskInfo[] = [
    { id: '1', description: 'Init', parallelSafe: true, dependencies: [], completed: false },
    { id: '2', description: 'Setup A', parallelSafe: false, dependencies: ['1'], completed: false },
    { id: '3', description: 'Setup B', parallelSafe: false, dependencies: ['1'], completed: false },
    { id: '4', description: 'Process A1', parallelSafe: false, dependencies: ['2'], completed: false },
    { id: '5', description: 'Process A2', parallelSafe: false, dependencies: ['2'], completed: false },
    { id: '6', description: 'Process B', parallelSafe: false, dependencies: ['3'], completed: false },
    { id: '7', description: 'Merge', parallelSafe: false, dependencies: ['4', '5', '6'], completed: false },
    { id: '8', description: 'Finalize', parallelSafe: false, dependencies: ['7'], completed: false }
  ];

  const result = await analyzer.analyzeDependencies(tasks);

  assertEquals(result.metadata.totalTasks, 8);
  assertEquals(result.metadata.independentTasks, 1);
  assert(result.executionOrder.length >= 4, 'Should have at least 4 execution levels');

  // Check that merge happens after all processes
  const mergeLevel = result.executionOrder.findIndex(level => level.includes('7'));
  const processLevel = result.executionOrder.findIndex(level =>
    level.includes('4') || level.includes('5') || level.includes('6')
  );
  assert(mergeLevel > processLevel, 'Merge should happen after processes');
});

// Test 9: Empty task list
runner.test('should handle empty task list', async () => {
  const tasks: ParallelTaskInfo[] = [];
  const result = await analyzer.analyzeDependencies(tasks);

  assertEquals(result.metadata.totalTasks, 0);
  assertEquals(result.metadata.independentTasks, 0);
  assertEquals(result.parallelGroups.length, 0);
  assertEquals(result.circularDependencies.length, 0);
});

// Test 10: Single task
runner.test('should handle single task', async () => {
  const tasks: ParallelTaskInfo[] = [
    {
      id: '1',
      description: 'Single task',
      parallelSafe: true,
      dependencies: [],
      completed: false
    }
  ];

  const result = await analyzer.analyzeDependencies(tasks);

  assertEquals(result.metadata.totalTasks, 1);
  assertEquals(result.metadata.independentTasks, 1);
  assertEquals(result.metadata.maxParallelism, 1);
});

// Run all tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});