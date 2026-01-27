/**
 * DTO Violations Report Generator
 *
 * This module extracts DTO violation data from the Artemis codebase using
 * static source code analysis with JavaParser. No compilation required.
 */

import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { CommitInfo, DtoViolationsData, DtoModuleViolations } from "../types";

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('start', {
    alias: 's',
    description: 'Generate reports starting from this historical date (YYYY-MM-DD format)',
    type: 'string',
  })
  .option('relative', {
    alias: 'r',
    description: 'Generate reports for a relative time period (e.g., "24h", "7d", "1m", "1y")',
    type: 'string',
  })
  .option('thresholds', {
    description: 'Use threshold parsing mode (counts only, no details)',
    type: 'boolean',
    default: false
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

const ARTEMIS_REPO_DIR = path.join(process.cwd(), "artemis");
const EXTRACTOR_DIR = path.join(process.cwd(), "report", "server");
const OUTPUT_DIR = path.join(process.cwd(), "data", "server", "dtoViolations");

// Required JARs for the static analyzer
const JAVAPARSER_VERSION = "3.26.2";
const GSON_VERSION = "2.11.0";
const MAVEN_CENTRAL = "https://repo1.maven.org/maven2";

// Cutoff date - won't analyze commits earlier than this
const CUTOFF_COMMIT_DATE = new Date("2025-03-28");

/**
 * Parse a relative time string into a Date object representing that time in the past
 */
function parseRelativeTime(relativeTime: string): Date | null {
  const now = new Date();
  const match = relativeTime.match(/^(\d+)([hdwmy])$/);

  if (!match) {
    console.error(`Invalid relative time format: ${relativeTime}`);
    console.error('Valid formats: Xh (hours), Xd (days), Xw (weeks), Xm (months), Xy (years)');
    return null;
  }

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);

  let monthDate: Date;
  let yearDate: Date;

  switch (unit) {
    case 'h':
      return new Date(now.getTime() - value * 60 * 60 * 1000);
    case 'd':
      return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
    case 'w':
      return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
    case 'm':
      monthDate = new Date(now);
      monthDate.setMonth(monthDate.getMonth() - value);
      return monthDate;
    case 'y':
      yearDate = new Date(now);
      yearDate.setFullYear(yearDate.getFullYear() - value);
      return yearDate;
    default:
      return null;
  }
}

/**
 * Get all commits from a start date
 */
function getCommitsFromStartDate(startDate: Date): CommitInfo[] {
  try {
    const dateStr = startDate.toISOString().split('T')[0];
    const gitCommand = `git log --since="${dateStr}" --format="%H|%ci|%an|%s" -n 1000`;
    const output = execSync(gitCommand, { cwd: ARTEMIS_REPO_DIR }).toString().trim();

    if (!output) {
      return [];
    }

    const commits = output.split('\n').map(line => {
      const [commitHash, commitTimestamp, commitAuthor, ...messageParts] = line.split('|');
      const commitMessage = messageParts.join('|');

      let commitDate: Date;
      try {
        commitDate = new Date(commitTimestamp);
        if (isNaN(commitDate.getTime())) {
          commitDate = new Date();
        }
      } catch {
        commitDate = new Date();
      }

      return { commitHash, commitDate, commitAuthor, commitMessage };
    });

    // Filter out commits earlier than cutoff
    const filteredCommits = commits.filter(commit => commit.commitDate >= CUTOFF_COMMIT_DATE);

    if (filteredCommits.length < commits.length) {
      console.log(`Filtered out ${commits.length - filteredCommits.length} commits earlier than cutoff date`);
    }

    return filteredCommits;
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
    const status = execSync('git status --porcelain', { cwd: ARTEMIS_REPO_DIR }).toString();
    if (status.trim()) {
      execSync('git reset --hard', { cwd: ARTEMIS_REPO_DIR });
      execSync('git clean -fd', { cwd: ARTEMIS_REPO_DIR });
    }
    execSync(`git checkout ${commitHash}`, { cwd: ARTEMIS_REPO_DIR });
    return true;
  } catch (error) {
    console.error(`Error checking out to commit ${commitHash}:`, error);
    return false;
  }
}

/**
 * Clean up after historical analysis
 */
function cleanupAfterAnalysis(): boolean {
  try {
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ARTEMIS_REPO_DIR }).toString().trim();

    if (currentBranch === 'HEAD') {
      const branches = execSync('git branch', { cwd: ARTEMIS_REPO_DIR }).toString().split('\n');
      for (const branch of ['develop', 'main', 'master']) {
        if (branches.some(b => b.includes(branch))) {
          execSync(`git checkout ${branch}`, { cwd: ARTEMIS_REPO_DIR });
          break;
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Error cleaning up after analysis:', error);
    return false;
  }
}

/**
 * Get the current commit info from Artemis
 */
function getArtemisCommitInfo(): CommitInfo {
  try {
    const commitHash = execSync('git rev-parse HEAD', { cwd: ARTEMIS_REPO_DIR }).toString().trim();
    const commitTimestamp = execSync('git show -s --format=%ci HEAD', { cwd: ARTEMIS_REPO_DIR }).toString().trim();
    const commitDate = new Date(commitTimestamp);
    const commitAuthor = execSync('git show -s --format=%an HEAD', { cwd: ARTEMIS_REPO_DIR }).toString().trim();
    const commitMessage = execSync('git show -s --format=%s HEAD', { cwd: ARTEMIS_REPO_DIR }).toString().trim();

    return {
      commitHash,
      commitDate,
      commitAuthor,
      commitMessage
    };
  } catch (error) {
    console.error('Error getting artemis commit info:', error);
    return {
      commitHash: 'unknown',
      commitDate: new Date(),
      commitAuthor: 'unknown',
      commitMessage: 'unknown'
    };
  }
}

/**
 * Ensure required JAR dependencies are downloaded
 */
function ensureDependencies(): boolean {
  const libDir = path.join(EXTRACTOR_DIR, "lib");

  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }

  const javaparserJar = path.join(libDir, `javaparser-core-${JAVAPARSER_VERSION}.jar`);
  const gsonJar = path.join(libDir, `gson-${GSON_VERSION}.jar`);

  try {
    // Download JavaParser if needed
    if (!fs.existsSync(javaparserJar)) {
      console.log("Downloading JavaParser...");
      const javaparserUrl = `${MAVEN_CENTRAL}/com/github/javaparser/javaparser-core/${JAVAPARSER_VERSION}/javaparser-core-${JAVAPARSER_VERSION}.jar`;
      execSync(`curl -sL -o "${javaparserJar}" "${javaparserUrl}"`, { stdio: 'inherit' });
    }

    // Download Gson if needed
    if (!fs.existsSync(gsonJar)) {
      console.log("Downloading Gson...");
      const gsonUrl = `${MAVEN_CENTRAL}/com/google/code/gson/gson/${GSON_VERSION}/gson-${GSON_VERSION}.jar`;
      execSync(`curl -sL -o "${gsonJar}" "${gsonUrl}"`, { stdio: 'inherit' });
    }

    return true;
  } catch (error) {
    console.error("Failed to download dependencies:", error);
    return false;
  }
}

/**
 * Compile the JavaParser-based extractor
 */
function compileExtractor(): boolean {
  const libDir = path.join(EXTRACTOR_DIR, "lib");
  const outDir = path.join(EXTRACTOR_DIR, "out");
  const sourceFile = path.join(EXTRACTOR_DIR, "src/main/java/de/tum/cit/aet/codestats/DtoViolationExtractor.java");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  try {
    console.log("Compiling static analyzer...");
    execSync(`javac -cp "${libDir}/*" -d "${outDir}" "${sourceFile}"`, {
      cwd: EXTRACTOR_DIR,
      stdio: 'inherit'
    });
    return true;
  } catch (error) {
    console.error("Failed to compile extractor:", error);
    return false;
  }
}

/**
 * Run the JavaParser-based static analyzer
 */
function runStaticAnalyzer(): DtoViolationsData | null {
  const libDir = path.join(EXTRACTOR_DIR, "lib");
  const outDir = path.join(EXTRACTOR_DIR, "out");
  const outputFile = path.join(EXTRACTOR_DIR, "violations.json");
  const artemisSourceDir = path.join(ARTEMIS_REPO_DIR, "src/main/java");

  try {
    console.log("Running static analysis...");
    execSync(
      `java -cp "${outDir}:${libDir}/*" ` +
      `-Dartemis.source="${artemisSourceDir}" ` +
      `-Doutput.file="${outputFile}" ` +
      `de.tum.cit.aet.codestats.DtoViolationExtractor`,
      {
        cwd: EXTRACTOR_DIR,
        stdio: 'inherit',
        timeout: 300000
      }
    );

    if (fs.existsSync(outputFile)) {
      const data = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      return data as DtoViolationsData;
    } else {
      console.error("Extractor output file not found");
      return null;
    }
  } catch (error) {
    console.error("Failed to run static analyzer:", error);
    return null;
  }
}

/**
 * Alternative: Parse threshold values from architecture test source files
 * This is faster but only gets threshold counts (no details)
 */
export function parseViolationThresholds(): DtoViolationsData | null {
  console.log("Parsing violation thresholds from test source files...");

  const testBaseDir = path.join(ARTEMIS_REPO_DIR, "src/test/java/de/tum/cit/aet/artemis");
  const modules: Record<string, DtoModuleViolations> = {};

  let totalEntityReturn = 0;
  let totalEntityInput = 0;
  let totalDtoEntityField = 0;

  function findTestFiles(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findTestFiles(fullPath));
      } else if (entry.name.endsWith('EntityUsageArchitectureTest.java')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const testFiles = findTestFiles(testBaseDir);
  console.log(`Found ${testFiles.length} EntityUsageArchitectureTest files`);

  for (const testFile of testFiles) {
    try {
      const content = fs.readFileSync(testFile, 'utf-8');

      const classNameMatch = content.match(/class\s+(\w+)EntityUsageArchitectureTest/);
      if (!classNameMatch) continue;

      const moduleName = classNameMatch[1].toLowerCase();

      if (moduleName === 'abstractmodule' || moduleName === 'incoming') {
        continue;
      }

      const returnMatch = content.match(/getMaxEntityReturnViolations\s*\(\s*\)\s*\{[^}]*return\s+(\d+)/);
      const inputMatch = content.match(/getMaxEntityInputViolations\s*\(\s*\)\s*\{[^}]*return\s+(\d+)/);
      const dtoFieldMatch = content.match(/getMaxDtoEntityFieldViolations\s*\(\s*\)\s*\{[^}]*return\s+(\d+)/);

      const entityReturnViolations = returnMatch ? parseInt(returnMatch[1]) : 0;
      const entityInputViolations = inputMatch ? parseInt(inputMatch[1]) : 0;
      const dtoEntityFieldViolations = dtoFieldMatch ? parseInt(dtoFieldMatch[1]) : 0;

      modules[moduleName] = {
        entityReturnViolations,
        entityInputViolations,
        dtoEntityFieldViolations
      };

      totalEntityReturn += entityReturnViolations;
      totalEntityInput += entityInputViolations;
      totalDtoEntityField += dtoEntityFieldViolations;

      console.log(`  ${moduleName}: return=${entityReturnViolations}, input=${entityInputViolations}, dtoField=${dtoEntityFieldViolations}`);
    } catch (error) {
      console.error(`Error parsing ${testFile}:`, error);
    }
  }

  return {
    modules,
    totals: {
      entityReturnViolations: totalEntityReturn,
      entityInputViolations: totalEntityInput,
      dtoEntityFieldViolations: totalDtoEntityField
    }
  };
}

/**
 * Write the DTO violations report to a file
 */
function writeReport(data: DtoViolationsData, commitInfo: CommitInfo, dataSource: string): string {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const formattedTimestamp = commitInfo.commitDate
    .toISOString()
    .replace("T", "_")
    .replace(/:/g, "-")
    .split(".")[0];

  const fileName = `dtoViolations_${formattedTimestamp}_${commitInfo.commitHash.substring(0, 8)}.json`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  const report = {
    metadata: {
      type: "dtoViolations",
      artemis: commitInfo,
      dataSource
    },
    dtoViolations: data
  };

  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  console.log(`Report written to: ${filePath}`);

  return filePath;
}

/**
 * Main function to generate DTO violations report
 *
 * @param mode 'static' for full JavaParser analysis (recommended),
 *             'thresholds' for quick threshold parsing only
 * @param providedCommitInfo Optional commit info for historical reports
 */
export async function generateDtoViolationsReport(
  mode: 'static' | 'thresholds' = 'static',
  providedCommitInfo?: CommitInfo
): Promise<string | null> {
  console.log("=== DTO Violations Report Generator ===\n");

  const commitInfo = providedCommitInfo || getArtemisCommitInfo();
  console.log(`Artemis commit: ${commitInfo.commitHash.substring(0, 8)}`);
  console.log(`Commit date: ${commitInfo.commitDate.toISOString()}`);
  console.log(`Author: ${commitInfo.commitAuthor}`);
  console.log(`Message: ${commitInfo.commitMessage}\n`);

  let violations: DtoViolationsData | null;
  let dataSource: string;

  if (mode === 'static') {
    console.log("Mode: Static source code analysis (full details)\n");

    // Ensure dependencies are downloaded
    if (!ensureDependencies()) {
      console.error("Aborting due to dependency download failure");
      return null;
    }

    // Compile the extractor
    if (!compileExtractor()) {
      console.error("Aborting due to compilation failure");
      return null;
    }

    // Run static analysis
    violations = runStaticAnalyzer();
    dataSource = "Static source code analysis with JavaParser (full coverage)";
  } else {
    console.log("Mode: Threshold parsing (counts only)\n");
    violations = parseViolationThresholds();
    dataSource = "Parsed from ArchUnit test thresholds (counts only, no details)";
  }

  if (!violations) {
    console.error("Failed to extract violations");
    return null;
  }

  console.log("\n=== Summary ===");
  console.log(`Entity Return Violations: ${violations.totals.entityReturnViolations}`);
  console.log(`Entity Input Violations: ${violations.totals.entityInputViolations}`);
  console.log(`DTO Entity Field Violations: ${violations.totals.dtoEntityFieldViolations}`);
  const total = violations.totals.entityReturnViolations +
                violations.totals.entityInputViolations +
                violations.totals.dtoEntityFieldViolations;
  console.log(`Total Violations: ${total}`);
  console.log(`Modules analyzed: ${Object.keys(violations.modules).length}`);

  return writeReport(violations, commitInfo, dataSource);
}

/**
 * Run historical analysis for DTO violations
 */
async function runHistoricalAnalysis(): Promise<void> {
  const mode = argv.thresholds ? 'thresholds' : 'static';
  const interval = argv.interval as number;

  // Determine start date from arguments
  let startDate: Date | null = null;

  if (argv.relative) {
    startDate = parseRelativeTime(argv.relative as string);
    if (!startDate) {
      process.exit(1);
    }
    console.log(`Analyzing DTO violations from ${startDate.toISOString()} (${argv.relative} ago)...`);
  } else if (argv.start) {
    startDate = new Date(argv.start as string);
    if (isNaN(startDate.getTime())) {
      console.error(`Invalid date format for --start: ${argv.start}`);
      process.exit(1);
    }
    console.log(`Analyzing DTO violations from ${argv.start}...`);
  }

  // If no historical analysis requested, just run for current state
  if (!startDate) {
    const result = await generateDtoViolationsReport(mode);
    if (!result) {
      process.exit(1);
    }
    return;
  }

  // Get commits for historical analysis
  const commits = getCommitsFromStartDate(startDate);
  if (commits.length === 0) {
    console.error('No commits found from the specified start date');
    process.exit(1);
  }

  console.log(`Found ${commits.length} commits to analyze with interval ${interval}`);

  // Filter by interval
  const filteredCommits = commits.filter((_, i) => i % interval === 0);
  console.log(`Will analyze ${filteredCommits.length} commits\n`);

  let successCount = 0;
  let failCount = 0;

  try {
    for (let i = 0; i < filteredCommits.length; i++) {
      const commitInfo = filteredCommits[i];
      console.log(`\n=== Commit ${i + 1}/${filteredCommits.length} ===`);
      console.log(`Hash: ${commitInfo.commitHash.substring(0, 8)}`);
      console.log(`Date: ${commitInfo.commitDate.toISOString()}`);
      console.log(`Message: ${commitInfo.commitMessage}`);

      if (!checkoutToCommit(commitInfo.commitHash)) {
        console.error(`Failed to checkout commit ${commitInfo.commitHash}`);
        failCount++;
        continue;
      }

      const result = await generateDtoViolationsReport(mode, commitInfo);
      if (result) {
        successCount++;
      } else {
        failCount++;
      }
    }
  } finally {
    console.log('\nCleaning up...');
    cleanupAfterAnalysis();
  }

  console.log(`\n=== Historical Analysis Complete ===`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runHistoricalAnalysis().catch((error) => {
    console.error("Report generation failed:", error);
    process.exit(1);
  });
}
