'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import Link from 'next/link'
import type { Database } from '@/types/database'

// Fix Leaflet default marker icons in Next.js
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

type Centre = Database['public']['Tables']['centres']['Row']

interface CentresMapProps {
  centres: Centre[]
}

export default function CentresMap({ centres }: CentresMapProps) {
  const centresWithCoords = centres.filter((c) => c.latitude && c.longitude)
  const center: [number, number] =
    centresWithCoords.length > 0
      ? [centresWithCoords[0].latitude!, centresWithCoords[0].longitude!]
      : [26.5, 73.5] // Rajasthan default

  return (
    <MapContainer
      center={center}
      zoom={7}
      style={{ height: '320px', width: '100%', borderRadius: '12px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {centresWithCoords.map((centre) => (
        <Marker
          key={centre.id}
          position={[centre.latitude!, centre.longitude!]}
          icon={icon}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{centre.name}</div>
              <div className="text-gray-500 text-xs">{centre.code}</div>
              <div className="text-gray-600 text-xs mt-1">{centre.address}</div>
              <div className="text-xs mt-1 capitalize">
                {centre.grain_types.join(', ')}
              </div>
              <Link
                href={`/centres/${centre.id}/book`}
                className="block mt-2 text-center bg-green-600 text-white text-xs px-3 py-1 rounded-lg"
              >
                Book Slot
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
