import { describe, it, expect } from 'vitest'
import {
  diffArray,
  movingAvg,
  meanDuplicate,
  subtractArray,
  validateWellData
} from '../utils/metrics'
import { calcS2251 } from '../utils/s2251Calculator'

describe('S2251 Function Tests', () => {
  it('should have all S2251 functions defined', () => {
    expect(typeof diffArray).toBe('function')
    expect(typeof movingAvg).toBe('function')
    expect(typeof meanDuplicate).toBe('function')
    expect(typeof subtractArray).toBe('function')
    expect(typeof calcS2251).toBe('function')
    expect(typeof validateWellData).toBe('function')
  })

  it('should handle basic diffArray', () => {
    const result = diffArray([1, 2, 3, 4], 1)
    expect(Array.isArray(result)).toBe(true)
    expect(result).toEqual([1, 1, 1])
  })

  it('should handle basic movingAvg', () => {
    const result = movingAvg([1, 2, 3, 4], 2)
    expect(Array.isArray(result)).toBe(true)
    expect(result).toEqual([1.5, 2.5, 3.5])
  })

  it('should handle basic meanDuplicate', () => {
    const result = meanDuplicate([[1, 2], [3, 4]])
    expect(Array.isArray(result)).toBe(true)
    expect(result).toEqual([2, 3])
  })

  it('should handle basic subtractArray', () => {
    const result = subtractArray([1, 2, 3], [0, 1, 2])
    expect(Array.isArray(result)).toBe(true)
    expect(result).toEqual([1, 1, 1])
  })

  it('should handle basic calcS2251', () => {
    const result = calcS2251([[1, 2, 3], [1, 2, 3]], [0, 0, 0], 2)
    expect(typeof result).toBe('number')
  })

  it('should handle basic validateWellData', () => {
    const result = validateWellData([
      { wellId: 'A1', timePoints: [1, 2, 3] }
    ])
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0) // No errors for valid data
  })

  it('should validate well data format', () => {
    const result = validateWellData([
      { wellId: 'A1', timePoints: [1, 2, 3] },
      { wellId: 'B2', timePoints: [4, 5, 6] }
    ])
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0) // No errors for valid data
  })

  it('should detect invalid well IDs', () => {
    const result = validateWellData([
      { wellId: 'A13', timePoints: [1, 2, 3] } // Invalid well ID
    ])
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0) // Should have errors
  })
}) 