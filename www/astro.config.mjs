import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import vercel from '@astrojs/vercel'

export default defineConfig({
  site: 'https://git-scenarios.griffen.codes',
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  integrations: [
    starlight({
      title: 'git-scenarios',
      description: 'Spin up real git repositories in any state, deterministically. Composable atoms for merge conflicts, submodules, multiple remotes, and more.',
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        replacesTitle: false,
      },
      favicon: '/favicon.svg',
      editLink: {
        baseUrl: 'https://github.com/gfargo/git-scenarios/edit/main/www/',
      },
      lastUpdated: true,
      pagination: true,
      head: [
        // Font preloads (non-render-blocking, replaces @import in CSS)
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.googleapis.com',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossorigin: '',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,300..800,0..100,0..1&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&display=swap',
          },
        },
        // Open Graph
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: 'https://git-scenarios.griffen.codes/og-image.png' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:type', content: 'image/png' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:width', content: '1200' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:height', content: '630' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:type', content: 'website' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:site_name', content: 'git-scenarios' },
        },
        // Twitter Card
        {
          tag: 'meta',
          attrs: { name: 'twitter:card', content: 'summary_large_image' },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:image', content: 'https://git-scenarios.griffen.codes/og-image.png' },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:creator', content: '@gaborFargo' },
        },
        // SEO
        {
          tag: 'meta',
          attrs: { name: 'author', content: 'Griffen Fargo' },
        },
        {
          tag: 'meta',
          attrs: { name: 'keywords', content: 'git, testing, fixtures, scenarios, typescript, simple-git, deterministic, atoms, composable, merge-conflict, submodule, worktree' },
        },
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: '#0a0e1a', media: '(prefers-color-scheme: dark)' },
        },
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
        },
        // Robots
        {
          tag: 'meta',
          attrs: { name: 'robots', content: 'index, follow' },
        },
        // Structured data (JSON-LD)
        {
          tag: 'script',
          attrs: { type: 'application/ld+json' },
          content: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareSourceCode',
            name: '@gfargo/git-scenarios',
            description: 'Composable atoms for spinning up real git repositories in any state — merge conflicts, submodules, multiple remotes, in-progress operations, and more.',
            url: 'https://git-scenarios.griffen.codes',
            codeRepository: 'https://github.com/gfargo/git-scenarios',
            programmingLanguage: 'TypeScript',
            runtimePlatform: 'Node.js',
            license: 'https://opensource.org/licenses/MIT',
            author: {
              '@type': 'Person',
              name: 'Griffen Fargo',
              url: 'https://github.com/gfargo',
            },
            keywords: ['git', 'testing', 'fixtures', 'scenarios', 'typescript', 'deterministic', 'composable'],
          }),
        },
      ],
      social: {
        github: 'https://github.com/gfargo/git-scenarios',
      },
      customCss: ['./src/styles/custom.css'],
      components: {
        SiteTitle: './src/components/SiteTitle.astro',
        Footer: './src/components/Footer.astro',
        Hero: './src/components/Hero.astro',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'docs/introduction' },
            { label: 'Installation', slug: 'docs/installation' },
            { label: 'Quick Start', slug: 'docs/quick-start' },
          ],
        },        {
          label: 'Scenarios',
          items: [
            { label: 'Overview', slug: 'docs/scenarios/overview' },
            { label: 'Browse & Filter', slug: 'docs/scenarios/browse' },
            { label: 'Branch Scenarios', slug: 'docs/scenarios/branch' },
            { label: 'Operation Scenarios', slug: 'docs/scenarios/operation' },
            { label: 'History Scenarios', slug: 'docs/scenarios/history' },
            { label: 'Worktree & Stash', slug: 'docs/scenarios/worktree-stash' },
            { label: 'Submodule Scenarios', slug: 'docs/scenarios/submodule' },
          ],
        },
        {
          label: 'Atoms',
          items: [
            { label: 'Overview', slug: 'docs/atoms/overview' },
            { label: 'Control Flow', slug: 'docs/atoms/control-flow' },
            { label: 'Working Tree', slug: 'docs/atoms/working-tree' },
            { label: 'Commits & Staging', slug: 'docs/atoms/commits' },
            { label: 'Branches & Tags', slug: 'docs/atoms/branches-tags' },
            { label: 'Remotes & Tracking', slug: 'docs/atoms/remotes' },
            { label: 'Operations', slug: 'docs/atoms/operations' },
            { label: 'Scoping', slug: 'docs/atoms/scoping' },
            { label: 'Utilities', slug: 'docs/atoms/utilities' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Jest & Vitest Adapters', slug: 'docs/guides/jest-adapter' },
            { label: 'Custom Scenarios', slug: 'docs/guides/custom-scenarios' },
            { label: 'CLI Reference', slug: 'docs/guides/cli' },
            { label: 'Contributing', slug: 'docs/guides/contributing' },
          ],
        },
        {
          label: 'About',
          items: [
            { label: 'Architecture', slug: 'docs/architecture' },
            { label: 'Release Notes', slug: 'docs/changelog' },
          ],
        },
      ],
    }),
  ],
})
