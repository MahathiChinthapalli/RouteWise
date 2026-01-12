import { useRouteStore } from '../store/routeStore';

export default function ControlPanel() {
  const {
    optimizationMode,
    transportMode,
    useMultiModal,
    setOptimizationMode,
    setTransportMode,
    setUseMultiModal,
    calculateOptimalRoute,
    clearRoute,
    destinations,
    startPoint,
    isCalculating,
    error
  } = useRouteStore();

  const canOptimize = destinations.length >= 2 && startPoint !== null;

  return (
    <div className="control-panel">
      <div className="control-group">
        <label>Optimization Mode:</label>
        <div className="button-group">
          <button
            className={optimizationMode === 'fastest' ? 'active' : ''}
            onClick={() => setOptimizationMode('fastest')}
          >
            ⚡ Fastest
          </button>
          <button
            className={optimizationMode === 'cheapest' ? 'active' : ''}
            onClick={() => setOptimizationMode('cheapest')}
          >
            💰 Cheapest
          </button>
          <button
            className={optimizationMode === 'balanced' ? 'active' : ''}
            onClick={() => setOptimizationMode('balanced')}
          >
            ⚖️ Balanced
          </button>
        </div>
      </div>

      <div className="control-group">
        <label>
          <input
            type="checkbox"
            checked={useMultiModal}
            onChange={(e) => setUseMultiModal(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Smart Multi-Modal (Auto-select best transport per leg)
        </label>
      </div>

      {!useMultiModal && (
        <div className="control-group">
          <label>Transport Mode:</label>
          <div className="button-group">
            <button
              className={transportMode === 'walk' ? 'active' : ''}
              onClick={() => setTransportMode('walk')}
            >
              🚶 Walk
            </button>
            <button
              className={transportMode === 'bike' ? 'active' : ''}
              onClick={() => setTransportMode('bike')}
            >
              🚴 Bike
            </button>
            <button
              className={transportMode === 'transit' ? 'active' : ''}
              onClick={() => setTransportMode('transit')}
            >
              🚇 Transit
            </button>
            <button
              className={transportMode === 'drive' ? 'active' : ''}
              onClick={() => setTransportMode('drive')}
            >
              🚗 Drive
            </button>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="action-buttons">
        <button
          className="optimize-btn primary"
          onClick={calculateOptimalRoute}
          disabled={!canOptimize || isCalculating}
        >
          {isCalculating ? 'Calculating...' : '🎯 Optimize Route'}
        </button>
        <button
          className="clear-btn secondary"
          onClick={clearRoute}
          disabled={isCalculating}
        >
          🗑️ Clear All
        </button>
      </div>

      {!canOptimize && destinations.length < 2 && (
        <p className="hint">Add at least 2 destinations to optimize your route</p>
      )}
      {!canOptimize && !startPoint && destinations.length >= 2 && (
        <p className="hint">Set a starting point to begin</p>
      )}
    </div>
  );
}
