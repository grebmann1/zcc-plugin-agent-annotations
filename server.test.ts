import { expect, it } from "vitest";
import { createFakePluginHost } from "@zana-ai/zcc-plugin-sdk/testing";
import plugin from "./server.js";
const record = {
  id: "abc",
  number: 1,
  comment: "Make this larger",
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
  components: [],
};
it("saves, resolves, updates and rejects unavailable or malformed records", async () => {
  const { zcc, harness } = createFakePluginHost({
    pluginId: "agent-annotations-9fc0",
  });
  plugin(zcc);
  await expect(harness.callRpc("save", record)).resolves.toEqual({ id: "abc" });
  expect(await harness.callRpc("resolve", { id: "abc" })).toMatchObject({
    context: expect.stringContaining("Make this larger"),
  });
  await harness.callRpc("update", { id: "abc", comment: "Use blue" });
  expect(await harness.callRpc("resolve", { id: "abc" })).toMatchObject({
    context: expect.stringContaining("Use blue"),
  });
  await expect(
    harness.callRpc("update", { id: "missing", comment: "x" }),
  ).rejects.toThrow("no longer available");
  await expect(
    harness.callRpc("save", { ...record, comment: "" }),
  ).rejects.toThrow();
  await expect(harness.callRpc("resolve", { id: "missing" })).rejects.toThrow();
  await expect(
    harness.callRpc("save", { ...record, id: "after" }),
  ).resolves.toEqual({ id: "after" });
});

it("rejects unavailable updates before any records exist", async () => {
  const { zcc, harness } = createFakePluginHost({
    pluginId: "agent-annotations-9fc0",
  });
  plugin(zcc);
  await expect(
    harness.callRpc("update", { id: "missing", comment: "Use blue" }),
  ).rejects.toThrow("no longer available");
  await expect(harness.callRpc("resolve", null)).rejects.toThrow();
});

it("serializes concurrent saves, retains other records on update and caps storage", async () => {
  const { zcc, harness } = createFakePluginHost({
    pluginId: "agent-annotations-9fc0",
  });
  plugin(zcc);
  await Promise.all(
    Array.from({ length: 1001 }, (_, index) =>
      harness.callRpc("save", { ...record, id: `pin-${index}` }),
    ),
  );
  await expect(
    harness.callRpc("resolve", { id: "pin-0" }),
  ).rejects.toThrow();
  await harness.callRpc("update", { id: "pin-1000", comment: "Use green" });
  expect(await harness.callRpc("resolve", { id: "pin-999" })).toMatchObject({
    context: expect.stringContaining("Make this larger"),
  });
  await harness.callRpc("save", { ...record, id: "pin-1000", comment: "Use blue" });
  expect(await harness.callRpc("resolve", { id: "pin-1000" })).toMatchObject({
    context: expect.stringContaining("Use blue"),
  });
  const records = await zcc.storage.kv.get<typeof record[]>("annotations");
  expect(records).toHaveLength(1000);
  expect(records?.filter((row) => row.id === "pin-1000")).toHaveLength(1);
});
