/**
 * Pure lane-layout algorithm for git commit DAGs.
 * Input: commits from `git log --all --date-order` (newest first).
 * Each commit: { hash, short, parents: string[], refs, subject, author, date }
 * Returns: { nodes, edges } for rendering a commit graph.
 */

/**
 * @param {Array<{hash:string,short:string,parents:string[],refs:string,subject:string,author:string,date:string}>} commits
 * @returns {{ nodes: Array<{hash,short,refs,subject,author,date,lane:number,row:number}>, edges: Array<{from,to,fromLane:number,toLane:number}> }}
 */
export function computeLanes(commits) {
  if (!commits || commits.length === 0) return { nodes: [], edges: [] }

  const nodes = []
  const edges = []
  // active[i] = hash expected next in lane i, null if the slot is free.
  const active = []

  for (let row = 0; row < commits.length; row++) {
    const { hash, short, parents = [], refs, subject, author, date } = commits[row]

    // Find the lane already reserved for this commit, or claim a free slot.
    let lane = active.indexOf(hash)
    if (lane === -1) {
      lane = active.indexOf(null)
      if (lane === -1) lane = active.length
    }

    // Clear every slot that points at this hash (can be >1 if multiple children
    // converge here before we've processed all of them — rare but valid).
    for (let i = 0; i < active.length; i++) {
      if (active[i] === hash) active[i] = null
    }

    // Assign each parent a lane.
    const pLanes = []
    for (let pi = 0; pi < parents.length; pi++) {
      const ph = parents[pi]
      const existing = active.indexOf(ph)
      if (existing !== -1) {
        // Parent already tracked by another ancestor — reuse the lane.
        pLanes.push(existing)
      } else if (pi === 0) {
        // First parent inherits this commit's lane (keeps main-line vertical).
        while (active.length <= lane) active.push(null)
        active[lane] = ph
        pLanes.push(lane)
      } else {
        // Merge parents get a new free slot.
        let free = active.indexOf(null)
        if (free === -1) free = active.length
        while (active.length <= free) active.push(null)
        active[free] = ph
        pLanes.push(free)
      }
    }

    // Trim trailing nulls to keep active compact.
    while (active.length > 0 && active[active.length - 1] === null) active.pop()

    nodes.push({ hash, short, refs, subject, author, date, lane, row })
    for (let pi = 0; pi < parents.length; pi++) {
      edges.push({ from: hash, to: parents[pi], fromLane: lane, toLane: pLanes[pi] })
    }
  }

  return { nodes, edges }
}
