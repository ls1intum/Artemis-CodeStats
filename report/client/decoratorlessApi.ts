import { Project } from 'ts-morph';
import * as path from 'path';

/**
 * Define interface for decoratorless API statistics
 */
export interface DecoratorlessAPIStats {
    inputFunction: number;     // input(...)
    inputRequired: number;     // input.required(...)
    inputDecorator: number;    // @Input()
    outputFunction: number;    // output(...)
    outputDecorator: number;   // @Output()
    modelFunction: number;     // model(...)
    viewChildFunction: number; // viewChild(...)
    viewChildRequired: number; // viewChild.required(...)
    viewChildrenFunction: number; // viewChildren(...)
    viewChildDecorator: number;// @ViewChild()
    viewChildrenDecorator: number;// @ViewChildren()
    contentChildFunction: number; // contentChild(...)
    contentChildRequired: number; // contentChild.required(...)
    contentChildrenFunction: number; // contentChildren(...)
    contentChildDecorator: number; // @ContentChild()
    total: number;
}

/**
 * Analyzes decoratorless API usage vs traditional decorators
 * @param project The ts-morph Project to analyze
 * @param modules List of modules to analyze
 * @param basePath Base path for the application
 * @returns Decoratorless API usage statistics by module
 */
export function analyzeDecoratorlessAPI(
  project: Project,
  modules: string[],
  basePath: string
): Record<string, DecoratorlessAPIStats> {
  const stats: Record<string, DecoratorlessAPIStats> = {};

  // Initialize stats for each module
  modules.forEach(module => {
      stats[module] = {
          inputFunction: 0,
          inputRequired: 0,
          inputDecorator: 0,
          outputFunction: 0,
          outputDecorator: 0,
          modelFunction: 0,
          viewChildFunction: 0,
          viewChildRequired: 0,
          viewChildrenFunction: 0,
          viewChildDecorator: 0,
          viewChildrenDecorator: 0,
          contentChildFunction: 0,
          contentChildRequired: 0,
          contentChildrenFunction: 0,
          contentChildDecorator: 0,
          total: 0
      };
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

      // Find all classes with decorators (to limit scope to components, directives)
      const classes = file.getClasses();
      classes.forEach(cls => {
          // Check if this is an Angular component or directive
          const isAngularClass = cls.getDecorators().some(decorator => {
              const name = decorator.getName();
              return name === 'Component' || name === 'Directive';
          });

          if (!isAngularClass) return;

          // Analyze property decorators
          cls.getProperties().forEach(property => {
              // Check for decorator-based APIs
              if (property.getDecorator('Input')) {
                  stats[moduleName].inputDecorator++;
              }
              
              if (property.getDecorator('Output')) {
                  stats[moduleName].outputDecorator++;
              }
              
              if (property.getDecorator('ViewChild')) {
                  stats[moduleName].viewChildDecorator++;
              }

              if (property.getDecorator('ViewChildren')) {
                  stats[moduleName].viewChildrenDecorator++;
              }

              if (property.getDecorator('ContentChild')) {
                  stats[moduleName].contentChildDecorator++;
              }

              // Check for function-based APIs in property initializers
              const initializer = property.getInitializer();
              if (initializer) {
                  const initText = initializer.getText();
                  
                  // Input APIs
                  if (initText.match(/\binput\s*(<[^>]*>)?\s*\(/)) {
                      stats[moduleName].inputFunction++;
                  }
                  else if (initText.match(/\binput\.required\s*(<[^>]*>)?\s*\(/)) {
                      stats[moduleName].inputRequired++;
                  }
                  
                  // Output APIs
                  else if (initText.match(/\boutput\s*(<[^>]*>)?\s*\(/)) {
                      stats[moduleName].outputFunction++;
                  }
                  
                  // Model API
                  else if (initText.match(/\bmodel\s*(<[^>]*>)?\s*\(/)) {
                      stats[moduleName].modelFunction++;
                  }
                  
                  // View Query APIs
                  else if (initText.match(/\bviewChild\s*(<[^>]*>)?\s*\(/)) {
                      stats[moduleName].viewChildFunction++;
                  }
                  else if (initText.match(/\bviewChild\.required\s*(<[^>]*>)?\s*\(/)) {
                      stats[moduleName].viewChildRequired++;
                  }
                  else if (initText.match(/\bviewChildren\s*(<[^>]*>)?\s*\(/)) {
                      stats[moduleName].viewChildrenFunction++;
                  }
                  
                  // Content Query APIs
                  else if (initText.match(/\bcontentChild\s*(<[^>]*>)?\s*\(/)) {
                      stats[moduleName].contentChildFunction++;
                  }
                  else if (initText.match(/\bcontentChild\.required\s*(<[^>]*>)?\s*\(/)) {
                      stats[moduleName].contentChildRequired++;
                  }
                  else if (initText.match(/\bcontentChildren\s*(<[^>]*>)?\s*\(/)) {
                      stats[moduleName].contentChildrenFunction++;
                  }
              }
          });
      });
  });

  // Calculate totals
  for (const module in stats) {
      stats[module].total =
          stats[module].inputFunction +
          stats[module].inputRequired +
          stats[module].inputDecorator +
          stats[module].outputFunction +
          stats[module].outputDecorator +
          stats[module].modelFunction +
          stats[module].viewChildFunction +
          stats[module].viewChildRequired +
          stats[module].viewChildrenFunction +
          stats[module].viewChildDecorator +
          stats[module].viewChildrenDecorator +
          stats[module].contentChildFunction +
          stats[module].contentChildRequired +
          stats[module].contentChildrenFunction +
          stats[module].contentChildDecorator;
  }

  return stats;
}