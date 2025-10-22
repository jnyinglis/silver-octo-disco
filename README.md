# Dashboard POC

An interactive, config-driven dashboard proof-of-concept built with **Vue 3 + TypeScript**. The experience runs entirely in the browser, keeps a mock "mini-database" in memory, and uses the [`linq`](https://www.npmjs.com/package/linq) package to perform LINQ-style aggregations for each card.

## ✨ Highlights

- **Frontend only** – all datasets are generated with [`@faker-js/faker`](https://github.com/faker-js/faker) and stored in memory.
- **Config powered** – every dashboard card defines its own `summaryQuery` and `detailQuery` in TypeScript.
- **LINQ everywhere** – shared helpers wrap the `Enumerable` API to apply filters, joins, and aggregations without mutating arrays.
- **Reactive drill downs** – clicking a card recomputes its detail query using the current filter state.
- **Tested queries** – Vitest specs assert both summary and detail results against a deterministic sample dataset.
- **Toggleable datasets** – swap between a static JSON sample and fresh faker-generated data right in the UI.

## 🗂️ Project structure

```
src/
├── App.vue
├── components/
│   ├── Card.vue
│   └── Dashboard.vue
├── config/
│   └── cardConfigs.ts
├── data/
│   └── sampleData.json
├── types/
│   └── dashboard.ts
├── utils/
│   ├── fakeDataGenerator.ts
│   └── linqHelpers.ts
└── main.ts
```

- `cardConfigs.ts` enumerates each card and wires up its summary/detail LINQ queries, including joins for cross-table metrics.
- `fakeDataGenerator.ts` fabricates relational data (users, courses, proctors, enrollments).
- `linqHelpers.ts` builds lookups, applies global filters, and exposes reusable aggregations.

## 🚀 Getting started

```bash
npm install
npm run dev
```

The development server runs on <http://localhost:5173>. Because the project is frontend-only, no additional services are required.

> **Note:** If your environment blocks access to npm (e.g. in a sandbox), install dependencies locally and copy the resulting `node_modules` directory into the workspace before running the commands above.

### Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite in development mode. |
| `npm run build` | Generate the production bundle in `dist/`. |
| `npm run preview` | Serve the production bundle locally. |
| `npm run test` | Execute Vitest in run mode. |
| `npm run test:watch` | Execute Vitest in watch mode. |
| `npm run type-check` | Run `vue-tsc` for type safety. |

## 🧪 Tests

Vitest specs live in `tests/cardQueries.test.ts`. They load `sampleData.json`, construct a `QueryContext`, and assert that each card's query produces the expected summary and detail information. Run the suite with:

```bash
npm run test
```

## 🌐 Deploying to GitHub Pages

1. Make sure `vite.config.ts` uses the correct base path for your repository (e.g. `base: '/your-repo/'`).
2. Build the project locally:
   ```bash
   npm run build
   ```
3. Push the `dist/` folder to the `gh-pages` branch. A simple approach is:
   ```bash
   git worktree add dist gh-pages
   npm run build
   cd dist && git add --all && git commit -m "Deploy" && git push origin gh-pages
   git worktree remove dist
   ```
   or use any GitHub Actions workflow that publishes the `dist/` directory.
4. Enable GitHub Pages for the repository (`Settings › Pages`) and point it to the `gh-pages` branch.

## ➕ Adding new cards

1. Create a new configuration in `src/config/cardConfigs.ts`.
2. Leverage the shared helpers:
   ```ts
   import { filteredEnrollments, average } from '@/utils/linqHelpers';

   summaryQuery: (ctx) => {
     const highScores = filteredEnrollments(ctx)
       .where((enrollment) => enrollment.score >= 90);

     return {
       label: 'High performers',
       value: highScores.count()
     };
   }
   ```
3. Provide a matching `detailQuery` to power the drill down table. Join across datasets when needed:
   ```ts
   const joined = filteredEnrollments(ctx)
     .join(
       Enumerable.from(ctx.data.courses),
       (enrollment) => enrollment.courseId,
       (course) => course.id,
       (enrollment, course) => ({ enrollment, course })
     );
   ```
4. Optionally specify `filters` metadata so the UI can display which global filters affect the card.

Because cards are just data, the dashboard automatically renders any additions without touching the Vue components.

## 📚 Resources

- [Vue 3 + TypeScript documentation](https://vuejs.org/guide/typescript/overview.html)
- [Vite documentation](https://vitejs.dev/)
- [`linq` package API reference](https://github.com/mihaifm/linq)

Enjoy exploring the LINQ-style analytics playground!
