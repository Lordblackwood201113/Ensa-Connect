import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import type { Profile } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { geocodeToLatLng } from '../../lib/geocoding';

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

// Interface pour le cluster (évite la dépendance sur @types/leaflet.markercluster)
interface MarkerCluster {
    getChildCount(): number;
}

// Création d'une icône de cluster personnalisée
const createClusterCustomIcon = (cluster: MarkerCluster) => {
    const count = cluster.getChildCount();
    let size = 'small';
    let dimension = 40;
    
    if (count >= 100) {
        size = 'large';
        dimension = 60;
    } else if (count >= 10) {
        size = 'medium';
        dimension = 50;
    }
    
    return L.divIcon({
        html: `<div class="cluster-icon cluster-icon-${size}"><span>${count}</span></div>`,
        className: 'custom-cluster-marker',
        iconSize: L.point(dimension, dimension, true),
    });
};

// Coordonnées pré-définies pour les villes ivoiriennes, africaines et mondiales pour accélérer le chargement
const PREDEFINED_COORDS: Record<string, [number, number]> = {
  // Côte d'Ivoire - Villes principales
  'Abidjan': [5.3600, -4.0083],
  "Abidjan, Côte d'Ivoire": [5.3600, -4.0083],
  "Abobo, Abidjan, Côte d'Ivoire": [5.4167, -4.0167],
  'Yamoussoukro': [6.8276, -5.2893],
  "Yamoussoukro, Côte d'Ivoire": [6.8276, -5.2893],
  'Bouaké': [7.6881, -5.0308],
  "Bouaké, Côte d'Ivoire": [7.6881, -5.0308],
  'Daloa': [6.8774, -6.4502],
  "Daloa, Côte d'Ivoire": [6.8774, -6.4502],
  'Korhogo': [9.4580, -5.6296],
  "Korhogo, Côte d'Ivoire": [9.4580, -5.6296],
  'San-Pédro': [4.7485, -6.6363],
  "San-Pédro, Côte d'Ivoire": [4.7485, -6.6363],
  'Man': [7.4125, -7.5536],
  "Man, Côte d'Ivoire": [7.4125, -7.5536],
  'Gagnoa': [6.1319, -5.9506],
  "Gagnoa, Côte d'Ivoire": [6.1319, -5.9506],
  'Divo': [5.8397, -5.3600],
  "Divo, Côte d'Ivoire": [5.8397, -5.3600],
  "Abengourou, Côte d'Ivoire": [6.7297, -3.4964],
  "Aboisso, Côte d'Ivoire": [5.4667, -3.2000],
  "Alépé, Côte d'Ivoire": [5.5000, -3.6667],
  "Attinguié, Côte d'Ivoire": [5.9167, -4.1333],
  "Bettié, Côte d'Ivoire": [6.1000, -3.5333],
  "Bingerville, Côte d'Ivoire": [5.3500, -3.8833],
  "Bondoukou, Côte d'Ivoire": [8.0404, -2.8000],
  "Boundiali, Côte d'Ivoire": [9.5200, -6.4800],
  "Dabou, Côte d'Ivoire": [5.3167, -4.3667],
  "Ferkessédougou, Côte d'Ivoire": [9.5900, -5.2000],
  "Grand-Bassam, Côte d'Ivoire": [5.2167, -3.7333],
  "Grand-Béréby, Côte d'Ivoire": [4.6500, -6.9167],
  "Iboké, Côte d'Ivoire": [5.6000, -3.3333],
  "Jacqueville, Côte d'Ivoire": [5.2000, -4.4167],
  "Kouassi Kouassikro, Côte d'Ivoire": [7.4000, -4.8500],
  "M'bengué, Côte d'Ivoire": [10.0000, -5.9000],
  "N'Douci, Côte d'Ivoire": [6.0000, -4.6500],
  "Odienné, Côte d'Ivoire": [9.5000, -7.5667],
  "Ouangolodougou, Côte d'Ivoire": [9.9667, -5.1500],
  "Sinematiali, Côte d'Ivoire": [9.5833, -5.3833],
  "Soubré, Côte d'Ivoire": [5.7833, -6.5833],
  "Tiassalé, Côte d'Ivoire": [5.8833, -4.8333],
  "Touba, Côte d'Ivoire": [8.2833, -7.6833],
  "Toupah, Côte d'Ivoire": [5.3833, -4.6167],
  "Vavoua, Côte d'Ivoire": [7.3833, -6.4667],
  "Zuénoula, Côte d'Ivoire": [7.4333, -6.0500],
  
  // Autres pays africains
  'Bamako': [12.6392, -8.0029],
  'Bamako, Mali': [12.6392, -8.0029],
  'Libreville': [0.4162, 9.4673],
  'Libreville, Gabon': [0.4162, 9.4673],
  'Mouila, Gabon': [-1.8667, 11.0500],
  'Lomé': [6.1375, 1.2123],
  'Lomé, Togo': [6.1375, 1.2123],
  'Kinshasa': [-4.4419, 15.2663],
  'Kinshasa, République démocratique du Congo': [-4.4419, 15.2663],
  'Boma, République démocratique du Congo': [-5.8500, 13.0500],
  'République démocratique du Congo': [-4.4419, 15.2663],
  'Saint-Louis, Sénégal': [16.0200, -16.5000],
  'Addis Ababa, Éthiopie': [9.0320, 38.7469],
  
  // France
  'Paris': [48.8566, 2.3522],
  'Paris, France': [48.8566, 2.3522],
  'France': [46.2276, 2.2137],
  'Lyon': [45.7640, 4.8357],
  'Lyon, France': [45.7640, 4.8357],
  'Bordeaux': [44.8378, -0.5792],
  'Bordeaux, France': [44.8378, -0.5792],
  'Montpellier': [43.6108, 3.8767],
  'Montpellier, France': [43.6108, 3.8767],
  'Rennes': [48.1173, -1.6778],
  'Rennes, France': [48.1173, -1.6778],
  'Rennes, France ': [48.1173, -1.6778], // avec espace trailing
  'Marseille': [43.2965, 5.3698],
  'Marseille, France': [43.2965, 5.3698],
  'Dijon': [47.3220, 5.0415],
  'Dijon, France': [47.3220, 5.0415],
  'Avignon': [43.9493, 4.8055],
  'Avignon, France': [43.9493, 4.8055],
  'Cholet': [47.0600, -0.8789],
  'Cholet, France': [47.0600, -0.8789],
  'Houilles': [48.9258, 2.1892],
  'Houilles, France': [48.9258, 2.1892],
  'La Rochelle': [46.1591, -1.1520],
  'La Rochelle, France': [46.1591, -1.1520],
  'Orléans': [47.9029, 1.9039],
  'Orléans, France': [47.9029, 1.9039],
  
  // Allemagne
  'Allemagne': [51.1657, 10.4515],
  
  // États-Unis
  'Alexandria, Virginia, États-Unis': [38.8048, -77.0469],
  'Frederick, Maryland, États-Unis': [39.4143, -77.4105],
  'New York': [40.7128, -74.0060],
  
  // Autres
  'Londres': [51.5074, -0.1278],
  'Montréal': [45.5017, -73.5673],
  'Dubai': [25.2048, 55.2708],
  
  // Maroc (conservés)
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
  const [geoErrorCount, setGeoErrorCount] = useState(0);

  // 1. Grouper les membres par ville
  const membersByCity = useMemo(() => {
    const grouped: Record<string, Profile[]> = {};
    members.forEach(member => {
      if (member.city) {
        // Normalisation simple du nom de ville (clé d'agrégation)
        const cityName = member.city.split(',')[0].trim(); // "Paris, France" -> "Paris"
        if (!grouped[cityName]) grouped[cityName] = [];
        grouped[cityName].push(member);
      }
    });
    return grouped;
  }, [members]);

  // Pour chaque ville (clé), on garde une requête de géocodage plus précise (ex: "Paris, France")
  const geocodeQueryByCity = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(membersByCity).forEach(([city, cityMembers]) => {
      const first = cityMembers[0]?.city;
      map[city] = (first && first.trim()) ? first : city;
    });
    return map;
  }, [membersByCity]);

  // 2. Récupérer les coordonnées manquantes
  useEffect(() => {
    const fetchCoordinates = async () => {
      const citiesToFetch = Object.keys(membersByCity).filter(city => !coords[city]);
      
      if (citiesToFetch.length === 0) return;

      setLoadingLocations(true);
      setGeoErrorCount(0);
      const newCoords: Record<string, [number, number]> = { ...coords };
      
      // Traitement par lots pour éviter le rate-limiting
      for (const city of citiesToFetch) {
        try {
            // Géocodage: on utilise une requête plus précise si disponible ("Ville, Pays")
            const query = geocodeQueryByCity[city] || city;
            const latLng = await geocodeToLatLng(query);
            if (latLng) {
              newCoords[city] = latLng;
            } else {
              setGeoErrorCount((c) => c + 1);
            }
            // Petit délai (quota / rate limit)
            await new Promise(resolve => setTimeout(resolve, 120));
        } catch (err) {
            console.error(`Could not fetch coords for ${city}`, err);
            setGeoErrorCount((c) => c + 1);
        }
      }
      
      setCoords(newCoords);
      setLoadingLocations(false);
    };

    fetchCoordinates();
  }, [membersByCity, geocodeQueryByCity, coords]);

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
      {!loadingLocations && Object.keys(membersByCity).length > 0 && geoErrorCount > 0 && (
        <div className="absolute bottom-4 right-4 z-[400] bg-white px-3 py-1 rounded-full shadow text-xs font-medium text-amber-700 border border-amber-200">
          {geoErrorCount} ville(s) non géocodée(s)
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

        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={60}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
          disableClusteringAtZoom={12}
        >
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
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
