import { HomeInteractive } from './_components/HomeInteractive';
import { HomeStaticContent } from './_components/HomeStaticContent';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <HomeInteractive />
      <HomeStaticContent />
    </div>
  );
}
