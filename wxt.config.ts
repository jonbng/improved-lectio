import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Improved Lectio',
    description: 'Better styling and improved functionality for Lectio',
    version: '0.0.2',
    author: {
      email: 'extensions@jonathanb.dk',
    },
    homepage_url: 'https://github.com/jonbng/improved-lectio',
    permissions: ['storage'],
  },
  hooks: {
    'build:manifestGenerated': (wxt, manifest) => {
      if (wxt.config.browser === 'firefox') {
        manifest.browser_specific_settings = {
          gecko: {
            id: '{a1b2c3d4-5678-4e9f-b012-3456789abcde}',
            strict_min_version: '140.0',
            data_collection_permissions: {
              required: ['none'],
            },
          },
        };
      }
    },
  },
  webExt: {
    startUrls: ['https://www.lectio.dk/lectio/94/SkemaNy.aspx'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
        'react': 'preact/compat',
        'react-dom': 'preact/compat',
        'react/jsx-runtime': 'preact/jsx-runtime',
      },
    },
  }),
});
