import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Profile } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Link } from 'react-router-dom';
import L from 'leaflet';

// Fix pour les icônes Leaflet par défaut qui manquent souvent dans les builds React

// Création d'une icône DivIcon personnalisée pour l'effet de pulse
const createPulsingIcon = (count: number) => {
    return L.divIcon({
        className: 'pulsing-marker',
        html: count > 1 ? `<span class="absolute -top-6 left-1/2 -translate-x-1/2 bg-brand-black text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">${count}</span>` : '',
        iconSize: [16, 16], // Taille du point central
        iconAnchor: [8, 8], // Centrage (moitié de la taille)
    });
};

// Coordonnées pré-définies pour les grandes villes marocaines et mondiales pour accélérer le chargement
const PREDEFINED_COORDS: Record<string, [number, number]> = {
  'Casablanca': [33.5731, -7.5898],
  'Rabat': [34.0209, -6.8416],
  'Marrakech': [31.6295, -7.9811],
  'Tanger': [35.7595, -5.8340],
  'Fès': [34.0181, -5.0078],
  'Agadir': [30.4278, -9.5981],
  'Meknès': [33.8935, -5.5473],
  'Oujda': [34.6814, -1.9076],
  'Kenitra': [34.2610, -6.5802],
  'Tetouan': [35.5785, -5.3684],
  'Safi': [32.3268, -9.2382],
  'El Jadida': [33.2316, -8.5007],
  'Paris': [48.8566, 2.3522],
  'Lyon': [45.7640, 4.8357],
  'Bordeaux': [44.8378, -0.5792],
  'Londres': [51.5074, -0.1278],
  'New York': [40.7128, -74.0060],
  'Montréal': [45.5017, -73.5673],
  'Dubai': [25.2048, 55.2708]
};

interface DirectoryMapProps {
  members: Profile[];
}

// Composant pour recentrer la carte quand les membres changent
function MapUpdater({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [bounds, map]);
  return null;
}

export function DirectoryMap({ members }: DirectoryMapProps) {
  const [coords, setCoords] = useState<Record<string, [number, number]>>(PREDEFINED_COORDS);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // 1. Grouper les membres par ville
  const membersByCity = useMemo(() => {
    const grouped: Record<string, Profile[]> = {};
    members.forEach(member => {
      if (member.city) {
        // Normalisation simple du nom de ville
        const cityName = member.city.split(',')[0].trim(); // "Paris, France" -> "Paris"
        if (!grouped[cityName]) grouped[cityName] = [];
        grouped[cityName].push(member);
      }
    });
    return grouped;
  }, [members]);

  // 2. Récupérer les coordonnées manquantes
  useEffect(() => {
    const fetchCoordinates = async () => {
      const citiesToFetch = Object.keys(membersByCity).filter(city => !coords[city]);
      
      if (citiesToFetch.length === 0) return;

      setLoadingLocations(true);
      const newCoords = { ...coords };
      
      // Traitement par lots pour éviter le rate-limiting
      for (const city of citiesToFetch) {
        try {
            // Utilisation de l'API OpenStreetMap Nominatim (Gratuit)
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                newCoords[city] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            }
            // Petit délai pour être gentil avec l'API
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
            console.error(`Could not fetch coords for ${city}`, err);
        }
      }
      
      setCoords(newCoords);
      setLoadingLocations(false);
    };

    fetchCoordinates();
  }, [membersByCity]);

  // 3. Calculer les limites de la carte (bounds) pour centrer sur les marqueurs
  const bounds = useMemo(() => {
    const points = Object.keys(membersByCity)
      .map(city => coords[city])
      .filter((p): p is [number, number] => !!p);
    
    if (points.length === 0) return null;
    return L.latLngBounds(points);
  }, [membersByCity, coords]);

  return (
    <div className="h-[600px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative bg-gray-100 z-0">
      {loadingLocations && (
        <div className="absolute top-4 right-4 z-[400] bg-white px-3 py-1 rounded-full shadow text-xs font-medium text-gray-500 animate-pulse">
            Localisation des villes...
        </div>
      )}
      
      <MapContainer 
        center={[31.7917, -7.0926]} // Centre du Maroc par défaut
        zoom={6} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater bounds={bounds} />

        {Object.entries(membersByCity).map(([city, cityMembers]) => {
          const position = coords[city];
          if (!position) return null;

          return (
            <Marker 
                key={city} 
                position={position}
                icon={createPulsingIcon(cityMembers.length)}
            >
              <Popup className="custom-popup">
                <div className="p-1 min-w-[200px] max-w-[300px]">
                    <h3 className="font-bold text-lg border-b border-gray-100 pb-2 mb-2">
                        {city} <span className="text-gray-400 text-sm font-normal">({cityMembers.length})</span>
                    </h3>
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                        {cityMembers.map(member => (
                            <Link 
                                key={member.id} 
                                to={`/member/${member.id}`}
                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                <Avatar src={member.avatar_url || undefined} alt={member.first_name || ''} size="sm" />
                                <div>
                                    <p className="font-medium text-sm text-brand-black">
                                        {member.first_name} {member.last_name}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate max-w-[150px]">
                                        {member.job_title || 'Membre'}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
