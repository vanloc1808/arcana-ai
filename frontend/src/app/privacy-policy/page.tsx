'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Eye, Lock, Database, UserCheck } from 'lucide-react';
import { TarotAgentLogo } from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';

export default function PrivacyPolicyPage() {
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
                            <Shield className="w-12 h-12 md:w-16 md:h-16 text-purple-400 mr-4" />
                            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                                <span className="bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent block">
                                    Privacy Policy
                                </span>
                            </h1>
                        </div>
                        <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
                            How we protect and handle your personal information
                        </p>
                    </div>
                </div>
            </div>

            {/* Privacy Content */}
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
                                    <Eye className="w-8 h-8 mr-3" />
                                    1. Introduction
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        At ArcanaAI, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered tarot reading service.
                                    </p>
                                    <p>
                                        By using our service, you consent to the practices described in this Privacy Policy. If you do not agree with this policy, please do not use our service.
                                    </p>
                                </div>
                            </section>

                            {/* Information We Collect */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6 flex items-center">
                                    <Database className="w-8 h-8 mr-3" />
                                    2. Information We Collect
                                </h2>
                                <div className="text-gray-300 space-y-6 text-lg leading-relaxed">

                                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-6">
                                        <h3 className="text-xl font-bold text-purple-300 mb-4">Personal Information</h3>
                                        <p className="mb-3">We collect information you provide directly to us, including:</p>
                                        <ul className="list-disc ml-6 space-y-2">
                                            <li>Account registration information (email address, username, password)</li>
                                            <li>Profile information (display name, avatar)</li>
                                            <li>Payment information (processed securely by third-party payment providers)</li>
                                            <li>Communications with our support team</li>
                                        </ul>
                                    </div>

                                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
                                        <h3 className="text-xl font-bold text-blue-300 mb-4">Usage Information</h3>
                                        <p className="mb-3">We automatically collect information about your use of our service:</p>
                                        <ul className="list-disc ml-6 space-y-2">
                                            <li>Tarot reading history and questions asked</li>
                                            <li>Journal entries and personal notes</li>
                                            <li>Feature usage and preferences</li>
                                            <li>Login activity and session information</li>
                                            <li>Device information and browser type</li>
                                        </ul>
                                    </div>

                                    <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6">
                                        <h3 className="text-xl font-bold text-green-300 mb-4">Technical Information</h3>
                                        <p className="mb-3">We collect technical data to improve our service:</p>
                                        <ul className="list-disc ml-6 space-y-2">
                                            <li>IP address and geographic location</li>
                                            <li>Browser information and device characteristics</li>
                                            <li>Cookies and similar tracking technologies</li>
                                            <li>Error logs and performance metrics</li>
                                        </ul>
                                    </div>

                                </div>
                            </section>

                            {/* How We Use Information */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    3. How We Use Your Information
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>We use the collected information for the following purposes:</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-gray-700/30 rounded-xl p-6">
                                            <h4 className="text-lg font-bold text-white mb-3">Service Provision</h4>
                                            <ul className="list-disc ml-6 space-y-1 text-sm">
                                                <li>Provide AI-powered tarot readings</li>
                                                <li>Maintain your reading history</li>
                                                <li>Process subscription payments</li>
                                                <li>Deliver personalized experiences</li>
                                            </ul>
                                        </div>

                                        <div className="bg-gray-700/30 rounded-xl p-6">
                                            <h4 className="text-lg font-bold text-white mb-3">Communication</h4>
                                            <ul className="list-disc ml-6 space-y-1 text-sm">
                                                <li>Send service updates and notifications</li>
                                                <li>Respond to customer support inquiries</li>
                                                <li>Provide important account information</li>
                                                <li>Send marketing communications (with consent)</li>
                                            </ul>
                                        </div>

                                        <div className="bg-gray-700/30 rounded-xl p-6">
                                            <h4 className="text-lg font-bold text-white mb-3">Improvement</h4>
                                            <ul className="list-disc ml-6 space-y-1 text-sm">
                                                <li>Analyze usage patterns and preferences</li>
                                                <li>Improve AI reading accuracy</li>
                                                <li>Develop new features</li>
                                                <li>Optimize user experience</li>
                                            </ul>
                                        </div>

                                        <div className="bg-gray-700/30 rounded-xl p-6">
                                            <h4 className="text-lg font-bold text-white mb-3">Security & Legal</h4>
                                            <ul className="list-disc ml-6 space-y-1 text-sm">
                                                <li>Prevent fraud and abuse</li>
                                                <li>Ensure platform security</li>
                                                <li>Comply with legal requirements</li>
                                                <li>Enforce our terms of service</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Information Sharing */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    4. Information Sharing and Disclosure
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        We do not sell, rent, or trade your personal information to third parties. We may share your information only in the following circumstances:
                                    </p>

                                    <div className="space-y-4">
                                        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-6">
                                            <h4 className="text-lg font-bold text-yellow-300 mb-2">Service Providers</h4>
                                            <p>We may share information with trusted third-party service providers who assist us in operating our service, such as payment processors, cloud hosting providers, and analytics services.</p>
                                        </div>

                                        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
                                            <h4 className="text-lg font-bold text-red-300 mb-2">Legal Requirements</h4>
                                            <p>We may disclose information if required by law, court order, or government regulation, or to protect our rights, property, or safety.</p>
                                        </div>

                                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
                                            <h4 className="text-lg font-bold text-blue-300 mb-2">Business Transfers</h4>
                                            <p>If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Data Security */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6 flex items-center">
                                    <Lock className="w-8 h-8 mr-3" />
                                    5. Data Security
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        We implement industry-standard security measures to protect your personal information:
                                    </p>
                                    <ul className="list-disc ml-6 space-y-2">
                                        <li><strong>Encryption:</strong> All data is encrypted in transit and at rest using advanced encryption standards</li>
                                        <li><strong>Access Controls:</strong> Strict access controls limit who can view your personal information</li>
                                        <li><strong>Secure Infrastructure:</strong> Our systems are hosted on secure, monitored cloud infrastructure</li>
                                        <li><strong>Regular Audits:</strong> We conduct regular security audits and vulnerability assessments</li>
                                        <li><strong>Password Protection:</strong> User passwords are hashed and salted using industry best practices</li>
                                    </ul>
                                    <p className="text-yellow-300 font-medium">
                                        <strong>Important:</strong> While we strive to protect your information, no internet transmission is completely secure. We cannot guarantee absolute security.
                                    </p>
                                </div>
                            </section>

                            {/* Your Rights */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6 flex items-center">
                                    <UserCheck className="w-8 h-8 mr-3" />
                                    6. Your Privacy Rights
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>You have the following rights regarding your personal information:</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
                                            <h4 className="text-base font-bold text-green-300 mb-2">Access & Portability</h4>
                                            <p className="text-sm">Request a copy of your personal data and download your reading history.</p>
                                        </div>

                                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                                            <h4 className="text-base font-bold text-blue-300 mb-2">Correction</h4>
                                            <p className="text-sm">Update or correct inaccurate personal information in your account.</p>
                                        </div>

                                        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                                            <h4 className="text-base font-bold text-red-300 mb-2">Deletion</h4>
                                            <p className="text-sm">Request deletion of your account and associated personal data.</p>
                                        </div>

                                        <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
                                            <h4 className="text-base font-bold text-purple-300 mb-2">Opt-out</h4>
                                            <p className="text-sm">Unsubscribe from marketing communications at any time.</p>
                                        </div>
                                    </div>

                                    <p>
                                        To exercise these rights, please contact us through your account settings or our support system.
                                    </p>
                                </div>
                            </section>

                            {/* Cookies */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    7. Cookies and Tracking Technologies
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        We use cookies and similar technologies to enhance your experience:
                                    </p>
                                    <ul className="list-disc ml-6 space-y-2">
                                        <li><strong>Essential Cookies:</strong> Required for basic website functionality and authentication</li>
                                        <li><strong>Performance Cookies:</strong> Help us understand how you use our service to improve it</li>
                                        <li><strong>Preference Cookies:</strong> Remember your settings and personalization choices</li>
                                        <li><strong>Analytics Cookies:</strong> Provide insights into user behavior and feature usage</li>
                                    </ul>
                                    <p>
                                        You can control cookies through your browser settings, but some features may not work properly if cookies are disabled.
                                    </p>
                                </div>
                            </section>

                            {/* Data Retention */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    8. Data Retention
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        We retain your personal information for as long as necessary to provide our services and comply with legal obligations:
                                    </p>
                                    <ul className="list-disc ml-6 space-y-2">
                                        <li><strong>Account Data:</strong> Retained while your account is active and for a reasonable period after deletion</li>
                                        <li><strong>Reading History:</strong> Stored to provide personalized experiences and insights</li>
                                        <li><strong>Payment Information:</strong> Retained as required by financial regulations</li>
                                        <li><strong>Support Communications:</strong> Kept for customer service and quality purposes</li>
                                    </ul>
                                    <p>
                                        When you delete your account, we will remove or anonymize your personal data, except where retention is required by law.
                                    </p>
                                </div>
                            </section>

                            {/* International Users */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    9. International Data Transfers
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data during international transfers, including:
                                    </p>
                                    <ul className="list-disc ml-6 space-y-2">
                                        <li>Using cloud providers with appropriate security certifications</li>
                                        <li>Implementing contractual data protection clauses</li>
                                        <li>Ensuring compliance with applicable privacy laws</li>
                                    </ul>
                                </div>
                            </section>

                            {/* Children&apos;s Privacy */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    10. Children&apos;s Privacy
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.
                                    </p>
                                </div>
                            </section>

                            {/* Changes to Policy */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    11. Changes to This Privacy Policy
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by:
                                    </p>
                                    <ul className="list-disc ml-6 space-y-2">
                                        <li>Posting the updated policy on our website</li>
                                        <li>Sending an email notification to registered users</li>
                                        <li>Displaying a notice in our application</li>
                                    </ul>
                                    <p>
                                        Your continued use of our service after any changes constitutes acceptance of the updated Privacy Policy.
                                    </p>
                                </div>
                            </section>

                            {/* Contact Information */}
                            <section className="mb-12">
                                <h2 className="text-2xl md:text-3xl font-bold text-purple-400 mb-6">
                                    12. Contact Us
                                </h2>
                                <div className="text-gray-300 space-y-4 text-lg leading-relaxed">
                                    <p>
                                        If you have questions about this Privacy Policy or our privacy practices, please contact us through:
                                    </p>
                                    <ul className="list-disc ml-6 space-y-2">
                                        <li>Our support system within the application</li>
                                        <li>The contact form on our website</li>
                                        <li>Your account settings privacy section</li>
                                    </ul>
                                    <p>
                                        We are committed to addressing your privacy concerns promptly and transparently.
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
                            <Link href="/terms-of-service" className="text-gray-400 hover:text-purple-400 transition-colors">
                                Terms of Service
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
