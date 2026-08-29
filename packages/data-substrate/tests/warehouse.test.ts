import test from 'node:test';
import assert from 'node:assert/strict';
import { WarehouseEngine } from '../src/warehouse/engine.js';

test('WarehouseEngine - DuckDB table creation, querying, and schema inspection', async () => {
  const warehouse = new WarehouseEngine({ dbPath: ':memory:' });
  await warehouse.initialize();

  // Create table
  await warehouse.execute(`
    CREATE TABLE sales (
      id INTEGER,
      region VARCHAR,
      amount DOUBLE,
      recorded_date DATE
    )
  `);

  // Insert rows
  await warehouse.execute(`
    INSERT INTO sales VALUES 
      (1, 'North America', 12000.50, '2026-01-15'),
      (2, 'Europe', 8500.00, '2026-01-16'),
      (3, 'Asia Pacific', 15400.75, '2026-01-17')
  `);

  // Query table
  const queryResult = await warehouse.execute<{ id: number; region: string; amount: number }>(
    'SELECT region, amount FROM sales WHERE amount > 10000 ORDER BY amount DESC'
  );

  assert.equal(queryResult.rowCount, 2);
  assert.equal(queryResult.rows[0].region, 'Asia Pacific');
  assert.equal(queryResult.rows[0].amount, 15400.75);
  assert.equal(queryResult.rows[1].region, 'North America');

  // Verify Schema
  const schema = await warehouse.getTableSchema('sales');
  assert.equal(schema.tableName, 'sales');
  assert.equal(schema.columns.length, 4);
  assert.ok(schema.columns.some(c => c.name === 'region'));

  await warehouse.close();
});
