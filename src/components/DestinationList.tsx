import { useRouteStore } from '../store/routeStore';
import type { Destination } from '../types';

export default function DestinationList() {
  const {
    destinations,
    startPoint,
    endPoint,
    removeDestination,
    setStartPoint,
    setEndPoint
  } = useRouteStore();

  const handleRemove = (id: string) => {
    removeDestination(id);
  };

  const handleSetAsStart = (destination: Destination) => {
    if (startPoint?.id === destination.id) {
      setStartPoint(null);
    } else {
      setStartPoint(destination);
    }
  };

  const handleSetAsEnd = (destination: Destination) => {
    if (endPoint?.id === destination.id) {
      setEndPoint(null);
    } else {
      setEndPoint(destination);
    }
  };

  if (destinations.length === 0 && !startPoint) {
    return (
      <div className="empty-state">
        <p>No destinations added yet.</p>
        <p>Search for locations above to start planning your route.</p>
      </div>
    );
  }

  return (
    <div className="destination-list">
      {startPoint && !destinations.find(d => d.id === startPoint.id) && (
        <div className="destination-item start-point">
          <div className="destination-marker">🚩</div>
          <div className="destination-info">
            <div className="destination-name">{startPoint.name}</div>
            <div className="destination-address">{startPoint.address}</div>
            <div className="destination-label">Starting Point</div>
          </div>
          <button
            onClick={() => setStartPoint(null)}
            className="remove-btn"
            title="Remove start point"
          >
            ×
          </button>
        </div>
      )}

      {destinations.map((destination, index) => {
        const isStartPoint = startPoint?.id === destination.id;
        const isEndPoint = endPoint?.id === destination.id;

        return (
          <div
            key={destination.id}
            className={`destination-item ${isStartPoint ? 'start-point' : ''} ${isEndPoint ? 'end-point' : ''}`}
          >
            <div className="destination-marker">
              {isStartPoint ? '🚩' : isEndPoint ? '🏁' : `${index + 1}`}
            </div>
            <div className="destination-info">
              <div className="destination-name">{destination.name}</div>
              <div className="destination-address">{destination.address}</div>
              {isStartPoint && <div className="destination-label">Starting Point</div>}
              {isEndPoint && <div className="destination-label">Ending Point</div>}
            </div>
            <div className="destination-actions">
              <button
                onClick={() => handleSetAsStart(destination)}
                className={`action-btn ${isStartPoint ? 'active' : ''}`}
                title={isStartPoint ? 'Remove as starting point' : 'Set as starting point'}
              >
                {isStartPoint ? '🚩✓' : '🚩'}
              </button>
              <button
                onClick={() => handleSetAsEnd(destination)}
                className={`action-btn ${isEndPoint ? 'active' : ''}`}
                title={isEndPoint ? 'Remove as ending point' : 'Set as ending point'}
              >
                {isEndPoint ? '🏁✓' : '🏁'}
              </button>
              <button
                onClick={() => handleRemove(destination.id)}
                className="remove-btn"
                title="Remove destination"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
