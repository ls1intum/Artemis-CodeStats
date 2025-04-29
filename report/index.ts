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
// Fix yargs import for ESM
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { CommitInfo, ReportMetadata } from "./types";
import { analyzeExistingComponents } from "./client/componentInventory";
import { analyzeChangeDetection } from "./client/changeDetection";
import { analyzeDecoratorlessAPI } from "./client/decoratorlessApi";

// Parse command line arguments, changing from --start parameter
const argv = yargs(hideBin(process.argv))
  .option('start', {
    alias: 's',
    description: 'Generate reports starting from this historical date (YYYY-MM-DD format)',
    type: 'string',
  })
  .option('commits', {
    alias: 'c',
    description: 'Number of commits to analyze (default: all commits since start date)',
    type: 'number',
  })
  .option('interval', {
    alias: 'i',
    description: 'Interval between commits to analyze (default: 1)',
    type: 'number',
    default: 1
  })
  .help()
  .alias('help', 'h')
  .parseSync();

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
function getArtemisCommitInfo(): CommitInfo {
  try {
    const commitHash = execSync('git rev-parse HEAD', { cwd: repoDir }).toString().trim();
    const commitTimestamp = execSync('git show -s --format=%ci HEAD', { cwd: repoDir }).toString().trim();
    const commitDate = new Date(commitTimestamp);
    const commitAuthor = execSync('git show -s --format=%an HEAD', { cwd: repoDir }).toString().trim();
    const commitMessage = execSync('git show -s --format=%s HEAD', { cwd: repoDir }).toString().trim();
    
    return {
      commitHash,
      commitTimestamp,
      commitDate,
      commitAuthor,
      commitMessage
    };
  } catch (error) {
    console.error('Error getting artemis commit info:', error);
    return {
      commitHash: 'unknown',
      commitTimestamp: 'unknown',
      commitDate: new Date(),
      commitAuthor: 'unknown',
      commitMessage: 'unknown'
    };
  }
}

/**
 * Get all commit hashes from the current date back to the specified start date
 */
function getCommitsFromStartDate(startDate: Date): CommitInfo[] {
  try {
    // Format the date as ISO string for git command
    const dateStr = startDate.toISOString().split('T')[0];
    
    // Get commits from now back to the specified start date with details
    const gitCommand = `git log --since="${dateStr}" --format="%H|%ci|%an|%s" -n 1000`;
    const output = execSync(gitCommand, { cwd: repoDir }).toString().trim();
    
    // Parse the output into commit info objects
    return output.split('\n').map(line => {
      const [commitHash, commitTimestamp, commitAuthor, ...messageParts] = line.split('|');
      const commitMessage = messageParts.join('|'); // In case commit message contained the delimiter
      
      return {
        commitHash,
        commitTimestamp,
        commitDate: new Date(commitTimestamp),
        commitAuthor,
        commitMessage
      };
    });
  } catch (error) {
    console.error('Error getting commits from start date:', error);
    return [];
  }
}

/**
 * Checkout to a specific commit
 */
function checkoutToCommit(commitHash: string): boolean {
  try {
    console.log("Checking repository status...");
    
    // Check for uncommitted changes first
    const status = execSync('git status --porcelain', { cwd: repoDir }).toString();
    if (status.trim()) {
      console.log("Repository has uncommitted changes. Attempting cleanup...");
      
      // Try to reset the repository to a clean state
      try {
        // Discard changes in working directory
        execSync('git reset --hard', { cwd: repoDir });
        console.log("Reset working directory to HEAD");
        
        // Clean untracked files
        execSync('git clean -fd', { cwd: repoDir });
        console.log("Cleaned untracked files");
      } catch (cleanupError) {
        console.error("Failed to clean repository:", cleanupError);
        return false;
      }
    }

    // Now checkout to the specific commit
    execSync(`git checkout ${commitHash}`, { cwd: repoDir });
    
    console.log(`Successfully checked out to commit: ${commitHash}`);
    return true;
  } catch (error) {
    console.error(`Error checking out to commit ${commitHash}:`, error);
    return false;
  }
}

/**
 * Clean up after commit history analysis
 */
