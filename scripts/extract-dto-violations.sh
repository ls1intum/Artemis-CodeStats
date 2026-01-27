#!/bin/bash
# Extract DTO violations from Artemis compiled classes
# Usage: ./scripts/extract-dto-violations.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
EXTRACTOR_DIR="$PROJECT_ROOT/report/server"
ARTEMIS_DIR="$PROJECT_ROOT/artemis"
OUTPUT_DIR="$PROJECT_ROOT/data/server/dtoViolations"

echo "=== DTO Violation Extractor ==="
echo ""

# Check Artemis classes exist
ARTEMIS_CLASSES="$ARTEMIS_DIR/build/classes/java/main"
if [ ! -d "$ARTEMIS_CLASSES" ]; then
    echo "Artemis classes not found at: $ARTEMIS_CLASSES"
    echo "Compiling Artemis..."
    cd "$ARTEMIS_DIR"
    ./gradlew compileJava -x webapp --console=plain
fi

# Get Artemis commit info
cd "$ARTEMIS_DIR"
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_DATE=$(git show -s --format=%cI HEAD)
COMMIT_AUTHOR=$(git show -s --format=%an HEAD)
COMMIT_MESSAGE=$(git show -s --format=%s HEAD)

echo "Artemis commit: ${COMMIT_HASH:0:8}"
echo "Commit date: $COMMIT_DATE"
echo "Author: $COMMIT_AUTHOR"
echo ""

# Compile the extractor
cd "$EXTRACTOR_DIR"
echo "Compiling extractor..."
./gradlew compileJava --no-daemon --console=plain

# Find required jars
GRADLE_CACHE="$HOME/.gradle/caches"
GSON_JAR=$(find "$GRADLE_CACHE" -name "gson-2.11.0.jar" 2>/dev/null | head -1)
JAKARTA_JAR=$(find "$GRADLE_CACHE" -name "jakarta.persistence-api-*.jar" 2>/dev/null | head -1)
SPRING_WEB_JAR=$(find "$GRADLE_CACHE" -name "spring-web-*.jar" 2>/dev/null | head -1)
SPRING_CORE_JAR=$(find "$GRADLE_CACHE" -name "spring-core-*.jar" 2>/dev/null | head -1)

# Build classpath
CLASSPATH="$EXTRACTOR_DIR/build/classes/java/main:$GSON_JAR:$JAKARTA_JAR:$SPRING_WEB_JAR:$SPRING_CORE_JAR"

# Run extractor
TEMP_OUTPUT="$EXTRACTOR_DIR/violations.json"
echo "Extracting violations..."
java -cp "$CLASSPATH" \
    -Dartemis.classes="$ARTEMIS_CLASSES" \
    -Doutput.file="$TEMP_OUTPUT" \
    de.tum.cit.aet.codestats.DtoViolationExtractor

# Format output filename
FORMATTED_DATE=$(echo "$COMMIT_DATE" | sed 's/T/_/' | sed 's/:/-/g' | cut -d+ -f1 | cut -d. -f1)
SHORT_HASH="${COMMIT_HASH:0:8}"
OUTPUT_FILE="$OUTPUT_DIR/dtoViolations_${FORMATTED_DATE}_${SHORT_HASH}.json"

# Read totals from temp output
ENTITY_RETURNS=$(jq '.totals.entityReturnViolations' "$TEMP_OUTPUT")
ENTITY_INPUTS=$(jq '.totals.entityInputViolations' "$TEMP_OUTPUT")
DTO_FIELDS=$(jq '.totals.dtoEntityFieldViolations' "$TEMP_OUTPUT")
TOTAL=$((ENTITY_RETURNS + ENTITY_INPUTS + DTO_FIELDS))

# Create final output with metadata
mkdir -p "$OUTPUT_DIR"
jq --arg hash "$COMMIT_HASH" \
   --arg date "$COMMIT_DATE" \
   --arg author "$COMMIT_AUTHOR" \
   --arg message "$COMMIT_MESSAGE" \
   '{
     metadata: {
       type: "dtoViolations",
       artemis: {
         commitHash: $hash,
         commitDate: $date,
         commitAuthor: $author,
         commitMessage: $message
       }
     },
     dtoViolations: .
   }' "$TEMP_OUTPUT" > "$OUTPUT_FILE"

echo ""
echo "=== Summary ==="
echo "Total violations: $TOTAL"
echo "  - Entity returns: $ENTITY_RETURNS"
echo "  - Entity inputs: $ENTITY_INPUTS"
echo "  - DTO fields: $DTO_FIELDS"
echo ""
echo "Report saved to: $OUTPUT_FILE"

# Cleanup
rm -f "$TEMP_OUTPUT"
