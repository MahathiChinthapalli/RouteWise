import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Destination,
  Route,
  OptimizationMode,
  TransportMode,
  RouteLeg
} from '../types';
import { fetchDistanceMatrix } from '../services/api';
import { optimizeRoute } from '../utils/tsp-algorithms';

interface RouteState {
  // State
  destinations: Destination[];
  startPoint: Destination | null;
  endPoint: Destination | null;
  optimizationMode: OptimizationMode;
  transportMode: TransportMode;
  currentRoute: Route | null;
  isCalculating: boolean;
  error: string | null;
  useMultiModal: boolean;

  // Actions
  addDestination: (destination: Destination) => void;
  removeDestination: (id: string) => void;
  updateDestination: (id: string, updates: Partial<Destination>) => void;
  reorderDestinations: (newOrder: Destination[]) => void;
  setStartPoint: (destination: Destination | null) => void;
  setEndPoint: (destination: Destination | null) => void;
  setOptimizationMode: (mode: OptimizationMode) => void;
  setTransportMode: (mode: TransportMode) => void;
  setUseMultiModal: (use: boolean) => void;
  updateLegTransportMode: (legIndex: number, mode: TransportMode) => Promise<void>;
  calculateOptimalRoute: () => Promise<void>;
  clearRoute: () => void;
  setError: (error: string | null) => void;
}

// Helper function to determine best transport mode based on distance
function getBestTransportMode(distanceMeters: number): TransportMode {
  const distanceMiles = distanceMeters * 0.000621371;

  if (distanceMiles < 0.5) return 'walk';      // < 0.5 miles: walk
  if (distanceMiles < 2) return 'bike';        // 0.5-2 miles: bike
  if (distanceMiles < 10) return 'transit';    // 2-10 miles: transit (metro/bus)
  return 'drive';                              // > 10 miles: drive
}

