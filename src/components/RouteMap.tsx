import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import { useRouteStore } from '../store/routeStore';
import type { Destination } from '../types';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function MapBoundsUpdater({ destinations }: { destinations: Destination[] }) {
  const map = useMap();

  useEffect(() => {
    if (destinations.length > 0) {
      const bounds = new LatLngBounds(
        destinations.map(d => [d.coordinates.lat, d.coordinates.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [destinations, map]);

  return null;
}

export default function RouteMap() {
  const { destinations, startPoint, currentRoute } = useRouteStore();

  // Combine all points for map bounds
  const allPoints: Destination[] = [];
  if (startPoint) allPoints.push(startPoint);
  allPoints.push(...destinations);

  // Default center (New York City)
  const defaultCenter: [number, number] = [40.7128, -74.0060];
  const center: [number, number] = allPoints.length > 0
    ? [allPoints[0].coordinates.lat, allPoints[0].coordinates.lng]
    : defaultCenter;

  // Generate route polyline if we have an optimized route
  const routePolyline: [number, number][] = [];
  if (currentRoute) {
    currentRoute.orderedStops.forEach(stopId => {
      const destination = currentRoute.destinations.find(d => d.id === stopId);
      if (destination) {
        routePolyline.push([destination.coordinates.lat, destination.coordinates.lng]);
      }
    });
  }

  return (
    <div className="map-container">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {allPoints.length > 0 && <MapBoundsUpdater destinations={allPoints} />}

        {/* Start point marker */}
        {startPoint && (
          <Marker
            position={[startPoint.coordinates.lat, startPoint.coordinates.lng]}
            icon={L.divIcon({
              className: 'custom-marker start-marker',
              html: '<div class="marker-content">🚩</div>',
              iconSize: [30, 30],
              iconAnchor: [15, 30]
            })}
          >
            <Popup>
              <strong>Start: {startPoint.name}</strong>
              <br />
              {startPoint.address}
            </Popup>
          </Marker>
        )}

        {/* Destination markers */}
        {destinations.map((destination, index) => {
          const isInRoute = currentRoute?.orderedStops.includes(destination.id);
          const routePosition = isInRoute && currentRoute
            ? currentRoute.orderedStops.indexOf(destination.id) + 1
            : index + 1;

          return (
            <Marker
              key={destination.id}
              position={[destination.coordinates.lat, destination.coordinates.lng]}
              icon={L.divIcon({
                className: `custom-marker ${isInRoute ? 'route-marker' : 'destination-marker'}`,
                html: `<div class="marker-content">${isInRoute ? routePosition : index + 1}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 30]
              })}
            >
              <Popup>
                <strong>{destination.name}</strong>
                <br />
                {destination.address}
                {isInRoute && (
                  <>
                    <br />
                    <em>Stop #{routePosition}</em>
                  </>
                )}
              </Popup>
            </Marker>
          );
        })}

        {/* Route polyline */}
        {routePolyline.length > 1 && (
          <Polyline
            positions={routePolyline}
            color="#2563eb"
            weight={4}
            opacity={0.7}
          />
        )}
      </MapContainer>
    </div>
  );
}
