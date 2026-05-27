/**
 * MapMarkerBitmap.tsx
 *
 * Renderiza el marcador de sitio usando el componente nativo de react-native-maps.
 */

import React from 'react';
import { Marker } from 'react-native-maps';

// ─── Colores por estado ───────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  'Ejecutado':    '#30D158',
  'En ejecución': '#FF9500',
  'Pospuesto':    '#FF453A',
  'Planificado':  '#0A84FF',
  'Sin asignar':  '#8E8E93',
};
const DEFAULT_COLOR = '#8E8E93';

interface SiteMarkerProps {
  coordinate: { latitude: number; longitude: number };
  code: string;
  status: string;
  onPress: () => void;
  zIndex?: number;
}

export const SiteMarker = ({
  coordinate, code, status, onPress, zIndex = 99
}: SiteMarkerProps) => {
  const color = STATUS_COLORS[status] || DEFAULT_COLOR;

  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      zIndex={zIndex}
      pinColor={color}
      title={code}
      description={status}
    />
  );
};

