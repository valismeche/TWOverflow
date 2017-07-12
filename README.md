# TWOverflow - Tribal Wars 2 Tool Pack

High customizable tools for Tribal Wars 2.

## Modules

### FarmOverflow

Tool with a lot of settings and filters to farm automatically around all your villages.
See all informations and screenshots [here](https://github.com/FarmOverflow/FarmOverflow/wiki/FarmOverflow).

### CommandQueue

Command planer! Send attacks/supports or relocate troops specifying the date it shold arrive, or a data to send. See all informations and screenshots [here](https://github.com/FarmOverflow/FarmOverflow/wiki/CommandQueue).

## Build

You'll need install [Node.js](https://nodejs.org/en/download/) to build the script from source.

Clone and install dependencies.

```bash
git clone https://github.com/FarmOverflow/FarmOverflow.git
cd FarmOverflow
npm install
```

You can specify which modules you want to include in the final build.

`grunt build -modules=module1,module2...`

### List of available modules

- farm
- queue
- deposit

If you want a minified version, add `--prod` flag.

`grunt build -modules=farm,queue --prod`

The script will be compiled inside `dist/`

## Languages

- English
- Portuguese

Each module has it's own locale file. `src/modules/some_module/locales.json`

Please help to translate the TWOverflow [here](https://crowdin.com/project/twoverflow).