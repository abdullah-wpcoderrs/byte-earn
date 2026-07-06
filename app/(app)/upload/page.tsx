import { redirect } from "next/navigation";

// The upload flow is now a global composer (see UploadProvider in AppShell).
// This route is kept as a redirect so old links/bookmarks land on the feed,
// where ?upload=1 / ?error= / ?updated= are handled by the composer.
type UploadPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const params = await searchParams ?? {};
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      search.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((entry) => search.append(key, entry));
    }
  }
  const query = search.toString();
  redirect(query ? `/feed?${query}` : "/feed");
}
