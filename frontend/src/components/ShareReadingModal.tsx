'use client';

import { useState } from 'react';
import { FiX, FiShare2, FiCopy, FiMail, FiMessageCircle, FiFacebook, FiTwitter, FiLoader } from 'react-icons/fi';
import { Card, SharedReadingCreate, ShareResponse } from '@/types/tarot';
import { sharing } from '@/lib/api';

interface ShareReadingModalProps {
    isOpen: boolean;
    onClose: () => void;
    cards: Card[];
    concern: string;
    spreadName?: string;
    deckName?: string;
}

export const ShareReadingModal = ({
    isOpen,
    onClose,
    cards,
    concern,
    spreadName,
    deckName
}: ShareReadingModalProps) => {
    const [title, setTitle] = useState('');
    const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [shareResponse, setShareResponse] = useState<ShareResponse | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleCreateShare = async () => {
        if (!title.trim()) {
            setError('Please enter a title for your reading');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const shareData: SharedReadingCreate = {
                title: title.trim(),
                concern,
                cards,
                spread_name: spreadName,
                deck_name: deckName,
                expires_in_days: expiresInDays
            };

            const response = await sharing.createSharedReading(shareData);
            setShareResponse(response);
        } catch (error: unknown) {
            const errorMessage = error && typeof error === 'object' && 'response' in error
                ? (error as { response?: { data?: { detail?: { message?: string } } } }).response?.data?.detail?.message || 'Failed to create share link'
                : 'Failed to create share link';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyLink = async () => {
        if (shareResponse?.sharing_url) {
            try {
                await navigator.clipboard.writeText(shareResponse.sharing_url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch {
                setError('Failed to copy link');
            }
        }
    };

    const handleSocialShare = (platform: string) => {
        if (!shareResponse?.sharing_url) return;

        const text = encodeURIComponent(`Check out my tarot reading: "${title}"`);
        const url = encodeURIComponent(shareResponse.sharing_url);

        let shareUrl = '';
        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${text}%20${url}`;
                break;
            case 'email':
                shareUrl = `mailto:?subject=${encodeURIComponent(`Tarot Reading: ${title}`)}&body=${text}%20${url}`;
                break;
        }

        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    };

    const handleClose = () => {
        setTitle('');
        setExpiresInDays(undefined);
        setShareResponse(null);
        setError('');
        setCopied(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <FiShare2 className="w-5 h-5 text-purple-600" />
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Share Reading
                            </h2>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>

                    {!shareResponse ? (
                        /* Create Share Form */
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Reading Title *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Give your reading a title..."
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Link Expiration (Optional)
                                </label>
                                <select
                                    value={expiresInDays || ''}
                                    onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : undefined)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Never expires</option>
                                    <option value="1">1 day</option>
                                    <option value="7">1 week</option>
                                    <option value="30">1 month</option>
                                    <option value="90">3 months</option>
                                </select>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <strong>Preview:</strong> This will share your {cards.length}-card reading
                                    {spreadName && ` using the ${spreadName} spread`} with the question: &ldquo;{concern}&rdquo;
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleCreateShare}
                                disabled={isLoading || !title.trim()}
                                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <FiLoader className="w-4 h-4 animate-spin" />
                                        Creating Share Link...
                                    </>
                                ) : (
                                    <>
                                        <FiShare2 className="w-4 h-4" />
                                        Create Share Link
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        /* Share Success */
                        <div className="space-y-4">
                            <div className="text-center py-4">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FiShare2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    Share Link Created!
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Your reading is now ready to share
                                </p>
                            </div>

                            {/* Copy Link */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Share Link
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={shareResponse.sharing_url}
                                        readOnly
                                        className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    />
                                    <button
                                        onClick={handleCopyLink}
                                        className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                    >
                                        {copied ? (
                                            <span className="text-green-400">✓</span>
                                        ) : (
                                            <FiCopy className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Social Share Options */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Share On
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => handleSocialShare('facebook')}
                                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <FiFacebook className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Facebook</span>
                                    </button>
                                    <button
                                        onClick={() => handleSocialShare('twitter')}
                                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <FiTwitter className="w-4 h-4 text-blue-400" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Twitter</span>
                                    </button>
                                    <button
                                        onClick={() => handleSocialShare('whatsapp')}
                                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <FiMessageCircle className="w-4 h-4 text-green-600" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">WhatsApp</span>
                                    </button>
                                    <button
                                        onClick={() => handleSocialShare('email')}
                                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <FiMail className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Email</span>
                                    </button>
                                </div>
                            </div>

                            {shareResponse.expires_at && (
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-400">
                                        <strong>Note:</strong> This link will expire on{' '}
                                        {new Date(shareResponse.expires_at).toLocaleDateString()}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleClose}
                                className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
