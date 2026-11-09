import Navbar from './components/sections/Navbar';
import Hero from './components/sections/Hero';
import Metrics from './components/sections/Metrics';
import Problems from './components/sections/Problems';
import Benefits from './components/sections/Benefits';
import HowItWorks from './components/sections/HowItWorks';
import UseCases from './components/sections/UseCases';
import Testimonials from './components/sections/Testimonials';
import FAQ from './components/sections/FAQ';
import FinalCTA from './components/sections/FinalCTA';
import Footer from './components/sections/Footer';

/* Orden de las secciones: reordena, comenta o duplica líneas para iterar. */
export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Metrics />
        <Problems />
        <Benefits />
        <HowItWorks />
        <UseCases />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
