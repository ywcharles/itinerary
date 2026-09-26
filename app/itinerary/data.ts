export type Stop = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  google_map_links: string;
  coordinates: { lat: number; lng: number };
  description: string;
  image: string;
};

export const mockStops: Stop[] = [
  {
    id: 'stop-1',
    start_time: '2026-09-26T09:00:00',
    end_time: '2026-09-26T10:00:00',
    google_map_links: 'https://maps.google.com/?q=Ottawa',
    coordinates: {
      lat: 45.4215,
      lng: -75.6972,
    },
    name: 'Breakfast at Café',
    description: '',
    image: '/images/cafe.jpg',
  },
  {
    id: 'stop-2',
    start_time: '2026-09-26T10:30:00',
    end_time: '2026-09-26T12:00:00',
    google_map_links: 'https://maps.google.com/?q=Parliament+Hill',
    coordinates: {
      lat: 45.4236,
      lng: -75.7009,
    },
    name: 'Parliament Hill',
    description: '',
    image: '/images/parliament.jpg',
  },
  {
    id: 'stop-3',
    start_time: '2026-09-26T12:30:00',
    end_time: '2026-09-26T13:30:00',
    google_map_links: 'https://maps.google.com/?q=Ottawa',
    coordinates: {
      lat: 45.4215,
      lng: -75.6972,
    },
    name: 'Lunch',
    description: '',
    image: '/images/lunch.jpg',
  },
];