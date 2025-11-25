import React from "react";
import { redirect } from "next/navigation";

const Home = async () => {
  return redirect("/dashboard");
};

export default Home;
