# Project Brief

## Overview
This is a NocoDB codebase - an open-source Airtable alternative that provides a database interface with REST APIs, webhooks, and various integrations.

## Completed Task ✅
**RESOLVED**: Fixed critical Server-Side Request Forgery (SSRF) vulnerability in the attachment upload service located at `packages/nocodb/src/services/v3/data-attachment-v3.service.ts:373-379`.

## Solution Implemented
Applied the existing NocoDB SSRF protection pattern using `request-filtering-agent`:

1. **Added import**: `import { useAgent } from 'request-filtering-agent';`
2. **Applied SSRF protection**: Added `httpAgent` and `httpsAgent` with `stopPortScanningByUrlRedirection: true`
3. **Maintained consistency**: Used the same pattern as webhooks and storage plugins
4. **Zero functional impact**: Transparent to legitimate users

## Security Improvements
- ✅ Blocks private IP ranges and cloud metadata endpoints
- ✅ Prevents access to dangerous protocols (file://, etc.)
- ✅ Stops internal network reconnaissance
- ✅ Validates redirects automatically
- ✅ Consistent with established codebase security architecture

## Critical Security Context
This was a **CRITICAL** vulnerability allowing authenticated users to perform SSRF attacks. Now **FULLY MITIGATED** with established protection patterns.