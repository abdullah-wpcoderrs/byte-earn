import { CheckCircle2, Trash2, XCircle } from "lucide-react";
import { moderatePostAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/input";
import { getModerationPosts } from "@/lib/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminModerationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = first(params.status) as "pending" | "published" | "rejected" | undefined;
  const posts = await getModerationPosts(["pending", "published", "rejected"].includes(status ?? "") ? status : undefined);

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4 sm:p-5">
        <p className="text-muted">Post review, publishing, rejection messages, and deletion</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Moderation hub</h1>
      </section>

      <form className="glass grid gap-3 p-4 sm:max-w-xs" action="/admin/moderation">
        <Select defaultValue={status ?? ""} label="Status filter" name="status">
          <option value="">All posts</option>
          <option value="pending">Pending</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Button type="submit">Filter</Button>
      </form>

      <section className="grid gap-3">
        {posts.map((post) => (
          <article className="glass grid gap-4 p-4 lg:grid-cols-[92px_1fr_300px]" key={post.id}>
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[5px] border border-white/10 bg-white/[0.055] text-center text-muted">
              {post.type}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-[5px] border border-cyan-200/20 bg-cyan-300/10 px-2 py-1 font-semibold text-cyan-100">{post.status}</span>
                <span className="text-muted">{post.authorName ?? "Unknown author"}</span>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-5 text-slate-100">{post.caption}</p>
              <p className="mt-3 text-muted">
                {post.likesCount} likes - {post.commentsCount} comments
              </p>
            </div>
            <form action={moderatePostAction} className="grid gap-2">
              <input name="postId" type="hidden" value={post.id} />
              <TextInput label="Rejection message" name="message" placeholder="Reason for author notification" />
              <div className="grid grid-cols-3 gap-2">
                <Button icon={<CheckCircle2 className="size-4" />} name="moderationAction" type="submit" value="publish">
                  Publish
                </Button>
                <Button icon={<XCircle className="size-4" />} name="moderationAction" type="submit" value="reject" variant="secondary">
                  Reject
                </Button>
                <Button icon={<Trash2 className="size-4" />} name="moderationAction" type="submit" value="delete" variant="danger">
                  Delete
                </Button>
              </div>
            </form>
          </article>
        ))}
      </section>
      {posts.length === 0 ? <div className="glass p-6 text-center text-muted">No posts match this moderation filter.</div> : null}
    </div>
  );
}
