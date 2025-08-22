"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarIcon, TagIcon, ArrowUpIcon, PlusIcon, MinusIcon, ExclamationTriangleIcon, ShieldCheckIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface ChangelogEntry {
    version: string;
    date: string;
    changes: {
        added?: string[];
        changed?: string[];
        deprecated?: string[];
        removed?: string[];
        fixed?: string[];
        security?: string[];
    };
}

interface ChangelogPageProps {
    searchParams?: Promise<{ version?: string }>;
}

export default function ChangelogPage({ searchParams }: ChangelogPageProps) {
    const [changelog, setChangelog] = useState<string>('');
    const [latestVersion, setLatestVersion] = useState<ChangelogEntry | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<ChangelogEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [versions, setVersions] = useState<string[]>([]);

    useEffect(() => {
        const handleParams = async () => {
            fetchChangelog();
            fetchLatestVersion();
            if (searchParams) {
                const params = await searchParams;
                if (params?.version) {
                    fetchVersionInfo(params.version);
                }
            }
        };

        handleParams();
    }, [searchParams]);

    const fetchChangelog = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/changelog');
            if (!response.ok) throw new Error('Failed to fetch changelog');
            const data = await response.text();
            setChangelog(data);

            // Extract versions from the markdown
            const versionMatches = data.match(/## \[([^\]]+)\]/g);
            if (versionMatches) {
                const extractedVersions = versionMatches.map(match => match.replace('## [', '').replace(']', ''));
                setVersions(extractedVersions);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch changelog');
        } finally {
            setLoading(false);
        }
    };

    const fetchLatestVersion = async () => {
        try {
            const response = await fetch('/api/changelog/latest');
            if (!response.ok) throw new Error('Failed to fetch latest version');
            const data = await response.json();
            setLatestVersion(data);
        } catch (err) {
            console.error('Failed to fetch latest version:', err);
        }
    };

    const fetchVersionInfo = async (version: string) => {
        try {
            const response = await fetch(`/api/changelog/version/${version}`);
            if (!response.ok) throw new Error('Failed to fetch version info');
            const data = await response.json();
            setSelectedVersion(data);
        } catch (err) {
            console.error('Failed to fetch version info:', err);
        }
    };

    const getChangeIcon = (type: string) => {
        switch (type) {
            case 'added':
                return <PlusIcon className="w-5 h-5 text-green-500" />;
            case 'changed':
                return <ArrowUpIcon className="w-5 h-5 text-blue-500" />;
            case 'deprecated':
                return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
            case 'removed':
                return <MinusIcon className="w-5 h-5 text-red-500" />;
            case 'fixed':
                return <WrenchScrewdriverIcon className="w-5 h-5 text-purple-500" />;
            case 'security':
                return <ShieldCheckIcon className="w-5 h-5 text-indigo-500" />;
            default:
                return <TagIcon className="w-5 h-5 text-gray-500" />;
        }
    };



    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const renderChangeList = (changes: string[], type: string) => {
        if (!changes || changes.length === 0) return null;

        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                    {getChangeIcon(type)}
                    <h4 className="font-semibold text-gray-200 capitalize">{type}</h4>
                </div>
                <ul className="space-y-2">
                    {changes.map((change, index) => (
                        <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start gap-3"
                        >
                            <CheckCircleIcon className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                            <span className="text-gray-300 leading-relaxed">{change}</span>
                        </motion.li>
                    ))}
                </ul>
            </div>
        );
    };

    const renderVersionCard = (version: ChangelogEntry, isLatest = false) => (
        <motion.div
            key={version.version}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`relative p-6 rounded-xl border backdrop-blur-sm ${isLatest
                ? 'border-purple-500/50 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                : 'border-gray-600/30 bg-gray-800/30'
                }`}
        >
            {isLatest && (
                <div className="absolute -top-3 left-6 px-3 py-1 bg-purple-500 text-white text-xs font-semibold rounded-full">
                    Latest Release
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <TagIcon className="w-6 h-6 text-purple-400" />
                    <h3 className="text-2xl font-bold text-white">v{version.version}</h3>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                    <CalendarIcon className="w-4 h-4" />
                    <span className="text-sm">{formatDate(version.date)}</span>
                </div>
            </div>

            <div className="space-y-6">
                {Object.entries(version.changes).map(([type, changes]) =>
                    changes && changes.length > 0 ? renderChangeList(changes, type) : null
                )}
            </div>
        </motion.div>
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading changelog...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Error Loading Changelog</h2>
                    <p className="text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={fetchChangelog}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
            {/* Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center"
                    >
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                            Changelog
                        </h1>
                        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                            Track the evolution of ArcanaAI with detailed information about new features,
                            improvements, and bug fixes across all versions.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Sidebar - Version Navigation */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8">
                            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                                <h3 className="text-lg font-semibold text-white mb-4">Versions</h3>
                                <div className="space-y-2">
                                    {versions.map((version) => (
                                        <button
                                            key={version}
                                            onClick={() => fetchVersionInfo(version)}
                                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedVersion?.version === version
                                                ? 'bg-purple-600 text-white'
                                                : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                                }`}
                                        >
                                            v{version}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <div className="space-y-8">
                            {/* Latest Version */}
                            {latestVersion && (
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-6">Latest Release</h2>
                                    {renderVersionCard(latestVersion, true)}
                                </div>
                            )}

                            {/* Selected Version */}
                            {selectedVersion && selectedVersion.version !== latestVersion?.version && (
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-6">Version Details</h2>
                                    {renderVersionCard(selectedVersion)}
                                </div>
                            )}

                            {/* Full Changelog */}
                            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                                <h2 className="text-2xl font-bold text-white mb-6">Complete Changelog</h2>
                                <div className="prose prose-invert max-w-none">
                                    <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono bg-gray-900/50 p-4 rounded-lg overflow-x-auto">
                                        {changelog}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
