/**
 * # Angular Technical Debt Analyzer
 *
 * ## Purpose:
 * Uncover and manage technical debt across your Angular modules through
 * incremental, actionable metrics. Add one metric at a time and watch your
 * debt score evolve with your codebase.
 *
 * ## Component Inventory
 * - Count `@Component`, `@Directive`, `@Pipe`, `@Injectable` declarations
 * - Track `@Input` / `@Output` and `@ViewChild` / `@ViewChildren` vs. modern usage
 *
 * ## Change Detection
 * - Identify explicit `OnPush`, explicit `Default`, and implicit (none)
 * - **Goal:** 100% explicit `OnPush` for consistent, performant rendering -> Phase out ZoneJS
 *
 * ## Signal Readiness
 * - Detect components using Angular signals `signal`, ignore `OnPush` components
 *
 * ## Complexity & Dependencies
 * - Measure lines of code (LOC) and method count per component
 * - Audit imports: internal modules, npm packages, cross-module links
 *   **Goal:** eliminate cross-module dependencies outside of `shared` and `core` module
 *
 * ## RxJS Usage
 * - Count `subscribe` / `unsubscribe` calls
 *   **Goal:** Reduce in favor of `async` pipe and signals
 * - List other RxJS imports and usages
 *
 * ## Service Catalog
 * - Count services (`*.service.ts`)
 * - Measure lines of code (LOC) and method count per service
 * - Distinguish generated vs custom services to favor automation
 *
 * ## Test Coverage
 * - Report spec files and their associations
 * - Count `describe` / `it` blocks and coverage % per module
 *
 * ## Dashboard Vision
 * - CRON job to run this script weekly and generate a report
 * - Weekly trend data with clear deltas
 * - "Hotspots" ranked by composite debt score
 * - Team/feature comparisons to focus refactoring efforts
 */

import { Project } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

const repoDir = path.join(process.cwd(), 'artemis');
const basePath = 'src/main/webapp/app';
const modules = [
    'admin',
    'assessment',
    'atlas',
    'buildagent',
    'communication',
    'core',
    'exam',
    'exercise',
    'fileupload',
    'iris',
    'lecture',
    'lti',
    'modeling',
    'plagiarism',
    'programming',
    'quiz',
    'shared',
    'text',
    'tutorialgroup'
];

// Initialize the project
const project = new Project({
    tsConfigFilePath: path.join(repoDir, 'tsconfig.json'),
});

// Add source files from each module
modules.forEach(moduleName => {
    const modulePath = path.join(repoDir, moduleName);
    if (fs.existsSync(modulePath)) {
        project.addSourceFilesAtPaths(path.join(modulePath, '**/*.ts'));
    }
});

// Define interface for module statistics
interface ModuleStats {
    components: number;
    directives: number;
    pipes: number;
    injectables: number;
    total: number;
}

// Define interface for change detection statistics
interface ChangeDetectionStats {
    onPush: number;
    default: number;
    implicit: number; // No explicit strategy specified (also Default)
    total: number;
}

// Analyze components, directives, and pipes by module
function analyzeModules(): Record<string, ModuleStats> {
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

// Analyze change detection strategies by module
function analyzeChangeDetection(): Record<string, ChangeDetectionStats> {
    const stats: Record<string, ChangeDetectionStats> = {};

    // Initialize stats for each module
    modules.forEach(module => {
        stats[module] = { onPush: 0, default: 0, implicit: 0, total: 0 };
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
                        stats[moduleName].onPush++;
                    } else if (text.includes('ChangeDetectionStrategy.Default')) {
                        stats[moduleName].default++;
                    } else {
                        stats[moduleName].implicit++;
                    }
                }
            });
        });
    });

    // Calculate totals
    for (const module in stats) {
        stats[module].total =
            stats[module].onPush +
            stats[module].default +
            stats[module].implicit;
    }

    return stats;
}

function saveReportToData() {
    // Get the module stats
    const componentStats = analyzeModules();
    const changeDetectionStats = analyzeChangeDetection();
    
    // Create a JSON structure
    const reportData = {
        metadata: {
            title: "Angular Technical Debt Analysis Report",
            generatedAt: new Date().toISOString()
        },
        componentInventory: componentStats,
        changeDetection: changeDetectionStats
    };

    // Convert to JSON string
    const jsonContent = JSON.stringify(reportData, null, 2);
    
    // Output handling - always to file
    const reportsDir = path.join(process.cwd(), 'data');
    // Create reports directory if it doesn't exist
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFilePath = path.join(reportsDir, `angular-debt-report-${timestamp}.json`);
    fs.writeFileSync(reportFilePath, jsonContent);
    console.log(`Report saved to: ${reportFilePath}`);
}

saveReportToData();