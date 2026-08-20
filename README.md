# Internal Ticketing System

## Overview
A modern, AI-augmented internal ticketing and IT service management platform. Designed for internal IT operations, it handles ticket lifecycles, SLAs, and intelligent ticket routing to ensure fast resolution times and comprehensive auditability.

## Why I Built It
Existing ITSM tools were either too rigid, overly complex, or lacked deep integration with modern AI capabilities for automated troubleshooting. I built this to provide a streamlined, intelligent support experience tailored for modern IT workflows.

## Architecture
\\\mermaid
graph TD;
    UI[Next.js 16 Frontend] --> API[Next.js API Routes / Server Actions];
    API --> DB[(Supabase PostgreSQL)];
    API --> AI[Google Gemini 2.5 Flash];
    
    subgraph Data Layer
      DB --> SLAEngine[SLA Tracking Engine];
      DB --> Audit[Audit & Event Logging];
    end
\\\

## Ticket Lifecycle
Tickets progress through a well-defined lifecycle: creation, assignment, in-progress, pending, and resolution. Users can add comments, internal notes, attachments, set priorities, and assign categories.

## SLA Engine
Includes a robust Service Level Agreement (SLA) engine that tracks resolution times against predefined policies and triggers automated alerts upon SLA breach detection.

## RBAC
Strict Role-Based Access Control ensures that only authorized IT staff can view internal notes, reassign tickets, or modify SLA policies, while standard users can only manage their own requests.

## Audit Trail
Every action—from status changes to comment edits—is recorded in a secure audit event log, providing complete transparency and accountability.

## AI Assistant
Leverages **Google Gemini 2.5 Flash** integrated with an intent/knowledge-base layer. Before falling back to the raw model, the AI scans internal documentation to provide context-aware, deterministic troubleshooting steps to users, deflecting common tickets.

## Tech Stack
* **Frontend/Backend:** Next.js 16, React 19, TypeScript
* **Database & Auth:** Supabase (PostgreSQL)
* **AI:** Google Gemini API

## Screenshots
*(Screenshots to be added here)*

## Roadmap
* Asset management integration
* Advanced reporting and metric exports
* Custom SLA policy builder

## Project Status
**APPROACHING BETA RELEASE** — Currently supporting 22 pilot users internally.
