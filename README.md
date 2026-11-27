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
- **Recompilations too.** A recompilation someone adds in PlayOut's Recompilations browser (a GitHub repository the
  catalogs do not list) is published by the owner's PlayOut to `recomps/<owner>__<repo>.json`, or suggested by anyone
  else's through the relay's `/suggest-recomp`: a pull request from `suggest/recomp/<owner>__<repo>-<id>` labelled
  `recomp-suggestion`, which only changes that file. Review it on GitHub (the game and the console are the user's
  words: edit them on the branch if they are wrong); merging puts it in `all.json`'s `recomps`, and every PlayOut
  lists it.
- **Artwork is not here.** Covers, heroes and logos a user picks stay on their PC.
- **The `database` branch is the PlayOut database.** A separate branch,
  [`database`](https://github.com/jeremybris/PlayOut-metadata/tree/database), with no history shared with `main`,
  holds each game's stable facts as CSV (`data/<prefix>/<nn>.csv`), which every PlayOut reads first. The relay adds
  rows there automatically (only new games, never changing a row); everything on `main` stays owner-approved, and the
  Actions here run on `main` only.

## Files

| Path                              | What it is                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `games/<key>.json`                | One corrected game (format below). The only files game suggestions may change.                                   |
| `recomps/<owner>__<repo>.json`    | One recompilation added in PlayOut (format below). The only files recompilation suggestions may change.          |
| `all.json`                        | Every game's fields and every recompilation in one file. **Built by the Action; never edit it by hand.**         |
| `config.json`                     | `{ "relayUrl": "https://..." }`: the suggestion relay every PlayOut uses (copied to all.json).                   |
| `schema.json`                     | JSON Schema of `games/<key>.json`.                                                                               |
| `recomp-schema.json`              | JSON Schema of `recomps/<owner>__<repo>.json`.                                                                   |
| `scripts/`                        | `build-all.mjs` (rebuilds all.json), `check.mjs` (checks changed files), `validate.mjs`.                         |
| `.github/workflows/build-all.yml` | On every push to `main`: validate `games/*.json` and `recomps/*.json`, rebuild `all.json`, commit it if changed. |
| `.github/workflows/check.yml`     | On every pull request: validate the changed files (the rules come from `main`).                                  |

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

| Field                                        | Type                                                                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                                      | text                                                                                                                                                                                                          |
| `description`, `shortDescription`            | plain text (no HTML)                                                                                                                                                                                          |
| `releaseDate`                                | `YYYY`, `YYYY-MM` or `YYYY-MM-DD`                                                                                                                                                                             |
| `developers`, `publishers`, `genres`, `tags` | lists of text (at most 50)                                                                                                                                                                                    |
| `localPlayers`                               | most players on one PC, 0-64                                                                                                                                                                                  |
| `controls`                                   | `{ "controller": "full" \| "partial" \| "none", "vr": "only" \| "supported" \| "none" }`, plus `"touch": true` (touch screen) and `"keyboard": true` (full mouse and keyboard beside the controller) when set |
| `hltb`                                       | How Long to Beat hours: `{ "main", "extra", "completionist", "solo" }`, each optional                                                                                                                         |
| `reviewScore`                                | `{ "score": 0-100, "source": "steam" \| "igdb" }`                                                                                                                                                             |

`controls.touch` and `controls.keyboard` are newer than the rest. Push this `schema.json` (and these scripts) to the
live repository and deploy the relay before releasing a PlayOut that writes them: an owner publish writes
`games/<key>.json` directly, and `build-all.mjs` leaves a file the live schema refuses out of `all.json` (every
correction of that game, not just its controls). An older PlayOut (0.9.90 and earlier) reads such a file as
controller and vr only; publishing another field of the game from one with the owner token writes its controls
back without the two flags, so publish from a current build once they exist.

An empty value (`""`, `[]`, `0`) says the game has none and hides what the scrapers found. HTML, script URLs and
control characters are refused everywhere.

### `recomps/<owner>__<repo>.json`

```json
{
  "id": "github:zelda64recomp/zelda64recomp",
  "repo": "Zelda64Recomp/Zelda64Recomp",
  "repoUrl": "https://github.com/Zelda64Recomp/Zelda64Recomp",
  "game": "The Legend of Zelda: Majora's Mask",
  "systemId": "n64",
  "blurb": "Static recompilation of Majora's Mask for PC.",
  "addedAt": "2026-11-27T12:00:00.000Z",
  "updatedAt": "2026-11-27T12:00:00.000Z"
}
```

GitHub repositories only. `repo` is the repository as GitHub spells it; `id` is `github:` and `repo` in lower case,
`repoUrl` is `https://github.com/` and `repo`, and the file name is `repo` in lower case with `/` as `__` (GitHub
account names cannot hold `_`). `game` (one line, at most 200 characters) and `systemId` (PlayOut's system id of
the original console, such as `n64`, `ps2`, `xbox360`, `pc`, or `other`: one of the `enum` in
`recomp-schema.json`, which is exactly the list PlayOut keeps) are what the user said; `blurb` (one line, at most
500) is optional. Neither holds tabs or other control characters. PlayOut reads only rows whose `id`, `repoUrl` and
`repo` agree and whose `systemId` it knows; a catalog (decomp-buddy, RecompLauncher) that lists the same repository
wins over the row.

The relay checked the repository is public and has a release with a download; it does not check the game. Reject
(close) a suggestion whose repository is not a recompilation.

### `all.json`

```json
{
  "generatedAt": "2026-11-16T12:00:00.000Z",
  "relayUrl": "https://...",
  "games": { "steam-620": { "...": "..." } },
  "recomps": [
    { "id": "github:...", "repo": "...", "repoUrl": "...", "game": "...", "systemId": "n64" }
  ]
}
```

`games` maps each key to that file's `fields`; `recomps` lists every recompilation file (without `updatedAt`), sorted
by `id`. PlayOut 0.9.91 and earlier ignore `recomps`. A file that does not match its schema is left out (and the
Action run fails so it is noticed).

### Pull request checks

`check.mjs` validates every changed `games/*.json` and `recomps/*.json`. A suggestion may change only its own kind of
file: a head branch `suggest/recomp/...` (or the label `recomp-suggestion`) only `recomps/*.json`, any other
`suggest/...` branch (or the label `suggestion`) only `games/*.json`. The head branch decides as well as the label,
so a pull request whose label failed to go on is still held to its rule. Create the `recomp-suggestion` label once
(GitHub creates it when the relay first adds it, but an older owner PlayOut lists only `suggestion` pull requests,
so recompilation suggestions are reviewed on GitHub).

## Running the scripts locally

Node 18 or newer, no dependencies:

```sh
node scripts/build-all.mjs                 # rebuild all.json
node scripts/check.mjs games/steam-620.json  # check files
CHECK_HEAD_REF=suggest/recomp/a__b-1 node scripts/check.mjs recomps/a__b.json  # as a recompilation suggestion
```
