import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { onboardingApi } from '../services/api';

interface FormData {
  tradingName: string;
  vatNumber: string;
  businessAddress: string;
  city: string;
  postalCode: string;
  country: string;
  businessPhone: string;
  termsAccepted: boolean;
}

interface ProfileInfo {
  businessName: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  companyCode: string;
  plan: string;
  monthlyPrice: number;
  billingCycle: string;
}

interface Credentials {
  companyCode: string;
  email: string;
  password: string;
  loginUrl: string;
}

const planLabel: Record<string, string> = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  BUSINESS: 'Business',
  ENTERPRISE: 'Enterprise',
  CUSTOM: 'Custom',
};

export default function OnboardingPage() {
  const { token } = useParams<{ token: string }>();
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    tradingName: '',
    vatNumber: '',
    businessAddress: '',
    city: '',
    postalCode: '',
    country: 'United Kingdom',
    businessPhone: '',
    termsAccepted: false,
  });

  useEffect(() => {
    if (!token) return;
    onboardingApi
      .getForm(token)
      .then((r) => {
        setProfile(r.data);
        setForm((f) => ({
          ...f,
          businessPhone: r.data.contactPhone || '',
        }));
      })
      .catch((e: any) => {
        setLoadError(
          e.response?.data?.message ||
            'This setup link is invalid or has expired.',
        );
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!form.businessAddress.trim() || !form.city.trim() || !form.postalCode.trim()) {
      setSubmitError('Please fill in your full business address.');
      return;
    }
    if (!form.termsAccepted) {
      setSubmitError('You must accept the Terms & Conditions to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const r = await onboardingApi.submitForm(token!, {
        tradingName: form.tradingName.trim() || undefined,
        vatNumber: form.vatNumber.trim() || undefined,
        businessAddress: form.businessAddress.trim(),
        city: form.city.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim(),
        businessPhone: form.businessPhone.trim() || undefined,
        termsAccepted: true,
      });
      setCredentials(r.data);
    } catch (e: any) {
      setSubmitError(
        e.response?.data?.message ||
          'Something went wrong. Please try again or contact support@truedesk.co.uk.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Wrapper>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Wrapper>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <Wrapper>
        <Card>
          <div className="text-center py-8 px-6">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Link Unavailable</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{loadError}</p>
            <p className="text-sm text-gray-400 mt-4">
              Need help?{' '}
              <a href="mailto:support@truedesk.co.uk" className="text-blue-600 hover:underline">
                support@truedesk.co.uk
              </a>
            </p>
          </div>
        </Card>
      </Wrapper>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────────
  if (credentials) {
    return (
      <Wrapper>
        <Card>
          <div className="text-center pb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              You're all set!
            </h2>
            <p className="text-sm text-gray-500">
              Your TrueDesk POS account has been created. Login details below.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Login Details
            </p>
            <div className="space-y-2.5">
              <Row label="Company Code" value={credentials.companyCode} mono />
              <Row label="Email" value={credentials.email} />
              <Row label="Password" value={credentials.password} mono highlight />
            </div>
            <p className="text-xs text-amber-600 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ Write this password down — you'll need it on first login. Change it after logging in.
            </p>
          </div>

          <a
            href={credentials.loginUrl}
            target="_blank"
            rel="noreferrer"
            className="block w-full text-center bg-gray-900 text-white font-semibold py-3.5 rounded-xl hover:bg-gray-700 transition-colors"
          >
            Log in to TrueDesk POS →
          </a>

          <p className="text-center text-xs text-gray-400 mt-4">
            A confirmation email with these details has been sent to your inbox.
          </p>
        </Card>
      </Wrapper>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <Wrapper>
      <Card>
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            Setup for {profile!.businessName}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            Complete your TrueDesk setup
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
            Hi {profile!.contactFirstName}, fill in your business details below. This takes about 2 minutes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── Section 1: Business Details ──────────────────────────────────── */}
          <Section number={1} title="Business Details">
            <Field label="Trading Name" hint="Leave blank if same as business name">
              <Input
                placeholder={profile!.businessName}
                value={form.tradingName}
                onChange={(e) => set('tradingName', e.target.value)}
              />
            </Field>

            <Field label="Business Address" required>
              <Input
                placeholder="Street address"
                value={form.businessAddress}
                onChange={(e) => set('businessAddress', e.target.value)}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="City" required>
                <Input
                  placeholder="Nottingham"
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  required
                />
              </Field>
              <Field label="Postcode" required>
                <Input
                  placeholder="NG1 1AA"
                  value={form.postalCode}
                  onChange={(e) => set('postalCode', e.target.value)}
                  required
                />
              </Field>
            </div>

            <Field label="VAT Number" hint="Optional — GB format, e.g. 123456789">
              <Input
                placeholder="123456789"
                value={form.vatNumber}
                onChange={(e) => set('vatNumber', e.target.value)}
              />
            </Field>

            <Field label="Business Phone">
              <Input
                type="tel"
                placeholder="+44 115 000 0000"
                value={form.businessPhone}
                onChange={(e) => set('businessPhone', e.target.value)}
              />
            </Field>
          </Section>

          {/* ── Section 2: Plan Confirmation ─────────────────────────────────── */}
          <Section number={2} title="Subscription Confirmation">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {planLabel[profile!.plan] || profile!.plan} Plan
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Billed {profile!.billingCycle.toLowerCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    £{profile!.monthlyPrice}
                  </p>
                  <p className="text-xs text-gray-500">per month</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 border-t border-blue-200 pt-3">
                Your first invoice will be issued 30 days after setup. You can cancel at any time by contacting{' '}
                <a href="mailto:billing@truedesk.co.uk" className="text-blue-600">billing@truedesk.co.uk</a>.
              </p>
            </div>
          </Section>

          {/* ── Section 3: Terms & Conditions ────────────────────────────────── */}
          <Section number={3} title="Terms & Conditions">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-h-36 overflow-y-auto text-xs text-gray-500 leading-relaxed mb-4">
              <p className="font-semibold text-gray-700 mb-2">TrueDesk POS — Service Terms</p>
              <p>By completing this setup you agree to the following:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Monthly subscription charges as stated above apply from your go-live date.</li>
                <li>A minimum contract period of 1 month applies after activation.</li>
                <li>Cancellation requests must be submitted in writing to billing@truedesk.co.uk with 30 days notice.</li>
                <li>TrueDesk retains the right to suspend accounts with overdue payments after 14 days.</li>
                <li>Your data is stored securely in the United Kingdom in accordance with UK GDPR.</li>
                <li>TrueDesk is not liable for data loss caused by hardware failure on the client's premises.</li>
                <li>Support is provided via email (support@truedesk.co.uk) Monday–Friday, 9am–5pm GMT.</li>
              </ul>
              <p className="mt-2">
                Full terms available at{' '}
                <a href="https://truedesk.co.uk/terms" className="text-blue-600">truedesk.co.uk/terms</a>.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(e) => set('termsAccepted', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 leading-snug">
                I confirm I have read and agree to the TrueDesk{' '}
                <a href="https://truedesk.co.uk/terms" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  Terms & Conditions
                </a>{' '}
                and understand the monthly subscription charge of{' '}
                <strong>£{profile!.monthlyPrice}/month</strong>.
              </span>
            </label>
          </Section>

          {/* ── Error ───────────────────────────────────────────────────────── */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* ── Submit ──────────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gray-900 text-white font-semibold py-4 rounded-xl hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Setting up your account…
              </span>
            ) : (
              'Complete Setup & Activate Account'
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            Need help?{' '}
            <a href="mailto:support@truedesk.co.uk" className="text-blue-600 hover:underline">
              support@truedesk.co.uk
            </a>
          </p>
        </form>
      </Card>
    </Wrapper>
  );
}

// ── Layout components ─────────────────────────────────────────────────────────

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm tracking-tight">TrueDesk POS</span>
        </div>
      </div>
      <div className="max-w-xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
      {children}
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <span className="flex-none w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">
          {number}
        </span>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <div className="space-y-3 pl-8.5">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="font-normal text-gray-400 ml-1.5">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
    />
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`text-sm font-semibold ${highlight ? 'text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg' : 'text-gray-900'} ${mono ? 'font-mono tracking-wide' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
