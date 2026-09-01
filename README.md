# Natural Deduction

A logic puzzle game for iOS, Android and the web. Each level is a sequent —
some premises and a goal — and you clear it by building a Fitch-style natural
deduction proof, one justified line at a time. 27 proofs across six chapters,
from `P ∧ Q ⊢ Q ∧ P` up to Peirce's law.

**Every level is free.** There is no paywall, no ads, no hint currency and no
timer. RevenueCat is wired up purely as an optional tip jar for people who want
to support the work; nothing in the app branches on whether they did.

<p align="center">
  <img src="assets/logo.png" width="140" alt="The app icon: a Scrabble tile whose letter is the negation sign">
</p>

The logo is a letter tile in the style of Scrabble and Apalabrados, except the
letter is `¬`. It is drawn geometrically by `tools/make_logo.py` — no font
files, no SVG toolchain — so `npm run logo` reproduces the whole icon set from
scratch.

## Running it

```bash
npm install
npm start          # Metro, for a development build
npm run web        # in a browser, no native build needed
npm test           # the engine's test suite
npm run typecheck
```

`npm run web` and `npm start --web` are the fastest way to play: the web target
runs the same React tree as the apps.

**Expo Go will not work for purchases.** `react-native-purchases` is a native
module, so the tip jar needs a development build:

```bash
npx eas build --profile development --platform ios     # or android
```

The app degrades gracefully without it — the store simply reports itself
unreachable and the tip jar hides.

## One codebase, three targets

| Target | Command | Notes |
| --- | --- | --- |
| iOS | `eas build --platform ios` | |
| Android | `eas build --platform android` | |
| Web | `npm run web:export` | Static files in `dist/`, deploy anywhere |

`npm run web:export` produces a plain static site — `index.html` plus a JS
bundle — that drops onto Netlify, Vercel, Cloudflare Pages or GitHub Pages with
no server. Nothing is platform-forked: the same screens, the same proof engine,
the same level data. The only concession to the web is in `app/_layout.tsx`,
which caps and centres the app column above 520px so a phone layout does not
stretch across a monitor. Progress lives in AsyncStorage, which is `localStorage`
on the web, so each platform keeps its own.

## How it is put together

```
src/logic/       the proof engine — no React, no React Native
  formula.ts     the AST, structural equality, minimal-parenthesis printing
  parser.ts      Unicode and ASCII spellings of every connective
  proof.ts       Fitch structure: nesting, line numbering, scope
  rules.ts       the 17 inference rules and their error messages
  check.ts       validation of a whole proof against a goal
src/levels/      level catalogue, each with a machine-verified solution
src/game/        structural edits to a proof, kept pure
src/components/  the tile logo, the proof renderer, the editor sheet
src/store/       progress (AsyncStorage) and the tip jar (RevenueCat)
app/             expo-router screens
tools/           the icon generator
```

The engine is deliberately free of any UI import. It is the part that has to be
right, it is fully unit tested, and keeping it portable means the same code
could back a web version or a marking script later.

### Scope is positional

A proof is a list of items; an item is a line or a subproof; a subproof is a
list of items whose first entry is its assumption. Because the structure nests,
scope falls out of position: a line may cite anything above it at its own level
or an enclosing one, and the interior of a closed subproof is unreachable by
construction. Discharge needs no separate bookkeeping.

### Every level is proved solvable at build time

Each level ships a reference solution, and the test suite replays all 27 of them
through the same checker the app runs, restricted to the rules that level
actually unlocks. A level that cannot be finished — or that needs a rule the
player has not been given yet — fails the build rather than stranding someone
mid-chapter. That suite is also the main test of the engine itself: getting
Peirce's law to validate exercises nested subproofs, discharge and the classical
rules at once.

### Error messages are the product

A wrong step never just goes red. `∧E` on a disjunction says which connective it
needed; `→I` names the conditional the subproof actually discharges to; a
citation reaching into a closed subproof says so in those words. That feedback
is what separates this from a proof checker with levels bolted on.

## Configuration

RevenueCat keys come from the environment via `app.config.ts`:

```bash
cp .env.example .env    # then fill in your keys
```

For builds, set them as EAS secrets:

```bash
eas secret:create --name REVENUECAT_IOS_KEY --value appl_xxx
eas secret:create --name REVENUECAT_ANDROID_KEY --value goog_xxx
```

Create an entitlement called `supporter` in the RevenueCat dashboard and attach
your tip products to the current offering. If no key is set, the app runs
normally and the tip jar hides itself.

## Adding a level

Add an entry to the relevant chapter in `src/levels/levels.ts` with its
premises, goal, available rules, a hint, and a solution. Solutions cite the line
numbers the UI displays, and subproofs by the range they span:

```ts
{
  id: 'modus-tollens',
  title: 'Modus tollens',
  premises: ['P → Q', '¬Q'],
  goal: '¬P',
  rules: NEGATION,
  hint: 'To prove a negation, assume the thing and derive ⊥.',
  solution: [
    { assume: 'P', steps: [['Q', 'impE', 1, 3], ['⊥', 'notE', 4, 2]] },
    ['¬P', 'notI', '3-5'],
  ],
}
```

`npm test` will tell you immediately if it does not go through.
