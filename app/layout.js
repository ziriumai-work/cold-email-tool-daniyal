import './globals.css';

export const metadata = {
  title: 'Zirium AI — Cold Email Tool',
  description: 'Personalized outreach with human approval',
  icons: { icon: '/logo.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Zirium AI — Enterprise Cold Email Outreach</title>
        <meta name="description" content="AI-Powered Personalized Cold Email Outreach with Live Approval & Analytics" />
        <link rel="icon" href="/logo.png" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
