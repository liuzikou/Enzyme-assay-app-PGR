// Utility functions for S2251 enzyme assay calculations

/**
 * Calculate the difference between consecutive elements in an array
 */
export function diffArray(arr: number[], order: number = 1): number[] {
  if (order === 0) return [...arr]
  if (arr.length <= order) return []
  
  const diff = []
  for (let i = order; i < arr.length; i++) {
    diff.push(arr[i] - arr[i - order])
  }
  return diff
}

/**
 * Calculate moving average with specified window size
 * Only returns values where the full window is available
 */
export function movingAvg(arr: number[], window: number): number[] {
  if (window <= 0 || arr.length === 0) return []
  if (window === 1) return [...arr]
  if (window > arr.length) return [] // Window larger than array
  
  const result = []
  // Only calculate for positions where the full window is available
  for (let i = 0; i <= arr.length - window; i++) {
    const slice = arr.slice(i, i + window)
    
    if (slice.length === 0) {
      result.push(0)
      continue
    }
    
    const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length
    result.push(isFinite(avg) ? avg : 0)
  }
  return result
}

/**
 * Get duplicate well data from adjacent wells (direct readings, not averaged)
 * @param wellId The current well ID (e.g., "A1")
 * @param rawData All well data
 * @returns Array of duplicate well readings for each time point, or null if no duplicate found
 */
export function meanDuplicateFromAdjacentWells(wellId: string, rawData: { wellId: string; timePoints: number[] }[]): number[] | null {
  // Parse well ID to get row and column
  const match = wellId.match(/^([A-H])(\d+)$/)
  if (!match) return null
  
  const row = match[1]
  const col = parseInt(match[2])
  
  // Get the first column with data for this row
  const firstCol = getFirstColumnWithData(row, rawData)
  if (firstCol === null) return null
  
  // Calculate relative position from first column
  const relativePos = col - firstCol + 1
  
  // Only process primary wells (odd relative positions)
  if (relativePos % 2 === 0) return null
  
  // Find the adjacent well (next column)
  const adjacentCol = col + 1
  if (adjacentCol > 12) return null // No adjacent well exists
  
  const adjacentWellId = `${row}${adjacentCol}`
  
  // Find the adjacent well in raw data
  const adjacentWell = rawData.find(well => well.wellId === adjacentWellId)
  
  if (!adjacentWell) return null
  
  // Return the adjacent well's direct readings (not averaged)
  return [...adjacentWell.timePoints]
}

/**
 * Get the first column that has data for a given row
 */
export function getFirstColumnWithData(row: string, rawData: { wellId: string; timePoints: number[] }[]): number | null {
  for (let col = 1; col <= 12; col++) {
    const wellId = `${row}${col}`
    const well = rawData.find(w => w.wellId === wellId)
    if (well) {
      return col
    }
  }
  return null
}

/**
 * Check if a well is a duplicate well based on data availability
 */
export function isDuplicateWell(wellId: string, rawData: { wellId: string; timePoints: number[] }[]): boolean {
  const match = wellId.match(/^([A-H])(\d+)$/)
  if (!match) return false
  
  const row = match[1]
  const col = parseInt(match[2])
  
  // Get the first column with data for this row
  const firstCol = getFirstColumnWithData(row, rawData)
  if (firstCol === null) return false
  
  // Calculate relative position from first column
  const relativePos = col - firstCol + 1
  return relativePos % 2 === 0 // Even relative positions are duplicate wells
}

/**
 * Calculate mean of duplicate measurements
 */
export function meanDuplicate(duplicates: number[][]): number[] {
  if (duplicates.length === 0) return []
  
  const result = []
  const length = duplicates[0].length
  
  for (let i = 0; i < length; i++) {
    const values = duplicates.map(dup => dup[i]).filter(isFinite)
    
    if (values.length === 0) {
      result.push(0)
      continue
    }
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    result.push(isFinite(mean) ? mean : 0)
  }
  
  return result
}

/**
 * Subtract background control from data
 */
export function subtractArray(data: number[], bgCtrl: number[]): number[] {
  if (data.length === 0 || bgCtrl.length === 0) return []
  
  const result = []
  const minLength = Math.min(data.length, bgCtrl.length)
  
  for (let i = 0; i < minLength; i++) {
    const diff = data[i] - bgCtrl[i]
    result.push(isFinite(diff) ? diff : 0)
  }
  
  return result
}

/**
 * Validate well data format and content
 */
export function validateWellData(data: { wellId: string; timePoints: number[] }[]): string[] {
  const errors: string[] = []
  
  if (!Array.isArray(data)) {
    errors.push('Data must be an array')
    return errors
  }
  
  if (data.length === 0) {
    errors.push('No data provided')
    return errors
  }
  
  // Check each well
  for (let i = 0; i < data.length; i++) {
    const well = data[i]
    
    if (!well || typeof well !== 'object') {
      errors.push(`Well ${i + 1}: Invalid well object`)
      continue
    }
    
    if (!well.wellId || typeof well.wellId !== 'string') {
      errors.push(`Well ${i + 1}: Invalid well ID`)
      continue
    }
    
    // Validate well ID format
    if (!/^[A-H](?:[1-9]|1[0-2])$/.test(well.wellId)) {
      errors.push(`Well ${i + 1}: Invalid well ID format (${well.wellId}). Must be A1-H12 format.`)
      continue
    }
    
    if (!Array.isArray(well.timePoints)) {
      errors.push(`Well ${i + 1}: Time points must be an array`)
      continue
    }
    
    if (well.timePoints.length === 0) {
      errors.push(`Well ${i + 1}: No time points provided`)
      continue
    }
    
    // Check for valid numbers in time points
    for (let j = 0; j < well.timePoints.length; j++) {
      const point = well.timePoints[j]
      if (typeof point !== 'number' || !isFinite(point)) {
        errors.push(`Well ${i + 1}, Time point ${j + 1}: Invalid value (${point})`)
      }
    }
  }
  
  return errors
} 