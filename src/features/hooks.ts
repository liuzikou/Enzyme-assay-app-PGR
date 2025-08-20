import { create } from 'zustand'
import { z } from 'zod'
import { validateWellData, meanDuplicateFromAdjacentWells, isDuplicateWell } from '../utils/metrics'
import { calcS2251 } from '../utils/s2251Calculator'

// Types
export type AssayType = 'S2251'

export interface WellData {
  wellId: string
  timePoints: number[]
}

export interface AssayResult {
  wellId: string
  value: number
  isValid: boolean
}

export interface AppState {
  // Assay configuration
  assayType: AssayType
  timeRange: [number, number]
  smoothingWindow: number
  
  // Data
  rawData: WellData[]
  selectedWells: Set<string>
  control0Wells: Set<string>
  
  // Results
  results: AssayResult[]
  isLoading: boolean
  errors: string[]
  
  // UI state
  showWellSelector: boolean
  // Precision control
  sigDigits: number
}

export interface AppActions {
  // Assay configuration
  setAssayType: (type: AssayType) => void
  setTimeRange: (range: [number, number]) => void
  setSmoothingWindow: (window: number) => void
  
  // Data management
  setRawData: (data: WellData[]) => void
  setSelectedWells: (wells: Set<string>) => void
  setControl0Wells: (wells: Set<string>) => void
  
  // Results
  setResults: (results: AssayResult[]) => void
  setLoading: (loading: boolean) => void
  setErrors: (errors: string[]) => void
  
  // UI state
  setShowWellSelector: (show: boolean) => void
  
  // Actions
  calculate: () => void
  reset: () => void
  // Precision control
  incDigits: () => void
  decDigits: () => void
}

export type AppStore = AppState & AppActions

// Validation schemas
export const wellDataSchema = z.object({
  wellId: z.string().regex(/^[A-H](?:[1-9]|1[0-2])$/),
  timePoints: z.array(z.number().finite()).min(1)
})

export const plateDataSchema = z.array(wellDataSchema).length(96)

// Store
export const useAssayStore = create<AppStore>((set, get) => ({
  // Initial state
  assayType: 'S2251',
  timeRange: [0, 30],
  smoothingWindow: 5,
  
  rawData: [],
  selectedWells: new Set(),
  control0Wells: new Set(),
  
  results: [],
  isLoading: false,
  errors: [],
  
  showWellSelector: false,
  
  // Precision control
      sigDigits: 5,
    incDigits: () => set(s => ({ sigDigits: Math.min(6, s.sigDigits + 1) })),
    decDigits: () => set(s => ({ sigDigits: Math.max(1, s.sigDigits - 1) })),
  
  // Actions
  setAssayType: (type) => set({ 
    assayType: type,
    // Set default smoothing window for S2251
    smoothingWindow: 5,
    // Set default control wells for S2251
    control0Wells: new Set()
  }),
  setTimeRange: (range) => set({ timeRange: range }),
  setSmoothingWindow: (window) => set({ smoothingWindow: window }),
  
  setRawData: (data) => set({ rawData: data }),
  setSelectedWells: (wells) => set({ selectedWells: wells }),
  setControl0Wells: (wells) => set({ control0Wells: wells }),
  
  setResults: (results) => set({ results }),
  setLoading: (loading) => set({ isLoading: loading }),
  setErrors: (errors) => set({ errors }),
  
  setShowWellSelector: (show) => set({ showWellSelector: show }),
  
  calculate: () => {
    const state = get()
    set({ isLoading: true, errors: [] })
    
    try {
      // Validate data
      const validationErrors = validateWellData(state.rawData)
      if (validationErrors.length > 0) {
        set({ errors: validationErrors, isLoading: false })
        return
      }
      
      // Check if we have selected wells
      if (state.selectedWells.size === 0) {
        set({ errors: ['No wells selected for analysis'], isLoading: false })
        return
      }
      
      const results: AssayResult[] = []
      
      // Process each selected well
      for (const wellId of state.selectedWells) {
        const wellData = state.rawData.find(well => well.wellId === wellId)
        if (!wellData) continue
        
        // Skip duplicate wells - they will be handled by their primary wells
        if (isDuplicateWell(wellId, state.rawData)) {
          results.push({
            wellId,
            value: 0,
            isValid: false
          })
          continue
        }
        
        try {
          let value = 0
          
          // Get duplicate data from adjacent well
          const duplicateData = meanDuplicateFromAdjacentWells(wellId, state.rawData)
          
          // S2251 calculation
          if (state.control0Wells.size === 0) {
            throw new Error('No negative control wells selected for S2251')
          }
          
          // Process control wells the same way as sample wells
          const controlWells = Array.from(state.control0Wells)
          const primaryControlWell = controlWells[0] // Use first control well as primary
          const primaryControlData = state.rawData.find(well => well.wellId === primaryControlWell)?.timePoints
          
          if (!primaryControlData) {
            throw new Error('No negative control data available')
          }
          
          // Get duplicate data for control well (if exists)
          const controlDuplicateData = meanDuplicateFromAdjacentWells(primaryControlWell, state.rawData)
          
          // Prepare control data in same format as sample data
          let bgCtrlS2251: number[][]
          if (controlDuplicateData) {
            bgCtrlS2251 = [primaryControlData, controlDuplicateData]
          } else {
            bgCtrlS2251 = [primaryControlData]
          }
          
          // For S2251, use correct data format based on new algorithm
          let s2251Data: number[][]
          if (duplicateData) {
            // Use both original and duplicate data
            s2251Data = [wellData.timePoints, duplicateData]
          } else {
            // Use single well data (wrap in array for meanDuplicate function)
            s2251Data = [wellData.timePoints]
          }
          
          // Use the new S2251 algorithm with smoothing window
          value = calcS2251(s2251Data, bgCtrlS2251, state.smoothingWindow)
          
          results.push({
            wellId,
            value,
            isValid: isFinite(value)
          })
          
        } catch (error) {
          results.push({
            wellId,
            value: 0,
            isValid: false
          })
        }
      }
      
      set({ results, isLoading: false })
      
    } catch (error) {
      set({ 
        errors: [error instanceof Error ? error.message : 'Unknown error'], 
        isLoading: false 
      })
    }
  },
  
  reset: () => set({
    rawData: [],
    selectedWells: new Set(),
    results: [],
    errors: [],
    isLoading: false
  })
})) 