import React from "react";
import Features from "@/components/subComponents/Features";
import Hero from "@/components/subComponents/Hero";
import SeeInAction from "@/components/subComponents/SeeInAction";
import Testimonials from "@/components/subComponents/Testimonials";

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
