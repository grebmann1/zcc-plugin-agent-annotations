// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { loadPluginApp, renderSlot } from "@zana-ai/zcc-plugin-sdk/testing/app";
const app = await loadPluginApp(
  () => import("./app.tsx"),
  "agent-annotations-9fc0",
);
it("registers a single toolbar control without a sidebar panel", () => {
  expect(app.browserToolbarActions).toHaveLength(1);
  expect(app.browserToolbarActions[0]).toMatchObject({
    id: "annotate",
    title: "Agent annotations",
  });
  expect(app.navPanels).toHaveLength(0);
});

import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { afterEach } from "vitest";
const record = {
  id: "abc",
  number: 1,
  comment: "Make this blue",
  url: "http://localhost/",
  title: "Demo",
  viewport: { width: 800, height: 600 },
  element: {
    tagName: "button",
    name: "button",
    selector: "#buy",
    text: "Buy",
    attributes: { id: "buy" },
    rect: { x: 0, y: 0, width: 60, height: 30 },
    styles: { color: "red" },
  },
};
afterEach(cleanup);
it("captures, updates and removes draft snapshots, then clears pins on successful submission", async () => {
  let receive!: (data: unknown) => void;
  let submitted!: () => void;
  const evaluate = vi.fn(async (expression: string) =>
    expression.includes("probeReactComponents")
      ? { components: [] }
      : { active: true, count: 0 },
  );
  const page = {
    evaluate,
    onMessage: vi.fn((listener) => {
      receive = listener;
      return () => {};
    }),
  };
  const composer = {
    insert: vi.fn((_reference: unknown) => true),
    update: vi.fn(() => true),
    focus: vi.fn(),
    onSubmitted: vi.fn((listener) => {
      submitted = listener;
      return () => {};
    }),
  };
  const slot = renderSlot(
    app.browserToolbarActions[0]!,
    {
      pluginId: "agent-annotations-9fc0",
      threadId: "thread",
      tabId: "tab",
      url: "http://localhost/",
      page,
      composer,
    },
    { rpc: { save: () => ({ id: "abc" }), update: () => ({ id: "abc" }) } },
  );
  await waitFor(() => expect(receive).toBeTypeOf("function"));
  act(() => receive({ type: "annotation", annotation: record }));
  await waitFor(() => expect(composer.insert).toHaveBeenCalledOnce());
  expect(composer.insert.mock.calls[0]![0]).toMatchObject({
    text: expect.stringContaining("Make this blue"),
    source: {
      kind: "plugin",
      pluginId: "agent-annotations-9fc0",
      resourceId: "abc",
    },
  });
  act(() =>
    receive({ type: "annotation-update", id: "abc", comment: "Use green" }),
  );
  await waitFor(() =>
    expect(composer.update).toHaveBeenCalledWith(
      "abc",
      expect.objectContaining({ text: expect.stringContaining("Use green") }),
    ),
  );
  act(() => receive({ type: "annotation-delete", id: "abc" }));
  await waitFor(() =>
    expect(composer.update).toHaveBeenCalledWith("abc", null),
  );
  act(() => receive({ type: "state", active: true, count: 1 }));
  expect(await slot.findByTestId("agent-annotations-count")).toBeTruthy();
  act(() => submitted());
  await waitFor(() =>
    expect(
      evaluate.mock.calls.some(([code]) => code.includes(".clear()")),
    ).toBe(true),
  );
  slot.unmount();
  expect(
    evaluate.mock.calls.some(([code]) => code.includes(".deactivate()")),
  ).toBe(true);
});
it("disables unavailable pages and reports insertion errors without clearing pins", async () => {
  const composer = {
    insert: vi.fn(() => false),
    update: vi.fn(() => false),
    focus: vi.fn(),
    onSubmitted: () => () => {},
  };
  const unavailable = renderSlot(app.browserToolbarActions[0]!, {
    pluginId: "agent-annotations-9fc0",
    threadId: "thread",
    tabId: "tab",
    url: "",
    page: null,
    composer,
  });
  expect(
    ((await unavailable.findByRole("button")) as HTMLButtonElement).disabled,
  ).toBe(true);
  unavailable.unmount();
  let receive!: (data: unknown) => void;
  const evaluate = vi.fn(async (_expression: string) => ({ active: false, count: 0 }));
  const slot = renderSlot(
    app.browserToolbarActions[0]!,
    {
      pluginId: "agent-annotations-9fc0",
      threadId: "thread",
      tabId: "tab",
      url: "",
      page: {
        evaluate,
        onMessage: (listener: (data: unknown) => void) => {
          receive = listener;
          return () => {};
        },
      },
      composer,
    },
    { rpc: { save: () => ({ id: "abc" }) } },
  );
  fireEvent.click(
    await slot.findByRole("button", { name: "Annotate elements" }),
  );
  await waitFor(() => expect(evaluate.mock.calls.length).toBeGreaterThan(1));
  act(() => receive({ type: "annotation", annotation: record }));
  await waitFor(() =>
    expect(slot.getByRole("button").title).toContain("Composer is unavailable"),
  );
  expect(evaluate.mock.calls.some(([code]) => code.includes(".clear()"))).toBe(
    false,
  );
});
