import { RoadSegmentData, LandmarkLocation } from '../types';

export const CAIRO_LANDMARKS: LandmarkLocation[] = [
  {
    name: 'Tahrir Square',
    nameArabic: 'ميدان التحرير',
    position: [0, 1.2, 0],
    rotationY: 0,
    description: 'Heart of modern Cairo, central obelisk monument and radiating boulevards',
  },
  {
    name: '6th of October Bridge Ramp',
    nameArabic: 'مطلع كوبري 6 أكتوبر',
    position: [-160, 2.5, -340],
    rotationY: Math.PI / 4,
    description: 'High-speed elevated flyover weaving through Cairo architecture',
  },
  {
    name: 'Nile Corniche Promenade',
    nameArabic: 'كورنيش النيل',
    position: [-180, 1.2, -100],
    rotationY: Math.PI / 2,
    description: 'Scenic multi-lane avenue along the reflective Nile River',
  },
  {
    name: 'Qasr El Nil Bridge',
    nameArabic: 'كوبري قصر النيل',
    position: [-140, 3.2, 0],
    rotationY: -Math.PI / 2,
    description: 'Iconic historical bridge connecting Downtown to Gezira Island',
  },
  {
    name: 'Old Cairo Historic Alley',
    nameArabic: 'حارة القاهرة التاريخية',
    position: [180, 1.2, -40],
    rotationY: 0,
    description: 'Challenging narrow streets with red-brick buildings and speed bumps',
  },
];

