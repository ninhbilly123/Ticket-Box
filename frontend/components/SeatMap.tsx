'use client';

import React from 'react';
import { TicketType } from '../lib/api';

interface SeatMapProps {
  ticketTypes: TicketType[];
  selectedTicketTypeId: string | null;
  onSelectTicketType: (id: string) => void;
}

export default function SeatMap({
  ticketTypes,
  selectedTicketTypeId,
  onSelectTicketType,
}: SeatMapProps) {
  // Helper to find a ticket type by case-insensitive name
  const findTicketTypeByName = (name: string) => {
    return ticketTypes.find((tt) => tt.name.toUpperCase() === name.toUpperCase());
  };

  // Configuration for zones in the SVG
  const zones = [
    {
      name: 'SVIP',
      label: 'SVIP Area',
      color: 'fill-red-500 hover:fill-red-600',
      selectedColor: 'fill-red-700 stroke-white stroke-2',
      disabledColor: 'fill-gray-700 opacity-40 cursor-not-allowed',
      textColor: 'fill-white',
    },
    {
      name: 'VIP',
      label: 'VIP Area',
      color: 'fill-purple-500 hover:fill-purple-600',
      selectedColor: 'fill-purple-700 stroke-white stroke-2',
      disabledColor: 'fill-gray-700 opacity-40 cursor-not-allowed',
      textColor: 'fill-white',
    },
    {
      name: 'CAT1',
      label: 'CAT 1',
      color: 'fill-blue-500 hover:fill-blue-600',
      selectedColor: 'fill-blue-700 stroke-white stroke-2',
      disabledColor: 'fill-gray-700 opacity-40 cursor-not-allowed',
      textColor: 'fill-white',
    },
    {
      name: 'CAT2',
      label: 'CAT 2',
      color: 'fill-yellow-500 hover:fill-yellow-600',
      selectedColor: 'fill-yellow-700 stroke-white stroke-2',
      disabledColor: 'fill-gray-700 opacity-40 cursor-not-allowed',
      textColor: 'fill-black',
    },
    {
      name: 'GA',
      label: 'GA Standing',
      color: 'fill-emerald-500 hover:fill-emerald-600',
      selectedColor: 'fill-emerald-700 stroke-white stroke-2',
      disabledColor: 'fill-gray-700 opacity-40 cursor-not-allowed',
      textColor: 'fill-white',
    },
  ];

  return (
    <div className="w-full flex flex-col items-center bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-bold text-white mb-1">Sơ đồ chỗ ngồi tương tác</h3>
        <p className="text-xs text-gray-400">Chọn một khu vực trên sơ đồ SVG bên dưới để đặt vé</p>
      </div>

      {/* SVG Container */}
      <div className="w-full max-w-lg aspect-[4/3] relative">
        <svg viewBox="0 0 400 300" className="w-full h-full select-none">
          {/* Stage / Sân khấu */}
          <rect
            x="80"
            y="10"
            width="240"
            height="35"
            rx="5"
            className="fill-gray-700 stroke-gray-500 stroke-1"
          />
          <text
            x="200"
            y="32"
            textAnchor="middle"
            className="fill-gray-300 font-bold text-[14px] tracking-wider"
          >
            STAGE / SÂN KHẤU
          </text>

          {/* Zones */}
          {zones.map((zone) => {
            const tt = findTicketTypeByName(zone.name);
            const isSoldOut = tt ? tt.remaining === 0 : true;
            const isSelected = tt ? selectedTicketTypeId === tt.id : false;

            // Define points/dimensions for SVG shapes
            let pathElement = null;
            let textCoords = { x: 200, y: 150 };

            if (zone.name === 'SVIP') {
              // Center-front box
              pathElement = (
                <rect x="130" y="60" width="140" height="50" rx="4" />
              );
              textCoords = { x: 200, y: 90 };
            } else if (zone.name === 'VIP') {
              // Flanking and behind SVIP
              pathElement = (
                <path d="M 80,60 L 120,60 L 120,110 L 280,110 L 280,60 L 320,60 L 320,130 L 80,130 Z" />
              );
              textCoords = { x: 200, y: 124 };
            } else if (zone.name === 'GA') {
              // Main standing area in center
              pathElement = (
                <rect x="110" y="140" width="180" height="65" rx="6" />
              );
              textCoords = { x: 200, y: 178 };
            } else if (zone.name === 'CAT1') {
              // Left side seating
              pathElement = (
                <path d="M 20,60 L 70,60 L 70,215 L 100,215 L 100,285 L 20,285 Z" />
              );
              textCoords = { x: 55, y: 175 };
            } else if (zone.name === 'CAT2') {
              // Right side & rear seating
              pathElement = (
                <path d="M 330,60 L 380,60 L 380,285 L 300,285 L 300,215 L 330,215 Z" />
              );
              textCoords = { x: 345, y: 175 };
            }

            const className = `transition-all duration-300 cursor-pointer ${
              isSoldOut
                ? zone.disabledColor
                : isSelected
                ? zone.selectedColor
                : zone.color
            }`;

            const handleClick = () => {
              if (tt && !isSoldOut) {
                onSelectTicketType(tt.id);
              }
            };

            return (
              <g key={zone.name} onClick={handleClick}>
                {/* Render Shape */}
                {React.cloneElement(pathElement as React.ReactElement, { className })}
                
                {/* Zone Label Text */}
                <text
                  x={textCoords.x}
                  y={textCoords.y}
                  textAnchor="middle"
                  className={`pointer-events-none font-bold text-[10px] ${
                    isSoldOut ? 'fill-gray-500' : zone.textColor
                  }`}
                >
                  {zone.label}
                </text>
                
                {/* Remaining Ticket Badge Text */}
                {tt && (
                  <text
                    x={textCoords.x}
                    y={textCoords.y + 12}
                    textAnchor="middle"
                    className={`pointer-events-none text-[8px] ${
                      isSoldOut ? 'fill-gray-500' : 'fill-white/80'
                    }`}
                  >
                    {isSoldOut ? 'Hết vé' : `Còn: ${tt.remaining}`}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend / Chú thích màu */}
      <div className="mt-4 w-full flex flex-wrap justify-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-500"></span>
          <span>SVIP</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-500"></span>
          <span>VIP</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-500"></span>
          <span>CAT 1</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-yellow-500"></span>
          <span>CAT 2</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500"></span>
          <span>GA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-700 opacity-40 border border-gray-600"></span>
          <span>Hết vé</span>
        </div>
      </div>
    </div>
  );
}
