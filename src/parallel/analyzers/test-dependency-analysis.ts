/**
 * Simple test for dependency analysis
 * Run with: npx tsx src/parallel/analyzers/test-dependency-analysis.ts
 */

import { EnhancedTaskParser } from './enhanced-task-parser.js';

const testContent = `
# Tasks Implementation

## Main Tasks

- [ ] 1. Setup project structure
  - Create base directories
  - Initialize configuration

- [ ] 2. Implement authentication (depends on task 1)
  - Setup auth middleware
  - Create login endpoints
  
- [ ] 3. Create database schema (depends on task 1)
  - Design tables
  - Setup migrations

- [ ] 4. Implement API endpoints (requires task 2 and task 3)
  - User endpoints
  - Product endpoints
  
- [ ] 5. Add frontend components
  - No dependencies, can run in parallel
  
- [ ] 6. Write tests (after task 4)
  - Unit tests
  - Integration tests
`;

async function runTest() {
  console.log('🧪 Testing Enhanced Task Parser with Dependency Analysis\n');
  
  const parser = new EnhancedTaskParser();
  const result = await parser.parseWithDependencies(testContent);
  
  console.log('📊 Analysis Results:');
  console.log('==================\n');
  
  console.log(`Total tasks: ${result.tasks.length}`);
  console.log(`Independent tasks: ${result.dependencyAnalysis.metadata.independentTasks}`);
  console.log(`Max parallelism: ${result.dependencyAnalysis.metadata.maxParallelism}\n`);
  
  console.log('📋 Task Dependencies:');
  result.tasks.forEach(task => {
    console.log(`  ${task.id}: ${task.description.substring(0, 50)}...`);
    if (task.dependencies && task.dependencies.length > 0) {
      console.log(`    ├─ Dependencies: ${task.dependencies.join(', ')}`);
    }
    if (task.parallelSafe) {
      console.log(`    └─ ✅ Can run in parallel`);
    } else {
      console.log(`    └─ ⚠️  Has dependencies`);
    }
  });
  
  console.log('\n🔀 Parallel Groups:');
  result.dependencyAnalysis.parallelGroups.forEach((group, index) => {
    console.log(`  Group ${index + 1} (${group.risk} risk, ${group.confidence * 100}% confidence):`);
    console.log(`    Tasks: ${group.tasks.join(', ')}`);
    console.log(`    Reason: ${group.reason}`);
  });
  
  console.log('\n🔄 Execution Order:');
  result.dependencyAnalysis.executionOrder.forEach((level, index) => {
    console.log(`  Level ${index}: [${level.join(', ')}]`);
  });
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warning => {
      console.log(`  ${warning}`);
    });
  }
  
  console.log('\n📈 Graph Statistics:');
  const stats = result.graph.getStatistics();
  console.log(`  Total nodes: ${stats.totalTasks}`);
  console.log(`  Max depth: ${stats.maxDepth}`);
  console.log(`  Max width: ${stats.maxWidth}`);
  console.log(`  Has cycles: ${stats.hasCycles}`);
  console.log(`  Critical path length: ${stats.criticalPathLength}`);
  
  console.log('\n✅ Test completed successfully!');
}

runTest().catch(console.error);