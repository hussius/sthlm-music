# Codon Frontend Repo template

## About 
This repo is a minimal frontend application, supposed to act as a starting point for frontend projects.

The code is assumed to be served vi a simple express web server `api.js`.

## Stack
- React Typescript, compiled by vite
- Tailwind for styling
- Installs codon component library
- Prettier config file for code formatting
- Eslint config file for linting

## Installation 

### Developer

#### Prerequisites
* Node v20.x
* npm v10.x

#### Setting up the project 
* Install the dependencies with `npm install`
* - If running in to npm authentication issues: `source .env && export CCL_NPM_TOKEN && npm install` or `make install-dependencies`

#### Running the project 
* Setup the necessary environment variables in a .env file: 
```
PORT=#port to run FE process on (for makefile)
CCL_NPM_TOKEN=#found in 1Password
CCL_PATH=#absolute path to CCL - for running dev mode in linked mode

```
* Run `make run` to start the frontend 
* Run `make preview` to serve the bundled code via the web-server (mimics production).

#### Contributing to the project
* Format code with `npm run format` or `make format`
* Check formatting and lint with `npm run check` or `make check`

#### Working with Codon Component Library
Codon component library is deployed as any other package and can just be installed as is. This adds minimal overhead to development. However if you need to develop in Codon Component Library and this repo in parallel, there is documentation on how to *link* the repo in the `README.md` in Codon Component Library repo. You can use `make link-ccl` to link the local CCL package.