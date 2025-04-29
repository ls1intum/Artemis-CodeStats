# Artemis-CodeStats

A visualization tool for analyzing code statistics and technical debt from the Artemis learning platform.

**[View Online](https://ls1intum.github.io/Artemis-CodeStats/)**

## Installation

```bash
# Clone repository with submodules
git clone --recurse-submodules https://github.com/ls1intum/Artemis-CodeStats.git

# Install dependencies
npm install
```

## Usage

```bash
# Start development server
npm run dev

# Generate statistics report for current codebase
npm run report

# Build for production
npm run build
```

## Reporting Features

The report tool analyzes the Angular codebase to uncover technical debt and usage patterns.

### Current State Analysis

To generate reports for the current state of the codebase:

```bash
npm run report
```

This generates reports in the `data/client/` directory, organized by report type.

### Historical Analysis

You can analyze codebase changes over time by specifying a date for historical commits:

```bash
# Analyze the most recent commit before March 1, 2025
npm run report -- --until 2025-03-01

# Analyze 5 commits before March 1, 2025
npm run report -- --until 2025-03-01 --commits 5 

# Analyze every 3rd commit (up to 10 commits total) before March 1, 2025
npm run report -- --until 2025-03-01 --commits 10 --interval 3
```

#### Parameters

- `--until` / `-u`: The date in YYYY-MM-DD format to analyze commits up to
- `--commits` / `-c`: Number of commits to analyze (default: 1)
- `--interval` / `-i`: Interval between commits to analyze (default: 1)

Reports are stored in the `data/client/` directory, with filenames containing the commit hash and timestamp.

## About

This project provides data visualization for code metrics, usage patterns, and statistics from the Artemis interactive learning platform. Built with React, TypeScript, and ShadCN with Recharts.
