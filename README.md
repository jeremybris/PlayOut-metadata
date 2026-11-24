# PlayOut metadata

Corrections to game metadata for [PlayOut](https://github.com/jeremybris), shared with every PlayOut.

Scrapers sometimes get a game wrong: a made-up release date, the wrong developer, odd genres, a missing player
count. When someone fixes a game with the pen on its page in PlayOut, the fix can end up here, and from here every
PlayOut picks it up.

## How PlayOut uses this repository

- **Everyone reads it, no account needed.** PlayOut downloads [`all.json`](all.json) from
  `https://raw.githubusercontent.com/jeremybris/PlayOut-metadata/main/all.json` at start and every 6 hours (with
  `If-None-Match`, so an unchanged file costs almost nothing), keeps a copy for offline use and lays it over what the
  scrapers found.
- **Precedence, per field:** a user's own edit on their PC, else this repository, else the scrapers. A field set here
  is locked against the scrapers: refreshing metadata never replaces it.
- **Only the owner changes it.** The owner's PlayOut has a fine-grained GitHub token (Settings › Metadata › Cloud
  metadata) and publishes a saved edit straight to `games/<key>.json`.
- **Everyone else suggests.** Their PlayOut sends a saved edit to the suggestion relay (a Cloudflare Worker), which
  opens a pull request labelled `suggestion`. Nothing reaches `main` until the owner approves it (merges the pull
  request) in PlayOut or on GitHub; Reject closes it.
- **`main` is locked to the owner.** A ruleset lets only the owner (and the Action that rebuilds `all.json`)
  write `main`; the relay signs in as a GitHub App (shown as `<app>[bot]`) that can only push `suggest/...` branches and open
  pull requests (metadata-relay/SETUP.md, step 5).
- **Artwork is not here.** Covers, heroes and logos a user picks stay on their PC.
- **The `database` branch is the PlayOut database.** A separate branch,
  [`database`](https://github.com/jeremybris/PlayOut-metadata/tree/database), with no history shared with `main`,
  holds each game's stable facts as CSV (`data/<prefix>/<nn>.csv`), which every PlayOut reads first. The relay adds
  rows there automatically (only new games, never changing a row); everything on `main` stays owner-approved, and the
  Actions here run on `main` only.

## Files

| Path                              | What it is                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `games/<key>.json`                | One corrected game (format below). The only files suggestions may change.                      |
| `all.json`                        | Every game's fields in one file. **Built by the Action; never edit it by hand.**               |
| `config.json`                     | `{ "relayUrl": "https://..." }`: the suggestion relay every PlayOut uses (copied to all.json). |
| `schema.json`                     | JSON Schema of `games/<key>.json`.                                                             |
| `scripts/`                        | `build-all.mjs` (rebuilds all.json), `check.mjs` (checks changed files), `validate.mjs`.       |
| `.github/workflows/build-all.yml` | On every push to `main`: validate `games/*.json`, rebuild `all.json`, commit it if changed.    |
| `.github/workflows/check.yml`     | On every pull request: validate the changed files (the rules come from `main`).                |

### Game key

The file name is the game's key, the same on every PC:

- `steam-<appid>` when the Steam app id is known (`steam-620`);
- `<store>-<id>` for GOG, Epic, EA, Ubisoft, Battle.net and Xbox games (`gog-1207658924`);
- `<systemId>-<serial>` for a ROM whose disc serial is known (`ps2-slus20777`), else `<systemId>-<file name>`, the
  ROM file's name without its tags (`snes-chrono-trigger`); a system id that another form uses (steam, xbox, ...)
  becomes `rom-<systemId>-...`;
- `manual-<folder and executable name>` for a game added by hand (`manual-my-homebrew-game`).

A key never comes from a game's title, which scrapers, rescans and edits change.

Keys are lower case: `a-z`, `0-9`, `.`, `_` and `-`.

### `games/<key>.json`

```json
{
  "key": "steam-620",
  "title": "Portal 2",
  "fields": {
    "releaseDate": "2011-04-18",
    "developers": ["Valve"],
    "genres": ["Puzzle", "Action"],
    "localPlayers": 2,
    "controls": { "controller": "full", "vr": "none" },
    "hltb": { "main": 8.5, "extra": 13, "completionist": 22 },
    "reviewScore": { "score": 98, "source": "steam" }
  },
  "updatedAt": "2026-11-16T12:00:00.000Z"
}
```

`key` must equal the file name; `title` is for people reading the file. Each field in `fields` is optional and
replaces that whole field of the scraped metadata:

| Field                                        | Type                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `title`                                      | text                                                                                     |
| `description`, `shortDescription`            | plain text (no HTML)                                                                     |
| `releaseDate`                                | `YYYY`, `YYYY-MM` or `YYYY-MM-DD`                                                        |
| `developers`, `publishers`, `genres`, `tags` | lists of text (at most 50)                                                               |
| `localPlayers`                               | most players on one PC, 0-64                                                             |
| `controls`                                   | `{ "controller": "full" \| "partial" \| "none", "vr": "only" \| "supported" \| "none" }` |
| `hltb`                                       | How Long to Beat hours: `{ "main", "extra", "completionist", "solo" }`, each optional    |
| `reviewScore`                                | `{ "score": 0-100, "source": "steam" \| "igdb" }`                                        |

An empty value (`""`, `[]`, `0`) says the game has none and hides what the scrapers found. HTML, script URLs and
control characters are refused everywhere.

### `all.json`

```json
{
  "generatedAt": "2026-11-16T12:00:00.000Z",
  "relayUrl": "https://...",
  "games": { "steam-620": { "...": "..." } }
}
```

`games` maps each key to that file's `fields`. A file that does not match the schema is left out (and the Action
run fails so it is noticed).

## Running the scripts locally

Node 18 or newer, no dependencies:

```sh
node scripts/build-all.mjs                 # rebuild all.json
node scripts/check.mjs games/steam-620.json  # check files
```
