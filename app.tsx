import { useCallback, useEffect, useRef, useState } from "react";
import {
  definePluginApp,
  useRpc,
  type ContextReference,
  type PluginBrowserToolbarActionProps,
} from "@zana-ai/zcc-plugin-sdk/app";
import {
  annotationMentionLabel,
  formatAnnotationContext,
  pageMessageSchema,
  pageStateSchema,
  reactProbeSchema,
  type AnnotationRecord,
  type PageState,
} from "./annotations.js";
import {
  buildActivateExpression,
  buildControllerExpression,
  buildReactProbeExpression,
} from "./page-script.js";
const INACTIVE: PageState = { active: false, count: 0 };
const THEME = {
  "--bb-canvas": "#ffffff",
  "--bb-ink": "#17202a",
  "--bb-popover": "#ffffff",
  "--bb-popover-foreground": "#17202a",
  "--bb-primary": "#5377dc",
  "--bb-primary-foreground": "white",
  "--bb-muted-foreground": "#77808d",
  "--bb-border": "#cbd0d8",
  "--bb-ring": "#5377dc",
  "--bb-destructive": "#c43c3c",
  "--bb-state-hover": "#eef1f6",
  "--bb-font-sans": "system-ui, sans-serif",
  "--bb-radius": "0.5rem",
};
function readTheme() {
  const theme = { ...THEME };
  const computed = getComputedStyle(document.documentElement);
  for (const [target, source] of Object.entries({
    "--bb-canvas": "--bg-base",
    "--bb-ink": "--text-primary",
    "--bb-popover": "--bg-elevated",
    "--bb-popover-foreground": "--text-primary",
    "--bb-primary": "--accent",
    "--bb-muted-foreground": "--text-muted",
    "--bb-border": "--border-default",
  })) {
    const value = computed.getPropertyValue(source).trim();
    if (value) theme[target as keyof typeof theme] = value;
  }
  return theme;
}
export function AnnotateAction({
  pluginId,
  page,
  composer,
  url,
}: PluginBrowserToolbarActionProps) {
  const rpc = useRpc();
  const current = useRef({ composer, rpc });
  current.current = { composer, rpc };
  const records = useRef(new Map<string, AnnotationRecord>());
  const pending = useRef(Promise.resolve());
  const [state, setState] = useState(INACTIVE);
  const [error, setError] = useState<string | null>(null);
  const reference = useCallback(
    (record: AnnotationRecord): ContextReference => ({
      version: 1,
      label: annotationMentionLabel(record).slice(0, 200),
      text: formatAnnotationContext(record),
      source: { kind: "plugin", pluginId, resourceId: record.id },
    }),
    [pluginId],
  );
  const applyState = useCallback((value: unknown) => {
    const parsed = pageStateSchema.safeParse(value);
    setState(parsed.success ? parsed.data : INACTIVE);
  }, []);
  useEffect(() => {
    if (!page) return;
    return page.onMessage((data) => {
      const result = pageMessageSchema.safeParse(data);
      if (!result.success) return;
      const message = result.data;
      if (message.type === "state") {
        setState({ active: message.active, count: message.count });
        return;
      }
      pending.current = pending.current
        .then(async () => {
          const { composer, rpc } = current.current;
          if (message.type === "annotation-delete") {
            composer.update(message.id, null);
            records.current.delete(message.id);
          } else if (message.type === "annotation-update") {
            const previous = records.current.get(message.id);
            if (!previous)
              throw new Error("Annotation is no longer in this draft");
            const record = { ...previous, comment: message.comment };
            await rpc.call("update", {
              id: message.id,
              comment: message.comment,
            });
            if (!composer.update(message.id, reference(record)))
              throw new Error("Annotation was removed from the composer");
            records.current.set(message.id, record);
          } else {
            let components: AnnotationRecord["components"] = [];
            try {
              const probe = reactProbeSchema.safeParse(
                await page.evaluate(
                  buildReactProbeExpression(message.annotation.id),
                  { world: "main" },
                ),
              );
              if (probe.success && probe.data)
                components = probe.data.components;
            } catch {
              /* Best effort React source lookup. */
            }
            const record = { ...message.annotation, components };
            await rpc.call("save", record);
            if (!composer.insert(reference(record)))
              throw new Error(
                "Composer is unavailable or full. Remove this pin and try again.",
              );
            records.current.set(record.id, record);
            composer.focus();
          }
          setError(null);
        })
        .catch((cause) =>
          setError(cause instanceof Error ? cause.message : String(cause)),
        );
    });
  }, [page, reference]);
  useEffect(() => {
    if (!page) return;
    records.current.clear();
    page
      .evaluate(buildControllerExpression("state"))
      .then(applyState, () => setState(INACTIVE));
  }, [page, url, applyState]);
  useEffect(
    () => () => {
      void page
        ?.evaluate(buildControllerExpression("deactivate"))
        .catch(() => {});
    },
    [page],
  );
  useEffect(
    () =>
      composer.onSubmitted(() => {
        pending.current = pending.current
          .then(async () => {
            if (page)
              applyState(
                await page.evaluate(buildControllerExpression("clear")),
              );
            records.current.clear();
          })
          .catch((cause) => setError(String(cause)));
      }),
    [composer, page, applyState],
  );
  const toggle = () => {
    if (!page) return;
    setError(null);
    const expression = state.active
      ? buildControllerExpression("deactivate")
      : `((bb)=>(${buildActivateExpression(readTheme())}))(bridge)`;
    page
      .evaluate(expression)
      .then(applyState, (cause) => setError(String(cause)));
  };
  const label = !page
    ? "Annotate elements is available in the desktop app"
    : state.active
      ? "Stop annotating"
      : "Annotate elements";
  return (
    <button
      type="button"
      aria-label={label}
      title={error ?? label}
      aria-pressed={state.active}
      disabled={!page}
      onClick={toggle}
      style={{
        position: "relative",
        width: 30,
        height: 28,
        border: 0,
        borderRadius: 6,
        background: state.active ? "var(--bg-active,#e6edff)" : "transparent",
        color: error ? "#c43c3c" : "inherit",
        cursor: "pointer",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16l4-4h6M19 14v8m-4-4h8" />
      </svg>
      {state.count > 0 && (
        <span
          data-testid="agent-annotations-count"
          style={{
            position: "absolute",
            right: -3,
            top: -4,
            borderRadius: 8,
            background: "#5377dc",
            color: "white",
            minWidth: 16,
            fontSize: 10,
          }}
        >
          {state.count}
        </span>
      )}
    </button>
  );
}
export default definePluginApp((app) => {
  app.slots.experimental_browserToolbarAction?.({
    id: "annotate",
    title: "Agent annotations",
    component: AnnotateAction,
  });
});
