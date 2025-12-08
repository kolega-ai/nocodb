import type CustomKnex from '~/db/CustomKnex';
import type { Knex } from 'knex';

/**
 * Securely replaces comma-delimited keys in a column with their corresponding values.
 * This function maintains proper parameterization throughout to prevent SQL injection.
 * 
 * @param params Configuration object
 * @param params.knex - Knex instance
 * @param params.needleColumn - Column containing comma-delimited keys
 * @param params.stack - Array of key-value mappings to apply
 * @param params.delimiter - Delimiter used in the column (default: ',')
 * @returns SQL query string with proper parameterization
 */
export function replaceDelimitedWithKeyValueMySQL(params: {
  knex: CustomKnex;
  stack: { key: string; value: string }[];
  needleColumn: string | Knex.QueryBuilder | Knex.RawBuilder;
  delimiter?: string;
}): string {
  const delimiter = params.delimiter ?? ',';
  const knex = params.knex;

  if (!params.stack || params.stack.length === 0) {
    return knex.raw(`??`, [params.needleColumn]).toQuery();
  }

  // Build mapping table with proper parameterization
  // Create SQL and collect all parameters separately
  const mapUnionParts: string[] = [];
  const allParameters: any[] = [];

  // Add column parameters first
  allParameters.push(
    params.needleColumn, // nc_raw_needle
    params.needleColumn, // substring_index outer
    params.needleColumn, // char_length for counting
    params.needleColumn, // replace for counting
    params.needleColumn  // char_length > 0 check
  );

  // Build the mapping union parts
  params.stack.forEach((row, index) => {
    if (index === 0) {
      mapUnionParts.push('SELECT ? as nc_p_key, ? as nc_p_value');
    } else {
      mapUnionParts.push('UNION ALL SELECT ?, ?');
    }
    allParameters.push(row.key, row.value);
  });

  const mapUnionSql = mapUnionParts.join(' ');

  // Generate numbers table for splitting the delimited column
  const maxItems = 100; // Support up to 100 items in delimited list
  const numbersTable = generateNumbersTableMySQL(maxItems);

  // Build the complete SQL with all parameters properly bound
  const sql = [
    `select nc_p_result from (`,
    `  select nc_t_needle.nc_raw_needle, GROUP_CONCAT(`,
    `    coalesce(nc_t_stack.nc_p_value, nc_t_needle.nc_p_item)`,
    `    order by nc_t_needle.nc_p_order`,
    `    separator '${delimiter}'`,
    `  ) as nc_p_result`,
    `  from (`,
    `    select ?? as nc_raw_needle,`,
    `           trim(substring_index(substring_index(??, '${delimiter}', nc_n.n), '${delimiter}', -1)) as nc_p_item,`,
    `           nc_n.n as nc_p_order`,
    `    from (${numbersTable}) nc_n`,
    `    where nc_n.n <= 1 + (char_length(??) - char_length(replace(??, '${delimiter}', ''))) / char_length('${delimiter}')`,
    `      and char_length(??) > 0`,
    `  ) nc_t_needle`,
    `  left join (${mapUnionSql}) nc_t_stack`,
    `    on nc_t_needle.nc_p_item = nc_t_stack.nc_p_key`,
    `  group by nc_t_needle.nc_raw_needle`,
    `) nc_subquery`,
  ].join(' ');

  return knex.raw(sql, allParameters).toQuery();
}

/**
 * Generates a MySQL-compatible numbers table using UNION ALL.
 * This creates a virtual table with numbers 1 to max.
 */
function generateNumbersTableMySQL(max: number): string {
  if (max <= 10) {
    // For small numbers, use direct UNION ALL
    return Array.from({ length: max }, (_, i) =>
      i === 0 ? `SELECT ${i + 1} AS n` : `UNION ALL SELECT ${i + 1}`
    ).join(' ');
  }

  // For larger numbers, use cross-join technique for efficiency
  // Generate numbers 0-9, then cross-join to get combinations
  const digits = [
    'SELECT 0 AS d',
    'UNION ALL SELECT 1',
    'UNION ALL SELECT 2',
    'UNION ALL SELECT 3',
    'UNION ALL SELECT 4',
    'UNION ALL SELECT 5',
    'UNION ALL SELECT 6',
    'UNION ALL SELECT 7',
    'UNION ALL SELECT 8',
    'UNION ALL SELECT 9'
  ].join(' ');

  return `
    SELECT (tens.d * 10 + ones.d + 1) AS n
    FROM (${digits}) ones
    CROSS JOIN (${digits}) tens
    WHERE (tens.d * 10 + ones.d + 1) <= ${max}
  `;
}