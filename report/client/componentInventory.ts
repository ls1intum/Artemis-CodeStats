import { Project } from 'ts-morph';
import * as path from 'path';

/**
 * Define interface for module statistics
 */
export interface ModuleStats {
    components: number;
    directives: number;
    pipes: number;
    injectables: number;
    total: number;
}

/**
 * Analyzes components, directives, and pipes by module
 * @param project The ts-morph Project to analyze
 * @param modules List of modules to analyze
 * @param basePath Base path for the application
 * @returns Component inventory statistics by module
 */
export function analyzeExistingComponents(
  project: Project, 
  modules: string[], 
  basePath: string
): Record<string, ModuleStats> {
  const stats: Record<string, ModuleStats> = {};

  // Initialize stats for each module
  modules.forEach(module => {
      stats[module] = { components: 0, directives: 0, pipes: 0, injectables: 0, total: 0 };
  });

  // Process each source file
  const sourceFiles = project.getSourceFiles();
  sourceFiles.forEach(file => {
      const filePath = file.getFilePath();

      // Determine which module this file belongs to
      const moduleName = modules.find(module =>
          filePath.includes(path.join(basePath, module))
      );

      if (!moduleName) return;

      // Find all classes with decorators
      const classes = file.getClasses();
      classes.forEach(cls => {
          const decorators = cls.getDecorators();

          decorators.forEach(decorator => {
              const decoratorName = decorator.getName();
              const decoratorText = decorator.getText();

              if (decoratorName === 'Component' || decoratorText.includes('@Component')) {
                  stats[moduleName].components++;
              } else if (decoratorName === 'Directive' || decoratorText.includes('@Directive')) {
                  stats[moduleName].directives++;
              } else if (decoratorName === 'Pipe' || decoratorText.includes('@Pipe')) {
                  stats[moduleName].pipes++;
              } else if (decoratorName === 'Injectable' || decoratorText.includes('@Injectable')) {
                  stats[moduleName].injectables++;
              }
          });
      });
  });

  // Calculate totals
  for (const module in stats) {
      stats[module].total =
          stats[module].components +
          stats[module].directives +
          stats[module].pipes +
          stats[module].injectables;
  }

  return stats;
}