# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spec Workflow MCP is a Model Context Protocol (MCP) server implementing a structured spec-driven development workflow with a real-time web dashboard and VSCode extension. The system helps manage software development through sequential specification documents (Requirements → Design → Tasks) with approval workflows and progress tracking.

## Development Commands

### Build & Development
```bash
# Full build (validates i18n, compiles TypeScript, builds dashboard)
npm run build

# Development mode with auto-reload
npm run dev

# Dashboard development with hot reload
npm run dev:dashboard

# Run production server
npm start

# Clean build artifacts
npm run clean
```

### Testing
```bash
# Run tests
npm test

# Watch mode for tests
npm run test:watch

# Coverage report
npm run test:coverage
```

### Validation
```bash
# Validate i18n translations
npm run validate:i18n
```

## Architecture

### Core Components

The project follows a modular architecture with clear separation of concerns:

1. **MCP Server (`src/server.ts`, `src/index.ts`)**: Main server handling MCP protocol communication with AI clients. Manages project initialization, dashboard lifecycle, and tool registration.

2. **Dashboard Backend (`src/dashboard/`)**: Fastify-based HTTP/WebSocket server providing real-time updates. Key components:
   - `server.ts`: Main dashboard server with WebSocket support
   - `watcher.ts`: File system monitoring for live updates
   - `approval-storage.ts`: Persistent approval workflow management

3. **Dashboard Frontend (`src/dashboard_frontend/`)**: React application with i18n support:
   - Vite-based build system
   - React Router for navigation
   - WebSocket integration for real-time updates
   - Multi-language support (11 languages)

4. **Core Services (`src/core/`)**: Business logic and utilities:
   - `session-manager.ts`: Dashboard session tracking
   - `parser.ts`: Spec document parsing and validation
   - `task-parser.ts`: Task extraction and progress tracking
   - `archive-service.ts`: Completed spec archival

5. **MCP Tools (`src/tools/`)**: Individual tool implementations exposed via MCP protocol
   - Each tool is a separate module with input validation
   - Tools communicate through the context object containing projectPath and sessionManager

6. **MCP Prompts (`src/prompts/`)**: Pre-configured prompts for AI guidance
   - Workflow guides and templates
   - Context builders for specs and steering documents

### Data Flow

1. AI clients communicate with MCP server via stdio transport
2. MCP server processes tool calls and manages file system operations
3. Dashboard server monitors file changes and broadcasts updates via WebSocket
4. Frontend receives updates and reflects current project state
5. Approval system uses persistent JSON storage with file-based tracking

### File System Structure

All project data is stored in `.spec-workflow/` directory:
- `steering/`: Project vision and technical decisions
- `specs/{spec-name}/`: Individual spec documents
- `approval/`: Approval request tracking
- `session.json`: Active dashboard session information
- `config.toml`: Configuration file (optional)

## Key Implementation Patterns

### Tool Context Pattern
All tools receive a standardized context object:
```typescript
interface ToolContext {
  projectPath: string;
  dashboardUrl?: string;
  sessionManager?: SessionManager;
  lang?: string;
}
```

### Approval Workflow
Documents go through approval states: pending → approved/rejected → revision_requested
Approval data persists in JSON files with unique IDs for tracking.

### WebSocket Broadcasting
Dashboard uses WebSocket for real-time updates with event types:
- `specsUpdated`: Spec list changes
- `specContentUpdated`: Document content changes
- `approvalRequested`: New approval request
- `approvalStatusChanged`: Approval state change

### I18n Implementation
- Backend passes language preference to tools
- Frontend uses react-i18next with automatic language detection
- All UI strings are externalized in locale JSON files

## Configuration

The server supports both command-line arguments and TOML configuration files. Command-line arguments take precedence over config files.

Configuration locations (in order of precedence):
1. Command-line arguments
2. Custom config file (via `--config` flag)
3. Default config: `.spec-workflow/config.toml`
4. Built-in defaults

## TypeScript Configuration

The project uses ES2022 modules with Node16 module resolution. The dashboard frontend is excluded from backend compilation and has its own Vite-based build process.