export const CAIRO_ROAD_NETWORK: RoadSegmentData[] = [
  // 1. Nile Corniche Avenue (North - South arterial)
  {
    id: 'corniche_main',
    name: 'Nile Corniche',
    nameArabic: 'كورنيش النيل',
    type: 'arterial',
    points: [
      [-180, 0, -600],
      [-180, 0, -300],
      [-175, 0, 0],
      [-180, 0, 300],
      [-180, 0, 600],
    ],
    width: 22,
    lanes: 4,
    elevation: 0,
    speedLimit: 80,
  },

  // 2. Qasr El Nil Street (connecting Corniche to Tahrir Square)
  {
    id: 'qasr_el_nil_street',
    name: 'Qasr El Nil Street',
    nameArabic: 'شارع قصر النيل',
    type: 'arterial',
    points: [
      [-175, 0, 0],
      [-100, 0, 0],
      [-35, 0, 0],
    ],
    width: 18,
    lanes: 4,
    elevation: 0,
    speedLimit: 50,
  },

  // 3. Qasr El Nil Bridge (crossing the Nile West to Gezira Island)
  {
    id: 'qasr_el_nil_bridge',
    name: 'Qasr El Nil Bridge',
    nameArabic: 'كوبري قصر النيل',
    type: 'bridge',
    points: [
      [-175, 0, 0],
      [-210, 2.5, 0],
      [-260, 2.5, 0],
      [-320, 0, 0],
    ],
    width: 16,
    lanes: 4,
    elevation: 2.5,
    speedLimit: 60,
  },

  // 4. Tahrir Square Ring Road (Roundabout at X: 0, Z: 0)
  {
    id: 'tahrir_roundabout',
    name: 'Tahrir Square',
    nameArabic: 'ميدان التحرير',
    type: 'roundabout',
    points: [
      [35, 0, 0],
      [25, 0, 25],
      [0, 0, 35],
      [-25, 0, 25],
      [-35, 0, 0],
      [-25, 0, -25],
      [0, 0, -35],
      [25, 0, -25],
      [35, 0, 0],
    ],
    width: 18,
    lanes: 3,
    elevation: 0,
    speedLimit: 40,
  },

  // 5. Talaat Harb Street (Tahrir towards Talaat Harb Roundabout)
  {
    id: 'talaat_harb_street',
    name: 'Talaat Harb Street',
    nameArabic: 'شارع طلعت حرب',
    type: 'arterial',
    points: [
      [0, 0, -35],
      [30, 0, -90],
      [60, 0, -140],
    ],
    width: 16,
    lanes: 3,
    elevation: 0,
    speedLimit: 50,
  },

  // 6. Talaat Harb Roundabout (X: 60, Z: -140)
  {
    id: 'talaat_harb_midan',
    name: 'Talaat Harb Square',
    nameArabic: 'ميدان طلعت حرب',
    type: 'roundabout',
    points: [
      [75, 0, -140],
      [60, 0, -125],
      [45, 0, -140],
      [60, 0, -155],
      [75, 0, -140],
    ],
    width: 14,
    lanes: 2,
    elevation: 0,
    speedLimit: 40,
  },

  // 7. Bab El-Louk Avenue (Tahrir South towards Ministry / Garden City)
  {
    id: 'bab_el_louk_ave',
    name: 'Bab El-Louk Avenue',
    nameArabic: 'شارع باب اللوق',
    type: 'arterial',
    points: [
      [0, 0, 35],
      [20, 0, 150],
      [30, 0, 320],
    ],
    width: 16,
    lanes: 3,
    elevation: 0,
    speedLimit: 50,
  },

  // 8. 6th of October Flyover Bridge - On-Ramp (from Corniche to deck)
  {
    id: 'october_bridge_onramp',
    name: '6th of October Bridge Ramp',
    nameArabic: 'مطلع كوبري 6 أكتوبر',
    type: 'ramp',
    points: [
      [-175, 0, -380],
      [-150, 4, -340],
      [-110, 9, -300],
      [-70, 14, -260],
    ],
    width: 12,
    lanes: 2,
    elevation: 14,
    speedLimit: 70,
  },

  // 9. 6th of October Flyover Bridge - Main Elevated Deck
  {
    id: 'october_bridge_main_deck',
    name: '6th of October Bridge',
    nameArabic: 'كوبري 6 أكتوبر',
    type: 'bridge',
    points: [
      [-70, 14, -260],
      [-20, 14, -220],
      [40, 14, -180],
      [90, 14, -100],
      [110, 14, 0],
      [100, 14, 120],
      [70, 14, 240],
    ],
    width: 16,
    lanes: 4,
    elevation: 14,
    speedLimit: 90,
  },

  // 10. 6th of October Flyover Bridge - Off-Ramp towards Downtown
  {
    id: 'october_bridge_offramp',
    name: 'October Bridge Downtown Exit',
    nameArabic: 'منزل كوبري أكتوبر - وسط البلد',
    type: 'ramp',
    points: [
      [40, 14, -180],
      [55, 9, -150],
      [65, 4, -120],
      [60, 0, -90],
    ],
    width: 10,
    lanes: 1,
    elevation: 0,
    speedLimit: 50,
  },

  // 11. Historic Cairo Alley 1 (Khan El-Khalili branch)
  {
    id: 'hara_khan_khalili',
    name: 'Al-Muizz Alley',
    nameArabic: 'شارع المعز وحارة خان الخليلي',
    type: 'alley',
    points: [
      [35, 0, 0],
      [110, 0, -10],
      [180, 0, -40],
      [240, 0, -70],
      [300, 0, -50],
    ],
    width: 8,
    lanes: 1,
    elevation: 0,
    speedLimit: 30,
    hasBumps: true,
  },

  // 12. Historic Cairo Alley 2 (Darb El-Ahmar cross-alley)
  {
    id: 'hara_darb_ahmar',
    name: 'Darb El-Ahmar Alley',
    nameArabic: 'حارة الدرب الأحمر',
    type: 'alley',
    points: [
      [180, 0, -150],
      [180, 0, -40],
      [190, 0, 60],
      [210, 0, 180],
    ],
    width: 7,
    lanes: 1,
    elevation: 0,
    speedLimit: 25,
    hasBumps: true,
  },
];

// Speed bump locations [X, Y, Z, width, rotationY, isAggressive]
export const CAIRO_SPEED_BUMPS: [number, number, number, number, number, boolean][] = [
  // Alley speed bumps (sharp concrete and asphalt waves)
  [120, 0, -12, 8, 0, true],
  [180, 0, 10, 7, Math.PI / 2, true],
  [210, 0, -55, 8, -Math.PI / 6, false],
  [200, 0, 120, 7, Math.PI / 2, true],
  // Downtown pedestrian approach bumps
  [25, 0, -65, 14, 0.4, false],
  [15, 0, 90, 16, 0.1, false],
];
