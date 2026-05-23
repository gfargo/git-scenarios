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
      head: [
        // Open Graph
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: 'https://git-scenarios.griffen.codes/og-image.svg' },
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
          attrs: { name: 'twitter:image', content: 'https://git-scenarios.griffen.codes/og-image.svg' },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:creator', content: '@gaborFargo' },
        },
        // Additional SEO
        {
          tag: 'meta',
          attrs: { name: 'author', content: 'Griffen Fargo' },
        },
        {
          tag: 'meta',
          attrs: { name: 'keywords', content: 'git, testing, fixtures, scenarios, typescript, simple-git, deterministic, atoms, composable, merge-conflict, submodule, worktree' },
        },
        // Theme color for mobile browsers
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: '#0a0e1a' },
        },
        // Canonical (Starlight handles per-page, this is the default)
        {
          tag: 'link',
          attrs: { rel: 'canonical', href: 'https://git-scenarios.griffen.codes' },
        },
      ],
      social: {
        github: 'https://github.com/gfargo/git-scenarios',
      },
      customCss: ['./src/styles/custom.css'],
      components: {
        // Override the Header to add nav links
        Header: './src/components/Header.astro',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'docs/introduction' },
            { label: 'Installation', slug: 'docs/installation' },
            { label: 'Quick Start', slug: 'docs/quick-start' },
          ],
        },
        {
          label: 'Scenarios',
          items: [
            { label: 'Overview', slug: 'docs/scenarios/overview' },
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
            { label: 'Jest Adapter', slug: 'docs/guides/jest-adapter' },
            { label: 'Custom Scenarios', slug: 'docs/guides/custom-scenarios' },
            { label: 'CLI Reference', slug: 'docs/guides/cli' },
            { label: 'Contributing', slug: 'docs/guides/contributing' },
          ],
        },
      ],
    }),
  ],
})
