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

You can analyze codebase changes over time by specifying a start date or relative time period:

```bash
# Analyze commits from today back to March 27, 2025
npm run report -- --start 2025-03-27

# Analyze commits from the last 24 hours
npm run report -- --relative 24h

# Analyze commits from the last 7 days
npm run report -- --relative 7d

# Analyze 5 most recent commits since March 27, 2025
npm run report -- --start 2025-03-27 --commits 5 

# Analyze 5 most recent commits in the last week
npm run report -- --relative 7d --commits 5

# Analyze every 3rd commit (up to 10 commits total) since March 27, 2025
npm run report -- --start 2025-03-27 --commits 10 --interval 3
```

#### Parameters

- `--start` / `-s`: The date in YYYY-MM-DD format from which to start analyzing commits backward
- `--relative` / `-r`: Relative time period to analyze (e.g., "24h", "7d", "2w", "1m", "1y")
- `--commits` / `-c`: Maximum number of commits to analyze (default: all commits since start date)
- `--interval` / `-i`: Interval between commits to analyze (default: 1)

For relative time formats, the following units are supported:

- `h`: hours (e.g., `24h` = last 24 hours)
- `d`: days (e.g., `7d` = last 7 days)
- `w`: weeks (e.g., `2w` = last 2 weeks)
- `m`: months (e.g., `1m` = last month)
- `y`: years (e.g., `1y` = last year)

Reports are stored in the `data/client/` directory, with filenames containing the commit hash and timestamp.

### Automated Hourly Reports

A GitHub Action runs every hour to generate reports analyzing changes from the past hour and commit them to the repository. This ensures real-time tracking of code metrics with minimal delay.

The workflow uses the `--relative 1h` parameter to focus only on the most recent changes, providing an up-to-date view of code evolution.

These automated reports are accessible through the visualization interface and provide detailed trend data with hourly granularity.

## About

This project provides data visualization for code metrics, usage patterns, and statistics from the Artemis interactive learning platform. Built with React, TypeScript, and ShadCN with Recharts.
