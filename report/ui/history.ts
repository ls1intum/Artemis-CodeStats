type Revision = { commit: string; date: string }

// First-parent history represents develop's integrated state, not side-branch commits.
export function planHistory(history: Revision[], packageAdoption: string) {
  const adoption = history.findIndex((row) => row.commit === packageAdoption)
  if (!history.length || adoption < 0)
    throw new Error('Adoption milestone is missing from first-parent history')
  let previous = Date.parse(history[0].date)
  const evidenceCommits: string[] = []
  const snapshots = history.filter((row, index) => {
    const retainEvidence =
      index === 0 ||
      index === adoption ||
      index === history.length - 1 ||
      Date.parse(row.date) - previous >= 7 * 86_400_000
    if (retainEvidence) {
      evidenceCommits.push(row.commit)
      previous = Date.parse(row.date)
    }
    return retainEvidence || index >= adoption
  })
  return { snapshots, evidenceCommits }
}