function cleanupAfterAnalysis() {
  try {
    console.log("Checking repository before cleanup...");
    
    // Check current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: repoDir }).toString().trim();
    console.log(`Current branch: ${currentBranch}`);
    
    // Go back to the original branch - use main/master/develop as fallback
    try {
      if (currentBranch === 'HEAD') {
        // We're in detached HEAD state, try to determine the default branch
        const branches = execSync('git branch', { cwd: repoDir }).toString().split('\n');
        let defaultBranch = '';
        
        // Look for main branches in order of preference
        for (const branch of ['develop', 'main', 'master']) {
          if (branches.some(b => b.includes(branch))) {
            defaultBranch = branch;
            break;
          }
        }
        
        if (defaultBranch) {
          console.log(`Checking out to default branch: ${defaultBranch}`);
          execSync(`git checkout ${defaultBranch}`, { cwd: repoDir });
        } else {
          console.log("Could not determine default branch, staying in detached HEAD state");
        }
      } else {
        // We can use git checkout - to go back to the previous branch
        execSync('git checkout -', { cwd: repoDir });
      }
    } catch (error) {
      console.warn("Warning: Could not return to original branch:", error);
      // Try to checkout a common branch name as fallback
      try {
        execSync('git checkout develop || git checkout main || git checkout master', { cwd: repoDir });
      } catch {
        console.error("Could not checkout any default branch");
      }
    }
    
    console.log('Successfully cleaned up after analysis');
    return true;
  } catch (error) {
    console.error('Error cleaning up after analysis:', error);
    return false;
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
    const modulePath = path.join(repoDir, basePath, moduleName);
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
 * @param commitInfo Optional commit info for historical reports
 */
function writeReportFile<T>(
  reportType: string,
  data: T,
  isClient: boolean,
  commitInfo?: CommitInfo
): string {
  // Create base directory structure first (client or server)
  const baseDir = path.join(process.cwd(), "data", isClient ? "client" : "server");
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  // Then create report-specific directory within client/server
  const reportDir = path.join(baseDir, reportType);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Use provided commit info or get current commit info
  const artemisCommitInfo = commitInfo || getArtemisCommitInfo();
  
  // Format commit timestamp for filename (replace spaces and colons with dashes)
  const formattedTimestamp = artemisCommitInfo.commitTimestamp
    .replace(/[\s:]/g, "-")
    .replace(/\+\d{4}/, "") // Remove timezone offset
    .replace(/-$/, "");

  // Create metadata
  const metadata: ReportMetadata = {
    type: reportType,
    artemis: artemisCommitInfo
  };

  // Create the file path and write file
  const reportFilePath = path.join(
    reportDir,
    `${reportType}_${formattedTimestamp}_${artemisCommitInfo.commitHash.substring(0, 8)}.json`
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
 * @param commitInfo Optional commit info for historical reports
 */
function generateReports(commitInfo?: CommitInfo) {
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
    true,
    commitInfo
  );
  console.log(`Component inventory report saved to: ${componentReportPath}`);

  const changeDetectionReportPath = writeReportFile(
    "changeDetection",
    changeDetectionStats,
    true,
    commitInfo
  );
  console.log(`Change detection report saved to: ${changeDetectionReportPath}`);

  const decoratorlessAPIReportPath = writeReportFile(
    "decoratorlessAPI",
    decoratorlessAPIStats,
    true,
    commitInfo
  );
  console.log(
    `Decoratorless API report saved to: ${decoratorlessAPIReportPath}`
  );
}

/**
 * Run historical analysis based on command line arguments
 */
function runHistoricalAnalysis() {
  // If --start argument is provided, generate reports for commits starting from that date
  if (argv.start) {
    // Fix for command line parsing issue - ensure start is a proper string
    const startDate = new Date(typeof argv.start === 'string' ? argv.start : '');
    console.log(`Analyzing commit history starting from ${typeof argv.start === 'string' ? argv.start : 'unknown date'}...`);
    
    // Check if date is valid
    if (isNaN(startDate.getTime())) {
      console.error(`Invalid date format for --start: ${argv.start}`);
      console.error('Please provide date in YYYY-MM-DD format');
      return;
    }
    
    // Get commits from the specified start date
    const commits = getCommitsFromStartDate(startDate);
    
    if (commits.length === 0) {
      console.error('No commits found from the specified start date');
      return;
    }
    
    console.log(`Found ${commits.length} commits since ${argv.start}`);
    
    // Determine which commits to analyze based on interval and count
    const commitsToAnalyze = argv.commits ? commits.slice(0, argv.commits) : commits;
    const interval = argv.interval as number;
    
    console.log(`Will analyze ${commitsToAnalyze.length} commits with interval ${interval}`);
    
    try {
      // Analyze selected commits
      const filteredCommits = commitsToAnalyze.filter((_, i) => i % interval === 0);
      for (let i = 0; i < filteredCommits.length; i++) {
        const commitInfo = filteredCommits[i];
        console.log(`\n--- Analyzing commit ${i+1}/${filteredCommits.length} ---`);
        console.log(`Commit: ${commitInfo.commitHash} (${commitInfo.commitTimestamp})`);
        console.log(`Author: ${commitInfo.commitAuthor}`);
        console.log(`Message: ${commitInfo.commitMessage}`);
        
        // Checkout to this commit
        if (checkoutToCommit(commitInfo.commitHash)) {
          // Generate reports for this commit state
          generateReports(commitInfo);
        }
      }
    } finally {
      // Always clean up afterward
      console.log('\nCleaning up after historical analysis...');
      cleanupAfterAnalysis();
    }
    
    console.log(`\nHistorical analysis completed. Analyzed ${commitsToAnalyze.length} commits.`);
    return;
  }
  
  // If no historical analysis requested, just generate reports for current state
  generateReports();
}

// Run the reports with historical analysis if specified
runHistoricalAnalysis();
