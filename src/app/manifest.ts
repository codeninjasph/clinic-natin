import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Clinic Natin Mobile',
    short_name: 'Clinic Natin',
    description: 'Skip the waiting room. Track your clinic queue turn in real time.',
    start_url: '/mobile',
    display: 'standalone',
    background_color: '#568259',
    theme_color: '#568259',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
