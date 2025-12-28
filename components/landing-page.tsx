"use client"

import React from "react"
import Link from "next/link"
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
} from "lucide-react"

export function LandingPage() {
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
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1">
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
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl blur-2xl opacity-10"></div>
                        <div className="relative mx-auto max-w-3xl">

                            <div className="relative rounded-[2rem] bg-gradient-to-t from-accent/90 to-primary/80 p-1 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">

                                {/* Screen */}
                                <div className="relative overflow-hidden rounded-[1.2rem] bg-card">

                                    {/* Glow */}
                                    <div className="pointer-events-none absolute inset-0 rounded-[1.2rem] ring-1 ring-white/10 shadow-[inset_0_0_40px_rgba(255,255,255,0.05)]" />

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
                                </div>
                            </div>
                            <div className="mx-auto h-8 w-32 border-r-2 border-l-10 border-accent bg-gradient-to-b from-white/100 to-white/8" />
                            <div className="mx-auto h-8 w-62 border-b-5 border-accent rounded-b-xl bg-gradient-to-t from-white/100 to-white/8 shadow-lg" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-foreground dark:text-foreground mb-4">Powerful Features</h2>
                    <p className="text-lg text-muted-foreground dark:text-muted-foreground max-w-2xl mx-auto">
                        Everything you need to run your pharmacy efficiently and profitably
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {features.map((feature, index) => {
                        const featureImagesDark: Record<number, string> = {
                            0: "/analytics.png",
                            1: "/billing.png",
                            2: "/import.png",
                            3: "/alert.png",
                            4: "/dashboard.png",
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
                        const imgSrcDark = featureImagesDark[index] ?? featureImagesDark[0]
                        const imgSrcLight = featureImagesLight[index] ?? featureImagesDark[index] ?? featureImagesDark[0]
                        return (
                            <Card
                                key={index}
                                className="group hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col rounded-2xl"
                            >
                                <CardHeader className="flex-1 pb-2">
                                    <CardTitle className="text-lg text-center rounded-b-xl border-b-4 border- pb-2 font-semibold">
                                        {feature.title}
                                    </CardTitle>
                                </CardHeader>

                                {/* Image wrapper */}
                                <div className="relative w-full h-80 bg-primary/10 dark:bg-primary/20 overflow-hidden">

                                    {/* ICON overlay */}
                                    <div className="absolute bottom-2 right-2 z-10 w-9 h-9 rounded-lg bg-primary/20 backdrop-blur-md flex items-center justify-center text-primary dark:text-foreground shadow-md group-hover:scale-110 transition-transform duration-300">
                                        {feature.icon}
                                    </div>

                                    {/* Dark image */}
                                    <img
                                        src={imgSrcDark}
                                        alt={feature.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 hidden dark:block"
                                    />

                                    {/* Light image */}
                                    <img
                                        src={imgSrcLight}
                                        alt={feature.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 block dark:hidden"
                                    />

                                    {/* subtle overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
                                </div>

                                <CardContent className="pt-4">
                                    <CardDescription className="text-center text-sm leading-relaxed">
                                        {feature.description}
                                    </CardDescription>
                                </CardContent>
                            </Card>

                        )
                    })}
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

            {/* Footer */}
            <footer className="justify-center bg-foreground dark:bg-background text-foreground py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Aushadhi 360</h3>
                            <p className="text-muted-foreground ">Smart medical store management software for modern pharmacies</p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Product</h4>
                            <ul className="space-y-2 text-muted-foreground ">
                                <li><Link href="#" className="hover:text-foreground transition">Features</Link></li>
                                <li><Link href="#" className="hover:text-foreground transition">Pricing</Link></li>
                                <li><Link href="#" className="hover:text-foreground transition">Security</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Company</h4>
                            <ul className="space-y-2 text-muted-foreground ">
                                <li><Link href="#" className="hover:text-foreground transition">About</Link></li>
                                <li><Link href="#" className="hover:text-foreground transition">Blog</Link></li>
                                <li><Link href="#" className="hover:text-foreground transition">Contact</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-muted-foreground ">
                                <li><Link href="#" className="hover:text-foreground transition">Privacy</Link></li>
                                <li><Link href="#" className="hover:text-foreground transition">Terms</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-card/20 pt-8 flex justify-between items-center text-muted-foreground">
                        <p>&copy; 2025 Aushadhi 360. All rights reserved.</p>
                        <p>Built by <a href="https://nexyugtech.com/">NexYug Tech</a></p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
