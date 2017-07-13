# TWOverflow - Tribal Wars 2 Script Bundle

Background script with usefull tools for friendly scripts (modules).

## Instalation

See [here](https://github.com/TWOverflow/TWOverflow/wiki).

## Modules

### [FarmOverflow](https://github.com/TWOverflow/FarmOverflow)

_Script with lots of settings and filters to farm automatically around all your villages._

### [CommandQueue](https://github.com/TWOverflow/CommandQueue)

_Script to send attacks/supports or relocate troops specifying the date it should arrive, or a data to send._

### [AutoDeposit](https://github.com/TWOverflow/AutoDeposit)

_Script to collect all resources from deposit and second village automatically._

## Build

You'll need install [Node.js](https://nodejs.org/en/download/) to build the script from source.

Clone and install dependencies.

```bash
git clone https://github.com/TWOverflow/TWOverflow.git
cd TWOverflow
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
