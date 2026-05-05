"use client";

import Lottie from "lottie-react";
import animationData from "../public/animations/gradient loader 01.json";

const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div className="w-64 h-64">
        <Lottie animationData={animationData} loop={true} />
      </div>
    </div>
  );
};

export default LoadingSpinner;
