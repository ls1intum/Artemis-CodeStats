# Main branch protection

The Artemis team has write access for feature branches, pull requests and reviews. Only
repository maintainers and admins can merge pull requests into `main`. `FelixTJDietrich` and
`krusche` currently have admin access and are included by that role.

Three repository rulesets apply to `main`. Their definitions are in `.github/rulesets/`.

| Ruleset                       | Rules                                                                                                                                            | Exceptions                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Preserve history              | No branch deletion or force pushes                                                                                                               | None, including automation                                 |
| Admins and maintainers merge  | Only designated actors can update main                                                                                                           | Maintain/admin roles through a PR; the report deploy key   |
| Reviewed and verified changes | One approval, stale approvals dismissed, last push approved by another person, resolved review threads, up-to-date `verify` and `reports` checks | Admin emergency bypass through a PR; the report deploy key |

Both checks must come from the GitHub Actions app, not a manually posted status. Maintain-role
mergers must satisfy the review and check rules. Admins should also follow them; their PR-only
bypass is for recovery and is visible in GitHub's rule history. Admins cannot use that exception
for a direct push. Write-role team members do not have a merge or bypass exception.

There is no generic GitHub Actions bypass. Workflow tokens are read-only by default and cannot
approve pull requests. Jobs request additional permissions only where they need them. Merged
branches are deleted automatically; auto-merge is available after the required approvals and
checks.

## Automatic report publication

The collector runs from `main` in the `report-publisher` environment. That environment permits
only the **main branch**, with no permitted tags, reviewer gate or wait timer. It contains the
`REPORT_PUBLISH_KEY` secret for a dedicated, repository-only SSH deploy key. Feature-branch
workflows cannot access this environment's credential.

The publisher also checks the workflow ref before using the key. It disables persisted checkout
credentials, pins SSH host keys through GitHub's HTTPS metadata endpoint, gives the temporary
private-key file mode `0600`, stages only `artemis` and `public/migrations`, and removes the key
on exit. An unchanged collection checks SSH access but makes no commit or push. A changed
collection pushes its validated report with that key, then runs the existing full verification
and exact-commit Pages deployment.

Deploy-key pushes trigger push workflows, unlike `GITHUB_TOKEN` pushes. The Pages push trigger
therefore ignores report-only changes; the collector itself publishes those through the
reusable deploy workflow. This prevents two Pages runs from cancelling each other.

GitHub's DeployKey bypass actor applies to deploy keys as a category. This repository has only
one deploy key. Adding another write-enabled key also grants the report rules' bypass; review
that access as a privileged change. Neither key can bypass the separate history rules.
To rotate the credential, replace the environment secret and deploy key, check a collector run,
and remove the previous key. Do not place this credential in a repository-wide secret.

## Check the configuration

- Open **Settings → Rules → Rulesets** and inspect all three active rulesets.
- Open **Settings → Environments → report-publisher**. The only allowed deployment ref is the
  `main` branch. Inspect the secret name; its value must not be disclosed.
- Open a PR from a feature branch. The `verify` and `reports` checks and one independent approval
  must be required. Write-role contributors cannot merge it; maintainers can merge it after the
  requirements pass. Admins can use the PR-only recovery bypass when necessary.
- Run **UI Migration Reports** on main. Check its publication, verification, deployment and
  alert jobs. Check the independent health workflow after deployment.

References: [repository rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets),
[ruleset API](https://docs.github.com/en/rest/repos/rules),
[environment restrictions](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment),
[deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys).
