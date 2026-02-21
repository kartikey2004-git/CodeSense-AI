import React from "react";
import Features from "@/components/subcomponents/Features";
import Hero from "@/components/subcomponents/Hero";
import Testimonials from "@/components/subcomponents/Testimonials";

const Home = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-black">
      <Hero />
      {/* <SeeInAction /> */}
      <Features />
      <Testimonials />
    </div>
  );
};

export default Home;
