import { useState } from 'react';
import LocationSearch from './components/LocationSearch';
import DestinationList from './components/DestinationList';
import RouteMap from './components/RouteMap';
import Itinerary from './components/Itinerary';
import ControlPanel from './components/ControlPanel';
import { useRouteStore } from './store/routeStore';
import type { Destination } from './types';
import './App.css';

function App() {
  const { addDestination, setStartPoint, startPoint } = useRouteStore();
  const [activeTab, setActiveTab] = useState<'destinations' | 'itinerary'>('destinations');

  const handleSelectLocation = (destination: Destination) => {
    addDestination(destination);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🗺️ RouteWise</h1>
        <p className="tagline">Intelligent Multi-Stop Trip Optimizer</p>
      </header>

      <div className="app-content">
        <aside className="sidebar">
          <div className="search-section">
            <h2>Add Destinations</h2>
            <LocationSearch onSelectLocation={handleSelectLocation} />
          </div>

          <div className="tabs">
            <button
              className={activeTab === 'destinations' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('destinations')}
            >
              Destinations
            </button>
            <button
              className={activeTab === 'itinerary' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('itinerary')}
            >
              Itinerary
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'destinations' ? (
              <>
                <DestinationList />
                <ControlPanel />
              </>
            ) : (
              <Itinerary />
            )}
          </div>
        </aside>

        <main className="map-section">
          <RouteMap />
        </main>
      </div>
    </div>
  );
}

export default App;
