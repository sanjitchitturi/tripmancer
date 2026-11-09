import Link from "next/link";

export function AccountWall({
  title,
  detail,
  next,
}: {
  title: string;
  detail: string;
  next: string;
}) {
  const query = `?next=${encodeURIComponent(next)}`;
  return (
    <div className="wrap page flex flex-1 items-center">
      <div className="card mx-auto w-full max-w-lg px-6 py-10 text-center sm:px-10 sm:py-14">
        <p className="eyebrow">Account</p>
        <h1 className="title mt-3">{title}</h1>
        <p className="mx-auto mt-4 max-w-[42ch] leading-7 text-muted">{detail}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={`/signup${query}`} className="btn btn-primary btn-lg">
            Create account
          </Link>
          <Link href={`/login${query}`} className="btn btn-quiet btn-lg">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
