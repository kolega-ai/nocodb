# NocoDB Project Brief

## Overview
NocoDB is an open-source no-code platform that transforms databases into smart spreadsheet interfaces. This is a TypeScript/Node.js project with a complex architecture handling various data operations.

## Current Task
Fixing a security vulnerability (CWE-209) - Information Exposure Through Error Messages in the data attachment service.

## Project Structure
- Monorepo structure using packages/
- Main backend in `packages/nocodb/`
- TypeScript-based with NestJS framework
- Services organized in version-specific directories (v3)
- Uses dependency injection and modular architecture

## Key Components Identified
- `DataAttachmentV3Service` - Handles file attachments for data records
- Error handling patterns using `NcError` utility
- Storage adapters for file operations
- Audit logging system

## Security Context
The vulnerability involves error messages exposing internal system information like:
- Absolute file paths
- System usernames
- Operating system details
- Internal ID structures