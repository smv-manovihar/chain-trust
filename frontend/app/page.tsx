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
  QrCode,
} from "lucide-react";


export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const getDashboardLink = () => {
    if (!user) return "/login";
    return user.role === "manufacturer" ? "/manufacturer" : "/customer";
  };

  const memberFeatures = [
    {
      icon: ShieldCheck,
      title: "Zero-latency Authenticity Checks",
      desc: "Instantly verify your medication using cryptographic signatures. Avoid counterfeit products.",
    },
    {
      icon: Smartphone,
      title: "My Medicines Monitoring",
      desc: "Track your active prescriptions securely on your mobile device.",
    },
    {
      icon: Lock,
      title: "Immediate Recall Alerts",
      desc: "Get notified instantly if a product you scanned becomes subject to a manufacturer recall.",
    },
  ];

  const manufacturerFeatures = [
    {
      icon: Box,
      title: "Secure Batch Management",
      desc: "Granular control over specific manufacturing batches with on-demand recall capabilities.",
    },
    {
      icon: Globe2,
      title: "Global Supply Chain Visibility",
      desc: "Instant insight into global product distribution to protect your brand reputation.",
    },
    {
      icon: Zap,
      title: "Anti-Counterfeit Analytics",
      desc: "Real-time dashboard tracking anomalies, multiple scans, and potential supply chain breaches.",
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
          <h1 className="text-4xl md:text-7xl font-black tracking-tight text-foreground max-w-4xl mx-auto text-balance mb-6">
            <TextAnimate animation="blurInUp" by="word" as="span" once>
              Uncompromising Integrity
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
              Powered by ChainTrust
            </TextAnimate>
          </h1>

          <TextAnimate
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance mb-8 md:mb-12 leading-relaxed"
            animation="blurInUp"
            by="word"
            delay={0.6}
            once={true}
          >
            The immutable global standard for pharmaceutical authenticity and
            patient safety.
          </TextAnimate>

          <div className="flex flex-col items-center justify-center w-full mb-12 md:mb-20">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="group h-14 px-10 rounded-full text-lg shadow-2xl shadow-primary/30 relative overflow-hidden bg-primary hover:bg-primary/90 flex-shrink-0"
                asChild
              >
                <Link href="/verify">
                  <span className="relative z-10 flex items-center font-bold text-primary-foreground">
                    <QrCode className="mr-3 h-6 w-6" />
                    Verify Product Now
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                </Link>
              </Button>
              
              {isLoading ? (
                <div className="h-14 w-48 bg-muted animate-pulse rounded-full shrink-0" />
              ) : isAuthenticated ? (
                <Button
                  size="lg"
                  variant="outline"
                  className="group h-14 px-8 rounded-full text-lg border-primary/20 hover:bg-primary/5 transition-all flex-shrink-0"
                  asChild
                >
                  <Link href={getDashboardLink()}>
                    <span className="relative z-10 flex items-center font-bold">
                      <LayoutDashboard className="mr-2 h-5 w-5" />
                      Go to Dashboard
                    </span>
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  className="group h-14 px-8 rounded-full text-lg border-primary/20 hover:bg-primary/5 transition-all w-full sm:w-auto flex-shrink-0"
                  asChild
                >
                  <Link href="/login">
                    <span className="relative z-10 flex items-center font-bold">
                      Get started
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                </Button>
              )}
          </div>
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
              className="text-3xl md:text-5xl font-black tracking-tight mb-6"
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

          <div className="space-y-24">
            {/* Member Features */}
            <div>
              <div className="flex items-center justify-center gap-4 mb-10">
                <div className="h-[1px] w-12 bg-primary/20" />
                <h3 className="text-2xl font-black tracking-tight text-foreground/80">For Members</h3>
                <div className="h-[1px] w-12 bg-primary/20" />
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {memberFeatures.map((feature, i) => (
                  <motion.div
                    key={`custom-${i}`}
                    initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
                    whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
                    className="group relative rounded-3xl p-[1px] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-primary/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative h-full bg-background/80 dark:bg-card/80 backdrop-blur-xl p-8 rounded-[23px] border border-white/5 flex flex-col items-start overflow-hidden">
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-500 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 pointer-events-none" />
                      <div className="relative z-10 w-full flex flex-col items-start text-left gap-5">
                        <div className="relative h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 group-hover:-rotate-6 overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 transition-opacity duration-500 group-hover:opacity-0" />
                          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                          <feature.icon className="relative z-10 h-7 w-7 text-primary group-hover:text-primary-foreground transition-colors duration-500" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black mb-2 tracking-tight group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
                          <p className="text-muted-foreground leading-relaxed text-sm">{feature.desc}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Manufacturer Features */}
            <div>
              <div className="flex items-center justify-center gap-4 mb-10">
                <div className="h-[1px] w-12 bg-blue-500/20" />
                <h3 className="text-2xl font-black tracking-tight text-foreground/80">For Manufacturers</h3>
                <div className="h-[1px] w-12 bg-blue-500/20" />
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {manufacturerFeatures.map((feature, i) => (
                  <motion.div
                    key={`mfg-${i}`}
                    initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
                    whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
                    className="group relative rounded-3xl p-[1px] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-transparent to-blue-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative h-full bg-background/80 dark:bg-card/80 backdrop-blur-xl p-8 rounded-[23px] border border-white/5 flex flex-col items-start overflow-hidden">
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all duration-500 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 pointer-events-none" />
                      <div className="relative z-10 w-full flex flex-col items-start text-left gap-5">
                        <div className="relative h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 group-hover:-rotate-6 overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-500/5 transition-opacity duration-500 group-hover:opacity-0" />
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-500/80 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                          <feature.icon className="relative z-10 h-7 w-7 text-blue-500 group-hover:text-primary-foreground transition-colors duration-500" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black mb-2 tracking-tight group-hover:text-blue-500 transition-colors duration-300">{feature.title}</h3>
                          <p className="text-muted-foreground leading-relaxed text-sm">{feature.desc}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
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
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-8 max-w-3xl mx-auto">
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
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="h-14 px-8 rounded-full text-lg shadow-lg group"
                  asChild
                >
                  <Link href="/register">Create Customer Account</Link>
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full" />
                  <Button
                    size="lg"
                    variant="outline"
                    className="relative h-14 px-8 rounded-full text-lg shadow-lg border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all text-blue-600 dark:text-blue-400 group"
                    asChild
                  >
                    <Link href="/manufacturer/register">
                      Apply as Manufacturer
                    </Link>
                  </Button>
                </div>
              </div>
            )}
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
