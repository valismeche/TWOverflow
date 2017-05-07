# FarmOverflow TribalWars 2

High customizable script for Tribal Wars 2 to farm automatically around your villages.

## Build

You'll need install [Node.js](https://nodejs.org/en/download/) to build the script from source.

```bash
git clone https://github.com/FarmOverflow/FarmOverflow.git
cd FarmOverflow
npm install
npm run build
```

The script will be compiled inside `dist/`

## Languages

- English
- Portuguese

## Changelog

2.2.2
- [Fixed] Tools inilize normally when the presetName settings is empty.

2.2.1
- [Changed] Inputs and selects now have the text centralized.
- [Changed] New logo added
- [Changed] The groups are now stored by ID instead of names.
- [Changed] Disabled option os settings are now different from "Disabled" named groups.
- [Fixed] Registers date are now calculated by the date/time of game instead of local PC.
- [Fixed] Account's presets not beeing showed on settings when none is set.
- [Fixed] Breaking line in dates on registers tab.
- [Fixed] The duration of attacks in player targets don't exceed the limit time.
- [Fixed] Date on remote status is now formatted.
- [Fixed] Nameless presets (Desc. only) are not showed anymore on settings.
- [Fixed] The tool can be initialized only one time.
- [Fixed] Translations/labels.
- [Fixed] Internal errors.
