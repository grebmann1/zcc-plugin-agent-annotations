# Agent Annotations for Zana

A port of BB Agent Annotations at upstream commit `916d684ac23d0b0de82c09cfc7553a50287d2188` (MIT, Michael Yong). `annotations.ts` and `page-script.ts` retain upstream capture, pins, editor, React probe and context formatting. Zana adapters live in `app.tsx` and `server.ts`.

Open a web page beside a thread. Toggle **Annotate elements**, click an element, enter feedback, and save. A numbered pin and compact composer reference appear. Edit a pin to update the unsent reference; Remove deletes it. Successful send/queue clears pins. Navigation clears the page pins. Saved messages keep immutable captured context.

Requires a Zana core with `experimental_browserToolbarAction` and the scoped page bridge. Older versions show this information panel until upgraded. No browser automation service or separate Chrome is needed.

## Install

With an updated Zana desktop and its `zcc` CLI:

```sh
git clone https://github.com/grebmann1/zcc-plugin-agent-annotations.git
cd zcc-plugin-agent-annotations
zcc plugin install .
zcc plugin dev --once
```

The plugin stays a separate installation. Its toolbar appears in each thread's browser; the sidebar panel explains how to use it.

## Development

Use Node.js 24 or later. The SDK test harness currently comes from the public [Zana source](https://github.com/salesforce/zana), rather than an npm package. Install dependencies in that checkout with `pnpm install --frozen-lockfile`, then from this plugin:

```sh
npm ci
npm run typecheck
ZCC_PLUGIN_SDK_SOURCE=/path/to/zana/packages/plugin-sdk/src npm test
zcc plugin dev --once
```

`types/zcc-plugin-sdk.d.ts` supplies authoring declarations. Zana supplies the SDK runtime when loading the plugin. See [LIVE_TEST.md](LIVE_TEST.md) for native desktop checks.

## Attribution

Original plugin: [get-bb/bb, plugins/agent-annotations](https://github.com/get-bb/bb/tree/916d684ac23d0b0de82c09cfc7553a50287d2188/plugins/agent-annotations). The capture and overlay implementation remains unchanged. Zana adapters and this repository use MIT; the original copyright and license remain in [LICENSE-BB](LICENSE-BB).
