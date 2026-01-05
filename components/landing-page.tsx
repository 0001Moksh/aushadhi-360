"use client"
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import {
    BarChart3,
    Brain,
    ShoppingCart,
    AlertCircle,
    Zap,
    Shield,
    TrendingUp,
    Clock,
    CheckCircle2,
    Users,
    Package,
    FileText,
    Upload,
    LayoutDashboard,
    Settings,
    ChevronDown,
    Linkedin,
    Twitter,
    Facebook,
    Instagram
} from "lucide-react"

export function LandingPage() {
    const [expandedFeature, setExpandedFeature] = useState<number | null>(0)
    const features = [
        {
            icon: <BarChart3 className="w-6 h-6" />,
            title: "Advanced Analytics",
            description:
                "Track sales, profit, medicine movement, and business performance with real-time analytics.",
        },
        {
            icon: <ShoppingCart className="w-6 h-6" />,
            title: "Smart Billing System",
            description:
                "Fast GST-compliant billing with invoice generation, discounts, and multiple payment options.",
        },
        {
            icon: <Upload className="w-6 h-6" />,
            title: "Bulk Data Import",
            description:
                "Import medicines, batches, pricing, and stock data instantly from Excel or CSV files.",
        },
        {
            icon: <AlertCircle className="w-6 h-6" />,
            title: "Expiry & Stock Alerts",
            description:
                "Automatic alerts for near-expiry medicines and low stock to reduce losses and shortages.",
        },
        {
            icon: <LayoutDashboard className="w-6 h-6" />,
            title: "Centralized Dashboard",
            description:
                "Get a complete overview of sales, inventory, alerts, and daily activity in one place.",
        },
        {
            icon: <Settings className="w-6 h-6" />,
            title: "Flexible System Settings",
            description:
                "Customize GST rates, billing formats, roles, permissions, and store preferences easily.",
        },
        {
            icon: <FileText className="w-6 h-6" />,
            title: "Manual Import Control",
            description:
                "Add or correct medicine data manually with full control over batches and expiry dates.",
        },
        {
            icon: <Package className="w-6 h-6" />,
            title: "All Products & Inventory",
            description:
                "Manage all medicines, batches, quantities, and suppliers with accurate stock tracking.",
        },
    ]


    const benefits = [
        {
            icon: <TrendingUp className="w-8 h-8 text-success" />,
            title: "Increase Revenue",
            description: "Boost sales with smart recommendations and better inventory management",
        },
        {
            icon: <Clock className="w-8 h-8 text-primary" />,
            title: "Save Time",
            description: "Automate routine tasks and focus on growing your pharmacy business",
        },
        {
            icon: <Users className="w-8 h-8 text-secondary" />,
            title: "Better Customer Service",
            description: "Quick billing and accurate medicine information improves customer experience",
        },
        {
            icon: <CheckCircle2 className="w-8 h-8 text-warning" />,
            title: "Reduce Errors",
            description: "Minimize mistakes with automated calculations and verification",
        },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-card dark:from-background dark:to-card">
            {/* Navigation */}
            <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
                <nav
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
                    aria-label="Primary Navigation"
                >
                    <div className="flex h-24 items-center justify-between">

                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2">
                            <img
                                src="/logo2.png"
                                alt="Aushadhi 360 – Medical Store Management Software"
                                className="h-12 sm:h-18 w-auto object-contain"
                                loading="eager"
                            />
                        </Link>

                        {/* Right Section */}
                        <div className="flex items-center gap-4">

                            {/* Theme Toggle */}
                            <div className="sm:flex items-center gap-2 px-1 py-1">
                                <ThemeToggle />
                            </div>

                            {/* CTA Buttons */}
                            <div className="flex gap-3">
                                <Link href="/register">
                                    <Button
                                        variant="outline"
                                        className="hidden sm:inline-flex"
                                    >
                                        Request Access
                                    </Button>
                                </Link>

                                <Link href="/login">
                                    <Button className="font-medium">
                                        Login
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </nav>
            </header>


            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h1 className="text-5xl lg:text-6xl font-bold text-foreground dark:text-foreground leading-tight">
                                Smart Medical Store Management Software
                            </h1>
                            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                                Try Aushadhi 360 instantly with the public demo credentials on the login page. AI features work with
                                limited tokens in demo mode. For your own store, request access—once we verify your medical store
                                details, we email your secure login.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/login">
                                <Button size="lg" className="w-full sm:w-auto">
                                    Use Demo Login
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                                    Request Verified Access
                                </Button>
                            </Link>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-8 h-8 text-success" />
                                <span>Demo login available</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-8 h-8 text-warning" />
                                <span>AI usage limited in demo</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-8 h-8 text-success" />
                                <span>Accounts approved after verification</span>
                            </div>
                        </div>

                    </div>

                    <div className="relative hidden md:block">
                        <div className="dark:block hidden absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl blur-2xl opacity-20"></div>
                        <div className="relative mx-auto max-w-3xl">

                            <div className="relative rounded-[2rem] bg-gradient-to-t from-accent/90 to-primary/80 p-1 shadow-[0_30px_80px_rgba(0,0,0,0.06)]">

                                {/* Screen */}
                                <div className="relative overflow-hidden rounded-[1.5rem] bg-card">

                                    {/* Glow */}
                                    <div className="pointer-events-none absolute inset-0 rounded-[1.2rem] ring-1 ring-white/10 shadow-[outset_0_0_40px_rgba(255,255,255,0.5)]" />

                                    {/* Dark Mode */}
                                    <img
                                        src="/dashboard2.png"
                                        alt="Aushadhi 360 Dashboard"
                                        className="block h-64 w-full object-cover dark:block hidden"
                                    />

                                    {/* Light Mode */}
                                    <img
                                        src="/dashboard2-light.png"
                                        alt="Aushadhi 360 Dashboard"
                                        className="block h-64 w-full object-cover dark:hidden"
                                    />
                                    <div className="dark:block hidden absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
                                </div>
                            </div>
                            <div className="mx-auto h-8 w-32 border-r-2 border-l-10 border-accent bg-gradient-to-b from-white/100 to-white/8" />
                            <div className="mx-auto h-8 w-62 border-b-5 border-accent rounded-b-xl bg-gradient-to-t from-white/100 to-white/8 shadow-lg" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Animated Features Marquee */}
            <section className="py-1 overflow-hidden">
                <div className="relative">
                    {/* Gradient Overlays for fade effect */}
                    <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent dark:from-background z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent dark:from-background z-10 pointer-events-none" />

                    {/* Scrolling Container */}
                    <div className="flex gap-2 animate-infinite-scroll hover:[animation-play-state:paused]">
                        {/* First Set */}
                        {features.map((feature, index) => (
                            <div
                                key={`first-${index}`}
                                className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-card/50 dark:bg-background/50 border-r-6 border-t-2 border-primary/50 dark:border-primary/20 hover:border-primary/30 dark:hover:border-primary/40 transition-all duration-300 hover:scale-105 min-w-fit whitespace-nowrap group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 dark:from-primary/30 dark:to-secondary/20 flex items-center justify-center text-primary dark:text-secondary group-hover:scale-110 transition-transform duration-300">
                                    {feature.icon}
                                </div>
                                <span className="font-semibold text-sm md:text-base text-foreground dark:text-foreground group-hover:text-primary dark:group-hover:text-secondary transition-colors duration-300">
                                    {feature.title}
                                </span>
                            </div>
                        ))}

                        {/* Second Set (Duplicate for seamless loop) */}
                        {features.map((feature, index) => (
                            <div
                                key={`second-${index}`}
                                className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-card/50 dark:bg-background/50 border border-primary/10 dark:border-primary/20 hover:border-primary/30 dark:hover:border-primary/40 transition-all duration-300 hover:scale-105 min-w-fit whitespace-nowrap group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 dark:from-primary/30 dark:to-secondary/20 flex items-center justify-center text-primary dark:text-secondary group-hover:scale-110 transition-transform duration-300">
                                    {feature.icon}
                                </div>
                                <span className="font-semibold text-sm md:text-base text-foreground dark:text-foreground group-hover:text-primary dark:group-hover:text-secondary transition-colors duration-300">
                                    {feature.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <style jsx>{`
                    @keyframes infinite-scroll {
                        from {
                            transform: translateX(0);
                        }
                        to {
                            transform: translateX(-50%);
                        }
                    }
                    
                    .animate-infinite-scroll {
                        animation: infinite-scroll 8s linear infinite;
                    }
                `}</style>
            </section>

            {/* Features Grid - Premium Accordion Design */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative">
                {/* Background Elements */}
                <div className="absolute -top-40 right-0 w-96 h-96 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-3xl opacity-30 pointer-events-none" />
                <div className="absolute -bottom-40 left-0 w-96 h-96 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-full blur-3xl opacity-30 pointer-events-none" />

                <div className="relative z-10">
                    {/* Section Header */}
                    <div className="text-center mb-20">
                        <h2 className="text-3xl lg:text-6xl font-bold text-foreground dark:text-foreground mb-6 leading-tight">
                            Powerful Features for Modern Pharmacies
                        </h2>
                        <p className="text-lg text-muted-foreground dark:text-muted-foreground max-w-3xl mx-auto">
                            Experience enterprise-grade tools designed specifically for pharmacy operations. Click to explore each feature in detail.
                        </p>
                    </div>

                    {/* Features Accordion */}
                    <div className="grid grid-cols-1 lg:grid-cols-8 gap-8 items-stretch">
                        {/* Left Side - Accordion */}
                        <div className="lg:col-span-2 space-y-1">
                            {features.map((feature, index) => {
                                const isExpanded = expandedFeature === index;
                                return (
                                    <button
                                        key={index}
                                        onClick={() => setExpandedFeature(isExpanded ? null : index)}
                                        className={`w-full text-left transition-all duration-500 overflow-hidden rounded-2xl border-2 ${isExpanded
                                            ? "border-primary/50 dark:border-secondary/50 bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20"
                                            : "border-primary/10 dark:border-primary/20 hover:border-primary/30 dark:hover:border-primary/40 bg-card/50 dark:bg-background/50 hover:bg-card/70 dark:hover:bg-background/70"
                                            }`}
                                    >
                                        <div className="p-6 flex items-start justify-between">
                                            <div className="flex-1 flex items-start gap-4">
                                                {/* Icon */}
                                                <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 ${isExpanded
                                                    ? "bg-gradient-to-br from-primary/40 to-secondary/30 text-primary dark:text-secondary scale-110"
                                                    : "bg-primary/10 dark:bg-primary/20 text-primary/70 dark:text-secondary/70 group-hover:scale-105"
                                                    }`}>
                                                    {feature.icon}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className={`font-bold transition-colors duration-300 ${isExpanded
                                                        ? "text-primary dark:text-secondary text-lg"
                                                        : "text-foreground text-base group-hover:text-primary dark:group-hover:text-secondary"
                                                        }`}>
                                                        {feature.title}
                                                    </h3>
                                                    {!isExpanded && (
                                                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                                            {feature.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Chevron */}
                                            <div className={`flex-shrink-0 ml-4 transition-all duration-500 ${isExpanded ? "rotate-180" : ""}`}>
                                                <ChevronDown className="w-5 h-5 text-primary dark:text-secondary" />
                                            </div>
                                        </div>

                                        {/* Expanded Content */}
                                        {isExpanded && (
                                            <div className="px-6 pb-6 border-t border-primary/20 dark:border-primary/30 pt-4 animate-in fade-in duration-300">
                                                <p className="text-sm text-foreground/80 dark:text-foreground/70 leading-relaxed">
                                                    {feature.description}
                                                </p>

                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Right Side - Feature Image */}
                        <div className="lg:col-span-6 relative z-10 sticky top-30 h-fit">
                            {expandedFeature !== null && (() => {
                                const featureImagesDark: Record<number, string> = {
                                    0: "/analytics.png",
                                    1: "/billing1.png",
                                    2: "/import.png",
                                    3: "/alert.png",
                                    4: "/dashboard2.png",
                                    5: "/setting.png",
                                    6: "/manual-import.png",
                                    7: "/all-products.png",
                                }
                                const featureImagesLight: Record<number, string> = {
                                    0: "/analytics-light.png",
                                    1: "/billing-light.png",
                                    2: "/import-light.png",
                                    3: "/alert-light.png",
                                    4: "/dashboard2-light.png",
                                    5: "/setting-light.png",
                                    6: "/manual-import-light.png",
                                    7: "/all-products-light.png",
                                }
                                const featureImagesMobileDark: Record<number, string> = {
                                    0: "/analytics-mb.jpg",
                                    1: "/billing1-mb.jpg",
                                    2: "/import-mb.jpg",
                                    3: "/alert-mb.jpg",
                                    4: "/dashbord1-mb.jpg",
                                    5: "/setting-mb.jpg",
                                    6: "/manual-import-mb.jpg",
                                    7: "/all-products-mb.jpg",
                                }
                                const featureImagesMobileLight: Record<number, string> = {
                                    0: "/analytics-light-mb.jpg",
                                    1: "/billing-light-mb.jpg",
                                    2: "/import-light-mb.jpg",
                                    3: "/alert-light-mb.jpg",
                                    4: "/dashboard2-light-mb.jpg",
                                    5: "/setting-light-mb.jpg",
                                    6: "/manual-import-light-mb.jpg",
                                    7: "/all-products-light-mb.jpg",
                                }
                                const imgSrcDark = featureImagesDark[expandedFeature] ?? featureImagesDark[0]
                                const imgSrcLight = featureImagesLight[expandedFeature] ?? featureImagesDark[expandedFeature] ?? featureImagesDark[0]
                                const imgSrcMobileDark = featureImagesMobileDark[expandedFeature] ?? featureImagesDark[expandedFeature] ?? featureImagesDark[0]
                                const imgSrcMobileLight = featureImagesMobileLight[expandedFeature] ?? featureImagesLight[expandedFeature] ?? featureImagesDark[expandedFeature] ?? featureImagesDark[0]

                                return (
                                    <div className="relative rounded-xl overflow-hidden border border-primary/20 dark:border-primary/30 shadow-2xl animate-in fade-in duration-500">
                                        {/* Desktop Dark image - shows on lg+ in dark mode */}
                                        <img
                                            src={imgSrcDark}
                                            alt={features[expandedFeature]?.title}
                                            className="w-full h-full object-cover hidden dark:hidden lg:dark:block aspect-video"
                                        />

                                        {/* Desktop Light image - shows on lg+ in light mode */}
                                        <img
                                            src={imgSrcLight}
                                            alt={features[expandedFeature]?.title}
                                            className="w-full h-full object-cover hidden dark:hidden lg:block aspect-video"
                                        />

                                        {/* Mobile Dark image - shows below lg in dark mode */}
                                        {/* <img
                                            src={imgSrcMobileDark}
                                            alt={features[expandedFeature]?.title}
                                            className="w-full h-full object-cover block dark:block lg:hidden aspect-video"
                                        /> */}

                                        {/* Mobile Light image - shows below lg in light mode */}
                                        {/* <img
                                            src={imgSrcMobileLight}
                                            alt={features[expandedFeature]?.title}
                                            className="w-full h-full object-cover block dark:hidden lg:hidden aspect-video"
                                        /> */}

                                        {/* Overlay gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-background/0 to-transparent" />
                                    </div>
                                );
                            })()}

                            {expandedFeature === null && (
                                <div className="relative rounded-3xl overflow-hidden border-2 border-dashed border-primary/20 dark:border-primary/30 shadow-lg bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 flex items-center justify-center aspect-video">
                                    <div className="text-center">
                                        <div className="w-16 h-16 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-primary/60 dark:text-secondary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2 1m2-1l-2-1m2 1v2.5" />
                                            </svg>
                                        </div>
                                        <p className="text-muted-foreground font-medium">Select a feature to explore</p>
                                        <p className="text-xs text-muted-foreground/70 mt-2">Click any feature on the left to view details</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="bg-card dark:bg-card py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-foreground dark:text-foreground mb-4">Why Choose Aushadhi 360?</h2>
                        <p className="text-lg text-muted-foreground dark:text-muted-foreground max-w-2xl mx-auto">
                            Transform your pharmacy operations with our intelligent platform
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {benefits.map((benefit, index) => (
                            <div key={index} className="flex gap-6">
                                <div className="flex-shrink-0">{benefit.icon}</div>
                                <div>
                                    <h3 className="text-xl font-semibold text-foreground dark:text-foreground mb-2">{benefit.title}</h3>
                                    <p className="text-muted-foreground dark:text-muted-foreground">{benefit.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Key Metrics */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
                    <div>
                        <img
                            src="/logo2.png"
                            alt="Analytics Dashboard"
                            className="w-full hidden dark:block"
                        />
                        <img
                            src="/logo2.png"
                            alt="Analytics Dashboard"
                            className="w-full block dark:hidden"
                        />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-10">
                        <div>
                            <div className="text-4xl font-bold text-primary dark:text-foreground mb-2">500+</div>
                            <p className="text-muted-foreground dark:text-muted-foreground">Pharmacies Active</p>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-primary dark:text-foreground mb-2">10M+</div>
                            <p className="text-muted-foreground dark:text-muted-foreground">Transactions Processed</p>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-primary dark:text-foreground mb-2">99.9%</div>
                            <p className="text-muted-foreground dark:text-muted-foreground">Uptime Guarantee</p>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-primary dark:text-foreground mb-2">24/7</div>
                            <p className="text-muted-foreground dark:text-muted-foreground">Support Available</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gradient-to-r from-primary to-secondary py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl font-bold text-foreground mb-4">See Aushadhi 360 in Action</h2>
                    <p className="text-xl text-foreground/90 mb-8">
                        Use the public demo login to explore features (AI requests are token-limited). Want your own store space?
                        Send a request and we will verify your details, then email secure credentials.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/login">
                            <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 w-full sm:w-auto">
                                Login with Demo Account
                            </Button>
                        </Link>
                        <Link href="/register">
                            <Button size="lg" variant="outline" className="border-primary-foreground text-foreground hover:bg-primary-foreground/10 w-full sm:w-auto">
                                Request Verified Access
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>



            <footer className="relative overflow-hidden bg-gradient-to-t from-background to-background-light text-foreground py-12 lg:pt-20">
                {/* Noise texture */}
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row gap-12 mb-16">
                        {/* Logo + description */}
                        <div className="lg:w-1/3">
                            <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                                <Image
                                    src="/logo2.png"
                                    alt="Aushadhi 360 Logo"
                                    width={300}
                                    height={300}
                                />
                            </div>
                            <p className="text-foreground text-base text-center lg:text-left leading-relaxed max-w-sm mx-auto lg:mx-0">
                                Smart medical store management software for modern pharmacies
                            </p>
                        </div>

                        <div className="lg:w-2/3 grid grid-cols-2 sm:grid-cols-3 gap-8 lg:gap-12 pt-10 lg:pl-12">
                            {/* Product */}
                            <div className="text-center sm:text-left">
                                <h4 className="font-semibold mb-4">Product</h4>
                                <ul className="space-y-2 text-muted-foreground text-sm">
                                    {["Features", "Pricing", "Security"].map(item => (
                                        <li key={item}>
                                            <Link href="#" className="hover:text-foreground transition-colors">
                                                {item}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Company */}
                            <div className="text-center sm:text-left">
                                <h4 className="font-semibold mb-4">Company</h4>
                                <ul className="space-y-2 text-muted-foreground text-sm">
                                    {["About", "Blog", "Contact"].map(item => (
                                        <li key={item}>
                                            <Link href="#" className="hover:text-foreground transition-colors">
                                                {item}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Legal */}
                            <div className="col-span-2 sm:col-span-1 text-center sm:text-left">
                                <h4 className="font-semibold mb-4">Legal</h4>
                                <ul className="space-y-2 text-muted-foreground text-sm">
                                    {["Privacy", "Terms"].map(item => (
                                        <li key={item}>
                                            <Link href="#" className="hover:text-foreground transition-colors">
                                                {item}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Bottom section */}
                    <div className="border-t-2 rounded-full px-10 border-border pt-8 pb-8">
                        {/* NexYug Tech */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-muted-foreground">
                            <div className="flex justify-center md:justify-start w-full md:w-auto">
                                <a
                                    href="https://nexyugtech.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 hover:opacity-80 transition group"
                                >
                                    <Image
                                        src="/nyt_logo.png"
                                        alt="NexYug Tech Logo"
                                        width={120}
                                        height={120}
                                        className="object-contain"
                                    />
                                    <div className="flex flex-col">
                                        <span className="pt-10 text-lg font-bold text-foreground group-hover:text-primary transition-colors">NEXYUG TECH</span>
                                        <span className="text-[10px]">&lt;Let's code the task/&gt;</span>
                                    </div>
                                </a>
                            </div>

                            {/* Copyright and social */}
                            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                                <p className="text-center">&copy; 2026 Aushadhi 360. All rights reserved.</p>
                                <div className="flex gap-4">
                                    <a href="#" className="hover:text-foreground transition" aria-label="Facebook">
                                        <Facebook className="h-5 w-5" />
                                    </a>
                                    <a href="#" className="hover:text-foreground transition" aria-label="Twitter">
                                        <Twitter className="h-5 w-5" />
                                    </a>
                                    <a href="#" className="hover:text-foreground transition" aria-label="Instagram">
                                        <Instagram className="h-5 w-5" />
                                    </a>
                                    <a href="#" className="hover:text-foreground transition" aria-label="LinkedIn">
                                        <Linkedin className="h-5 w-5" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>


        </div>
    )
}
