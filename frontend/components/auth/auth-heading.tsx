import { BrandLogo } from "@/components/auth/brand-logo";

export function AuthHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-7 text-center">
      <div className="mb-6 hidden justify-center lg:flex">
        <BrandLogo />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </header>
  );
}
