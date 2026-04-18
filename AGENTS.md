# AGENTS.md

## Project identity
This repository contains the legacy version and/or redevelopment materials for ITII Assist Classroom, an academic classroom/lab management system.

## Primary goal
Build a complete documentation package for the legacy system so it can be used as the source of truth for V2 redevelopment.

## Documentation principles
- Prefer code-based truth over assumptions
- Do not hallucinate features
- When unclear, mark as "Needs verification"
- Use actual file paths whenever possible
- Distinguish clearly between implemented behavior, inferred behavior, and recommended future behavior

## Required documentation areas
- project overview
- business domain
- feature modules
- system architecture
- folder structure
- database schema
- API reference
- workflows
- business rules
- realtime events
- config and environment
- technical debt
- migration notes for V2
- AI handoff summary

## Output location
Write documentation to:
docs/legacy-system/

## Special V2 migration rule
The purpose of the documentation is to help future AI coding agents and developers understand the old system before redesigning V2.
Always include:
- what must be preserved
- what can be redesigned
- what is risky to rewrite
- what business logic is critical