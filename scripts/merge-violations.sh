#!/bin/bash
# Merge ArchUnit thresholds (accurate counts) with extractor details (examples)

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARTEMIS_DIR="$PROJECT_ROOT/artemis"
EXTRACTOR_OUTPUT="$PROJECT_ROOT/report/server/violations.json"
OUTPUT_DIR="$PROJECT_ROOT/data/server/dtoViolations"

echo "=== Merging Violations Data ==="

cd "$ARTEMIS_DIR"
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_DATE=$(git show -s --format=%cI HEAD)
COMMIT_AUTHOR=$(git show -s --format=%an HEAD)
COMMIT_MESSAGE=$(git show -s --format=%s HEAD)

echo "Artemis commit: ${COMMIT_HASH:0:8}"
echo "Parsing ArchUnit thresholds..."

# Build threshold JSON by parsing each test file
THRESHOLD_JSON="{"
TOTAL_RET=0
TOTAL_INP=0
TOTAL_FLD=0
FIRST=1

for module in assessment atlas communication core exam exercise fileupload iris lecture lti modeling plagiarism programming quiz text tutorialgroup; do
    # Find the test file for this module
    testfile=$(find src/test/java/de/tum/cit/aet/artemis/$module -name "*EntityUsageArchitectureTest.java" 2>/dev/null | head -1)

    if [ -n "$testfile" ]; then
        ret=$(grep -A1 "getMaxEntityReturnViolations" "$testfile" 2>/dev/null | grep "return" | grep -oE "[0-9]+" | head -1)
        inp=$(grep -A1 "getMaxEntityInputViolations" "$testfile" 2>/dev/null | grep "return" | grep -oE "[0-9]+" | head -1)
        fld=$(grep -A1 "getMaxDtoEntityFieldViolations" "$testfile" 2>/dev/null | grep "return" | grep -oE "[0-9]+" | head -1)
    else
        ret=0; inp=0; fld=0
    fi

    ret=${ret:-0}
    inp=${inp:-0}
    fld=${fld:-0}

    TOTAL_RET=$((TOTAL_RET + ret))
    TOTAL_INP=$((TOTAL_INP + inp))
    TOTAL_FLD=$((TOTAL_FLD + fld))

    [ $FIRST -eq 0 ] && THRESHOLD_JSON="$THRESHOLD_JSON,"
    THRESHOLD_JSON="$THRESHOLD_JSON\"$module\":{\"ret\":$ret,\"inp\":$inp,\"fld\":$fld}"
    FIRST=0
done
THRESHOLD_JSON="$THRESHOLD_JSON}"

echo "Thresholds: ret=$TOTAL_RET inp=$TOTAL_INP fld=$TOTAL_FLD total=$((TOTAL_RET + TOTAL_INP + TOTAL_FLD))"

cd "$PROJECT_ROOT"

FORMATTED_DATE=$(echo "$COMMIT_DATE" | sed 's/T/_/' | sed 's/:/-/g' | cut -d+ -f1 | cut -d. -f1)
SHORT_HASH="${COMMIT_HASH:0:8}"
OUTPUT_FILE="$OUTPUT_DIR/dtoViolations_${FORMATTED_DATE}_${SHORT_HASH}.json"

mkdir -p "$OUTPUT_DIR"

jq --arg hash "$COMMIT_HASH" \
   --arg date "$COMMIT_DATE" \
   --arg author "$COMMIT_AUTHOR" \
   --arg msg "$COMMIT_MESSAGE" \
   --argjson thresholds "$THRESHOLD_JSON" \
   --argjson totalRet "$TOTAL_RET" \
   --argjson totalInp "$TOTAL_INP" \
   --argjson totalFld "$TOTAL_FLD" \
   '{
     metadata: {
       type: "dtoViolations",
       artemis: {
         commitHash: $hash,
         commitDate: $date,
         commitAuthor: $author,
         commitMessage: $msg
       },
       dataSource: "Counts from ArchUnit thresholds. Details from standalone extractor (partial coverage)."
     },
     dtoViolations: {
       modules: (
         .modules | to_entries | map({
           key: .key,
           value: (
             .value + {
               entityReturnViolations: ($thresholds[.key].ret // .value.entityReturnViolations),
               entityInputViolations: ($thresholds[.key].inp // .value.entityInputViolations),
               dtoEntityFieldViolations: ($thresholds[.key].fld // .value.dtoEntityFieldViolations)
             }
           )
         }) | from_entries
       ),
       totals: {
         entityReturnViolations: $totalRet,
         entityInputViolations: $totalInp,
         dtoEntityFieldViolations: $totalFld
       }
     }
   }' "$EXTRACTOR_OUTPUT" > "$OUTPUT_FILE"

echo ""
echo "=== Summary ==="
echo "Total violations: $((TOTAL_RET + TOTAL_INP + TOTAL_FLD))"
echo "  - Entity returns: $TOTAL_RET"
echo "  - Entity inputs: $TOTAL_INP"
echo "  - DTO fields: $TOTAL_FLD"
echo ""
echo "Report saved to: $OUTPUT_FILE"
