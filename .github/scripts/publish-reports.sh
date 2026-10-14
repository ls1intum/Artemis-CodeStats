#!/usr/bin/env bash
set -euo pipefail

: "${REPORT_BRANCH:?Missing default branch}"
: "${GITHUB_REF:?Missing workflow ref}"
: "${GITHUB_REPOSITORY:?Missing repository}"
: "${GITHUB_OUTPUT:?Missing workflow output}"
: "${REPORT_PUBLISH_KEY:?Missing environment-scoped deploy key}"
[[ "$GITHUB_REF" == "refs/heads/$REPORT_BRANCH" ]] || {
  echo 'Report publication is allowed only from the default branch' >&2
  exit 1
}
[[ "$GITHUB_REPOSITORY" == 'ls1intum/Artemis-CodeStats' ]] || exit 1

# The private key is available only after the main-only environment gate. Pin host keys
# from GitHub's HTTPS API, never from unauthenticated ssh-keyscan output.
auth_dir=$(mktemp -d "${RUNNER_TEMP:-/tmp}/report-publish.XXXXXX")
trap 'rm -rf "$auth_dir"' EXIT
chmod 700 "$auth_dir"
printf '%s\n' "$REPORT_PUBLISH_KEY" > "$auth_dir/key"
chmod 600 "$auth_dir/key"
curl --fail --silent --show-error --max-time 30 https://api.github.com/meta \
  | jq -er '.ssh_keys[] | "github.com " + .' > "$auth_dir/known_hosts"
export GIT_SSH_COMMAND="ssh -i $auth_dir/key -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$auth_dir/known_hosts"
remote="git@github.com:$GITHUB_REPOSITORY.git"
# Also prove credential access on unchanged collections.
git ls-remote --exit-code "$remote" "refs/heads/$REPORT_BRANCH" > /dev/null

git config user.name 'github-actions[bot]'
git config user.email 'github-actions[bot]@users.noreply.github.com'
git add artemis public/migrations public/openapi public/collection-status.json
if ! git diff --cached --quiet; then
  git commit -m 'chore: refresh migration evidence'
  git push "$remote" "HEAD:$REPORT_BRANCH"
fi
printf 'commit=%s\n' "$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"
