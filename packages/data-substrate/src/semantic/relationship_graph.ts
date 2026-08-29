import { TableRelationship, Cardinality } from './types.js';
import { WarehouseEngine } from '../warehouse/engine.js';
import { SemanticModelError } from './errors.js';

export class RelationshipGraph {
  private relationships: Map<string, TableRelationship> = new Map();
  private warehouse: WarehouseEngine;

  constructor(warehouse: WarehouseEngine) {
    this.warehouse = warehouse;
  }

  public defineRelationship(rel: Omit<TableRelationship, 'id'>): TableRelationship {
    const id = `${rel.sourceTable}.${rel.sourceColumn}->${rel.targetTable}.${rel.targetColumn}`;
    const fullRel: TableRelationship = {
      id,
      ...rel,
    };
    this.relationships.set(id, fullRel);
    return fullRel;
  }

  public getRelationship(sourceTable: string, targetTable: string): TableRelationship | undefined {
    for (const rel of this.relationships.values()) {
      if (
        (rel.sourceTable === sourceTable && rel.targetTable === targetTable) ||
        (rel.sourceTable === targetTable && rel.targetTable === sourceTable)
      ) {
        return rel;
      }
    }
    return undefined;
  }

  public listRelationships(): TableRelationship[] {
    return Array.from(this.relationships.values());
  }

  public async inferRelationships(): Promise<TableRelationship[]> {
    const tables = await this.warehouse.getTables();
    const inferred: TableRelationship[] = [];

    for (let i = 0; i < tables.length; i++) {
      const source = tables[i];
      const sourceSchema = await this.warehouse.getTableSchema(source);

      for (let j = i + 1; j < tables.length; j++) {
        const target = tables[j];
        const targetSchema = await this.warehouse.getTableSchema(target);

        // Check common FK/PK naming patterns
        for (const sCol of sourceSchema.columns) {
          for (const tCol of targetSchema.columns) {
            const sName = sCol.name.toLowerCase();
            const tName = tCol.name.toLowerCase();

            const isMatch =
              sName === tName ||
              sName === `${target.toLowerCase()}_id` ||
              tName === `${source.toLowerCase()}_id` ||
              sName === `${target.toLowerCase()}_key` ||
              tName === `${source.toLowerCase()}_key`;

            if (isMatch) {
              const rel = this.defineRelationship({
                sourceTable: source,
                sourceColumn: sCol.name,
                targetTable: target,
                targetColumn: tCol.name,
                cardinality: 'N:1',
                isVerified: false,
              });
              inferred.push(rel);
            }
          }
        }
      }
    }

    return inferred;
  }
}
