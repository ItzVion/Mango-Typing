import { Seo } from "../components/Seo";
import { BackButton } from "../components/BackButton";

const providers = [
  { name: "Google Identity Services", role: "Optional sign-in", detail: "If you choose Google sign-in, Google provides an identity credential. MangoTyping verifies it on the server and may receive your Google account identifier, verified email, and—if available—profile name and photo. MangoTyping does not receive your Google password and does not request access to Gmail or Google Drive through this sign-in flow.", href: "https://policies.google.com/privacy", label: "Google Privacy Policy" },
  { name: "Razorpay", role: "Optional donation payments", detail: "When donations are enabled and you choose to contribute, Razorpay supplies the payment checkout and processes payment credentials. MangoTyping receives and stores transaction information such as amount, order/payment identifiers, status and timestamps; it does not intentionally store full card numbers, CVV/CVC, UPI PINs or banking passwords.", href: "https://razorpay.com/privacy/", label: "Razorpay Privacy Policy" },
  { name: "Neon", role: "Database infrastructure", detail: "MangoTyping uses PostgreSQL database infrastructure hosted through Neon to store service records, including accounts, typing history, donation metadata, settings and legal-page content.", href: "https://neon.tech/privacy-policy", label: "Neon Privacy Policy" },
  { name: "Vercel", role: "Hosting and deployment", detail: "Vercel delivers the website and may process request and operational data as part of hosting, security, and deployment services.", href: "https://vercel.com/legal/privacy-policy", label: "Vercel Privacy Policy" },
  { name: "Email and support providers", role: "Messages and bug reports", detail: "The project may use configured SMTP/email services to send verification codes and account notices. If a support or bug-report destination is configured to use a third party, the submitted report and any attachments may be processed by that provider. Do not include passwords, payment credentials, or another person’s private information in reports.", href: "mailto:support@mangotyping.fun", label: "Contact MangoTyping" },
];

export const ThirdPartyNotice = () => (
  <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-1 pb-8 text-[var(--text-primary)]">
    <Seo title="Third-party Services Notice" description="See the external services MangoTyping may use for Google sign-in, payment processing, database infrastructure, hosting, and email." path="/third-party-notice" />
    <BackButton to="/" label="Back to MangoTyping" />
    <header>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Transparency</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Third-party services notice</h1>
      <p className="mt-4 text-sm leading-7 text-[var(--text-muted)] sm:text-base">
        MangoTyping is an independent project. Some features depend on external providers. A provider receives information only as part of the feature or infrastructure it supplies, according to its own systems, terms, and applicable privacy practices.
      </p>
    </header>
    <section className="flex flex-col gap-4" aria-label="External providers">
      {providers.map((provider) => (
        <article className="card flex flex-col gap-3 p-5 sm:p-6" key={provider.name}>
          <div>
            <h2 className="text-lg font-bold">{provider.name}</h2>
            <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{provider.role}</p>
          </div>
          <p className="text-sm leading-7 text-[var(--text-muted)]">{provider.detail}</p>
          <p><a className="inline-flex min-h-11 items-center underline underline-offset-4" href={provider.href} target={provider.href.startsWith("https://") ? "_blank" : undefined} rel={provider.href.startsWith("https://") ? "noopener noreferrer" : undefined}>{provider.label}</a></p>
        </article>
      ))}
    </section>
    <section className="rounded-3xl bg-[var(--card-bg)] p-6 sm:p-8">
      <h2 className="text-lg font-bold">Independent service; separate policies</h2>
      <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
        Brand and product names belong to their respective owners. Listing a provider does not imply sponsorship, endorsement, or partnership. External sites and services are governed by their own policies and terms. The providers actually used may change as the project evolves; the Privacy Policy describes the data MangoTyping handles and the categories of processors it may rely on.
      </p>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">Questions? <a className="underline underline-offset-4" href="mailto:support@mangotyping.fun">support@mangotyping.fun</a>.</p>
    </section>
  </main>
);
