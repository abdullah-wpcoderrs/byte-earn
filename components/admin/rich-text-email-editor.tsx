"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Code2, Eye, Heading2, Italic, Link2, List, ListOrdered, Pilcrow, Type, Bold } from "lucide-react";
import { Button } from "@/components/ui/button";

type RichTextEmailEditorProps = {
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
};

type EditorTab = "compose" | "html" | "preview";

const tabCopy: Record<EditorTab, string> = {
  compose: "Compose",
  html: "HTML source",
  preview: "Preview",
};

const formatterButtons = [
  { command: "bold", icon: Bold, label: "Bold" },
  { command: "italic", icon: Italic, label: "Italic" },
  { command: "formatBlock", icon: Heading2, label: "Heading", value: "<h2>" },
  { command: "formatBlock", icon: Pilcrow, label: "Paragraph", value: "<p>" },
  { command: "insertUnorderedList", icon: List, label: "Bullet list" },
  { command: "insertOrderedList", icon: ListOrdered, label: "Numbered list" },
] as const;

export function RichTextEmailEditor({ defaultValue = "", label, name, required }: RichTextEmailEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const inputId = useId();
  const [activeTab, setActiveTab] = useState<EditorTab>("compose");
  const [html, setHtml] = useState(defaultValue);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [html]);

  const isEmpty = useMemo(() => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, "").length === 0, [html]);

  function syncFromEditor() {
    setHtml(editorRef.current?.innerHTML ?? "");
  }

  function applyCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncFromEditor();
  }

  function insertLink() {
    const url = window.prompt("Enter the full URL for this link.");
    if (!url) return;
    applyCommand("createLink", url);
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <label className="font-medium text-slate-200" htmlFor={inputId}>
          {label}
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(tabCopy) as EditorTab[]).map((tab) => (
            <Button
              className="min-h-8 px-2.5 text-sm"
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
              variant={activeTab === tab ? "primary" : "secondary"}
            >
              {tabCopy[tab]}
            </Button>
          ))}
        </div>
      </div>

      {activeTab === "compose" ? (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            {formatterButtons.map((item) => (
              <Button
                className="min-h-7 gap-1 px-2 text-[12px]"
                icon={<item.icon className="size-3.5" />}
                key={`${item.command}-${item.label}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyCommand(item.command, "value" in item ? item.value : undefined)}
                type="button"
                variant="secondary"
              >
                {item.label}
              </Button>
            ))}
            <Button
              className="min-h-7 gap-1 px-2 text-[12px]"
              icon={<Link2 className="size-3.5" />}
              onMouseDown={(event) => event.preventDefault()}
              onClick={insertLink}
              type="button"
              variant="secondary"
            >
              Link
            </Button>
          </div>

          <div className="relative rounded-[5px] border border-white/10 bg-white/[0.04]">
            {isEmpty ? (
              <span className="pointer-events-none absolute left-3 top-3 text-sm text-slate-500">
                Build the email here. Use preview to review the final layout before saving.
              </span>
            ) : null}
            <div
              contentEditable
              id={inputId}
              onInput={syncFromEditor}
              ref={editorRef}
              className="min-h-64 w-full px-3 py-3 text-sm leading-6 text-slate-100 outline-none"
              suppressContentEditableWarning
            />
          </div>
        </div>
      ) : null}

      {activeTab === "html" ? (
        <label className="grid gap-2">
          <span className="sr-only">HTML source</span>
          <textarea
            className="min-h-64 rounded-[5px] border border-white/10 bg-slate-950/80 px-3 py-3 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
            onChange={(event) => setHtml(event.target.value)}
            value={html}
          />
        </label>
      ) : null}

      {activeTab === "preview" ? (
        <div className="overflow-hidden rounded-[5px] border border-white/10 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Eye className="size-3.5" />
            Email preview
          </div>
          <div
            className="min-h-64 px-5 py-5 text-sm leading-6 text-slate-800 [&_a]:text-sky-700 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:text-2xl [&_h2]:font-semibold [&_img]:max-w-full [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: html || "<p>Your preview will appear here.</p>" }}
          />
        </div>
      ) : null}

      <div className="rounded-[5px] border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          {activeTab === "compose" ? <Type className="size-4" /> : activeTab === "html" ? <Code2 className="size-4" /> : <Eye className="size-4" />}
          <span>{activeTab === "compose" ? "Use the toolbar to style the message." : activeTab === "html" ? "Raw HTML stays in sync with the visual editor." : "Preview uses the exact HTML that will be saved."}</span>
        </div>
      </div>

      <input name={name} type="hidden" value={html} />
      {required ? <input name={`${name}Required`} type="hidden" value={isEmpty ? "" : "ready"} /> : null}
    </div>
  );
}
