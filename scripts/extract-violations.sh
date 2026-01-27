#!/bin/bash
# Extract DTO violations using static source code analysis
# Full coverage - analyzes all Java source files directly

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARTEMIS_DIR="$PROJECT_ROOT/artemis"
EXTRACTOR_DIR="$PROJECT_ROOT/report/server"
OUTPUT_DIR="$PROJECT_ROOT/data/server/dtoViolations"

echo "=== DTO Violation Extractor ==="

# Get Artemis commit info
cd "$ARTEMIS_DIR"
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_DATE=$(git show -s --format=%cI HEAD)
COMMIT_AUTHOR=$(git show -s --format=%an HEAD)
COMMIT_MESSAGE=$(git show -s --format=%s HEAD)

echo "Artemis commit: ${COMMIT_HASH:0:8}"
echo "Date: $COMMIT_DATE"

# Run the static analyzer
cd "$EXTRACTOR_DIR"

echo ""
echo "Running static analysis..."
java -cp "out:lib/*" \
    -Dartemis.source="$ARTEMIS_DIR/src/main/java" \
    -Doutput.file="violations.json" \
    de.tum.cit.aet.codestats.DtoViolationExtractor

# Create output file with metadata
cd "$PROJECT_ROOT"
FORMATTED_DATE=$(echo "$COMMIT_DATE" | sed 's/T/_/' | sed 's/:/-/g' | cut -d+ -f1 | cut -d. -f1)
SHORT_HASH="${COMMIT_HASH:0:8}"
OUTPUT_FILE="$OUTPUT_DIR/dtoViolations_${FORMATTED_DATE}_${SHORT_HASH}.json"

mkdir -p "$OUTPUT_DIR"

# Add metadata wrapper to the extraction output
jq --arg hash "$COMMIT_HASH" \
   --arg date "$COMMIT_DATE" \
   --arg author "$COMMIT_AUTHOR" \
   --arg msg "$COMMIT_MESSAGE" \
   '{
     metadata: {
       type: "dtoViolations",
       artemis: {
         commitHash: $hash,
         commitDate: $date,
         commitAuthor: $author,
         commitMessage: $msg
       },
       dataSource: "Static source code analysis with JavaParser (full coverage)"
     },
     dtoViolations: {
       modules: .modules,
       totals: .totals
     }
   }' "$EXTRACTOR_DIR/violations.json" > "$OUTPUT_FILE"

# Print summary
TOTAL_RET=$(jq '.totals.entityReturnViolations' "$EXTRACTOR_DIR/violations.json")
TOTAL_INP=$(jq '.totals.entityInputViolations' "$EXTRACTOR_DIR/violations.json")
TOTAL_FLD=$(jq '.totals.dtoEntityFieldViolations' "$EXTRACTOR_DIR/violations.json")
TOTAL=$((TOTAL_RET + TOTAL_INP + TOTAL_FLD))

echo ""
echo "=== RESULTS ==="
echo "Total violations: $TOTAL"
echo "  - Entity returns: $TOTAL_RET"
echo "  - Entity inputs: $TOTAL_INP"
echo "  - DTO fields: $TOTAL_FLD"
echo ""
echo "Report saved to: $OUTPUT_FILE"