export const useRouteStore = create<RouteState>((set, get) => ({
  // Initial state
  destinations: [],
  startPoint: null,
  endPoint: null,
  optimizationMode: 'fastest',
  transportMode: 'drive',
  currentRoute: null,
  isCalculating: false,
  error: null,
  useMultiModal: true,

  // Actions
  addDestination: (destination) => {
    set((state) => ({
      destinations: [...state.destinations, destination],
      error: null
    }));
  },

  removeDestination: (id) => {
    set((state) => ({
      destinations: state.destinations.filter((d) => d.id !== id),
      error: null
    }));
  },

  updateDestination: (id, updates) => {
    set((state) => ({
      destinations: state.destinations.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
      error: null
    }));
  },

  reorderDestinations: (newOrder) => {
    set({ destinations: newOrder });
  },

  setStartPoint: (destination) => {
    set({ startPoint: destination, error: null });
  },

  setEndPoint: (destination) => {
    set({ endPoint: destination, error: null });
  },

  setOptimizationMode: (mode) => {
    set({ optimizationMode: mode });
  },

  setTransportMode: (mode) => {
    set({ transportMode: mode });
  },

  setUseMultiModal: (use) => {
    set({ useMultiModal: use });
  },

  updateLegTransportMode: async (legIndex, mode) => {
    const state = get();
    const { currentRoute } = state;

    if (!currentRoute || !currentRoute.legs[legIndex]) {
      return;
    }

    set({ isCalculating: true });

    try {
      const leg = currentRoute.legs[legIndex];
      const fromDest = currentRoute.destinations.find(d => d.id === leg.fromDestinationId);
      const toDest = currentRoute.destinations.find(d => d.id === leg.toDestinationId);

      if (!fromDest || !toDest) {
        throw new Error('Destination not found');
      }

      // Fetch new distance matrix for this specific leg with new transport mode
      const matrix = await fetchDistanceMatrix([fromDest, toDest], mode);
      const element = matrix[0][1];

      // Update the leg
      const updatedLegs = [...currentRoute.legs];
      updatedLegs[legIndex] = {
        ...leg,
        transportMode: mode,
        duration: Math.round(element.duration / 60),
        distance: element.distance,
        cost: element.cost || { min: 0, max: 0 }
      };

      // Recalculate totals
      let totalDuration = 0;
      let totalDistance = 0;
      let totalCostMin = 0;
      let totalCostMax = 0;

      updatedLegs.forEach(l => {
        totalDuration += l.duration;
        totalDistance += l.distance;
        totalCostMin += l.cost.min;
        totalCostMax += l.cost.max;
      });

      const updatedRoute: Route = {
        ...currentRoute,
        legs: updatedLegs,
        totalDuration,
        totalDistance,
        totalCost: { min: totalCostMin, max: totalCostMax }
      };

      set({ currentRoute: updatedRoute, isCalculating: false });
    } catch (error) {
      console.error('Error updating leg transport mode:', error);
      set({ isCalculating: false });
    }
  },

  calculateOptimalRoute: async () => {
    const state = get();
    const { destinations, startPoint, endPoint, transportMode, useMultiModal } = state;

    if (destinations.length < 2) {
      set({ error: 'Please add at least 2 destinations' });
      return;
    }

    if (!startPoint) {
      set({ error: 'Please set a starting point' });
      return;
    }

    set({ isCalculating: true, error: null });

    try {
      // Build full destination list including start and optional end
      const allDestinations: Destination[] = [];
      const destinationMap = new Map<string, number>();

      // Add start point first
      allDestinations.push(startPoint);
      destinationMap.set(startPoint.id, 0);

      // Add other destinations (skip if already added as start)
      destinations.forEach((dest) => {
        if (dest.id !== startPoint.id) {
          const idx = allDestinations.length;
          allDestinations.push(dest);
          destinationMap.set(dest.id, idx);
        }
      });

      let endIndex: number | null = null;
      if (endPoint) {
        if (endPoint.id === startPoint.id) {
          // End point is same as start point - use index 0
          endIndex = 0;
        } else if (!destinationMap.has(endPoint.id)) {
          // End point is not in destinations list - add it
          endIndex = allDestinations.length;
          allDestinations.push(endPoint);
          destinationMap.set(endPoint.id, endIndex);
        } else {
          // End point is already in destinations list - use its index
          endIndex = destinationMap.get(endPoint.id)!;
        }
      }

      // Fetch distance matrix
      const matrix = await fetchDistanceMatrix(allDestinations, transportMode);

      // Run optimization
      const result = optimizeRoute(matrix, 0, endIndex);

      // Build route legs with intelligent transport mode selection
      const legs: RouteLeg[] = [];
      for (let i = 0; i < result.orderedStops.length - 1; i++) {
        const fromIdx = parseInt(result.orderedStops[i]);
        const toIdx = parseInt(result.orderedStops[i + 1]);
        const matrixElement = matrix[fromIdx][toIdx];

        // Determine transport mode: use smart selection if multimodal, otherwise use selected mode
        const legTransportMode = useMultiModal
          ? getBestTransportMode(matrixElement.distance)
          : transportMode;

        // If using multi-modal, fetch accurate data for the selected mode
        let legData = matrixElement;
        if (useMultiModal && legTransportMode !== transportMode) {
          try {
            const legMatrix = await fetchDistanceMatrix(
              [allDestinations[fromIdx], allDestinations[toIdx]],
              legTransportMode
            );
            legData = legMatrix[0][1];
          } catch (e) {
            console.warn('Failed to fetch mode-specific data, using default:', e);
          }
        }

        legs.push({
          fromDestinationId: allDestinations[fromIdx].id,
          toDestinationId: allDestinations[toIdx].id,
          transportMode: legTransportMode,
          duration: Math.round(legData.duration / 60), // Convert to minutes
          distance: legData.distance,
          cost: legData.cost || { min: 0, max: 0 },
          instructions: []
        });
      }

      // Convert ordered stops from indices to destination IDs
      const orderedStopIds = result.orderedStops.map(stopIdx => {
        const idx = parseInt(stopIdx);
        return allDestinations[idx].id;
      });

      // Create route object
      const route: Route = {
        id: uuidv4(),
        destinations: allDestinations,
        orderedStops: orderedStopIds,
        startPoint,
        endPoint,
        optimizationMode: state.optimizationMode,
        totalDuration: result.totalDuration,
        totalDistance: result.totalDistance,
        totalCost: result.totalCost,
        createdAt: Date.now(),
        legs
      };

      set({ currentRoute: route, isCalculating: false });
    } catch (error) {
      console.error('Error calculating route:', error);
      set({
        error: 'Failed to calculate route. Please try again.',
        isCalculating: false
      });
    }
  },

  clearRoute: () => {
    set({
      destinations: [],
      startPoint: null,
      endPoint: null,
      currentRoute: null,
      error: null
    });
  },

  setError: (error) => {
    set({ error });
  }
}));
