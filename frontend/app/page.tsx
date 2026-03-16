"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { TextAnimate } from "@/components/ui/text-animate";
import { motion } from "motion/react";
import { useAuth } from "@/contexts/auth-context";
import {
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Globe2,
  Smartphone,
  Box,
  LayoutDashboard,
} from "lucide-react";


export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const getDashboardLink = () => {
    if (user?.role === "manufacturer") {
      return "/manufacturer";
    }
    return "/customer-home";
  };

  const features = [
    {
      icon: ShieldCheck,
      title: "Counterfeit Detection",
      desc: "Instant verification using cryptographic signatures. Detect fake products with 99.9% accuracy.",
    },
    {
      icon: Globe2,
      title: "Global Visibility",
      desc: "Instant insight into global product authenticity to protect your brand reputation.",
    },
    {
      icon: Lock,
      title: "Immutable Security",
      desc: "Built on a private blockchain network ensuring data integrity that cannot be tampered with.",
    },
    {
      icon: Smartphone,
      title: "Consumer Mobile App",
      desc: "Empower patients to verify their own medication scanning a simple QR code.",
    },
    {
      icon: Zap,
      title: "Instant Verification",
      desc: "Zero-latency checks at point of sale or administration to ensure patient safety.",
    },
    {
      icon: Box,
      title: "Batch Management",
      desc: "Granular control over specific manufacturing batches with instant recall capabilities.",
    },
  ];

  return (
    <div className="min-h-screen font-sans selection:bg-primary/20">
      <Header variant="floating" />

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen flex flex-col justify-center pt-20 pb-32 overflow-hidden">
        {/* Global grid pattern is now in layout */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/10 blur-[120px] rounded-full z-0 pointer-events-none" />

        <motion.div
          className="container relative z-10 px-4 md:px-6 mx-auto flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground max-w-4xl text-balance mb-8">
            <TextAnimate animation="blurInUp" by="word" as="span" once>
              Secure the future of
            </TextAnimate>
            <br />
            <TextAnimate
              animation="blurInUp"
              by="word"
              as="span"
              className="text-primary inline-block"
              delay={0.3}
              once
            >
              Pharmaceutical Supply
            </TextAnimate>
          </h1>

          <TextAnimate
            className="text-xl text-muted-foreground max-w-2xl text-balance mb-12 leading-relaxed"
            animation="blurInUp"
            by="word"
            delay={0.6}
            once={true}
          >
            ChainTrust provides immutable blockchain tracking from manufacture
            to patient. Stop counterfeits, ensure compliance, and build trust in
            every dose.
          </TextAnimate>

          <div className="flex flex-col sm:flex-row gap-4 mb-20">
            {isLoading ? (
              <div className="h-14 w-48 bg-muted animate-pulse rounded-full" />
            ) : isAuthenticated ? (
              <Button
                size="lg"
                className="group h-14 px-8 rounded-full text-lg shadow-xl shadow-primary/20 relative overflow-hidden"
                asChild
              >
                <Link href={getDashboardLink()}>
                  <span className="relative z-10 flex items-center">
                    <LayoutDashboard className="mr-2 h-5 w-5" />
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                </Link>
              </Button>
            ) : (
              <Button
                size="lg"
                className="group h-14 px-8 rounded-full text-lg shadow-xl shadow-primary/20 relative overflow-hidden"
                asChild
              >
                <Link href="/register">
                  <span className="relative z-10 flex items-center">
                    Get Started for Free
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                </Link>
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 rounded-full text-lg bg-background/50 backdrop-blur border-border hover:bg-muted/50 transition-colors"
              asChild
            >
              <Link href="#features">View Features</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32 relative text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent z-[-1]" />

        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <TextAnimate
              as="h2"
              className="text-3xl md:text-5xl font-bold tracking-tight mb-6"
              animation="blurInUp"
              by="word"
              once
            >
              Designed for Supply Chain Velocity
            </TextAnimate>
            <p className="text-xl text-muted-foreground text-balance">
              Everything you need to verify, track, and secure your products in
              one powerful platform.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
                whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.1,
                  ease: "easeOut",
                }}
                className="group relative rounded-3xl p-[1px] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2"
              >
                {/* Gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-primary/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Inner Card content */}
                <div className="relative h-full bg-background/80 dark:bg-card/80 backdrop-blur-xl p-8 rounded-[23px] border border-white/5 flex flex-col items-start overflow-hidden">
                  
                  {/* Subtle background glow on hover */}
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-500 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 pointer-events-none" />

                  <div className="relative z-10 w-full flex items-start text-left gap-5">
                    <div className="relative h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 group-hover:-rotate-6 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 transition-opacity duration-500 group-hover:opacity-0" />
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <feature.icon className="relative z-10 h-7 w-7 text-primary group-hover:text-primary-foreground transition-colors duration-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 tracking-tight group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-sm">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent -z-10" />
        <motion.div
          className="container mx-auto px-4 text-center relative z-10"
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8 max-w-3xl mx-auto">
            {isAuthenticated
              ? "Your Dashboard Awaits"
              : "Start Securing Your Supply Chain Today"}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
            {isAuthenticated
              ? "Access your verification tools and manage your pharmaceutical products."
              : "Join the network of trusted manufacturers building the future of pharma safety."}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {isLoading ? (
              <div className="h-14 w-48 bg-muted animate-pulse rounded-full" />
            ) : isAuthenticated ? (
              <Button
                size="lg"
                className="h-14 px-8 rounded-full text-lg shadow-lg"
                asChild
              >
                <Link href={getDashboardLink()}>
                  <LayoutDashboard className="mr-2 h-5 w-5" />
                  Open Dashboard
                </Link>
              </Button>
            ) : (
              <Button
                size="lg"
                className="h-14 px-8 rounded-full text-lg shadow-lg"
                asChild
              >
                <Link href="/register">Create Free Account</Link>
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 rounded-full text-lg"
              asChild
            >
              <Link href={isAuthenticated ? "#features" : "/contact"}>
                {isAuthenticated ? "Explore Features" : "Contact Sales"}
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-background relative z-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground gap-4">
          <p>
            &copy; {new Date().getFullYear()} ChainTrust. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
