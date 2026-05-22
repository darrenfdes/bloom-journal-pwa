import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bloom Journal',
    short_name: 'Bloom',
    description: 'A mood-aware journal where each entry grows a flower in your garden.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF6F0',
    theme_color: '#8FA88A',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
