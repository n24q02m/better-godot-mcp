function fastNormalizeNodePath(nodePath) {
  if (!nodePath) return { path: '.', corrected: false }

  // Convert backslashes to forward slashes safely
  let normalized = nodePath.replace(/\\/g, '/')
  if (normalized === '.') return { path: '.', corrected: false }

  const rootMatch = normalized.match(/^\/?root\/(.+)$/i)
  if (rootMatch) {
    const afterRoot = rootMatch[1]

    // Instead of split('/').filter(Boolean)
    let firstSlashIdx = afterRoot.indexOf('/')
    while (firstSlashIdx !== -1 && firstSlashIdx === 0) {
      afterRoot = afterRoot.substring(1)
      firstSlashIdx = afterRoot.indexOf('/')
    }

    if (firstSlashIdx === -1) {
      return { path: '.', corrected: true }
    }

    // Check if there are consecutive slashes we need to clean up
    // ... maybe too complex compared to split/filter? let's benchmark
  }
}
