# text-editor

An Electron application with React and TypeScript

built with: https://electron-vite.org/guide/

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

to get react dev tools working, after the app is loaded open the developer tools, restart the app using ```ctrl+r```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```


## ToDo: 
- [ ] UI
  - [x] thin out left nav. 
  - [ ] drag to widen chat window / and other windows. 
  - [x] fix text box height in chat box. 
  - [x] bring active level to front. 
  - [ ] md file cursor goes invisible. 
- [ ] user created agents
- [ ] write in specified language / or style, user uploads a style of writing they want to mimic. 
- [ ] Create default internal file system that is savable somewhere when desired by user. 
- [ ] make file system for for files not just folders. 
- [ ] switch to info / template structure.  That is if the user wants a styled output, they crate a rough template, the agent outputs the file in that style. Need a template builder (connected to image builder).  
- [ ] add link scraper system.  User drops links into the link scrapper box, they do not get the link as a file just see its in there, it goes to administrative file system the user does not get to manipulate and is now context for agent. 
- [ ] chat by voice? 
- [ ] save chat threads. 
- [ ] UX
  - [ ] control s hot key to save a file. 
  - [ ] control f for finding. 

## How to not starve:
- [ ] LLM market place, pay by the minute (buy outright, bulk pricing reductions) experts domains and styles. ** this is the feature that is focused on tech that will be developed in the future when experts really are experts but are priced at a premium to general models and inaccessible to users, we buy time in bulk and sell at a premium to give anyone access at a low price point. 
- [ ] Share file system. 
- [ ] Hosted for companies. 
- [ ] Trains experts for companies on their data. ( contract out to companies that already do this, we are just the broker and interface)


## To Rebuild for better-sqlite3
npm rebuild @parcel/watcher better-sqlite3 --runtime=electron --target=$(npx electron --version | tr -d v) --dist-url=https://electronjs.org/headers --arch=$(uname -m)