'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Camera, Upload, Trash2 } from 'lucide-react';
import { auth } from '@/lib/api';
import { useUserProfile } from '@/hooks/useUserProfile';
import toast from 'react-hot-toast';

interface AvatarUploadProps {
    currentAvatarUrl?: string;
    username?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showUploadButton?: boolean;
    showDeleteButton?: boolean;
    onAvatarChange?: (avatarUrl: string | null) => void;
}

const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
};

const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
};

// Font size classes for initials based on avatar size
const initialsFontSizeClasses = {
    sm: 'text-sm font-medium',
    md: 'text-lg font-semibold',
    lg: 'text-2xl font-bold',
    xl: 'text-4xl font-bold'
};

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
    currentAvatarUrl,
    username,
    size = 'lg',
    showUploadButton = true,
    showDeleteButton = true,
    onAvatarChange
}) => {
    const { fetchProfile } = useUserProfile();
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [imageKey, setImageKey] = useState<number>(Date.now()); // Force image re-render
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Get user initials for fallback
    const getUserInitials = (username?: string) => {
        if (username) {
            return username.slice(0, 2).toUpperCase();
        }
        return 'U';
    };

    // Validate file
    const validateFile = (file: File): string | null => {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

        if (!allowedTypes.includes(file.type)) {
            return 'Please select a valid image file (JPEG, PNG, GIF, or WebP)';
        }

        if (file.size > maxSize) {
            return 'File size must be less than 10MB';
        }

        return null;
    };

    // Handle file upload
    const handleFileUpload = useCallback(async (file: File) => {
        const validationError = validateFile(file);
        if (validationError) {
            toast.error(validationError);
            return;
        }

        setIsUploading(true);

        try {
            // Show preview immediately
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);

            const response = await auth.uploadAvatar(file);

            // Clean up object URL
            URL.revokeObjectURL(objectUrl);
            setPreviewUrl(null);

            toast.success('Avatar uploaded successfully!');

            // Refresh profile to get updated avatar URL
            await fetchProfile();

            // Force image re-render by updating the key
            setImageKey(Date.now());

            // Notify parent component
            if (onAvatarChange) {
                onAvatarChange(response.avatar_url);
            }
        } catch (error) {
            // Clean up object URL on error
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
            }

            console.error('Avatar upload error:', error);
            toast.error('Failed to upload avatar. Please try again.');
        } finally {
            setIsUploading(false);
        }
    }, [fetchProfile, onAvatarChange, previewUrl]);

    // Handle file input change
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
        // Reset input value to allow selecting the same file again
        event.target.value = '';
    };

    // Handle drag and drop
    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragOver(false);

        const file = event.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragOver(false);
    };

    // Handle avatar deletion
    const handleDeleteAvatar = async () => {
        if (!window.confirm('Are you sure you want to delete your avatar?')) {
            return;
        }

        setIsDeleting(true);

        try {
            await auth.deleteAvatar();
            toast.success('Avatar deleted successfully!');

            // Refresh profile
            await fetchProfile();

            // Force image re-render by updating the key
            setImageKey(Date.now());

            // Notify parent component
            if (onAvatarChange) {
                onAvatarChange(null);
            }
        } catch (error) {
            console.error('Avatar deletion error:', error);
            toast.error('Failed to delete avatar. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    // Click handler for avatar (opens file picker)
    const handleAvatarClick = () => {
        if (showUploadButton && !isUploading) {
            fileInputRef.current?.click();
        }
    };

    // Simple cache busting - only add timestamp when image key changes
    const displayUrl = previewUrl || currentAvatarUrl;
    console.log('displayUrl', displayUrl);

    const isLoading = isUploading || isDeleting;

    return (
        <div className="flex flex-col items-center space-y-4">
            {/* Avatar Display */}
            <div
                className={`relative ${sizeClasses[size]} rounded-full overflow-hidden ${showUploadButton ? 'cursor-pointer' : ''
                    } ${dragOver ? 'ring-4 ring-purple-500 ring-opacity-50' : ''} ${isLoading ? 'opacity-50' : ''
                    }`}
                onClick={handleAvatarClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {displayUrl ? (
                    <Image
                        key={imageKey}
                        src={displayUrl}
                        alt={`${username || 'User'}'s avatar`}
                        fill
                        unoptimized
                        className="object-cover"
                        onError={() => {
                            console.error('Avatar image failed to load:', displayUrl);
                        }}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 flex items-center justify-center shadow-lg">
                        <span className={`${initialsFontSizeClasses[size]} text-white font-bold tracking-wide drop-shadow-sm`}>
                            {getUserInitials(username)}
                        </span>
                    </div>
                )}

                {/* Loading overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                )}

                {/* Upload overlay on hover */}
                {showUploadButton && !isLoading && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                        <Camera className={`text-white ${iconSizeClasses[size]}`} />
                    </div>
                )}

                {/* Drag overlay */}
                {dragOver && (
                    <div className="absolute inset-0 bg-purple-500 bg-opacity-75 flex items-center justify-center">
                        <Upload className={`text-white ${iconSizeClasses[size]}`} />
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
                {showUploadButton && (
                    <>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                        >
                            <Upload className="w-4 h-4" />
                            <span>{currentAvatarUrl ? 'Change Avatar' : 'Upload Avatar'}</span>
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </>
                )}

                {showDeleteButton && currentAvatarUrl && (
                    <button
                        onClick={handleDeleteAvatar}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Remove</span>
                    </button>
                )}
            </div>

            {/* Help Text */}
            {showUploadButton && (
                <div className="text-center text-sm text-gray-400 max-w-xs">
                    <p>Click to upload or drag and drop an image</p>
                    <p>Supports JPEG, PNG, GIF, and WebP (max 10MB)</p>
                    <p>Images will be resized to 400x400px</p>
                </div>
            )}
        </div>
    );
};

// Simple Avatar component for display-only use cases
export const Avatar: React.FC<{
    src?: string;
    username?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}> = ({ src, username, size = 'md', className = '' }) => {
    const getUserInitials = (username?: string) => {
        if (username) {
            return username.slice(0, 2).toUpperCase();
        }
        return 'U';
    };

    return (
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden relative ${className} touch-manipulation`}>
            {src ? (
                <Image
                    src={src}
                    alt={`${username || 'User'}'s avatar`}
                    fill
                    unoptimized
                    className="object-cover"
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 flex items-center justify-center shadow-lg">
                    <span className={`${initialsFontSizeClasses[size]} text-white font-bold tracking-wide drop-shadow-sm`}>
                        {getUserInitials(username)}
                    </span>
                </div>
            )}
        </div>
    );
};
