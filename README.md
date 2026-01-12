# RouteWise - Intelligent Multi-Stop Trip Optimizer

RouteWise is a web application that optimizes multi-stop itineraries for travelers visiting cities. It solves the Traveling Salesman Problem (TSP) using advanced algorithms to calculate the most efficient route between multiple destinations.

## Features

- **Smart Route Optimization**: Uses TSP algorithms (Brute Force, Held-Karp, Nearest Neighbor + 2-opt) based on problem size
- **Interactive Map**: Built with Leaflet for visualizing routes and destinations
- **Multiple Transport Modes**: Walk, bike, or drive
- **Cost Estimation**: See estimated costs for different transportation options
- **Location Search**: Search for destinations using Nominatim (OpenStreetMap)
- **Real-time Distance Matrix**: Fetches actual travel times using OpenRouteService
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **State Management**: Zustand
- **Mapping**: Leaflet + React Leaflet
- **APIs**:
  - OpenRouteService (distance matrix and routing)
  - Nominatim (geocoding and place search)
- **Build Tool**: Vite
- **Styling**: CSS3 with custom properties

## Getting Started

### Prerequisites

- Node.js 20+ (recommended)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Get your free OpenRouteService API key:
   - Visit https://openrouteservice.org/dev/#/signup
   - Sign up for a free account
   - Copy your API key and paste it in `.env`:
```
VITE_ORS_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Add Starting Point**: Search for a location or use your current location as the starting point
2. **Add Destinations**: Search and add 2-15 destinations you want to visit
3. **Choose Transport Mode**: Select walk, bike, or drive
4. **Optimize Route**: Click the "Optimize Route" button to calculate the best route
5. **View Itinerary**: See step-by-step directions with time and cost estimates

## Algorithm Performance

| Destinations | Algorithm | Time Complexity | Performance |
|-------------|-----------|-----------------|-------------|
| 2-7 stops | Brute Force | O(n!) | Guaranteed optimal |
| 8-10 stops | Held-Karp DP | O(n² × 2ⁿ) | Exact solution |
| 11-15 stops | Nearest Neighbor + 2-opt | O(n²) | ~95% optimal |

## Project Structure

```
RouteWise/
├── src/
│   ├── components/       # React components
│   │   ├── LocationSearch.tsx
│   │   ├── DestinationList.tsx
│   │   ├── RouteMap.tsx
│   │   ├── Itinerary.tsx
│   │   └── ControlPanel.tsx
│   ├── services/         # API services
│   │   └── api.ts
│   ├── store/           # Zustand state management
│   │   └── routeStore.ts
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/           # Utility functions
│   │   └── tsp-algorithms.ts
│   ├── App.tsx          # Main app component
│   ├── App.css          # Styles
│   └── main.tsx         # Entry point
├── package.json
└── README.md
```

## API Rate Limits

- **OpenRouteService Free Tier**: 2,000 requests/day
- **Nominatim**: Max 1 request/second (handled automatically)

## Future Enhancements

- Public transit integration
- Rideshare price estimates (Uber/Lyft APIs)
- Operating hours and time constraints
- User accounts with saved routes
- Calendar export functionality
- Multi-day trip planning
- Native mobile apps

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Acknowledgments

- Built based on the RouteWise Product Requirements Document
- Uses OpenStreetMap data via Nominatim
- Routing powered by OpenRouteService
