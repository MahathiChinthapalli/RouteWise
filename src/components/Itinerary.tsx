import { useState } from 'react';
import { useRouteStore } from '../store/routeStore';
import type { TransportMode } from '../types';

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatDistance(meters: number): string {
  const miles = meters * 0.000621371;
  if (miles < 0.1) {
    return `${Math.round(meters)} m`;
  }
  return `${miles.toFixed(1)} mi`;
}

function formatCost(min: number, max: number): string {
  if (min === 0 && max === 0) {
    return 'Free';
  }
  if (min === max) {
    return `$${min.toFixed(2)}`;
  }
  return `$${min.toFixed(2)} - $${max.toFixed(2)}`;
}

function getTransportIcon(mode: string): string {
  switch (mode) {
    case 'walk':
      return '🚶';
    case 'bike':
      return '🚴';
    case 'drive':
      return '🚗';
    case 'transit':
      return '🚇';
    case 'rideshare':
      return '🚕';
    default:
      return '➡️';
  }
}

export default function Itinerary() {
  const { currentRoute, isCalculating, updateLegTransportMode } = useRouteStore();
  const [editingLeg, setEditingLeg] = useState<number | null>(null);

  const handleTransportModeChange = async (legIndex: number, mode: TransportMode) => {
    await updateLegTransportMode(legIndex, mode);
    setEditingLeg(null);
  };

  if (isCalculating) {
    return (
      <div className="itinerary calculating">
        <div className="loading-spinner"></div>
        <p>Calculating optimal route...</p>
      </div>
    );
  }

  if (!currentRoute) {
    return (
      <div className="itinerary empty">
        <p>Click "Optimize Route" to generate your itinerary.</p>
      </div>
    );
  }

  const { orderedStops, destinations, legs, totalDuration, totalDistance, totalCost } = currentRoute;

  return (
    <div className="itinerary">
      <div className="itinerary-header">
        <h2>Your Optimized Route</h2>
        <div className="route-summary">
          <div className="summary-item">
            <span className="label">Total Time:</span>
            <span className="value">{formatDuration(totalDuration)}</span>
          </div>
          <div className="summary-item">
            <span className="label">Total Distance:</span>
            <span className="value">{formatDistance(totalDistance)}</span>
          </div>
          <div className="summary-item">
            <span className="label">Estimated Cost:</span>
            <span className="value">{formatCost(totalCost.min, totalCost.max)}</span>
          </div>
        </div>
      </div>

      <div className="itinerary-steps">
        {orderedStops.map((stopId, index) => {
          const destination = destinations.find(d => d.id === stopId);
          if (!destination) return null;

          const leg = index < legs.length ? legs[index] : null;

          return (
            <div key={`${stopId}-${index}`} className="itinerary-step">
              <div className="step-header">
                <div className="step-number">{index + 1}</div>
                <div className="step-destination">
                  <div className="destination-name">{destination.name}</div>
                  <div className="destination-address">{destination.address}</div>
                </div>
              </div>

              {leg && (
                <div className="step-leg">
                  <div className="leg-icon">{getTransportIcon(leg.transportMode)}</div>
                  <div className="leg-details">
                    <div className="leg-info">
                      {formatDuration(leg.duration)} • {formatDistance(leg.distance)}
                    </div>
                    <div className="leg-cost">{formatCost(leg.cost.min, leg.cost.max)}</div>
                  </div>
                  {editingLeg === index ? (
                    <div className="transport-selector">
                      <button onClick={() => handleTransportModeChange(index, 'walk')} className={leg.transportMode === 'walk' ? 'active' : ''}>🚶</button>
                      <button onClick={() => handleTransportModeChange(index, 'bike')} className={leg.transportMode === 'bike' ? 'active' : ''}>🚴</button>
                      <button onClick={() => handleTransportModeChange(index, 'transit')} className={leg.transportMode === 'transit' ? 'active' : ''}>🚇</button>
                      <button onClick={() => handleTransportModeChange(index, 'drive')} className={leg.transportMode === 'drive' ? 'active' : ''}>🚗</button>
                      <button onClick={() => setEditingLeg(null)} className="cancel-btn">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingLeg(index)} className="change-transport-btn" title="Change transport mode">
                      ⚙️
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
