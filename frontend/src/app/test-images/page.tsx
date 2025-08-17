'use client';

import Image from 'next/image';
import { useState } from 'react';
import { logDebug, logError } from '@/lib/logger';

export default function TestImagesPage() {
    const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

    // Test image URLs from the API response
    const testImageUrls = [
        "https://cdn.yourdomain.com/kaggle_tarot_images/cards/s06.jpg",
        "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m11.jpg",
        "https://cdn.yourdomain.com/kaggle_tarot_images/cards/c06.jpg"
    ];

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-white mb-8">Image Loading Test</h1>

                <div className="space-y-8">
                    {testImageUrls.map((url, index) => (
                        <div key={index} className="border border-gray-600 p-6 rounded-lg bg-gray-800">
                            <h2 className="text-lg text-white mb-4">Test Image {index + 1}</h2>
                            <p className="text-sm text-gray-400 mb-4 break-all">URL: {url}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Next.js Image Component */}
                                <div>
                                    <h3 className="text-md text-white mb-2">Next.js Image Component</h3>
                                    <div className="border border-gray-500 p-4 rounded">
                                        {!brokenImages.has(`nextjs-${url}`) && (
                                            <Image
                                                src={url}
                                                alt={`Test ${index + 1}`}
                                                width={150}
                                                height={225}
                                                className="rounded border border-gray-600"
                                                onLoad={() => logDebug('Next.js Image loaded', { url })}
                                                onError={(e) => {
                                                    logError('Next.js Image failed', e, {
                                                        component: 'TestImagesPage',
                                                        url,
                                                        currentTarget: e.currentTarget
                                                    });
                                                    setBrokenImages(prev => new Set(prev).add(`nextjs-${url}`));
                                                }}
                                            />
                                        )}
                                        {brokenImages.has(`nextjs-${url}`) && (
                                            <div className="w-[150px] h-[225px] bg-red-900 flex items-center justify-center text-white text-sm">
                                                Next.js Image Failed
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Regular img tag */}
                                <div>
                                    <h3 className="text-md text-white mb-2">Regular img tag</h3>
                                    <div className="border border-gray-500 p-4 rounded">
                                        {!brokenImages.has(`regular-${url}`) && (
                                            <Image
                                                src={url}
                                                alt={`Regular test ${index + 1}`}
                                                width={150}
                                                height={225}
                                                className="rounded border border-gray-600"
                                                style={{ objectFit: 'contain' }}
                                                onLoad={() => logDebug('Regular img loaded', { url })}
                                                onError={(e) => {
                                                    logError('Regular img failed', e, {
                                                        component: 'TestImagesPage',
                                                        url,
                                                        currentTarget: e.currentTarget
                                                    });
                                                    setBrokenImages(prev => new Set(prev).add(`regular-${url}`));
                                                }}
                                                unoptimized={true}
                                            />
                                        )}
                                        {brokenImages.has(`regular-${url}`) && (
                                            <div className="w-[150px] h-[225px] bg-red-900 flex items-center justify-center text-white text-sm">
                                                Regular img Failed
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Direct fetch test */}
                <div className="mt-8 border border-gray-600 p-6 rounded-lg bg-gray-800">
                    <h2 className="text-lg text-white mb-4">Direct Fetch Test</h2>
                    <button
                        onClick={async () => {
                            for (const url of testImageUrls) {
                                try {
                                    const response = await fetch(url, { method: 'HEAD' });
                                    logDebug(`Fetch test for ${url}`, {
                                        status: response.status,
                                        statusText: response.statusText,
                                        headers: Object.fromEntries(response.headers.entries())
                                    });
                                } catch (error) {
                                    logError(`Fetch test failed for ${url}`, error);
                                }
                            }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                        Test Fetch
                    </button>
                </div>
            </div>
        </div>
    );
}
