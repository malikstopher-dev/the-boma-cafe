# The Boma Café Sandton
## AI Development Charter

This document overrides any tendency to simplify, remove, or redesign features for convenience. When implementation challenges arise, preserve the approved product vision and solve the engineering problem instead.

This document defines the engineering philosophy, architecture rules and development standards for this project.

Every AI agent working on this repository MUST read and follow this document before making changes.

Failure to follow these rules usually results in technical debt, regressions or architectural inconsistency.

---

# 1. PROJECT PURPOSE

This is NOT a demo.

This is NOT an AI experiment.

This is NOT a template.

This is a production-grade commercial restaurant platform being built for a real client.

The project must always be treated as enterprise software.

Every decision must prioritize:

- stability
- maintainability
- scalability
- security
- client experience
- future SaaS expansion

Never optimize for speed of completion over software quality.

---

# 2. CORE PHILOSOPHY

Do not simply make something work.

Understand WHY it works.

Understand WHY it failed.

Fix the root cause.

Never hide problems by removing functionality.

Removing a feature because it is difficult is considered a failure unless explicitly approved.

---

# 3. FUNCTIONALITY FIRST

Existing approved functionality must be preserved.

Never silently remove:

- booking features
- quotation features
- PDF generation
- CMS capabilities
- authentication
- pricing logic
- email workflows
- customer portal
- reporting
- audit logging

If something cannot currently work,

investigate WHY.

Design a proper solution.

Do not downgrade the product.

---

# 4. PRODUCTION THINKING

Every architectural decision should assume this system will eventually support:

- restaurants
- hotels
- lodges
- conference centres
- wedding venues
- event venues

Build for longevity.

Not shortcuts.

---

# 5. ROOT CAUSE ENGINEERING

Before changing code:

Understand the complete execution flow.

Identify the actual bottleneck.

Never patch symptoms.

Never guess.

Verify assumptions using the codebase.

---

# 6. NO ASSUMPTIONS

Never assume:

- framework behaviour
- platform limits
- API behaviour
- package capabilities
- runtime restrictions

Verify first.

State evidence.

Then proceed.

---

# 7. BEFORE REMOVING ANYTHING

Before deleting:

- package
- route
- component
- helper
- hook
- file
- export

prove it is unused.

Search the entire repository.

Show all references.

Only then request approval.

---

# 8. BUILD AFTER EVERY PHASE

After every logical group of changes:

Run

npm run build

Report:

- compilation
- TypeScript
- warnings
- routes
- bundle health

Never continue after a failing build.

---

# 9. DO NOT CHANGE BUSINESS LOGIC

Unless specifically instructed:

Never change:

booking workflow

pricing calculations

authentication

CMS behaviour

database behaviour

quotation logic

PDF content

email behaviour

payment workflow

customer experience

---

# 10. SECURITY

Never expose:

error.message

stack traces

database errors

internal IDs

secret keys

tokens

Always sanitize responses.

---

# 11. PERFORMANCE

Optimise only after correctness.

Never sacrifice reliability for micro-optimisations.

Never introduce complexity unless it produces measurable benefit.

---

# 12. DATABASE

Never modify schema blindly.

Every migration must:

- preserve existing data
- be idempotent where practical
- be reversible when possible
- explain risks

---

# 13. CLIENT EXPERIENCE

Customer experience is sacred.

Never redesign flows because they are easier to implement.

Example:

If customers currently receive:

Booking

↓

Professional quotation

↓

PDF

↓

Portal

↓

Future payment

that experience must remain.

Internal implementation may change.

Customer experience must not degrade.

---

# 14. PDF SYSTEM

The PDF quotation is a premium feature.

Do not remove it.

Do not replace it with a simple email.

Do not replace it with a download link only.

If technical limitations exist,

redesign the architecture,

not the feature.

---

# 15. DEBUGGING

When something fails:

Do not immediately rewrite code.

Investigate:

execution flow

runtime

logs

platform

dependencies

environment

Only then decide.

---

# 16. ENTERPRISE STANDARDS

Prefer architectures that include:

background processing

queues

retry mechanisms

audit logs

observability

configuration

feature flags

versioning

structured logging

graceful degradation

---

# 17. FUTURE SaaS

Every module should be evaluated for future reuse.

Avoid tightly coupling features to The Boma Café where generic abstractions make sense.

However:

Do not over-engineer.

Generalise only when there is a clear architectural benefit.

---

# 18. COMMUNICATION

Never silently make product decisions.

If multiple approaches exist:

Explain:

Option A

Option B

Option C

Recommend one.

Explain why.

Wait for approval before major architectural changes.

---

# 19. DEVELOPMENT PRINCIPLE

Think like:

Senior Software Architect

Senior Next.js Engineer

Senior Backend Engineer

Senior Database Architect

Senior DevOps Engineer

Senior Security Engineer

Senior Performance Engineer

Not like an autocomplete tool.

---

# 20. BACKGROUND PROCESSING STANDARD

Long-running or resource-intensive operations must never execute inside user-facing request/response cycles if they can impact responsiveness or reliability.

Examples include:

- PDF generation
- Email delivery
- Image processing
- Report generation
- Invoice generation
- Notifications
- Scheduled reminders
- Data exports
- Analytics processing

These operations should execute through a background job architecture with:

- durable job persistence
- retries
- idempotency
- status tracking
- audit logging
- administrative visibility
- graceful recovery from failures

User-facing requests should complete as quickly as possible while guaranteeing that background work can be safely completed afterward without compromising data integrity or user experience.

---

# 21. FINAL RULE

The objective is not to finish quickly.

The objective is to build software that a professional engineering team would be proud to maintain for years.

Every change should move the project closer to that standard.
