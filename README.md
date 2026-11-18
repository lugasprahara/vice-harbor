# vice-harbor
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/lugasprahara/vice-harbor/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/lugasprahara/vice-harbor/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Vice Harbor** is an original top-down 2D open-world crime game for the desktop browser, written in vanilla JavaScript on HTML5 canvas — no libraries, no build step, no network requests. The whole city is lit in golden-hour sunset: warm orange streets, long soft building shadows, bright sand, turquoise water, palm trees everywhere, and neon storefront signs just flickering on. You play Nico Reyes, a deckhand at Marina Azul who gets pulled, job by job, into the harbour wars of fixer Marisol Vega, mechanic Rico Santana and smuggler Captain Duarte.

The world is one continuous city of **5 districts** — Downtown Solmar, Coral Boardwalk, Marina Azul, Ironhook Docks and Palmera Gardens — stitched together by a road grid with live traffic, crowds of pedestrians with their own clothing colours and routines, authored buildings with rooftop water tanks, air-conditioning units, striped awnings and glowing signs, plus landmarks: the Faro de Solmar lighthouse, the Solmar Grand Hotel, the Coral Ferris wheel, the Ironhook crane yard, the Marina Azul clubhouse and the Palmera fountain. East and south of the city the land gives way to beach and open water, where the game's headline system lives: **drivable boats**. Boats are moored at five named piers; board one with the same key you use for cars, throttle across the bay with real drift and a foaming wake, dodge the other boats cruising the water, and run smuggler cargo from pier to pier.

On land there are **7 stealable vehicle classes** — Brisa Compact, Solmar Sedan, Oro Muscle, Faro GT Sport, Ironhook Pickup, Cargo Van and the Solmar Taxi — each with its own silhouette, top speed, acceleration and grip. Crime is answered by a **wanted level of 1–5 stars** that builds with heat and decays when you lie low: cruisers chase you, fast **interceptors** cut you off at 3 stars and start shooting, and at 4 stars the Solmar PD throws **roadblocks** — two angled police cars and a tyre-shredding spike strip — across the road ahead. Get cornered on foot and you are **busted**; get shot down and you are **wasted**; either way you wake up poorer and back on the street.

The story is a **10-mission campaign** with named characters and written dialogue: freight runs, a stolen sedan for Rico, a pier strongbox raid, a boat smuggler run for Captain Duarte, chauffeuring a judge, crane sabotage, a lighthouse signal, an arms-van theft, a boardwalk defence and a final strongbox run across the bay. On top of that sit **3 staged heists** — the Banco Solmar Job, the Grand Hotel Jewels and the Harbour Gold Run — each played in five stages: planning, entry, loot, getaway and payout. Repeatable work never runs out: **taxi fares** with named riders and tip bonuses, and boat **smuggler runs** between the piers. Combat uses **4 weapons** — fists, pistol, SMG and shotgun — with ammo, spread and pellets. **18 hidden packages** are tucked across all five districts and the water. Four synth **radio stations** (SOL 98.1 sunset house, CORAL WAVE latin pop, FARO ROCK, BRISA LO-FI) are generated live with WebAudio while you drive, and the current station is always shown on the HUD next to your health, money, wanted stars, weapon and ammo, the current objective banner, your district name and a **live minimap** with blips for you, your objective, the police, hidden packages and boats. Progress **saves to 3 localStorage slots** (plus an autosave after every respawn), and a pause menu recaps the controls and your career stats.

## Features

- 10-mission story campaign with named characters (Marisol Vega, Rico Santana, Captain Duarte, Judge Herrera) and timed dialogue
- 3 staged heists, each with planning → entry → loot → getaway → payout stages and five-figure crews' planning dialogue
- 5 districts with distinct palettes, ground, roofs and accent colours, plus 6 authored landmarks
- 7 stealable vehicle classes with distinct silhouettes and handling; ambient traffic AI that brakes, yields and flees
- Drivable boats in 4 kinds (dinghy, speedboat, cruiser, yacht) with drift physics, visible wakes and moving water traffic
- Boat smuggler runs: pickup at one pier, delivery at another, repeatable
- Wanted level 1–5 stars with heat decay, police cruisers, interceptors, officer gunfire and roadblocks with spike strips
- Busted and wasted outcomes with fines and respawn
- 4 weapons: fists, pistol, SMG, shotgun — with ammo pickups earned through the campaign
- 4 WebAudio synth radio stations with generative bass and chords; station shown on the HUD
- 18 hidden packages, repeatable taxi fares with named riders
- HUD with health, money, stars, weapon/ammo, objective banner, district label and radio line; live minimap with blips
- Save/load in 3 localStorage slots, autosave, pause menu, heist board, title screen
- Deterministic screenshot scenes via `?shot=start|play|chase|boat&seed=1`

## Controls

- **WASD / arrows** — move on foot, drive cars, throttle and steer boats
- **E** — enter / exit a car or boat (stealing cars draws police heat)
- **Mouse** — aim; **F or mouse click** — punch or shoot
- **Q** — switch weapon · **N** — next radio station · **M** — radio off
- **T** — start a taxi fare · **B** — start a boat smuggler run · **H** — heist board
- **Esc / P** — pause · **F5/F6/F7** — save to slots 1–3 · **F9/F10/F11** — load slots 1–3
- **Shift** — sprint on foot

## How it works

Everything is plain files under `game/` loaded with classic script tags in a fixed order — no modules, no bundler, no assets to fetch. Each file has one job: `world/` builds the districts, buildings and population; `vehicles/` holds the car classes, traffic AI and stealing/driving; `boats/` holds boat physics and wakes; `police/` holds the wanted system, pursuit AI and roadblocks; `campaign/` and `heists/` hold the story and the heist state machines; `radio/` synthesises the stations; `activities/` holds taxi fares and hidden packages; `combat/` holds weapons and projectiles; `ui/` draws the HUD, minimap, menus and the staged screenshot scenes; `save/` serialises runs to localStorage; `core/` holds input, the WebAudio effects engine, particles and the main loop. The world is simulated the same way whether you are playing or the game is posing for one of its four `?shot=` screenshot scenes, so the screenshots are the real game.

## Run it

```sh
node serve.ts
```

then open http://localhost:8080

---
<sub>Entered on [make.fun](https://make.fun/?ref=aes5np1n&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
