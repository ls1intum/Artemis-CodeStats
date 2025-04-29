import { Project } from 'ts-morph';
import * as path from 'path';

/**
 * Define interface for change detection statistics
 */
export interface ChangeDetectionStats {
    explicitOnPush: number; // Explicitly set to OnPush
    explicitDefault: number; // Explicitly set to Default
    implicitDefault: number; // No explicit strategy specified (also Default)
    total: number;
}

/**
 * Analyzes change detection strategies by module
 * @param project The ts-morph Project to analyze
 * @param modules List of modules to analyze
 * @param basePath Base path for the application
 * @returns Change detection statistics by module
 */
export function analyzeChangeDetection(
  project: Project,
  modules: string[],
  basePath: string
): Record<string, ChangeDetectionStats> {
  const stats: Record<string, ChangeDetectionStats> = {};

  // Initialize stats for each module
  modules.forEach(module => {
      stats[module] = { explicitOnPush: 0, explicitDefault: 0, implicitDefault: 0, total: 0 };
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

      // Find all component decorators
      const classes = file.getClasses();
      classes.forEach(cls => {
          const decorators = cls.getDecorators();

          decorators.forEach(decorator => {
              if (decorator.getName() === 'Component' || decorator.getText().includes('@Component')) {
                  // Get the decorator arguments
                  const callExpr = decorator.getCallExpression();
                  if (!callExpr) return;

                  const args = callExpr.getArguments();
                  if (args.length === 0) return;

                  // Look for changeDetection property in the component decorator
                  const arg = args[0];
                  const text = arg.getText();

                  if (text.includes('ChangeDetectionStrategy.OnPush')) {
                      stats[moduleName].explicitOnPush++;
                  } else if (text.includes('ChangeDetectionStrategy.Default')) {
                      stats[moduleName].explicitDefault++;
                  } else {
                      stats[moduleName].implicitDefault++;
                  }
              }
          });
      });
  });

  // Calculate totals
  for (const module in stats) {
      stats[module].total =
          stats[module].explicitOnPush +
          stats[module].explicitDefault +
          stats[module].implicitDefault;
  }

  return stats;
}