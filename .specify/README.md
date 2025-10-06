# .specify/ Directory

**Purpose**: Single source of truth for requirements, tasks, and implementation specifications using SPARC methodology.

## Directory Structure

```
.specify/
├── README.md              # This file
├── requirements/          # High-level phase requirements
│   ├── phase-2-database.md
│   ├── phase-3-backend.md
│   ├── phase-4-frontend.md
│   ├── phase-5-ai.md
│   ├── phase-6-realtime.md
│   └── phase-7-widget.md
├── tasks/                 # Granular implementation tasks
│   ├── 2.1-database-schema.md
│   ├── 2.2-lucia-auth.md
│   ├── 3.1-trpc-routers.md
│   └── [phase].[task]-[name].md
└── templates/             # Templates for creating new specs
    ├── requirement-template.md
    └── task-template.md
```

## How to Use

### 1. Read Before Implementing

Before starting any implementation:
```
Read .specify/requirements/phase-[N]-[name].md
Read .specify/tasks/[N].[task]-[name].md
```

### 2. Task-Driven Development

Each task follows this structure:
- **Dependencies**: What must be complete first
- **Location**: Where code lives in monorepo
- **Acceptance Criteria**: Checklist of requirements
- **Test Requirements**: Coverage and test cases

### 3. Implementation Workflow

```bash
# 1. Read task specification
# 2. Create feature branch
git checkout -b feature/[task-name]

# 3. Write tests first (TDD)
# 4. Implement to pass tests
# 5. Verify acceptance criteria
# 6. Create PR with reference to .specify/ task
```

## SPARC Methodology

**Specification → Pseudocode → Architecture → Refinement → Completion**

### Specification
- Write detailed requirements in `.specify/requirements/`
- Define acceptance criteria
- Identify dependencies

### Pseudocode
- Outline algorithm/logic in task specification
- Break complex tasks into steps
- Document edge cases

### Architecture
- Reference `docs/architecture/` for system design
- Document component interactions
- Define interfaces and types

### Refinement
- Test-driven development (write tests first)
- Iterate on implementation
- Code review against specification

### Completion
- All acceptance criteria met
- Tests pass with ≥80% coverage
- Documentation updated
- PR approved and merged

## Templates

Use templates to create new specifications:

### Create New Requirement
```bash
cp .specify/templates/requirement-template.md .specify/requirements/phase-[N]-[name].md
# Fill in details
```

### Create New Task
```bash
cp .specify/templates/task-template.md .specify/tasks/[N].[task]-[name].md
# Fill in details
```

## Integration with Claude Code

Claude Code reads `.specify/` files to understand:
- What to build (requirements)
- How to build it (tasks)
- When it's done (acceptance criteria)

**Example prompt**:
```
Read .specify/tasks/3.1-trpc-routers.md and implement the RAG query router
following the acceptance criteria. Write tests first.
```

## Best Practices

1. **Keep tasks atomic**: Each task should be completable in 1-4 hours
2. **Clear acceptance criteria**: Use checkboxes for measurable outcomes
3. **Document dependencies**: Reference prerequisite tasks explicitly
4. **Update as you learn**: Specifications can evolve based on implementation discoveries
5. **Link to planning docs**: Reference `docs/guides/roadmap.md` and `docs/architecture/`

## Status Tracking

- ⏳ **Pending**: Task not started
- 🔄 **In Progress**: Currently being implemented
- ✅ **Complete**: All acceptance criteria met, PR merged
- 🚫 **Blocked**: Waiting on dependencies

Track status in task files using checkboxes and status badges.
