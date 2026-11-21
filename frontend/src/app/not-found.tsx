import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex h-screen w-screen items-center justify-center bg-background p-6">
      <div className="max-w-sm space-y-4 text-center">
        <h1 className="text-lg font-semibold text-foreground">This city isn&apos;t available yet</h1>
        <p className="text-sm text-muted-foreground">Pick one of the cities we currently cover.</p>
        <Link
          href="/"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Back to cities
        </Link>
      </div>
    </main>
  );
}
