/**
 * Security Fix Validation Tests
 * 
 * This test file validates that the SQL injection vulnerabilities in NocoDB's
 * MySQL query construction have been properly fixed.
 * 
 * Vulnerabilities Fixed:
 * 1. Vulnerability #6 - SQL Injection in User Display Name Filter Processing
 * 2. Vulnerability #8 - SQL Injection via .toQuery() String Conversion
 */

import { replaceDelimitedWithKeyValueMySQL } from '../../../src/db/aggregations/mysql';

// Mock Knex interface to test SQL generation
interface MockKnex {
  raw: (sql: string, bindings?: any[]) => MockQueryBuilder;
  clientType: () => string;
}

interface MockQueryBuilder {
  toQuery: () => string;
  toString: () => string;
  bindings: any[];
}

class MockQueryBuilder implements MockQueryBuilder {
  constructor(private sql: string, private _bindings: any[] = []) {}

  toQuery(): string {
    // Simulate Knex's toQuery() method - replaces ? with actual values
    let query = this.sql;
    let bindingIndex = 0;
    
    query = query.replace(/\?\?/g, () => {
      // ?? is for identifiers (column names)
      const binding = this._bindings[bindingIndex++];
      return `\`${binding}\``;
    });
    
    query = query.replace(/\?/g, () => {
      // ? is for values
      const binding = this._bindings[bindingIndex++];
      return typeof binding === 'string' ? `'${binding.replace(/'/g, "''")}'` : String(binding);
    });
    
    return query;
  }

  toString(): string {
    return this.toQuery();
  }

  get bindings(): any[] {
    return this._bindings;
  }
}

const mockKnex: MockKnex = {
  raw: (sql: string, bindings: any[] = []) => new MockQueryBuilder(sql, bindings),
  clientType: () => 'mysql2'
};

describe('MySQL Security Fix Tests', () => {
  describe('replaceDelimitedWithKeyValueMySQL', () => {
    it('should properly parameterize user input to prevent SQL injection', () => {
      // Malicious payload that would cause SQL injection in the old implementation
      const maliciousDisplayName = "'; DROP TABLE users; --";
      const maliciousEmail = "' OR '1'='1";
      
      const users = [
        { key: 'usr_001', value: maliciousDisplayName },
        { key: 'usr_002', value: maliciousEmail },
        { key: 'usr_003', value: 'Normal User' }
      ];

      const result = replaceDelimitedWithKeyValueMySQL({
        knex: mockKnex as any,
        needleColumn: 'created_by',
        stack: users,
      });

      // Verify that the result is a properly formed SQL query
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');

      // Verify that malicious input is treated as literal data, not SQL code
      expect(result).toContain("'''; DROP TABLE users; --''"); // Escaped properly
      expect(result).toContain("''' OR ''1''=''1''"); // Escaped properly
      expect(result).toContain("'Normal User'");

      // Verify that the SQL structure is intact (no broken syntax from injection)
      expect(result).toContain('SELECT');
      expect(result).toContain('GROUP_CONCAT');
      expect(result).toContain('LEFT JOIN');
      expect(result).not.toContain('DROP TABLE'); // Not as executed SQL
    });

    it('should handle empty user list without errors', () => {
      const result = replaceDelimitedWithKeyValueMySQL({
        knex: mockKnex as any,
        needleColumn: 'created_by',
        stack: [],
      });

      expect(result).toBe('`created_by`');
    });

    it('should handle special characters in display names safely', () => {
      const specialCharsUsers = [
        { key: 'usr_001', value: "O'Brien" }, // Apostrophe
        { key: 'usr_002', value: 'Smith & Jones' }, // Ampersand  
        { key: 'usr_003', value: 'User "Quote"' }, // Quotes
        { key: 'usr_004', value: 'User\\Backslash' }, // Backslash
        { key: 'usr_005', value: 'User%Wildcard_' }, // SQL wildcards
      ];

      const result = replaceDelimitedWithKeyValueMySQL({
        knex: mockKnex as any,
        needleColumn: 'created_by', 
        stack: specialCharsUsers,
      });

      expect(result).toBeDefined();
      // All special characters should be properly escaped
      expect(result).toContain("'O''Brien'");
      expect(result).toContain("'Smith & Jones'");
      expect(result).toContain("'User \"Quote\"'");
      expect(result).toContain("'User\\Backslash'");
      expect(result).toContain("'User%Wildcard_'");
    });

    it('should maintain proper query structure for large user lists', () => {
      // Test with many users to ensure query doesn't break
      const largeUserList = Array.from({ length: 50 }, (_, i) => ({
        key: `usr_${String(i).padStart(3, '0')}`,
        value: `User ${i}`
      }));

      const result = replaceDelimitedWithKeyValueMySQL({
        knex: mockKnex as any,
        needleColumn: 'created_by',
        stack: largeUserList,
      });

      expect(result).toBeDefined();
      expect(result).toContain('SELECT');
      expect(result).toContain('UNION ALL');
      expect(result.split('UNION ALL').length).toBe(50); // 50 users = 49 UNION ALLs + 1 initial SELECT
    });

    it('should use proper SQL syntax for MySQL', () => {
      const users = [
        { key: 'usr_001', value: 'Alice' },
        { key: 'usr_002', value: 'Bob' }
      ];

      const result = replaceDelimitedWithKeyValueMySQL({
        knex: mockKnex as any,
        needleColumn: 'created_by',
        stack: users,
      });

      // Verify MySQL-specific functions are used
      expect(result).toContain('SUBSTRING_INDEX'); // MySQL string function
      expect(result).toContain('CHAR_LENGTH'); // MySQL length function  
      expect(result).toContain('GROUP_CONCAT'); // MySQL aggregation
      expect(result).toContain('COALESCE'); // Standard SQL NULL handling
      
      // Verify proper column quoting for MySQL
      expect(result).toContain('`created_by`');
    });
  });

  describe('Regression Tests - Original Vulnerability Patterns', () => {
    it('should not contain the old vulnerable .toQuery() pattern', () => {
      // This test ensures we have eliminated the dangerous pattern
      const users = [
        { key: 'usr_001', value: "'; DROP TABLE users; --" }
      ];

      const result = replaceDelimitedWithKeyValueMySQL({
        knex: mockKnex as any,
        needleColumn: 'created_by',
        stack: users,
      });

      // The old vulnerable pattern would result in unescaped SQL injection
      // The new secure pattern properly escapes the malicious input
      expect(result).not.toContain("'; DROP TABLE users; --"); // Raw injection should be escaped
      expect(result).toContain("'''; DROP TABLE users; --''"); // Should be escaped
    });

    it('should maintain parameterization throughout query construction', () => {
      const users = [
        { key: 'usr_001', value: 'Test User' }
      ];

      const result = replaceDelimitedWithKeyValueMySQL({
        knex: mockKnex as any,
        needleColumn: 'created_by',
        stack: users,
      });

      // In the secure implementation, user data flows through as parameters
      // and gets properly escaped in the final query
      expect(result).toContain("'Test User'"); // Properly quoted
      expect(result).toContain("'usr_001'"); // Key also properly quoted
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle undefined/null values gracefully', () => {
      const users = [
        { key: 'usr_001', value: undefined as any },
        { key: 'usr_002', value: null as any },
        { key: 'usr_003', value: '' }
      ];

      const result = replaceDelimitedWithKeyValueMySQL({
        knex: mockKnex as any,
        needleColumn: 'created_by',
        stack: users,
      });

      expect(result).toBeDefined();
      expect(result).toContain("'usr_001'");
      expect(result).toContain("'usr_002'");
      expect(result).toContain("'usr_003'");
    });

    it('should handle unicode characters properly', () => {
      const users = [
        { key: 'usr_001', value: '田中太郎' }, // Japanese
        { key: 'usr_002', value: 'Владимир' }, // Russian  
        { key: 'usr_003', value: 'José María' }, // Spanish with accents
        { key: 'usr_004', value: '🎉 Emoji User 🚀' } // Emojis
      ];

      const result = replaceDelimitedWithKeyValueMySQL({
        knex: mockKnex as any,
        needleColumn: 'created_by',
        stack: users,
      });

      expect(result).toBeDefined();
      expect(result).toContain("'田中太郎'");
      expect(result).toContain("'Владимир'");
      expect(result).toContain("'José María'");
      expect(result).toContain("'🎉 Emoji User 🚀'");
    });

    it('should use custom delimiter when specified', () => {
      const users = [
        { key: 'usr_001', value: 'Alice' }
      ];

      const result = replaceDelimitedWithKeyValueMySQL({
        knex: mockKnex as any,
        needleColumn: 'created_by',
        stack: users,
        delimiter: ';'
      });

      expect(result).toBeDefined();
      // Should use semicolon as separator instead of comma
      expect(result).toContain("separator ';'");
      expect(result).toContain("';', nc_n.n), ';'");
    });
  });
});

