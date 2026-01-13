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

to get react dev tools working, after the app is loaded open the developer tools, restart the app using `ctrl+r`

## To Rebuild for better-sqlite3

npm rebuild @parcel/watcher better-sqlite3 --runtime=electron --target=$(npx electron --version | tr -d v) --dist-url=https://electronjs.org/headers --arch=$(uname -m)

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## ToDo / Future Features / Ideas:

- [ ] UI
  - [x] thin out left nav.
  - [ ] drag to widen chat window / and other windows.
  - [x] fix text box height in chat box.
  - [x] bring active level to front.
  - [ ] md file cursor goes invisible.
- [ ] user created agents
- [ ] Customize writing style.
- [ ] Create default internal file system that is savable somewhere when desired by user.
- [ ] Make work for naked files not just folders.
- [ ] Templating (separate information and style)
  - [x] Separate style and design.
  - [ ] PDF exporter
  - [ ] Template builder ()
- [ ] add link scraper system. User drops links into the link scrapper box, they do not get the link as a file just see its in there, it goes to administrative file system the user does not get to manipulate and is now context for agent.
- [ ] chat by voice?
- [ ] save chat threads.
- [ ] UX
  - [ ] control s hot key to save a file.
  - [ ] control f for finding.

## Add On's:

- [ ] LLM market place, buy access to more competent or specific LLM's.
- [ ] Share file system.
- [ ] Hosted for companies.
- [ ] Trains experts for the users data.
