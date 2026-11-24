# PlayOut database

Each game's stable facts for [PlayOut](https://github.com/jeremybris), as plain CSV files: the title, the platform,
the release date, the genres, the Steam tags, the developers, the publishers and the number of local players. Every
PlayOut reads it to fill a game's facts at once, before any scraper runs, and adds the games it lacks.

What changes over time is not here: How Long To Beat times, install sizes and review scores. Neither are descriptions
or artwork, which PlayOut still gets from its scrapers.

## How PlayOut uses this repository

- **Everyone reads it, no account needed.** PlayOut downloads the files of the games in its library from
  `https://raw.githubusercontent.com/jeremybris/PlayOut-database/main/data/<prefix>/<nn>.csv` (with
  `If-None-Match`, at most every 6 hours per file) and keeps a copy for offline use.
- **First, not only.** When PlayOut fetches a game's metadata (a new game, or **Refresh metadata**), a row here fills
  the game's facts; the scrapers still add the description, the artwork and anything the row leaves empty. A game this
  repository lacks is scraped as before.
- **The database grows by itself.** After PlayOut scrapes a game this repository lacks, it sends the game's facts to
  the PlayOut relay (a Cloudflare Worker), which checks them and adds the row. Settings › Metadata › PlayOut database
  turns this off.
- **Rows are only added, never replaced by others.** The relay only appends rows for games the database does not have
  yet. Corrections go through the pen (Edit) on a game's page in PlayOut, as suggestions to
  [PlayOut-metadata](https://github.com/jeremybris/PlayOut-metadata) that the owner approves.
- **What is sent:** a game's key, title and the facts above, with a random id of the PlayOut install (for rate limits).
  No account, user name, file path or play time, and never a user's own edits.

## Files

| Path                     | What it is                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `data/<prefix>/<nn>.csv` | The rows of games whose key starts with `<prefix>`, split in 16 files (`00`-`15`). |
| `README.md`              | This page.                                                                         |

The file a game's row is in follows from its key: `<prefix>` is the key's first part (`steam`, `gog`, `ps2`, `rom`,
...) and `<nn>` is the 32-bit FNV-1a hash of the key's UTF-8 bytes, modulo 16, as two digits. Splitting keeps every
file small, so PlayOut only downloads the files of the games it has.

## Columns

Every file starts with this header row, and rows are sorted by `key`:

```csv
key,title,platform,release_date,genres,tags,developers,publishers,local_players,steam_appid
steam-427520,Factorio,pc,2020-08-14,Simulation|Strategy,Automation|Base Building,Wube Software LTD.,Wube Software LTD.,,427520
```

| Column          | What it holds                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `key`           | The game's key, the same on every PC (below).                                                          |
| `title`         | The game's title.                                                                                      |
| `platform`      | `pc` for every store's game, else the emulated system's id (`ps2`, `snes`, `xbox360`, ...).            |
| `release_date`  | `YYYY-MM-DD`, `YYYY-MM`, `YYYY` or empty.                                                              |
| `genres`        | Genres, separated by `\|`.                                                                             |
| `tags`          | Steam tags, strongest first, separated by `\|`.                                                        |
| `developers`    | Developers, separated by `\|`.                                                                         |
| `publishers`    | Publishers, separated by `\|`.                                                                         |
| `local_players` | The most players on one PC or console, 1-64, or empty.                                                 |
| `steam_appid`   | The game's Steam app id when known, so a GOG or Epic copy finds the Steam copy's row. Empty otherwise. |

Text follows RFC 4180: a cell with a comma, a quote or a line break is quoted, a quote inside it doubled. A value never
contains `|`, a control character, or starts like a spreadsheet formula (`=`, `+`, `@`, or `-` before anything but a
letter), so the files open safely in any spreadsheet. A row needs at least one fact besides its title and platform.

### Game key

The same keys as [PlayOut-metadata](https://github.com/jeremybris/PlayOut-metadata):

- `steam-<appid>` when the Steam app id is known (`steam-620`);
- `<store>-<id>` for GOG, Epic, EA, Ubisoft, Battle.net and Xbox games (`gog-1207658924`);
- `<systemId>-<serial>` for a ROM whose disc serial is known (`ps2-slus20777`), else `<systemId>-<file name>`, the
  ROM file's name without its tags (`snes-chrono-trigger`); a system id that another form uses (steam, xbox, ...)
  becomes `rom-<systemId>-...`.

Games added by hand, recompilations and games streamed from another PC are never sent.

## Editing by hand

The owner can edit a file on GitHub like any CSV (keep the header, the sorting and the rules above). PlayOut skips a
row it cannot read rather than failing, and the relay never rewrites a row that is already here.
