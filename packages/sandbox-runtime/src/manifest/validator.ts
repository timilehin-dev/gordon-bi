import { PluginManifest, PluginConsentSummary, PluginPermissionDeclaration } from './types.js';
import { PluginManifestValidationError } from './errors.js';

export class PluginManifestValidator {
  public static validate(manifest: unknown): PluginManifest {
    if (!manifest || typeof manifest !== 'object') {
      throw new PluginManifestValidationError('Manifest must be a JSON object');
    }

    const m = manifest as Partial<PluginManifest>;
    const errors: string[] = [];

    if (!m.id || !/^[a-z0-9_\-]+$/.test(m.id)) {
      errors.push("Field 'id' is required and must be alphanumeric with dashes/underscores");
    }
    if (!m.name || typeof m.name !== 'string') {
      errors.push("Field 'name' is required");
    }
    if (!m.version || !/^\d+\.\d+\.\d+/.test(m.version)) {
      errors.push("Field 'version' must follow semver format (e.g. 1.0.0)");
    }
    if (!m.runtime || (m.runtime !== 'python' && m.runtime !== 'node')) {
      errors.push("Field 'runtime' must be either 'python' or 'node'");
    }
    if (!m.entryPoint || typeof m.entryPoint !== 'string') {
      errors.push("Field 'entryPoint' is required (e.g. main.py or index.js)");
    }
    if (!Array.isArray(m.permissions)) {
      errors.push("Field 'permissions' must be an array");
    }
    if (!Array.isArray(m.tools)) {
      errors.push("Field 'tools' must be an array");
    }

    if (errors.length > 0) {
      throw new PluginManifestValidationError('Invalid plugin manifest specification', errors);
    }

    return m as PluginManifest;
  }

  public static generateConsentSummary(manifest: PluginManifest): PluginConsentSummary {
    const plainEnglishPermissions = manifest.permissions.map((perm: PluginPermissionDeclaration) => {
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      let title = '';

      switch (perm.category) {
        case 'fs_read':
          title = `Read Files from: ${perm.scope}`;
          riskLevel = perm.scope === '*' ? 'high' : 'medium';
          break;
        case 'fs_write':
          title = `Write Files to: ${perm.scope}`;
          riskLevel = 'high';
          break;
        case 'network':
          title = `Network Access to: ${perm.scope}`;
          riskLevel = perm.scope === '*' ? 'high' : 'medium';
          break;
        case 'query':
          title = `Query Table Data: ${perm.scope}`;
          riskLevel = 'medium';
          break;
        case 'tool_call':
          title = `Invoke Analytical Tool: ${perm.scope}`;
          riskLevel = 'low';
          break;
      }

      return {
        title,
        description: perm.description || `Allows plugin to perform ${perm.category} on ${perm.scope}`,
        riskLevel,
      };
    });

    return {
      pluginId: manifest.id,
      pluginName: manifest.name,
      runtime: manifest.runtime,
      plainEnglishPermissions,
    };
  }
}
