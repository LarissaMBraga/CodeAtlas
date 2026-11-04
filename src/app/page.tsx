import Header from "@/components/layout/header/Header";
import Footer from "@/components/layout/footer/Footer";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import WorkflowSection from "@/components/landing/WorkflowSection";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <WorkflowSection />
      <Footer />
    </main>
  );
}