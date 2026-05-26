"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { FileClock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type { AuditLogRow } from "@/lib/admin";

type AuditLogTableProps = {
  rows: AuditLogRow[];
};

type MetadataValue = boolean | null | number | string | MetadataValue[] | { [key: string]: MetadataValue };

function parseMetadata(value: string | null): MetadataValue | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as MetadataValue;
  } catch {
    return value;
  }
}

function labelForKey(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function primitiveText(value: boolean | null | number | string) {
  if (value === null) return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function isPrimitive(value: MetadataValue): value is boolean | null | number | string {
  return value === null || ["boolean", "number", "string"].includes(typeof value);
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-white/10 py-2 last:border-0">
      <span className="text-[10px] font-semibold uppercase text-slate-500">{label}</span>
      <span className="break-words text-slate-100">{value}</span>
    </div>
  );
}

function TagList({ values }: { values: Array<boolean | null | number | string> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value, index) => (
        <span className="rounded-[5px] border border-cyan-200/20 bg-cyan-300/10 px-2 py-1 text-[11px] font-semibold text-cyan-100" key={`${primitiveText(value)}-${index}`}>
          {primitiveText(value)}
        </span>
      ))}
    </div>
  );
}

function MetadataField({ label, value }: { label: string; value: MetadataValue }) {
  let content: ReactNode;

  if (Array.isArray(value)) {
    content = value.length === 0
      ? <span className="text-slate-500">None</span>
      : value.every(isPrimitive)
        ? <TagList values={value} />
        : (
          <div className="grid gap-2">
            {value.map((item, index) => (
              <div className="rounded-[5px] border border-white/10 bg-white/[0.035] p-2" key={index}>
                <MetadataValueView value={item} />
              </div>
            ))}
          </div>
        );
  } else if (isPrimitive(value)) {
    content = <span className="break-words text-slate-100">{primitiveText(value)}</span>;
  } else {
    content = <MetadataObject value={value} nested />;
  }

  return (
    <div className="grid gap-2 border-b border-white/10 py-3 last:border-0 md:grid-cols-[160px_1fr]">
      <span className="text-[10px] font-semibold uppercase text-slate-500">{labelForKey(label)}</span>
      <div>{content}</div>
    </div>
  );
}

function MetadataObject({ nested = false, value }: { nested?: boolean; value: { [key: string]: MetadataValue } }) {
  const entries = Object.entries(value);

  if (entries.length === 0) {
    return <span className="text-slate-500">No metadata</span>;
  }

  return (
    <div className={nested ? "rounded-[5px] border border-white/10 bg-white/[0.035] px-3" : "rounded-[5px] border border-white/10 bg-white/[0.045] px-3"}>
      {entries.map(([key, item]) => (
        <MetadataField key={key} label={key} value={item} />
      ))}
    </div>
  );
}

function MetadataValueView({ value }: { value: MetadataValue }) {
  if (Array.isArray(value)) {
    return value.every(isPrimitive) ? <TagList values={value} /> : <div className="grid gap-2">{value.map((item, index) => <MetadataValueView key={index} value={item} />)}</div>;
  }

  if (isPrimitive(value)) {
    return <span className="break-words text-slate-100">{primitiveText(value)}</span>;
  }

  return <MetadataObject value={value} nested />;
}

function MetadataPanel({ value }: { value: string | null }) {
  const parsed = parseMetadata(value);

  if (!parsed) {
    return (
      <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3 text-slate-500">
        No metadata
      </div>
    );
  }

  if (isPrimitive(parsed)) {
    return (
      <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3 text-slate-100">
        {primitiveText(parsed)}
      </div>
    );
  }

  if (Array.isArray(parsed)) {
    return (
      <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3">
        <MetadataValueView value={parsed} />
      </div>
    );
  }

  return <MetadataObject value={parsed} />;
}

export function AuditLogTable({ rows }: AuditLogTableProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const selectedRow = useMemo(() => rows.find((row) => row.id === selectedRowId) ?? null, [rows, selectedRowId]);

  return (
    <>
      <section className="glass overflow-hidden">
        <div className="hidden grid-cols-[1.15fr_0.9fr_0.9fr_170px] border-b border-white/10 px-4 py-3 font-semibold text-slate-300 lg:grid">
          <span>Action</span>
          <span>Actor</span>
          <span>Entity</span>
          <span>Created</span>
        </div>
        <div className="divide-y divide-white/10">
          {rows.map((row) => (
            <button
              className="grid w-full gap-3 p-4 text-left transition hover:bg-white/[0.035] lg:grid-cols-[1.15fr_0.9fr_0.9fr_170px] lg:items-center"
              key={row.id}
              onClick={() => setSelectedRowId(row.id)}
              type="button"
            >
              <div>
                <p className="font-semibold text-slate-100">{row.action}</p>
                <p className="mt-1 text-muted">{row.actorType}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-200">{row.actorName ?? "Unknown actor"}</p>
                <p className="mt-1 break-all text-slate-500">{row.actorId ?? "System"}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-200">{row.entityType}</p>
                <p className="mt-1 break-all text-slate-500">{row.entityId ?? "Not set"}</p>
              </div>
              <time className="text-slate-400">{row.createdAt.toLocaleString("en-NG")}</time>
            </button>
          ))}
        </div>
        {rows.length === 0 ? (
          <div className="grid min-h-40 place-items-center gap-2 p-4 text-center text-muted">
            <FileClock className="size-5" />
            No audit entries are available yet.
          </div>
        ) : null}
      </section>

      <Modal className="max-w-3xl" onClose={() => setSelectedRowId(null)} open={Boolean(selectedRow)} title="Audit entry">
        {selectedRow ? (
          <div className="grid gap-4">
            <div className="grid gap-2 rounded-[5px] border border-white/10 bg-white/[0.045] p-3 sm:grid-cols-2">
              <Detail label="Action" value={selectedRow.action} />
              <Detail label="Actor type" value={selectedRow.actorType} />
              <Detail label="Actor" value={selectedRow.actorName ?? "Unknown actor"} />
              <Detail label="Actor ID" value={selectedRow.actorId ?? "System"} />
              <Detail label="Entity type" value={selectedRow.entityType} />
              <Detail label="Entity ID" value={selectedRow.entityId ?? "Not set"} />
              <Detail label="Created" value={selectedRow.createdAt.toLocaleString("en-NG")} />
              <Detail label="Log ID" value={selectedRow.id} />
            </div>
            <div>
              <p className="mb-2 font-semibold text-slate-100">Metadata</p>
              <div className="app-scrollbar max-h-[42vh] overflow-auto pr-1">
                <MetadataPanel value={selectedRow.metadata} />
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
