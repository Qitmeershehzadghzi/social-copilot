import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Social Media Qitmeer",
  description: "Privacy policy for Social Media Qitmeer.",
};

const contactEmail = "muhammadsufiyanfb@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-200"
        >
          Back to Social Media Qitmeer
        </Link>

        <div className="mt-10 rounded-lg border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <p className="text-sm text-gray-400">Last updated: June 6, 2026</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-gray-300">
            Social Media Qitmeer helps users connect social media accounts, create
            content, schedule posts, and manage publishing workflows. This policy
            explains what information we collect and how we use it.
          </p>

          <div className="mt-8 space-y-8 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white">
                Information We Collect
              </h2>
              <p className="mt-3">
                We may collect account information such as your name, email
                address, profile details from connected social platforms, access
                tokens required to connect supported platforms, scheduled post
                content, media URLs, publishing status, and app preferences.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">
                How We Use Information
              </h2>
              <p className="mt-3">
                We use this information to authenticate users, connect social
                accounts, schedule and publish posts, show account status,
                provide AI-assisted content features, improve the product, and
                respond to support or deletion requests.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">
                Platform Data
              </h2>
              <p className="mt-3">
                When you connect a Facebook or Instagram account, Social Media
                Qitmeer uses Meta platform permissions only to provide the
                features you request, such as connecting an account and
                publishing content. We do not sell Meta platform data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">
                Sharing Information
              </h2>
              <p className="mt-3">
                We do not sell your personal information. We may share data only
                with service providers and platform APIs needed to operate the
                app, comply with legal requirements, protect the service, or
                complete actions you request.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">
                Data Retention
              </h2>
              <p className="mt-3">
                We keep information for as long as needed to provide the service
                or meet legal and operational requirements. You may request data
                deletion at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">
                Data Deletion
              </h2>
              <p className="mt-3">
                To request deletion of your data, visit our{" "}
                <Link
                  href="/data-deletion"
                  className="text-cyan-300 underline-offset-4 hover:underline"
                >
                  data deletion instructions
                </Link>{" "}
                or email us at{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-cyan-300 underline-offset-4 hover:underline"
                >
                  {contactEmail}
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">
                Contact Us
              </h2>
              <p className="mt-3">
                If you have questions about this privacy policy, contact us at{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-cyan-300 underline-offset-4 hover:underline"
                >
                  {contactEmail}
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}