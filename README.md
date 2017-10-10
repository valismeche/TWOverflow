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

To build run `npm run build` or `npm run build-dev` to skip minifined/map version.

The script will be compiled inside `dist/`

## Languages

- English
- Português
- Polski

Each module has it's own locale file. `src/modules/some_module/locales/*.json`

Please help to translate the TWOverflow [here](https://crowdin.com/project/twoverflow).
