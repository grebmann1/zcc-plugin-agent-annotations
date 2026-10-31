import type { ZccPluginApi } from "@zana-ai/zcc-plugin-sdk/server";
import {
  annotationRecordSchema,
  annotationUpdateSchema,
  formatAnnotationContext,
  type AnnotationRecord,
} from "./annotations.js";
export default function plugin(zcc: ZccPluginApi) {
  let pending = Promise.resolve();
  const mutate = <T>(run: () => Promise<T>): Promise<T> => {
    const result = pending.then(run);
    pending = result.then(
      () => {},
      () => {},
    );
    return result;
  };
  zcc.rpc.method("save", (value) =>
    mutate(async () => {
      const record = annotationRecordSchema.parse(value);
      const records =
        (await zcc.storage.kv.get<AnnotationRecord[]>("annotations")) ?? [];
      await zcc.storage.kv.set(
        "annotations",
        [...records.filter((row) => row.id !== record.id), record].slice(-1000),
      );
      return { id: record.id };
    }),
  );
  zcc.rpc.method("update", (value) =>
    mutate(async () => {
      const { id, comment } = annotationUpdateSchema.parse(value);
      const records =
        (await zcc.storage.kv.get<AnnotationRecord[]>("annotations")) ?? [];
      if (!records.some((row) => row.id === id))
        throw new Error("This browser annotation is no longer available");
      await zcc.storage.kv.set(
        "annotations",
        records.map((row) => (row.id === id ? { ...row, comment } : row)),
      );
      return { id };
    }),
  );
  zcc.rpc.method("resolve", async (value) => {
    const id = (value as { id?: unknown })?.id;
    const record = (
      (await zcc.storage.kv.get<AnnotationRecord[]>("annotations")) ?? []
    ).find((row) => row.id === id);
    return {
      context: formatAnnotationContext(annotationRecordSchema.parse(record)),
    };
  });
}
