import {
  Activity,
  BarChart3,
  CheckCircle2,
  Mail,
  Send,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/auth/brand-logo";

export type AuthVariant = "login" | "forgot" | "reset";

const copy: Record<AuthVariant, { title: string; description: string }> = {
  login: {
    title: "Segurança térmica para a sua operação.",
    description:
      "Monitore, analise e previna falhas em equipamentos industriais com tecnologia e inteligência.",
  },
  forgot: {
    title: "Esqueceu sua senha?",
    description:
      "Não se preocupe. Informe o e-mail cadastrado e enviaremos um link para você redefinir sua senha.",
  },
  reset: {
    title: "Crie uma nova senha.",
    description:
      "Escolha uma senha forte para voltar a acessar o monitoramento da sua operação.",
  },
};

const benefits = [
  {
    icon: ShieldCheck,
    title: "Mais segurança",
    description: "Evite paradas não programadas.",
  },
  {
    icon: BarChart3,
    title: "Dados em tempo real",
    description: "Decisões mais rápidas e assertivas.",
  },
  {
    icon: Settings,
    title: "Alta performance",
    description: "Mantenha sua operação no máximo.",
  },
];

function FactoryIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 620 300"
      className="pointer-events-none absolute -bottom-2 -left-8 w-[112%] text-teal-100/25"
      fill="none"
    >
      <path d="M0 239 94 184v41l100-63v53l110-72v54l99-59v34l100-63v145H0Z" fill="currentColor" opacity=".22" />
      <path d="M15 284V201l47 17v-47l30 11v102M76 285V144l28-15 28 15v141M84 160h39M84 180h39M84 200h39M84 220h39M84 240h39" stroke="currentColor" strokeWidth="3" />
      <path d="M170 286V113l23-19 24 19v173M174 133h39M174 154h39M174 175h39M174 196h39M174 217h39M174 238h39" stroke="currentColor" strokeWidth="3" />
      <path d="M185 94V48h15v46M184 47h17M197 46V27h11v19M297 286V173l45-28 42 24v117M300 191h81M300 213h81M300 235h81M300 257h81" stroke="currentColor" strokeWidth="3" />
      <path d="M431 286V112l20-15 22 15v174M435 137h34M435 159h34M435 181h34M435 203h34M435 225h34M435 247h34M446 96V42h13v54M445 42h16M453 41V20h12v22M512 286V165l25-16 24 16v121M515 189h42M515 211h42M515 233h42M515 255h42" stroke="currentColor" strokeWidth="3" />
      <path d="M0 287c74-70 124-51 171 13M391 298c57-93 136-109 229-163" stroke="#10B981" strokeOpacity=".42" strokeWidth="2" />
    </svg>
  );
}

function RecoveryIllustration() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto mt-10 flex size-56 items-center justify-center"
    >
      <div className="absolute inset-5 rounded-full border border-teal-300/30" />
      <div className="absolute inset-0 rounded-full border border-dashed border-teal-300/35" />
      <div className="absolute inset-10 rounded-full bg-teal-300/10 shadow-[0_0_55px_rgba(16,185,129,0.18)]" />
      <div className="relative flex size-28 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-teal-200 text-brand-primary shadow-xl">
        <Mail className="size-14" strokeWidth={1.55} />
      </div>
      <span className="absolute bottom-7 right-5 flex size-14 items-center justify-center rounded-full border border-teal-300/60 bg-brand-primary-light text-white shadow-lg">
        <Send className="size-6" />
      </span>
      <span className="absolute left-4 top-11 size-2.5 rounded-full bg-brand-accent shadow-[0_0_12px_#10b981]" />
      <span className="absolute right-4 top-9 size-2.5 rounded-full bg-brand-accent shadow-[0_0_12px_#10b981]" />
      <span className="absolute bottom-9 left-8 size-2 rounded-full bg-teal-300" />
    </div>
  );
}

export function BrandPanel({ variant }: { variant: AuthVariant }) {
  const content = copy[variant];

  return (
    <aside className="brand-panel relative flex min-h-[300px] flex-col overflow-hidden bg-brand-primary px-7 py-7 text-white sm:px-10 sm:py-9 lg:min-h-[690px] lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute -right-36 -top-28 size-[420px] rounded-full border border-teal-200/10" />
      <div className="pointer-events-none absolute -right-24 -top-16 size-[340px] rounded-full border border-teal-200/10" />
      <div className="relative z-10">
        <BrandLogo light compact />
        <p className="mt-5 max-w-xs text-sm leading-6 text-teal-50/75">
          Monitoramento térmico inteligente para um futuro mais seguro.
        </p>
      </div>

      <div className="brand-copy relative z-10 mt-8 max-w-md lg:mt-12">
        <div className="mb-5 h-1 w-10 rounded-full bg-brand-accent" />
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-3xl">
          {variant === "login" ? (
            <>
              Segurança térmica
              <br />
              para a sua <span className="text-teal-300">operação.</span>
            </>
          ) : (
            <span>
              {content.title.split(" ").slice(0, -1).join(" ")}{" "}
              <span className="text-teal-300">
                {content.title.split(" ").slice(-1)}
              </span>
            </span>
          )}
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-6 text-teal-50/80">
          {content.description}
        </p>
      </div>

      {variant === "login" ? (
        <ul className="relative z-10 mt-6 hidden space-y-4 lg:block">
          {benefits.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-teal-300/30 bg-teal-300/10 text-teal-200">
                <Icon aria-hidden="true" className="size-5" strokeWidth={1.7} />
              </span>
              <span>
                <span className="block text-sm font-medium">{title}</span>
                <span className="mt-0.5 block text-xs text-teal-50/60">
                  {description}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="relative z-10 hidden flex-1 items-center justify-center lg:flex">
          <RecoveryIllustration />
        </div>
      )}

      {variant === "login" ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[230px] lg:block">
          <div className="absolute inset-0 bg-gradient-to-t from-[#052f30]/80 via-[#075a58]/20 to-transparent" />
          <FactoryIllustration />
        </div>
      ) : (
        <div className="pointer-events-none absolute -bottom-32 -right-16 hidden size-80 rounded-full border border-teal-300/20 lg:block" />
      )}

      <div className="relative z-10 mt-auto hidden pt-8 text-xs text-teal-50/65 lg:block">
        <Activity aria-hidden="true" className="mr-2 inline size-4 text-teal-300" />
        Monitoramento contínuo. Decisões mais seguras.
      </div>
    </aside>
  );
}
