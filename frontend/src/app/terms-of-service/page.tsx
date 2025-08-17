'use client';

import React from 'react';
import Link from 'next/link';
import { Scale, Shield, AlertTriangle } from 'lucide-react';
import { TarotAgentLogo } from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';

export default function TermsOfServicePage() {
    const { isAuthenticated } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
            {/* Header */}
            <header className="border-b border-purple-700/50 bg-gray-950/95 backdrop-blur-md">
                <div className="container mx-auto px-4 md:px-6 lg:px-8 h-16 md:h-18 lg:h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 flex items-center justify-center">
                            <TarotAgentLogo size={28} className="text-white" />
                        </div>
                        <div className="hidden md:block">
                            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
                                ArcanaAI
                            </h1>
                            <p className="text-xs md:text-sm text-gray-400 -mt-1">
                                Mystical Guidance
                            </p>
                        </div>
                    </Link>

                    <div className="flex items-center space-x-3 md:space-x-4">
                        {isAuthenticated ? (
                            // Authenticated user buttons
                            <>
                                <Link
                                    href="/profile"
                                    className="px-4 py-2 text-purple-300 hover:text-white transition-colors font-medium"
                                >
                                    Profile
                                </Link>
                                <Link
                                    href="/"
                                    className="px-6 md:px-8 py-3 md:py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold text-sm md:text-base rounded-xl hover:shadow-lg hover:shadow-purple-500/25 hover:from-purple-700 hover:to-purple-800 transition-all duration-200 min-w-[100px] md:min-w-[120px] flex items-center justify-center text-center"
                                >
                                    <span className="text-white">Dashboard</span>
                                </Link>
                            </>
                        ) : (
                            // Unauthenticated user buttons
                            <>
                                <Link
                                    href="/login"
                                    className="px-4 py-2 text-purple-300 hover:text-white transition-colors font-medium"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    className="px-6 md:px-8 py-3 md:py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold text-sm md:text-base rounded-xl hover:shadow-lg hover:shadow-purple-500/25 hover:from-purple-700 hover:to-purple-800 transition-all duration-200 min-w-[100px] md:min-w-[120px] flex items-center justify-center text-center"
                                >
                                    <span className="text-white">Sign Up</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <div className="py-12 md:py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="mb-8">
                        <div className="flex items-center justify-center mb-6">
                            <Scale className="w-12 h-12 md:w-16 md:h-16 text-purple-400 mr-4" />
                            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                                <span className="bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent block">
                                    Terms of Service
                                </span>
                            </h1>
                        </div>
                        <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
                            Understanding your rights and responsibilities when using Tarot Agent
                        </p>
                    </div>
                </div>
            </div>

            {/* Terms Content */}
            <div className="py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gray-800/50 border border-purple-700/50 rounded-2xl p-8 md:p-12 backdrop-blur-sm">

                        {/* Last Updated */}
                        <div className="text-center mb-12">
                            <p className="text-gray-400">
                                <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>

                        <div className="prose prose-invert max-w-none">

                            {/* Introduction */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6 flex items-center">
                                    <Shield className="w-8 h-8 mr-3" />
                                    1. Acceptance of Terms
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        Welcome to ArcanaAI. By accessing or using our AI-powered tarot reading service, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use our service.
                                    </p>
                                    <p>
                                        These Terms constitute a legally binding agreement between you and ArcanaAI. We may update these Terms from time to time, and your continued use of the service constitutes acceptance of any changes.
                                    </p>
                                </div>
                            </section>

                            {/* Service Description */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    2. Service Description
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        ArcanaAI provides AI-powered tarot card readings for entertainment and personal reflection purposes. Our service includes:
                                    </p>
                                    <ul className="list-disc ml-6 space-y-2">
                                        <li>AI-generated tarot card interpretations</li>
                                        <li>Various tarot spreads and layouts</li>
                                        <li>Reading history and personal journal features</li>
                                        <li>Subscription-based premium features</li>
                                    </ul>
                                    <p>
                                        <strong>Important Disclaimer:</strong> Our service is for entertainment and self-reflection purposes only. Tarot readings should not be considered as professional advice for medical, legal, financial, or other important life decisions.
                                    </p>
                                </div>
                            </section>

                            {/* User Responsibilities */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    3. User Responsibilities
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>As a user of ArcanaAI, you agree to:</p>
                                    <ul className="list-disc ml-6 space-y-2">
                                        <li>Provide accurate and truthful information when creating your account</li>
                                        <li>Maintain the confidentiality of your account credentials</li>
                                        <li>Use the service only for lawful purposes</li>
                                        <li>Respect intellectual property rights</li>
                                        <li>Not attempt to reverse engineer or compromise our systems</li>
                                        <li>Not share your account with others</li>
                                    </ul>
                                </div>
                            </section>

                            {/* Subscription and Billing */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    4. Subscription and Billing
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        ArcanaAI offers both free readings and premium turn packages:
                                    </p>
                                    <ul className="list-disc ml-6 space-y-2">
                                        <li><strong>Free Tier:</strong> 5 monthly readings with basic features</li>
                                        <li><strong>Premium Turn Packages:</strong> Purchase additional reading turns with advanced features</li>
                                    </ul>
                                    <p>
                                        Turn packages are one-time purchases that provide you with a specific number of reading turns. Purchased turns never expire and can be used at any time.
                                    </p>
                                    <p>
                                        Free monthly turns reset on the first day of each month. Any purchased turns carry over and do not expire.
                                    </p>
                                </div>
                            </section>

                            {/* Refund Policy - Highlighted Section */}
                            <section className="mb-12">
                                <div className="bg-red-900/20 border-2 border-red-500/50 rounded-xl p-8">
                                    <h2 className="text-2xl md:text-3xl font-bold text-red-400 mb-6 flex items-center">
                                        <AlertTriangle className="w-8 h-8 mr-3" />
                                        5. Refund Policy
                                    </h2>
                                    <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                        <p className="text-red-300 font-semibold text-xl">
                                            <strong>NO REFUNDS POLICY</strong>
                                        </p>
                                        <p>
                                            <strong>All payments made to ArcanaAI are final and non-refundable.</strong> This includes:
                                        </p>
                                        <ul className="list-disc ml-6 space-y-2">
                                            <li>Monthly subscription fees</li>
                                            <li>Annual subscription fees</li>
                                            <li>One-time purchases for reading turns</li>
                                            <li>Premium feature upgrades</li>
                                        </ul>
                                        <p>
                                            We do not provide refunds, credits, or prorated billing for:
                                        </p>
                                        <ul className="list-disc ml-6 space-y-2">
                                            <li>Partial months of service</li>
                                            <li>Unused reading turns or features</li>
                                            <li>Dissatisfaction with readings or service</li>
                                            <li>Account cancellations</li>
                                            <li>Service interruptions</li>
                                        </ul>
                                        <p className="text-red-300 font-semibold">
                                            By subscribing to our service or making any payment, you acknowledge and agree to this no-refund policy.
                                        </p>
                                        <p>
                                            We encourage all users to try our free tier before purchasing a subscription to ensure the service meets your expectations.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Intellectual Property */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    6. Intellectual Property
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        All content on ArcanaAI, including but not limited to text, graphics, images, tarot card interpretations, and software, is the property of ArcanaAI and is protected by intellectual property laws.
                                    </p>
                                    <p>
                                        You may not reproduce, distribute, or create derivative works from our content without explicit written permission.
                                    </p>
                                </div>
                            </section>

                            {/* Privacy and Data */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    7. Privacy and Data Protection
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        Your privacy is important to us. Please review our <Link href="/privacy-policy" className="text-purple-400 hover:text-purple-300 underline">Privacy Policy</Link> to understand how we collect, use, and protect your personal information.
                                    </p>
                                    <p>
                                        We employ industry-standard security measures to protect your data, but no system is completely secure. You acknowledge the inherent security risks of internet transmissions.
                                    </p>
                                </div>
                            </section>

                            {/* Disclaimers */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    8. Disclaimers and Limitation of Liability
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        <strong>Entertainment Purpose Only:</strong> Tarot Agent is provided for entertainment and personal reflection purposes only. Our readings are not intended to provide professional advice.
                                    </p>
                                    <p>
                                        <strong>No Guarantees:</strong> We make no guarantees about the accuracy, completeness, or usefulness of any reading or interpretation.
                                    </p>
                                    <p>
                                        <strong>Limitation of Liability:</strong> To the maximum extent permitted by law, Tarot Agent shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of the service.
                                    </p>
                                </div>
                            </section>

                            {/* Termination */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    9. Termination
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        We reserve the right to terminate or suspend your account at any time for violation of these Terms or for any other reason we deem necessary.
                                    </p>
                                    <p>
                                        Upon termination, your right to use the service will cease immediately, and any data associated with your account may be deleted.
                                    </p>
                                </div>
                            </section>

                            {/* Governing Law */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    10. Governing Law
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        These Terms shall be governed by and construed in accordance with the laws of the jurisdiction where Tarot Agent operates, without regard to conflict of law principles.
                                    </p>
                                </div>
                            </section>

                            {/* Contact Information */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    11. Contact Information
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        If you have any questions about these Terms of Service, please contact us through our support system or website.
                                    </p>
                                </div>
                            </section>

                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-purple-700/50 py-8">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="text-gray-400 mb-4 md:mb-0">
                            © 2025 ArcanaAI. All rights reserved.
                        </div>
                        <div className="flex space-x-6">
                            <Link href="/privacy-policy" className="text-gray-400 hover:text-purple-400 transition-colors">
                                Privacy Policy
                            </Link>
                            <Link href="/pricing" className="text-gray-400 hover:text-purple-400 transition-colors">
                                Pricing
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
