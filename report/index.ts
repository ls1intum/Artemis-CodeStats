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

import { Project } from "ts-morph";
import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";

import { analyzeExistingComponents } from "./client/componentInventory";
import { analyzeChangeDetection } from "./client/changeDetection";
import { analyzeDecoratorlessAPI } from "./client/decoratorlessApi";

const repoDir = path.join(process.cwd(), "artemis");
const basePath = "src/main/webapp/app";
const modules = [
  "admin",
  "assessment",
  "atlas",
  "buildagent",
  "communication",
  "core",
  "exam",
  "exercise",
  "fileupload",
  "iris",
  "lecture",
  "lti",
  "modeling",
  "plagiarism",
  "programming",
  "quiz",
  "shared",
  "text",
  "tutorialgroup",
];

/**
 * Get the current commit hash and timestamp from the artemis submodule
 */
function getArtemisCommitInfo() {
  try {
    const commitHash = execSync('git rev-parse HEAD', { cwd: repoDir }).toString().trim();
    const commitTimestamp = execSync('git show -s --format=%ci HEAD', { cwd: repoDir }).toString().trim();
    
    return {
      commitHash,
      commitTimestamp
    };
  } catch (error) {
    console.error('Error getting artemis commit info:', error);
    return {
      commitHash: 'unknown',
      commitTimestamp: 'unknown'
    };
  }
}

/**
 * Initialize the ts-morph project and add source files
 */
function initializeProject(): Project {
  const project = new Project({
    tsConfigFilePath: path.join(repoDir, "tsconfig.json"),
  });

  // Add source files from each module
  modules.forEach((moduleName) => {
    const modulePath = path.join(repoDir, moduleName);
    if (fs.existsSync(modulePath)) {
      project.addSourceFilesAtPaths(path.join(modulePath, "**/*.ts"));
    }
  });

  return project;
}

/**
 * Helper function to write a report file
 * @param reportType The type of report (used for directory name)
 * @param data The data to write to the file
 * @param isClient Flag to indicate if the report is for client-side
 */
function writeReportFile(
  reportType: string,
  data: unknown,
  isClient: boolean
): string {
  // Create report-specific directory
  const reportDir = path.join(process.cwd(), "data", reportType);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Get artemis commit info
  const artemisCommitInfo = getArtemisCommitInfo();
  
  // Format commit timestamp for filename (replace spaces and colons with dashes)
  const formattedTimestamp = artemisCommitInfo.commitTimestamp
    .replace(/[\s:]/g, "-")
    .replace(/\+\d{4}/, "") // Remove timezone offset
    .replace(/-$/, "");

  // Create metadata
  const metadata = {
    type: reportType,
    artemis: artemisCommitInfo
  };

  // Create complete report path with subdirectories
  const fullReportPath = path.join(
    reportDir,
    isClient ? "client" : "server",
    reportType
  );
  
  // Ensure all directories in the path exist
  if (!fs.existsSync(fullReportPath)) {
    fs.mkdirSync(fullReportPath, { recursive: true });
  }

  // Create the file path and write file
  const reportFilePath = path.join(
    fullReportPath,
    `${reportType}-${formattedTimestamp}.json`
  );
  fs.writeFileSync(
    reportFilePath,
    JSON.stringify(
      {
        metadata,
        [reportType]: data,
      },
      null,
      2
    )
  );

  return reportFilePath;
}

/**
 * Generate report data and save to files
 */
function generateReports() {
  // Initialize project
  const project = initializeProject();

  // Run analyzers
  const componentStats = analyzeExistingComponents(project, modules, basePath);
  const changeDetectionStats = analyzeChangeDetection(
    project,
    modules,
    basePath
  );
  const decoratorlessAPIStats = analyzeDecoratorlessAPI(
    project,
    modules,
    basePath
  );

  // Ensure base reports directory exists
  const reportsBaseDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(reportsBaseDir)) {
    fs.mkdirSync(reportsBaseDir);
  }

  // Save individual reports using the helper function
  const componentReportPath = writeReportFile(
    "componentInventory",
    componentStats,
    true
  );
  console.log(`Component inventory report saved to: ${componentReportPath}`);

  const changeDetectionReportPath = writeReportFile(
    "changeDetection",
    changeDetectionStats,
    true
  );
  console.log(`Change detection report saved to: ${changeDetectionReportPath}`);

  const decoratorlessAPIReportPath = writeReportFile(
    "decoratorlessAPI",
    decoratorlessAPIStats,
    true
  );
  console.log(
    `Decoratorless API report saved to: ${decoratorlessAPIReportPath}`
  );
}

// Run the reports
generateReports();
