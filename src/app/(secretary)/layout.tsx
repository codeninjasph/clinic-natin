import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Queue Dashboard | Clinic Natin',
  description: 'Secretary queue management dashboard for Clinic Natin',
};

export default function SecretaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
