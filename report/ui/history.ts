type Revision = { commit: string; date: string }

// First-parent history represents develop's integrated state, not side-branch commits.
// Before package adoption only weekly samples are kept; afterwards every commit is a snapshot.
// Weekly commits and the milestones are bases with a full detail file; the rest store patches.
export function planHistory<R extends Revision>(
  history: R[],
  packageAdoption: string,
) {
  const adoption = history.findIndex((row) => row.commit === packageAdoption)
  if (!history.length || adoption < 0)
    throw new Error('Adoption milestone is missing from first-parent history')
  let previous = Date.parse(history[0].date)
  const bases: string[] = []
  const snapshots = history.filter((row, index) => {
    const isBase =
      index === 0 ||
      index === adoption ||
      Date.parse(row.date) - previous >= 7 * 86_400_000
    if (isBase) {
      bases.push(row.commit)
      previous = Date.parse(row.date)
    }
    return isBase || index >= adoption
  })
  return { snapshots, bases }
}
