# TWOverflow - Tribal Wars 2 Script Bundle

Background script with usefull tools for friendly scripts (modules).

## Current tools

**[FarmOverflow](https://github.com/TWOverflow/FarmOverflow)** _Script with lots of settings and filters to farm automatically around all your villages._

**[CommandQueue](https://github.com/TWOverflow/CommandQueue)** _Script to send attacks/supports or relocate troops specifying the date it should arrive, or a data to send._

**[AutoDeposit](https://github.com/TWOverflow/AutoDeposit)** _Script to collect all resources from deposit and second village automatically._

## Instalation

See [here](https://github.com/TWOverflow/TWOverflow/wiki).

## Module Structure

```
Module Root
|-- module.json (required)
|-- interface
|-- |-- interface.js (optional)
|-- |-- customMarkup1.html
|-- |-- customMarkup2.html
|-- |-- customStyle1.less
|-- |-- customStyle2.less
|-- locales
|-- |-- en.json
|-- |-- pt.json
|-- source (required)
|-- |-- [moduleId].js (required)
|-- |-- init.js (required)
|-- |-- customScript1.js
|-- |-- customScript2.js
```

### Root Folder

Module Root folder can have any name.

### The module.json File

The `module.json` contain basic information about the module.
Only the `id` key is required and must be lower case and a single word.
Any other keys can be included and can be retrivied in any `.js` script across the module with the fallowing code: `__moduleId_customKey`.

### Interface Folder

If `interface.js` is present inside the interface folder, the script will be called with all custom files ready to use. The purpose of the script must be to build de interface.

Any `.html` files included inside the interface folder will be minified and can be retrivied by `.js` scripts using the fallowing code: `__moduleId_html_fileName`. Note: `moduleId` must be replaced with the name of the module and `fileName` by the name of the file (without extension) that will be retrivied. Exemple: `__myModule_html_customMarkup1`.
The same goes to style files: `__myModule_css_customStyle1`

The folder can include unlimited custom files.

### Locales Folder

Locale files must a `json` named with simple language codes (en, pt, pl, it...).

The files will be compiled to a single object with the fallowing structure:

```
{
    "en": {
        "key": "string",
        ...
    },
    "pt": {
        "key": "string",
        ...
    },
    ...
}
```

The object can be retrivied in any ".js" script using the fallowing code: `__moduleId_locale`.

### Source Folder

The source folder must have a `.js` script named with the same name of the module that will include the logic of the module, and a `init.js` script that must start the module script.

The folder can include any custom `.js` files and all will be concatened between the `[moduleId].js` script (first file) and the `init.js` (last file).

An module exemple can be found [here](https://github.com/TWOverflow/CommandQueue).

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