/**
 * Integration Test Simulation
 * 
 * These tests simulate how the fix would work in the actual NocoDB codebase
 * by testing the patterns used in the fixed files.
 */
describe('Integration Simulation Tests', () => {
  // Simulate the pattern used in conditionV2.ts
  it('should safely handle user display name filtering (conditionV2.ts pattern)', () => {
    const mockUsers = [
      { 
        id: 'usr_abc123', 
        display_name: "'; DELETE FROM nc_bases WHERE id != ''; --",  // Malicious
        email: 'attacker@evil.com'
      },
      {
        id: 'usr_def456',
        display_name: null, // Will fall back to email
        email: 'normal@user.com'
      }
    ];

    const userMappings = mockUsers.map((user) => ({
      key: user.id,
      value: user.display_name || user.email,
    }));

    const result = replaceDelimitedWithKeyValueMySQL({
      knex: mockKnex as any,
      needleColumn: 'created_by',
      stack: userMappings,
    });

    // The malicious payload should be safely escaped
    expect(result).toContain("'''; DELETE FROM nc_bases WHERE id !=");
    // Normal user email should be handled properly  
    expect(result).toContain("'normal@user.com'");
  });

  // Simulate the pattern used in formulaQueryBuilderv2.ts
  it('should safely handle user email in formulas (formulaQueryBuilderv2.ts pattern)', () => {
    const mockBaseUsers = [
      { 
        id: 'usr_123', 
        email: "'; UPDATE nc_users SET role='admin' WHERE id='target'; --" // Malicious
      },
      {
        id: 'usr_456',
        email: 'normal@company.com'
      }
    ];

    const userMappings = mockBaseUsers.map((user) => ({
      key: user.id,
      value: `${user.email}`, // This pattern is used in the formula builder
    }));

    const result = replaceDelimitedWithKeyValueMySQL({
      knex: mockKnex as any,
      needleColumn: 'last_modified_by',
      stack: userMappings,
    });

    // Malicious email should be properly escaped
    expect(result).toContain("'''; UPDATE nc_users SET role=''admin''");
    // Normal email should work fine
    expect(result).toContain("'normal@company.com'");
  });
});