# Project Brief

## Project Identity
**Project Name**: NocoDB
**Type**: Open Source Airtable Alternative
**License**: AGPLv3

## Core Purpose
NocoDB is the fastest and easiest way to build databases online. It's a no-code interface for databases that democratizes access to powerful computing tools. The mission is to provide the most powerful no-code interface for databases that is open source to every single internet business in the world.

## Architecture Overview
- Multi-database support including Oracle, PostgreSQL, MySQL, SQLite, etc.
- Database client abstraction layer (`sql-client`)
- Web-based spreadsheet-like interface
- REST APIs and SDK access
- Docker-based deployment
- Multi-tenant capability

## Current Task Context
**Security Vulnerability**: Multiple critical SQL injection vulnerabilities identified in Oracle Client (`packages/nocodb/src/db/sql-client/lib/oracle/OracleClient.ts`)

**Vulnerability Details**:
- CWE-89 (SQL Injection)
- Lines affected: 169, 325, 345, 399, 538, 563, 637, 683-685, 755, 808, 862, 909, 955, 995, 1035, 1081, 1123
- Cause: Direct string concatenation of user-controlled parameters into SQL queries
- Impact: Arbitrary SQL execution, data exfiltration, privilege escalation
- Risk Level: CRITICAL

**Affected Parameters**:
- `connectionConfig.connection.user`
- `args.tn` (table name)
- `args.databaseName`
- `args.function_name`
- `args.procedure_name`
- `args.view_name`
- `args.trigger_name`

## Technical Context
- Uses Knex.js as query builder
- Oracle-specific client implementation extends KnexClient
- Must maintain API compatibility while fixing vulnerabilities