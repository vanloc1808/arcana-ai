'use client';

import React from 'react';
import { SubscriptionHistory } from '@/components/SubscriptionHistory';

export default function SubscriptionDemoPage() {
    return (
        <div className="min-h-screen bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-white">
                                    Subscription History Demo
                                </h1>
                                <p className="text-gray-400 mt-1">
                                    Preview of the subscription management interface
                                </p>
                            </div>
                            <div className="bg-purple-900/20 px-4 py-2 rounded-lg border border-purple-500">
                                <span className="text-purple-400 text-sm">Demo Mode</span>
                            </div>
                        </div>
                    </div>

                    {/* Subscription History Component */}
                    <div className="bg-gray-800 rounded-lg shadow-md p-6">
                        <SubscriptionHistory />
                    </div>
                </div>
            </div>
        </div>
    );
}