import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion | Social Media Qitmeer",
  description: "Data deletion instructions for Social Media Qitmeer.",
};

const contactEmail = "muhammadsufiyanfb@gmail.com";

export default function DataDeletionPage() {
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
            Data Deletion Instructions
          </h1>
          <p className="mt-4 text-gray-300">
            You can request deletion of your Social Media Qitmeer account data
            at any time by contacting us.
          </p>

          <div className="mt-8 space-y-8 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white">
                How To Request Deletion
              </h2>
              <p className="mt-3">
                Send an email to{" "}
                <a
                  href={`mailto:${contactEmail}?subject=Delete%20my%20data`}
                  className="text-cyan-300 underline-offset-4 hover:underline"
                >
                  {contactEmail}
                </a>{" "}
                with the subject line &quot;Delete my data&quot;. Please include
                the email address used for your Social Media Qitmeer account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">
                What We Delete
              </h2>
              <p className="mt-3">
                After verifying your request, we will delete or disconnect your
                stored account profile, connected social account tokens, saved
                posts, media records, auto-reply rules, and related application
                data, unless retention is required by law or security needs.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">
                Processing Time
              </h2>
              <p className="mt-3">
                We aim to complete verified deletion requests within 7 business
                days and will confirm once the request has been processed.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">
                Facebook And Instagram Connections
              </h2>
              <p className="mt-3">
                If you connected Facebook or Instagram, you may also remove app
                access from your Facebook settings. Removing access there stops
                future access, and emailing us lets us delete data stored inside
                Social Media Qitmeer.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">
                Privacy Policy
              </h2>
              <p className="mt-3">
                Read our{" "}
                <Link
                  href="/privacy"
                  className="text-cyan-300 underline-offset-4 hover:underline"
                >
                  privacy policy
                </Link>{" "}
                for more information about how we handle data.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}